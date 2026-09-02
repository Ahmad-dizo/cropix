# Flask-based proxy to forward chat requests to OpenAI
# Usage:
# 1) python -m pip install flask flask-cors requests python-dotenv
# 2) create a .env with OPENAI_API_KEY=sk-...
# 3) python server_py.py

import os
import json
import requests
import sys
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
from dotenv import load_dotenv

# Force unbuffered output
sys.stdout = open(sys.stdout.fileno(), mode='w', buffering=1)
sys.stderr = open(sys.stderr.fileno(), mode='w', buffering=1)

# Ensure Keras uses TensorFlow backend
os.environ.setdefault("KERAS_BACKEND", "tensorflow")

# ML deps
TF_IMPORT_ERROR = None
try:
    import tensorflow as tf
except Exception as e:
    tf = None
    TF_IMPORT_ERROR = e

try:
    import keras
except Exception:
    keras = None
from PIL import Image, ImageDraw
import numpy as np
import cv2
import base64
from io import BytesIO

load_dotenv()
OPENAI_KEY = os.getenv('OPENAI_API_KEY')
OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-5.5-pro').strip()
OPENAI_VISION_MODEL = os.getenv('OPENAI_VISION_MODEL', OPENAI_MODEL).strip()
ENABLE_LEAF_API_CHECK = os.getenv('ENABLE_LEAF_API_CHECK', 'false').strip().lower() in ('1', 'true', 'yes', 'on')
ENABLE_AI_ADVICE = os.getenv('ENABLE_AI_ADVICE', 'false').strip().lower() in ('1', 'true', 'yes', 'on')
OPENAI_FALLBACK_MODELS = [
    model_name.strip()
    for model_name in os.getenv('OPENAI_FALLBACK_MODELS', 'gpt-5.5,gpt-5.4-mini').split(',')
    if model_name.strip()
]

AGRI_CHAT_SYSTEM_PROMPT = """
You are CROPIX Chat Assistant for an agriculture disease detection system.

Your job:
- Answer all chat questions through the API as a practical agriculture-focused assistant.
- Focus on crop farming, plant disease awareness, treatment options, prevention, irrigation, soil care, pest control, weather impact, and best farming practices.
- Help users understand how to use this system whenever they ask. Explain clearly how to:
  1. Select region
  2. Upload an image or use webcam
  3. Start detection
  4. Read the detected crop, disease result, and advisory
  5. Use the AI chat for extra guidance
- If the user asks something unrelated to agriculture or this system, respond politely and gently guide the conversation back to agriculture or system usage.
- Use the same language as the user's latest message whenever possible. If the user writes in Swahili, answer in Swahili. If the user writes in English, answer in English. If mixed, use simple helpful Swahili-English.
- Keep answers clear, practical, and supportive.
- When giving advice, prefer actionable steps and safety-minded guidance.
- Do not claim certainty when unsure. Briefly say when field inspection or an agricultural expert may still be needed.
- Organize long answers in a clean structure that is easy to scan.
- Prefer short paragraphs or a short numbered list when giving steps.
- Avoid sending one long unbroken paragraph.
""".strip()

# Email configuration
EMAIL_ADDRESS = os.getenv('EMAIL_ADDRESS', 'hajialiahmad@gmail.com')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD', '')
CONTACT_RECEIVER = os.getenv('CONTACT_RECEIVER', 'abinhambal7@gmail.com')
SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', 587))

app = Flask(__name__)
CORS(app)

# Optional: limit upload size (e.g., 10MB)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024

# Allow overriding model locations via environment variables so the model
# file can live outside the project directory (e.g., on D:\models\...).
MODEL_PATH_ENV = os.getenv('MODEL_PATH', '').strip()
MODEL_H5_ENV = os.getenv('MODEL_H5_PATH', '').strip()
proj_dir = os.path.dirname(__file__)

if MODEL_PATH_ENV:
    env_path = os.path.abspath(os.path.expanduser(MODEL_PATH_ENV))
    if os.path.isdir(env_path):
        MODEL_PATH_KERAS = os.path.join(env_path, 'plant_disease_model.keras')
    else:
        MODEL_PATH_KERAS = env_path
else:
    MODEL_PATH_KERAS = os.path.join(proj_dir, 'plant_disease_model.keras')

if MODEL_H5_ENV:
    env_h5 = os.path.abspath(os.path.expanduser(MODEL_H5_ENV))
    if os.path.isdir(env_h5):
        MODEL_PATH_H5 = os.path.join(env_h5, 'plant_disease_model.h5')
    else:
        MODEL_PATH_H5 = env_h5
else:
    MODEL_PATH_H5 = os.path.join(proj_dir, 'plant_disease_model.h5')

LABELS_PATH = os.path.join(proj_dir, 'labels.txt')
MODEL_INPUT_MODE = os.getenv('MODEL_INPUT_MODE', 'raw').strip().lower()

model = None
labels = None
ACTIVE_MODEL_PATH = None

# Serve the single-page frontend from the same Render service as the API.
# This keeps all fetch('/predict') and fetch('/api/...') calls same-origin.
FRONTEND_FILES = {
    'styles.css',
    'script.js',
    'logo.ico',
    'logo.png',
    'picture.jpg',
}


@app.route('/', methods=['GET'])
def frontend():
    return send_from_directory(proj_dir, 'index.html')


@app.route('/<path:filename>', methods=['GET'])
def frontend_asset(filename):
    if filename not in FRONTEND_FILES:
        abort(404)
    return send_from_directory(proj_dir, filename)


@app.route('/health', methods=['GET'])
def health():
    """Render health check; only report ready after the ML model is loaded."""
    if model is None:
        return jsonify({'status': 'starting', 'model_loaded': False}), 503
    return jsonify({
        'status': 'ok',
        'model_loaded': True,
        'model_path': ACTIVE_MODEL_PATH,
        'labels_loaded': len(labels) if labels else 0,
    })

def load_model_and_labels():
    global model, labels, ACTIVE_MODEL_PATH
    try:
        model_candidates = [MODEL_PATH_KERAS, MODEL_PATH_H5]
        model_path = next((p for p in model_candidates if os.path.exists(p)), None)
        ACTIVE_MODEL_PATH = model_path

        if model_path:
            if tf is None:
                print(f'TensorFlow is not available in this environment: {TF_IMPORT_ERROR}')
                print('Skipping model load. Install Python 3.10-3.13 and reinstall requirements to enable /predict.')
            else:
                try:
                    if keras is not None:
                        model = keras.models.load_model(model_path, compile=False, safe_mode=False)
                        print('Model loaded with standalone Keras from', model_path)
                    else:
                        model = tf.keras.models.load_model(model_path, compile=False)
                        print('Model loaded with tf.keras from', model_path)
                except Exception as load_err:
                    # Fallback: compat loader for legacy models serialized with positional training args
                    print('Default model load failed:', load_err)

                    class CompatBatchNormalization(tf.keras.layers.BatchNormalization):
                        def __init__(self, *args, **kwargs):
                            super().__init__(*args, **kwargs)
                            # Disable strict input count checks
                            self.input_spec = None

                        def call(self, inputs, training=None, **kwargs):
                            if isinstance(inputs, (list, tuple)):
                                if len(inputs) > 0:
                                    x = inputs[0]
                                    if len(inputs) > 1 and training is None:
                                        training = inputs[1]
                                    return super().call(x, training=training, **kwargs)
                            return super().call(inputs, training=training, **kwargs)

                    model = tf.keras.models.load_model(
                        model_path,
                        compile=False,
                        custom_objects={"BatchNormalization": CompatBatchNormalization},
                    )
                    print('Model loaded with CompatBatchNormalization from', model_path)
        else:
            print(f'Model file not found. Checked: {MODEL_PATH_KERAS} and {MODEL_PATH_H5}')

        if os.path.exists(LABELS_PATH):
            with open(LABELS_PATH, 'r', encoding='utf-8') as f:
                labels = [l.strip() for l in f.readlines() if l.strip()]
            print(f'Labels loaded: {len(labels)}')
            print(f'First 3 labels: {labels[:3]}')
            print(f'Labels path: {LABELS_PATH}')

            # If the model output layer has a fixed number of classes, align labels to that output length.
            if model is not None and hasattr(model, 'output_shape'):
                output_shape = model.output_shape
                if isinstance(output_shape, tuple) and len(output_shape) >= 2:
                    output_dim = int(output_shape[-1])
                    if len(labels) > output_dim:
                        print(f'WARNING: labels count ({len(labels)}) exceeds model output dimension ({output_dim}); trimming labels to match model output.')
                        labels = labels[:output_dim]
                    elif len(labels) < output_dim:
                        print(f'WARNING: labels count ({len(labels)}) is smaller than model output dimension ({output_dim}); some predictions will be returned as numeric class indices.')
        else:
            labels = None
            print(f'No labels file found at: {LABELS_PATH}')
            print(f'Files in /app: {os.listdir("/app") if os.path.exists("/app") else "N/A"}')
    except Exception as e:
        print('Error loading model or labels:', e)


def preprocess_image(image_file, target_size=(224,224)):
    image = Image.open(image_file).convert('RGB')
    image = image.resize(target_size)
    arr = np.array(image).astype('float32')
    if MODEL_INPUT_MODE == 'normalized':
        arr = arr / 255.0
    arr = np.expand_dims(arr, axis=0)
    return arr


def generate_grad_cam(model, img_array, pred_index, target_size=(224, 224)):
    """
    Generate Grad-CAM heatmap to visualize where the model detected the disease
    """
    try:
        # Find the last convolutional layer
        last_conv_layer = None
        for layer in reversed(model.layers):
            if 'conv' in layer.name.lower():
                last_conv_layer = layer
                break
        
        if last_conv_layer is None:
            print("⚠️ No convolutional layer found for Grad-CAM")
            return None
        
        # Create a model that outputs feature maps and predictions
        grad_model = tf.keras.models.Model(
            inputs=model.input,
            outputs=[last_conv_layer.output, model.output]
        )
        
        # Compute gradient
        with tf.GradientTape() as tape:
            conv_outputs, predictions = grad_model(img_array)
            loss = predictions[:, pred_index]
        
        # Get gradients
        grads = tape.gradient(loss, conv_outputs)
        
        # Average pooling of gradients
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        
        # Weight each channel in the feature map by the gradient
        conv_outputs = conv_outputs[0]
        heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
        heatmap = tf.squeeze(heatmap)
        
        # Normalize heatmap
        heatmap = (heatmap - tf.reduce_min(heatmap)) / (tf.reduce_max(heatmap) - tf.reduce_min(heatmap))
        heatmap = heatmap.numpy()
        
        return heatmap
        
    except Exception as e:
        print(f"Error generating Grad-CAM: {e}")
        return None


def create_annotated_image(original_image, heatmap, output_size=(224, 224)):
    """
    Overlay heatmap on the original image to show disease location
    """
    try:
        # Convert PIL image to numpy
        img_np = np.array(original_image)
        
        # Resize heatmap to match image size
        heatmap_resized = cv2.resize(heatmap, output_size)
        
        # Normalize heatmap to 0-255
        heatmap_normalized = (heatmap_resized * 255).astype(np.uint8)
        
        # Apply color map (red for affected areas)
        heatmap_color = cv2.applyColorMap(heatmap_normalized, cv2.COLORMAP_JET)
        heatmap_color = cv2.cvtColor(heatmap_color, cv2.COLOR_BGR2RGB)
        
        # Blend heatmap with original image (30% heatmap, 70% original)
        annotated = cv2.addWeighted(img_np, 0.7, heatmap_color, 0.3, 0)
        
        # Draw a circle around the most affected area
        # Find contours in heatmap
        _, thresh = cv2.threshold(heatmap_normalized, heatmap_normalized.max() * 0.6, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(thresh, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            # Get the largest contour
            largest_contour = max(contours, key=cv2.contourArea)
            (x, y), radius = cv2.minEnclosingCircle(largest_contour)
            x, y, radius = int(x), int(y), int(radius)
            
            # Draw circle on annotated image
            cv2.circle(annotated, (x, y), radius + 10, (0, 255, 0), 3)  # Green circle
        
        return annotated
        
    except Exception as e:
        print(f"Error creating annotated image: {e}")
        return None


def image_to_base64(image_np):
    """Convert numpy array to base64 string"""
    img_pil = Image.fromarray(image_np.astype('uint8'))
    buffered = BytesIO()
    img_pil.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return img_str


def pil_image_to_data_url(image, max_size=(768, 768)):
    img = image.copy()
    img.thumbnail(max_size)
    buffered = BytesIO()
    img.save(buffered, format='JPEG', quality=85)
    encoded = base64.b64encode(buffered.getvalue()).decode()
    return f'data:image/jpeg;base64,{encoded}'


def format_disease_name(raw_label):
    """Return disease name only, without plant prefix."""
    if not raw_label:
        return raw_label
    disease = raw_label.split('___', 1)[-1]
    disease = disease.replace('_', ' ')
    return ' '.join(disease.split()).strip()


def format_crop_name(raw_crop):
    """Return user-friendly crop name from crop prefix key."""
    if not raw_crop:
        return ''
    crop = raw_crop.replace('_', ' ').replace(',', ' ')
    crop = crop.replace('(', ' ').replace(')', ' ')
    return ' '.join(crop.split()).strip()


def split_prediction_label(raw_label):
    if not raw_label:
        return '', ''
    if '___' not in raw_label:
        return '', raw_label
    crop_key, disease_key = raw_label.split('___', 1)
    return crop_key, disease_key


def get_preferred_language(language_code):
    return 'Swahili' if str(language_code).strip().lower() == 'sw' else 'English'


def get_openai_model_candidates():
    seen = set()
    candidates = []
    for model_name in [OPENAI_MODEL, *OPENAI_FALLBACK_MODELS]:
        if not model_name or model_name in seen:
            continue
        seen.add(model_name)
        candidates.append(model_name)
    return candidates


def get_openai_vision_model_candidates():
    seen = set()
    candidates = []
    for model_name in [OPENAI_VISION_MODEL, OPENAI_MODEL, *OPENAI_FALLBACK_MODELS]:
        if not model_name or model_name in seen:
            continue
        seen.add(model_name)
        candidates.append(model_name)
    return candidates


def get_openai_timeout(model_name):
    return 120 if str(model_name).endswith('-pro') else 45


def build_chat_fallback_reply(message, selected_region='', selected_crop='', preferred_language='English'):
    crop_part = selected_crop or ('the detected crop' if preferred_language == 'English' else 'mmea uliotambuliwa')
    region_part = selected_region or ('your area' if preferred_language == 'English' else 'eneo lako')
    if preferred_language == 'English':
        return (
            f'I am temporarily using offline guidance. For {crop_part} in {region_part}, '
            'please describe the visible symptoms, leaf color changes, spots, wilting, or rotting signs. '
            'You can also run image detection again and follow the prevention and treatment steps shown there. '
            'If you share the crop name, region, and symptoms clearly, I can still give general farming guidance.'
        )
    return (
        f'Kwa sasa ninatumia mwongozo wa muda bila huduma ya moja kwa moja. Kwa {crop_part} katika {region_part}, '
        'tafadhali eleza dalili unazoona kama mabadiliko ya rangi ya majani, madoa, kunyauka, au kuoza. '
        'Unaweza pia kurudia detection ya picha na kufuata hatua za kinga na matibabu zinazoonyeshwa. '
        'Ukitaja zao, mkoa, na dalili kwa uwazi, bado naweza kutoa ushauri wa jumla wa kilimo.'
    )


def build_detection_advice_fallback(predicted_class, crop_name='', region='', weather_context='', confidence=None, preferred_language='English'):
    disease_name = format_disease_name(predicted_class) or ('Unknown condition' if preferred_language == 'English' else 'Tatizo lisilojulikana')
    crop_label = crop_name or format_crop_name(predicted_class.split('___', 1)[0]) or ('the crop' if preferred_language == 'English' else 'zao hili')
    region_label = region or ('your area' if preferred_language == 'English' else 'eneo lako')
    weather_label = weather_context or (
        'typical local weather conditions' if preferred_language == 'English' else 'hali ya hewa ya kawaida ya eneo lako'
    )
    is_healthy = 'healthy' in disease_name.lower()

    if is_healthy:
        if preferred_language == 'English':
            return {
                'localized_name': f'{crop_label} appears healthy',
                'summary': f'The result suggests that {crop_label} currently shows no clear disease signs.',
                'cause': 'Healthy leaves usually mean the crop is receiving fair growing conditions and no obvious active infection is visible in this image.',
                'home_remedies': [
                    'Continue regular field inspection once or twice a week.',
                    'Keep the field clean and remove weak or damaged leaves early.',
                    'Water at the root zone and avoid unnecessary leaf wetness.'
                ],
                'store_options': [
                    'Use balanced fertilizer based on crop stage if needed.',
                    'Use preventive bio-protection products only when there is known disease pressure nearby.'
                ],
                'prevention': [
                    f'Keep monitoring {crop_label} closely in {region_label}.',
                    f'Adjust watering and spraying based on {weather_label}.',
                    'Use clean tools and remove crop residue after harvest.'
                ]
            }
        return {
            'localized_name': f'{crop_label} linaonekana lenye afya',
            'summary': f'Matokeo yanaonyesha kuwa {crop_label} kwa sasa halionyeshi dalili wazi za ugonjwa.',
            'cause': 'Majani yenye afya mara nyingi yanaonyesha kuwa zao linapata mazingira mazuri ya ukuaji na hakuna maambukizi makubwa yanayoonekana kwenye picha hii.',
            'home_remedies': [
                'Endelea kukagua shamba mara moja au mbili kwa wiki.',
                'Weka shamba safi na ondoa majani dhaifu au yaliyoharibika mapema.',
                'Mwagilia karibu na mizizi na epuka kulowesha majani bila sababu.'
            ],
            'store_options': [
                'Tumia mbolea sahihi kulingana na hatua ya ukuaji wa zao ikihitajika.',
                'Tumia kinga za kibaolojia tu kama kuna hatari ya ugonjwa karibu na shamba.'
            ],
            'prevention': [
                f'Endelea kufuatilia {crop_label} kwa karibu katika {region_label}.',
                f'Badili umwagiliaji na unyunyiziaji kulingana na {weather_label}.',
                'Tumia zana safi na ondoa mabaki ya mazao baada ya mavuno.'
            ]
        }

    if preferred_language == 'English':
        return {
            'localized_name': disease_name,
            'summary': f'This result suggests {disease_name} on {crop_label}. If ignored, it may weaken leaves, reduce plant vigor, and lower yield.',
            'cause': 'This kind of problem is often linked to moisture, infected plant residue, poor air flow, spread from nearby plants, or weather that favors disease development.',
            'home_remedies': [
                'Remove badly affected leaves and keep the field clean.',
                'Avoid overhead watering and water close to the root zone.',
                'Use a mild neem-based spray or other safe local treatment on early symptoms.'
            ],
            'store_options': [
                'Ask an agrovet for a fungicide, bactericide, or treatment suitable for this crop problem.',
                'Choose preventive products that match the crop stage and disease pressure.'
            ],
            'prevention': [
                f'Monitor {crop_label} closely in {region_label}, especially during {weather_label}.',
                'Space plants well so air moves easily between leaves.',
                'Remove infected crop residue after harvest and rotate crops when possible.'
            ]
        }

    return {
        'localized_name': disease_name,
        'summary': f'Matokeo yanaonyesha uwezekano wa {disease_name} kwenye {crop_label}. Isipodhibitiwa mapema, inaweza kudhoofisha majani na kupunguza mavuno.',
        'cause': 'Tatizo la aina hii mara nyingi huhusishwa na unyevunyevu, mabaki ya mazao yenye maambukizi, hewa kutopita vizuri, kuenea kutoka mimea ya karibu, au hali ya hewa inayochochea ugonjwa.',
        'home_remedies': [
            'Ondoa majani yaliyoathirika sana na weka shamba safi.',
            'Epuka kumwagilia juu ya majani; mwagilia karibu na mizizi.',
            'Tumia mchanganyiko salama wa mwarobaini au tiba nyepesi ya mapema inapofaa.'
        ],
        'store_options': [
            'Uliza duka la pembejeo dawa inayofaa kwa tatizo hili kwenye zao husika.',
            'Chagua dawa ya kinga au matibabu inayolingana na hatua ya ukuaji wa zao.'
        ],
        'prevention': [
            f'Fuatilia {crop_label} kwa karibu katika {region_label}, hasa wakati wa {weather_label}.',
            'Panda kwa nafasi nzuri ili hewa ipite katikati ya majani.',
            'Ondoa mabaki ya mazao yaliyoathirika baada ya mavuno na badilisha mazao inapowezekana.'
        ]
    }


def extract_json_object(raw_text):
    if not raw_text:
        return {}
    text = raw_text.strip()
    if text.startswith('```'):
        text = text.strip('`')
        if '\n' in text:
            text = text.split('\n', 1)[1]
        text = text.rsplit('```', 1)[0].strip()
    start = text.find('{')
    end = text.rfind('}')
    if start == -1 or end == -1 or end <= start:
        return {}
    try:
        return json.loads(text[start:end + 1])
    except Exception:
        return {}


def call_openai_chat(api_messages, temperature=0.4, max_tokens=500):
    if not OPENAI_KEY:
        raise RuntimeError('OPENAI_API_KEY is missing on the server.')

    headers = {
        'Authorization': f'Bearer {OPENAI_KEY}',
        'Content-Type': 'application/json'
    }

    errors = []
    for model_name in get_openai_model_candidates():
        payload = {
            'model': model_name,
            'messages': api_messages,
            'max_completion_tokens': max_tokens,
            'temperature': temperature
        }
        try:
            response = requests.post(
                'https://api.openai.com/v1/chat/completions',
                json=payload,
                headers=headers,
                timeout=get_openai_timeout(model_name)
            )
        except requests.RequestException as req_err:
            error_text = f'{model_name}: request failed: {req_err}'
            print('OpenAI request exception:', error_text)
            errors.append(error_text)
            continue

        if response.status_code != 200:
            detail = response.text.strip()
            error_text = f'{model_name}: HTTP {response.status_code}: {detail}'
            print('OpenAI request failed:', error_text)
            errors.append(error_text)
            continue

        data = response.json()
        reply = data.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
        if reply:
            return reply

        error_text = f'{model_name}: empty response content'
        print('OpenAI response issue:', error_text)
        errors.append(error_text)

    raise RuntimeError(' | '.join(errors) if errors else 'OpenAI request failed for all configured models.')


def call_openai_leaf_check(image):
    if not OPENAI_KEY:
        raise RuntimeError('OPENAI_API_KEY is missing on the server.')

    data_url = pil_image_to_data_url(image)
    headers = {
        'Authorization': f'Bearer {OPENAI_KEY}',
        'Content-Type': 'application/json'
    }

    prompt = (
        'Look at this image and decide whether it contains a real plant/crop leaf. '
        'A diseased, spotted, partially cropped, or damaged leaf still counts as a leaf. '
        'Only answer false if the image clearly does not show a plant leaf. '
        'Reply only as JSON: {"is_leaf": true} or {"is_leaf": false}.'
    )

    errors = []
    for model_name in get_openai_vision_model_candidates():
        payload = {
            'model': model_name,
            'messages': [
                {
                    'role': 'user',
                    'content': [
                        {'type': 'text', 'text': prompt},
                        {'type': 'image_url', 'image_url': {'url': data_url}}
                    ]
                }
            ],
            'max_completion_tokens': 80,
            'temperature': 0
        }
        try:
            response = requests.post(
                'https://api.openai.com/v1/chat/completions',
                json=payload,
                headers=headers,
                timeout=get_openai_timeout(model_name)
            )
        except requests.RequestException as req_err:
            errors.append(f'{model_name}: request failed: {req_err}')
            continue

        if response.status_code != 200:
            errors.append(f'{model_name}: HTTP {response.status_code}: {response.text.strip()}')
            continue

        reply = response.json().get('choices', [{}])[0].get('message', {}).get('content', '').strip()
        parsed = extract_json_object(reply)
        if isinstance(parsed.get('is_leaf'), bool):
            return parsed
        errors.append(f'{model_name}: invalid leaf-check response: {reply[:120]}')

    raise RuntimeError(' | '.join(errors) if errors else 'OpenAI leaf check failed.')



@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json() or {}
        message = (data.get('message') or '').strip()
        messages = data.get('messages', [])
        selected_region = (data.get('selectedRegion') or '').strip()
        selected_crop = (data.get('selectedCrop') or '').strip()
        language = (data.get('language') or 'sw').strip().lower()
        message_language = (data.get('messageLanguage') or '').strip().lower()
        ui_language = get_preferred_language(language)
        latest_message_language = get_preferred_language(message_language or language)

        context_parts = []
        if selected_region:
            context_parts.append(f"Selected region: {selected_region}.")
        if selected_crop:
            context_parts.append(f"Detected crop: {selected_crop}.")

        context_prompt = (
            AGRI_CHAT_SYSTEM_PROMPT
            + f"\n- Interface language selected in the app: {ui_language}."
            + f"\n- Reply language for this turn: {latest_message_language}."
            + "\n- Prioritize the language of the user's latest message over the interface language."
        )
        if context_parts:
            context_prompt += "\n\nCurrent user context:\n" + "\n".join(context_parts)

        api_messages = [{ 'role': 'system', 'content': context_prompt }]
        for m in messages:
            text = (m.get('text') or '').strip()
            if not text:
                continue
            role = 'assistant' if m.get('role') == 'ai' else 'user'
            api_messages.append({ 'role': role, 'content': text })

        if message:
            api_messages.append({ 'role': 'user', 'content': message })

        if not message and len(api_messages) == 1:
            api_messages.append({
                'role': 'user',
                'content': 'Introduce yourself briefly and explain how you can help with agriculture and how to use this system.'
            })

        try:
            reply = call_openai_chat(api_messages, temperature=0.4, max_tokens=500)
        except Exception as ai_err:
            print('Falling back to local chat guidance:', ai_err)
            reply = build_chat_fallback_reply(message, selected_region, selected_crop, latest_message_language)
        return jsonify({ 'reply': reply })

    except Exception as e:
        print('Error in /api/chat', e)
        return jsonify({ 'error': 'Server error', 'details': str(e) }), 500


@app.route('/api/detection-advice', methods=['POST'])
def detection_advice():
    try:
        data = request.get_json() or {}
        predicted_class = (data.get('predictedClass') or '').strip()
        region = (data.get('region') or '').strip()
        crop = (data.get('crop') or '').strip()
        weather_context = (data.get('weatherContext') or '').strip()
        language = (data.get('language') or 'sw').strip().lower()
        preferred_language = get_preferred_language(language)
        confidence = data.get('confidence')

        if not predicted_class:
            return jsonify({ 'error': 'predictedClass is required.' }), 400

        disease_name = format_disease_name(predicted_class)
        crop_name = crop or format_crop_name(predicted_class.split('___', 1)[0])

        prompt = f"""
You are an agricultural results explainer for CROPIX.
Reply only in valid JSON with these exact keys:
- localized_name
- summary
- cause
- home_remedies
- store_options
- prevention

Rules:
- Write in {preferred_language}.
- Translate the disease/result into the requested language.
- The summary must be short, clear, and easy for a farmer to understand.
- The summary should explain what the disease looks like or how it affects the plant.
- The cause should explain what usually causes the disease in simple farmer-friendly language.
- home_remedies must be a JSON array of 3 to 5 simple local or home remedies a farmer can try safely.
- store_options must be a JSON array of 2 to 4 practical products or treatment types they may buy if needed.
- prevention must be a JSON array of 3 to 5 prevention steps tailored to the crop, region, and weather context.
- Avoid telling the user they must find an expert unless it is absolutely necessary.
- Use simple words and useful steps.
- Do not include markdown, code fences, or extra keys.

Context:
- Crop: {crop_name or 'Unknown crop'}
- Region: {region or 'Unknown region'}
- Weather context: {weather_context or 'Typical local weather conditions'}
- Predicted disease class: {predicted_class}
- Disease name: {disease_name}
- Confidence: {confidence if confidence is not None else 'Unknown'}%
""".strip()

        fallback_payload = build_detection_advice_fallback(
            predicted_class,
            crop_name=crop_name,
            region=region,
            weather_context=weather_context,
            confidence=confidence,
            preferred_language=preferred_language
        )

        if not ENABLE_AI_ADVICE:
            return jsonify(fallback_payload)

        try:
            raw_reply = call_openai_chat([
                {
                    'role': 'system',
                    'content': 'You convert crop disease prediction results into farmer-friendly guidance.'
                },
                {
                    'role': 'user',
                    'content': prompt
                }
            ], temperature=0.3, max_tokens=450)
            parsed = extract_json_object(raw_reply)
        except Exception as ai_err:
            print('Falling back to local detection advice:', ai_err)
            parsed = {}

        if not parsed:
            parsed = fallback_payload

        return jsonify({
            'localized_name': parsed.get('localized_name') or fallback_payload['localized_name'],
            'summary': parsed.get('summary') or fallback_payload['summary'],
            'cause': parsed.get('cause') or fallback_payload['cause'],
            'home_remedies': parsed.get('home_remedies') or fallback_payload['home_remedies'],
            'store_options': parsed.get('store_options') or fallback_payload['store_options'],
            'prevention': parsed.get('prevention') or fallback_payload['prevention']
        })

    except Exception as e:
        print('Error in /api/detection-advice', e)
        return jsonify({ 'error': 'Server error', 'details': str(e) }), 500


@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        if tf is None:
            return jsonify({
                'error': 'Model not loaded: TensorFlow is unavailable for this Python runtime.',
                'details': str(TF_IMPORT_ERROR),
                'hint': 'Use Python 3.10-3.13, recreate venv, then install requirements.txt'
            }), 503
        return jsonify({'error': 'Model not loaded on server'}), 500

    if 'image' not in request.files:
        return jsonify({'error': 'No image file part in request'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        # Load and display original image
        original_image = Image.open(file).convert('RGB')
        target_size = (224, 224)
        original_image_resized = original_image.resize(target_size)
        file.stream.seek(0)
        
        img = preprocess_image(file, target_size=target_size)
        preds = model.predict(img, verbose=0)
        preds = np.asarray(preds)
        
        print(f'Raw predictions shape: {preds.shape}')
        print(f'Raw predictions dtype: {preds.dtype}')
        print(f'Raw predictions min/max: {preds.min():.6f} / {preds.max():.6f}')

        # Flatten if needed
        if preds.ndim > 1:
            if preds.shape[0] == 1:
                preds = preds[0]
            else:
                preds = preds[0] if preds.shape[0] > 0 else preds

        if preds.ndim > 1:
            preds = preds.flatten()
        
        print(f'Flattened predictions shape: {preds.shape}')

        # Always apply softmax for multi-class
        if preds.shape[0] > 1:
            exp_preds = np.exp(preds - np.max(preds))
            probs = exp_preds / np.sum(exp_preds)
            print(f'After softmax - min: {probs.min():.6f}, max: {probs.max():.6f}, sum: {probs.sum():.6f}')
        else:
            probs = 1.0 / (1.0 + np.exp(-preds))
        
        idx = int(np.argmax(probs))
        confidence = float(probs[idx])
        all_top = np.argsort(-probs)[:3]
        scoped_top = [(int(i), float(probs[i])) for i in all_top]
        
        print(f'Predicted index: {idx}, confidence: {confidence:.6f}')
        print(f'Labels available: {len(labels) if labels else 0}')
        print(f'Probs shape: {probs.shape}')

        predicted_label = labels[idx] if labels and idx < len(labels) else f'class_{idx}'
        detected_crop, _ = split_prediction_label(predicted_label)

        if labels and idx < len(labels):
            predicted_class = format_disease_name(predicted_label)
        else:
            predicted_class = f'class_{idx}'

        # 🎯 Generate Grad-CAM heatmap
        print(f'Generating Grad-CAM for disease localization...')
        heatmap = generate_grad_cam(model, img, idx)
        
        # 🎨 Create annotated image with heatmap overlay and circle
        annotated_image = None
        annotated_image_base64 = None
        
        if heatmap is not None:
            annotated_image = create_annotated_image(original_image_resized, heatmap, output_size=target_size)
            if annotated_image is not None:
                annotated_image_base64 = image_to_base64(annotated_image)
                print(f'✅ Annotated image created with disease localization circle')
        
        # Get top 3 disease predictions for debugging
        top_3 = []
        for i, (idx_val, scoped_conf) in enumerate(scoped_top):
            if labels and idx_val < len(labels):
                top_label = labels[int(idx_val)]
                top_crop, _ = split_prediction_label(top_label)
                top_3.append({
                    'rank': i + 1,
                    'class': format_disease_name(top_label),
                    'predicted_label': top_label,
                    'detected_crop': top_crop,
                    'detected_crop_label': format_crop_name(top_crop),
                    'index': int(idx_val),
                    'confidence': float(scoped_conf)
                })
            else:
                top_3.append({
                    'rank': i + 1,
                    'class': f'class_{int(idx_val)}',
                    'index': int(idx_val),
                    'confidence': float(scoped_conf)
                })

        # Get top 3 unique crop predictions so the user can choose the correct plant.
        # Crop confidence is the combined probability of all disease classes for that crop.
        top_3_crops = []
        if labels:
            crop_scores = {}
            for idx_int, label in enumerate(labels):
                if idx_int >= len(probs):
                    continue
                crop_key, _ = split_prediction_label(label)
                if not crop_key:
                    continue
                score = float(probs[idx_int])
                crop_entry = crop_scores.setdefault(crop_key, {
                    'score': 0.0,
                    'best_index': idx_int,
                    'best_score': score
                })
                crop_entry['score'] += score
                if score > crop_entry['best_score']:
                    crop_entry['best_index'] = idx_int
                    crop_entry['best_score'] = score

            sorted_crops = sorted(crop_scores.items(), key=lambda item: item[1]['score'], reverse=True)[:3]
            for crop_key, crop_entry in sorted_crops:
                idx_int = int(crop_entry['best_index'])
                top_3_crops.append({
                    'rank': len(top_3_crops) + 1,
                    'class': format_disease_name(labels[idx_int]),
                    'predicted_label': labels[idx_int],
                    'detected_crop': crop_key,
                    'detected_crop_label': format_crop_name(crop_key),
                    'index': idx_int,
                    'confidence': float(crop_entry['score']),
                    'disease_confidence': float(crop_entry['best_score'])
                })

        if ENABLE_LEAF_API_CHECK and not top_3_crops:
            try:
                leaf_check = call_openai_leaf_check(original_image)
                if leaf_check.get('is_leaf') is False:
                    return jsonify({
                        'is_leaf_like': False,
                        'message': 'This image does not look like a crop leaf. Please upload a clear leaf photo.'
                    }), 200
            except Exception as leaf_err:
                print('OpenAI leaf check unavailable; continuing with local prediction:', leaf_err)

        response = {
            'predicted_class': predicted_class,
            'predicted_label': predicted_label,
            'predicted_index': idx,
            'confidence': confidence,
            'top_3': top_3,
            'top_3_crops': top_3_crops,
            'detected_crop': detected_crop,
            'detected_crop_label': format_crop_name(detected_crop),
            'is_leaf_like': True
        }
        
        # Add annotated image if available
        if annotated_image_base64:
            response['annotated_image'] = f'data:image/png;base64,{annotated_image_base64}'
            response['has_localization'] = True
        else:
            response['has_localization'] = False
        
        return jsonify(response)

    except Exception as e:
        import traceback
        print('Error during prediction:', e)
        print(traceback.format_exc())
        return jsonify({'error': 'Prediction error', 'details': str(e)}), 500


@app.route('/api/send-contact', methods=['POST'])
def send_contact():
    """Send contact form email"""
    try:
        data = request.get_json() or {}
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        message = data.get('message', '').strip()

        # Validate inputs
        if not name or not email or not message:
            return jsonify({'error': 'Missing required fields'}), 400

        # Basic email validation
        if '@' not in email:
            return jsonify({'error': 'Invalid email address'}), 400

        if not EMAIL_PASSWORD:
            print('Warning: EMAIL_PASSWORD not configured in .env')
            return jsonify({'error': 'Email service not configured on server'}), 500

        # Compose email
        subject = f"New Contact Form Message from {name}"
        
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2>New Contact Form Submission</h2>
                <p><strong>From:</strong> {name}</p>
                <p><strong>Email:</strong> {email}</p>
                <hr>
                <h3>Message:</h3>
                <p>{message.replace(chr(10), '<br>')}</p>
                <hr>
                <p><em>Reply to: {email}</em></p>
            </body>
        </html>
        """

        # Create email message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = EMAIL_ADDRESS
        recipient = CONTACT_RECEIVER or EMAIL_ADDRESS
        msg['To'] = recipient
        msg['Reply-To'] = email

        msg.attach(MIMEText(html_body, 'html'))

        # Send email
        try:
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.sendmail(EMAIL_ADDRESS, [recipient], msg.as_string())
            server.quit()
            
            print(f'Contact email sent from {email} to {recipient}')
            return jsonify({
                'success': True,
                'message': 'Message sent successfully!'
            }), 200

        except smtplib.SMTPAuthenticationError:
            print(f'SMTP Authentication Error: Invalid email credentials')
            return jsonify({'error': 'Email authentication failed'}), 500
        except smtplib.SMTPException as e:
            print(f'SMTP Error: {e}')
            return jsonify({'error': f'Email sending failed: {str(e)}'}), 500

    except Exception as e:
        import traceback
        print(f'Error in /api/send-contact: {e}')
        print(traceback.format_exc())
        return jsonify({'error': 'Server error', 'details': str(e)}), 500


if __name__ == '__main__':
    load_model_and_labels()
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
