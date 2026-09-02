const API_BASE_URL = (() => {
    const configuredBase = window.CROPIX_API_BASE_URL || '';
    if (configuredBase) return configuredBase.replace(/\/+$/, '');
    if (window.location.protocol === 'file:') return 'http://localhost:5000';
    return '';
})();

function apiUrl(path) {
    return `${API_BASE_URL}${path}`;
}

async function parseApiResponse(resp, defaultMessage) {
    const text = await resp.text();
    let payload = null;

    try {
        payload = text ? JSON.parse(text) : null;
    } catch (_) {
        payload = null;
    }

    if (!resp.ok) {
        const details = payload?.details || payload?.error || text || defaultMessage;
        throw new Error(`HTTP ${resp.status}: ${details}`);
    }

    return payload ?? {};
}

// Map model predictions to disease advisory
const diseaseAdvisory = {
    'Apple___Apple_scab': {
        name: 'Apple Scab',
        description: 'Apple scab is a fungal disease causing dark lesions on leaves, fruit, and twigs, reducing fruit quality and marketability.',
        treatment: [
            'Apply sulfur or copper fungicides at budbreak and throughout the season',
            'Remove and dispose of infected leaves and fruit',
            'Ensure good air circulation with proper pruning',
            'Avoid overhead irrigation to reduce leaf wetness',
            'Use resistant apple varieties when possible'
        ]
    },
    'Apple___Black_rot': {
        name: 'Apple Black Rot',
        description: 'Black rot causes large dark sunken lesions on fruit and cankers on branches, leading to fruit decay and branch dieback.',
        treatment: [
            'Prune out infected branches and cankers',
            'Apply fungicides during growing season',
            'Remove infected fruit from trees',
            'Maintain tree vigor with proper care',
            'Practice proper sanitation of pruning tools'
        ]
    },
    'Apple___Cedar_apple_rust': {
        name: 'Cedar Apple Rust',
        description: 'This fungal disease causes yellow spots with dark borders on leaves and orange gelatinous structures on fruit.',
        treatment: [
            'Remove nearby cedar/juniper trees if possible',
            'Apply fungicides starting in spring',
            'Remove infected leaves promptly',
            'Improve air circulation with pruning',
            'Choose resistant apple varieties'
        ]
    },
    'Apple___healthy': {
        name: 'Apple - Healthy',
        description: 'Your apple plant appears to be healthy with no visible signs of disease.',
        treatment: [
            'Continue regular monitoring and maintenance',
            'Apply preventive fungicide if disease history exists',
            'Maintain proper pruning and air circulation',
            'Water consistently and deeply',
            'Apply balanced fertilizer as needed'
        ]
    },
    'Blueberry___healthy': {
        name: 'Blueberry - Healthy',
        description: 'Your blueberry plant appears to be healthy with no visible signs of disease.',
        treatment: [
            'Continue regular watering during growing season',
            'Harvest berries when fully ripe',
            'Prune dead or crossing branches',
            'Monitor for pest activity',
            'Apply mulch to retain soil moisture'
        ]
    },
    'Cherry_(including_sour)___healthy': {
        name: 'Cherry - Healthy',
        description: 'Your cherry tree appears to be healthy with no visible signs of disease.',
        treatment: [
            'Maintain regular watering schedule',
            'Thin fruit for better development',
            'Prune after harvest',
            'Monitor for pest activity',
            'Apply preventive care measures'
        ]
    },
    'Cherry_(including_sour)___Powdery_mildew': {
        name: 'Cherry Powdery Mildew',
        description: 'Powdery mildew appears as white coating on leaves and fruit, affecting photosynthesis and fruit quality.',
        treatment: [
            'Apply sulfur dust or neem oil spray',
            'Improve air circulation with pruning',
            'Avoid overhead watering',
            'Remove severely affected leaves',
            'Apply sulfur-based fungicides regularly'
        ]
    },
    'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot': {
        name: 'Corn Leaf Spot',
        description: 'Leaf spot disease causes rectangular gray lesions with brown borders on corn leaves, reducing photosynthesis.',
        treatment: [
            'Plant resistant corn hybrids',
            'Remove infected plant residue after harvest',
            'Apply fungicides if needed',
            'Practice crop rotation',
            'Avoid overhead irrigation'
        ]
    },
    'Corn_(maize)___Common_rust_': {
        name: 'Corn Common Rust',
        description: 'Common rust causes reddish-brown pustules on both leaf surfaces, weakening the plant.',
        treatment: [
            'Plant resistant corn hybrids',
            'Apply fungicides if rust appears early',
            'Remove infected plant material',
            'Ensure good spacing for air circulation',
            'Practice crop rotation'
        ]
    },
    'Corn_(maize)___healthy': {
        name: 'Corn - Healthy',
        description: 'Your corn plant appears to be healthy with no visible signs of disease.',
        treatment: [
            'Continue proper irrigation schedule',
            'Monitor for pest activity',
            'Apply fertilizer as needed at growth stages',
            'Ensure adequate spacing between plants',
            'Watch for early disease signs'
        ]
    },
    'Corn_(maize)___Northern_Leaf_Blight': {
        name: 'Corn Northern Leaf Blight',
        description: 'Northern leaf blight causes long, elliptical tan lesions with darker borders on corn leaves.',
        treatment: [
            'Choose resistant corn hybrids',
            'Plant resistant varieties',
            'Apply fungicides early if needed',
            'Remove infected plant residue',
            'Practice crop rotation'
        ]
    },
    'Grape___Black_rot': {
        name: 'Grape Black Rot',
        description: 'Black rot causes circular black lesions on fruit and leaves, resulting in complete fruit loss if untreated.',
        treatment: [
            'Apply fungicides at bud break and throughout season',
            'Remove infected fruit immediately',
            'Prune for better air circulation',
            'Remove overwintering mummies',
            'Practice proper canopy management'
        ]
    },
    'Grape___Esca_(Black_Measles)': {
        name: 'Grape Esca (Black Measles)',
        description: 'Esca causes browning of fruit and leaves with characteristic black spots, potentially killing the vine.',
        treatment: [
            'Prune infected wood and seal cuts',
            'Apply protective paint after pruning',
            'Remove severely affected vines',
            'No fungicide fully effective once infected',
            'Practice preventive pruning and sanitation'
        ]
    },
    'Grape___healthy': {
        name: 'Grape - Healthy',
        description: 'Your grape vine appears to be healthy with no visible signs of disease.',
        treatment: [
            'Continue regular monitoring and maintenance',
            'Prune for canopy management',
            'Apply preventive fungicide if needed',
            'Ensure proper irrigation',
            'Monitor for pests regularly'
        ]
    },
    'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)': {
        name: 'Grape Leaf Blight',
        description: 'Leaf blight causes brown spots with yellow halos on grape leaves, causing premature defoliation.',
        treatment: [
            'Apply copper-based fungicides',
            'Remove infected leaves',
            'Improve air circulation in canopy',
            'Avoid overhead watering',
            'Practice good sanitation'
        ]
    },
    'Orange___Haunglongbing_(Citrus_greening)': {
        name: 'Orange Citrus Greening',
        description: 'Citrus greening causes blotchy mottling of fruit, bitter taste, and eventual tree decline.',
        treatment: [
            'Control Asian citrus psyllid vectors',
            'No cure available - prevention is key',
            'Remove infected trees if necessary',
            'Monitor for early symptoms',
            'Use disease-free nursery stock'
        ]
    },
    'Peach___Bacterial_spot': {
        name: 'Peach Bacterial Spot',
        description: 'Bacterial spot causes dark circular lesions on fruit and leaves with yellow halos.',
        treatment: [
            'Apply copper bactericide sprays',
            'Prune out infected branches',
            'Remove fallen infected leaves',
            'Improve air circulation',
            'Use resistant peach varieties'
        ]
    },
    'early_blight': {
        name: 'Early Blight',
        confidence: 87,
        description: 'Early blight is a fungal disease that affects tomato and potato plants, causing brown spots with concentric rings on leaves.',
        treatment: [
            'Remove infected leaves immediately',
            'Apply copper-based fungicide every 7-10 days',
            'Improve air circulation by pruning lower branches',
            'Water at the base of the plant to keep leaves dry',
            'Plant resistant varieties when possible'
        ]
    },
    'late_blight': {
        name: 'Late Blight',
        confidence: 92,
        description: 'Late blight is a serious fungal disease affecting tomatoes and potatoes, causing water-soaked spots and white mold on leaf undersides.',
        treatment: [
            'Apply metalaxyl or chlorothalonil fungicides',
            'Remove all affected plant parts',
            'Increase spacing between plants for better air circulation',
            'Avoid overhead watering',
            'Monitor weather conditions closely during wet seasons'
        ]
    },
    'leaf_spot': {
        name: 'Leaf Spot',
        confidence: 85,
        description: 'Leaf spot disease causes circular or angular spots on leaves, often with yellow halos, affecting various crops.',
        treatment: [
            'Remove and burn infected leaves',
            'Apply sulfur or copper fungicides',
            'Reduce leaf wetness duration through proper irrigation',
            'Ensure good air circulation',
            'Crop rotation for at least 2-3 years'
        ]
    },
    'powdery_mildew': {
        name: 'Powdery Mildew',
        confidence: 88,
        description: 'Powdery mildew appears as white, powdery coating on leaves and stems, reducing photosynthesis and plant vigor.',
        treatment: [
            'Apply sulfur dust or spray at first sign',
            'Improve air circulation between plants',
            'Avoid excessive nitrogen fertilization',
            'Water early in the morning',
            'Remove severely infected leaves'
        ]
    },
    'rust': {
        name: 'Rust Disease',
        confidence: 83,
        description: 'Rust appears as reddish-brown pustules on leaf undersides, affecting many crop species.',
        treatment: [
            'Apply rust-specific fungicides early',
            'Remove and destroy infected leaves',
            'Avoid overhead watering',
            'Improve plant spacing and air flow',
            'Practice crop rotation'
        ]
    },
    'healthy': {
        name: 'Healthy Plant',
        confidence: 95,
        description: 'The crop appears to be healthy with no visible signs of disease.',
        treatment: [
            'Continue regular monitoring and maintenance',
            'Follow proper irrigation schedule',
            'Apply balanced fertilizer as needed',
            'Implement preventive pest control measures',
            'Record weekly observations'
        ]
    }
};

const demoDiseaseClasses = [
    'Apple___healthy',
    'Tomato___Bacterial_spot',
    'Corn_(maize)___healthy',
    'Grape___Black_rot',
    'Potato___Late_blight'
];

const regionWeatherContext = {
    'Arusha': 'warm days with occasional afternoon thunderstorms and cooler mornings',
    'Dar es Salaam': 'humid coastal heat with high humidity and occasional sea breeze',
    'Dodoma': 'dry and hot with occasional dust and strong sun',
    'Mbeya': 'cooler highland weather with afternoon rains',
    'Morogoro': 'tropical with afternoon showers and high humidity',
    'Mwanza': 'lakeside humid conditions with frequent clouds',
    'Kilimanjaro': 'cool mountain air with mist and afternoon rains',
    'Tanga': 'coastal humidity and sea breeze with warm temperatures',
    'Singida': 'dry and sunny weather with occasional wind',
    'Tabora': 'hot and dry with dusty afternoons',
    'Zanzibar': 'warm coastal humidity, sea breeze, and occasional thunderstorms'
};

const LANGUAGE_STORAGE_KEY = 'cropix_ui_language';
const translations = {
    en: {
        appTitle: 'AI - Crop Disease Detection & Advisory',
        navHome: 'Home',
        navFeatures: 'Features',
        navDetection: 'Detection',
        navAdvisory: 'Advisory',
        navContact: 'Contact',
        languageLabel: 'Language',
        newChatBtn: '+ New Chat',
        chatCurrentLabel: 'Conversation',
        sidebarToggle: 'Chats',
        heroTitle: 'AI-Based Crop Disease Detection and Advisory',
        heroSubtitle: 'Identify crop diseases early and get instant agricultural advice to protect your harvest',
        heroStartBtn: 'Start Detection',
        heroAdvisoryBtn: 'Get Advisory',
        featuresTitle: 'Why Choose CROPIX?',
        featureRecognitionTitle: 'Image Recognition',
        featureRecognitionDesc: 'Upload crop leaf images for instant AI-powered disease identification with high accuracy',
        featureAdviceTitle: 'Smart Advice',
        featureAdviceDesc: 'Receive personalized treatment recommendations based on disease diagnosis',
        featureMobileTitle: 'Mobile Friendly',
        featureMobileDesc: 'Access CROPIX anywhere, anytime from your phone or tablet',
        featureAnalyticsTitle: 'Farm Analytics',
        featureAnalyticsDesc: 'Track crop health and disease patterns with detailed analytics',
        featureSupportTitle: 'Farmer Support',
        featureSupportDesc: 'Get practical guidance that farmers can follow on their own',
        featureSecurityTitle: 'Data Security',
        featureSecurityDesc: 'Your farm data is encrypted and securely stored',
        chatTitle: 'AI Chat Assistant',
        chatIntro: 'Ask about farming, crop diseases, or how to use this system. I am here to help.',
        chatTyping: 'AI is typing',
        chatInputPlaceholder: 'Ask about farming or how to use the system...',
        chatSend: 'Send',
        detectionTitle: 'Crop Disease Detection',
        detectionSubtitle: 'Upload an image of your crop leaf to diagnose diseases',
        regionLabel: 'Select Your Region (Tanzania) Before Detection',
        regionPlaceholder: '-- Select Region --',
        cropLabel: 'Detected Crop',
        cropPlaceholder: 'Detected automatically by the system',
        uploadFileBtn: 'Upload File',
        useCameraBtn: 'Use Webcam',
        uploadBoxTitle: 'Upload Crop Leaf Image',
        uploadBoxDesc: 'Drag and drop or click to select',
        cameraPlaceholderDefault: 'Click Start Camera to capture a crop leaf photo.',
        cameraHelp: 'Use webcam if you want to take a fresh picture instead of selecting a file.',
        startCameraBtn: 'Start Camera',
        captureBtn: 'Capture Photo',
        retakeBtn: 'Retake',
        detectionStartBtn: 'Start Detection',
        resultTitle: 'Detection Result',
        placeholderReady: 'Detection results will appear here after analysis.',
        placeholderProcessing: 'Analyzing image... Please wait.',
        advisoryTitle: 'Agricultural Advisory',
        advisorySubtitle: 'Get practical recommendations for crop care and disease management',
        advisoryApiTitle: 'API Advisory Output',
        advisoryApiHint: 'After detection, advisory generated by the API for the detected crop and selected region will appear here.',
        advisoryApiWaiting: 'Waiting for API advisory after detection.',
        advisoryApiError: 'Advice is temporarily unavailable right now. Please try again shortly.',
        irrigationTitle: 'Irrigation Guide',
        irrigationDesc: '<strong>Optimal watering schedule:</strong> 2-3 times per week during dry season. Ensure proper drainage to prevent root rot.',
        pestTitle: 'Pest Control',
        pestDesc: '<strong>Natural solutions:</strong> Use neem oil spray and companion planting. Avoid unnecessary chemical pesticides.',
        soilTitle: 'Soil Health',
        soilDesc: '<strong>Maintain soil quality:</strong> Add organic compost, rotate crops annually, and test soil pH regularly.',
        climateTitle: 'Climate Care',
        climateDesc: '<strong>Weather adaptation:</strong> Monitor local forecasts and adjust farming practices accordingly.',
        learnMore: 'Learn More',
        contactTitle: 'Get In Touch',
        contactSubtitle: 'Do you have any advice for our system? We are here to listen and improve it.',
        contactPhoneLabel: 'Phone',
        contactEmailLabel: 'Email',
        contactLocationLabel: 'Location',
        contactNamePlaceholder: 'Your Name',
        contactEmailPlaceholder: 'Your Email',
        contactMessagePlaceholder: 'Your Message',
        contactSendBtn: 'Send Message',
        contactSending: 'Sending...',
        footerText: '&copy; 2026 CROPIX. All rights reserved. | Empowering Farmers with AI Technology',
        notSelected: 'Not selected',
        resultMetaRegion: 'Region',
        resultMetaCrop: 'Detected Crop',
        resultMetaDisease: 'Disease',
        confidence: 'Confidence',
        top3Title: 'Top 3 Predictions',
        cropChoiceTitle: 'Choose the Correct Plant',
        cropChoiceHint: 'The system found these possible crops. Select the plant that matches your image to get advice.',
        cropChoiceButton: 'Use this plant',
        cropChoicePending: 'Choose one prediction below',
        noAlternative: 'No alternative predictions available.',
        summaryTitle: 'Result Summary',
        summaryLoading: 'Preparing explanation in your selected language...',
        advisoryLoading: 'Preparing farmer-friendly advice for your selected region...',
        annotatedTitle: 'Disease Localization (Affected Area Highlighted)',
        annotatedCaption: '<strong>Green circle</strong> shows the affected area | <strong>Heat map overlay</strong> shows disease region',
        qualityGood: 'Image ready.',
        qualityWarningPrefix: 'Image quality warning',
        qualityErrorPrefix: 'Image quality is too low for reliable detection',
        qualityReasonSmall: 'image is too small',
        qualityReasonDark: 'image is too dark',
        qualityReasonBright: 'image is too bright',
        qualityReasonLowContrast: 'image has very low contrast',
        qualityReasonBlurry: 'image is too blurry',
        qualityTryAgain: 'Please upload or capture another clearer image.',
        selectCropBeforeUpload: 'Please upload a crop leaf image. The system will detect the crop automatically.',
        selectImageFile: 'Please select an image file.',
        selectCropBeforeCamera: 'Please take a crop leaf photo. The system will detect the crop automatically.',
        browserNoCamera: 'Your browser does not support webcam access.',
        cameraAccessFailed: 'Failed to access webcam. Please allow camera permission and try again.',
        startCameraFirst: 'Start the camera first, then capture the image.',
        captureFailed: 'Failed to capture image from camera. Please try again.',
        selectRegionBeforeDetection: 'Please select your region in Tanzania before detection.',
        selectCropBeforeDetection: 'The crop name will be detected automatically from the image.',
        uploadBeforeDetection: 'Please upload or capture an image before starting detection.',
        reselectImage: 'Please select or capture the image again for accurate detection.',
        predictionApiError: 'Unable to complete detection right now.',
        predictionFailed: 'We could not process this request at the moment. Please try again shortly.',
        invalidLeafImage: 'This image does not look like a crop leaf. Please upload a clear leaf photo.',
        noAdvisoryResponse: 'Advice is being prepared. Please try again in a moment.',
        advisoryFallbackSuffix: '(a temporary advisory has been provided)',
        resultFallbackSummary: 'The model detected this condition, but detailed translated guidance is currently unavailable.',
        contactSuccess: 'Thank you, {name}! Your message has been sent successfully.\nWe will get back to you at {email} soon.',
        contactError: 'Error: {message}',
        contactFailedGeneric: 'Failed to send message',
        contactSendFailed: 'Error sending message. Please try again later.',
        chatApiOffline: 'Sorry, chat is temporarily unavailable right now. Please try again shortly.',
        qualityStatusTitle: 'Image status',
        localizedDiseaseLoading: 'Translating result...',
        translationUnknownDisease: 'Unknown disease'
    },
    sw: {
        appTitle: 'AI - Utambuzi wa Magonjwa ya Mazao na Ushauri',
        navHome: 'Nyumbani',
        navFeatures: 'Vipengele',
        navDetection: 'Utambuzi',
        navAdvisory: 'Ushauri',
        navContact: 'Mawasiliano',
        languageLabel: 'Lugha',
        newChatBtn: '+ Chat Mpya',
        chatCurrentLabel: 'Mazungumzo',
        sidebarToggle: 'Chat',
        heroTitle: 'Utambuzi wa Magonjwa ya Mazao kwa AI na Ushauri wa Kilimo',
        heroSubtitle: 'Tambua magonjwa ya mazao mapema na upate ushauri wa kilimo wa haraka kulinda mavuno yako',
        heroStartBtn: 'Anza Utambuzi',
        heroAdvisoryBtn: 'Pata Ushauri',
        featuresTitle: 'Kwa Nini Utumie CROPIX?',
        featureRecognitionTitle: 'Utambuzi wa Picha',
        featureRecognitionDesc: 'Pakia picha ya jani la zao lako kupata utambuzi wa ugonjwa kwa AI kwa haraka',
        featureAdviceTitle: 'Ushauri Bora',
        featureAdviceDesc: 'Pata mapendekezo ya matibabu na hatua za kuchukua kulingana na ugonjwa uliogunduliwa',
        featureMobileTitle: 'Inatumika Kwenye Simu',
        featureMobileDesc: 'Tumia CROPIX mahali popote kupitia simu au tablet yako',
        featureAnalyticsTitle: 'Taarifa za Shamba',
        featureAnalyticsDesc: 'Fuatilia hali ya mazao na mwelekeo wa magonjwa kwa takwimu muhimu',
        featureSupportTitle: 'Msaada kwa Mkulima',
        featureSupportDesc: 'Pata maelekezo ya vitendo ambayo mkulima anaweza kufuata mwenyewe',
        featureSecurityTitle: 'Usalama wa Data',
        featureSecurityDesc: 'Taarifa zako za shamba zinalindwa na kuhifadhiwa kwa usalama',
        chatTitle: 'Msaidizi wa AI',
        chatIntro: 'Uliza kuhusu kilimo, magonjwa ya mazao, au namna ya kutumia mfumo huu. Nitakusaidia.',
        chatTyping: 'AI inaandika',
        chatInputPlaceholder: 'Uliza kuhusu kilimo au jinsi ya kutumia mfumo...',
        chatSend: 'Tuma',
        detectionTitle: 'Utambuzi wa Magonjwa ya Mazao',
        detectionSubtitle: 'Pakia picha ya jani la zao lako ili kutambua magonjwa',
        regionLabel: 'Chagua Mkoa Wako (Tanzania) Kabla ya Utambuzi',
        regionPlaceholder: '-- Chagua Mkoa --',
        cropLabel: 'Mmea Uliotambuliwa',
        cropPlaceholder: 'System itatambua mmea yenyewe',
        uploadFileBtn: 'Pakia Picha',
        useCameraBtn: 'Tumia Kamera',
        uploadBoxTitle: 'Pakia Picha ya Jani la Zao',
        uploadBoxDesc: 'Buruta picha au bofya kuchagua',
        cameraPlaceholderDefault: 'Bonyeza Anza Kamera kupiga picha ya jani la zao.',
        cameraHelp: 'Tumia webcam kama unataka kupiga picha mpya badala ya kuchagua file.',
        startCameraBtn: 'Anza Kamera',
        captureBtn: 'Piga Picha',
        retakeBtn: 'Rudia',
        detectionStartBtn: 'Anza Utambuzi',
        resultTitle: 'Matokeo ya Utambuzi',
        placeholderReady: 'Matokeo ya utambuzi yataonekana hapa baada ya uchambuzi.',
        placeholderProcessing: 'Inachambua picha... Tafadhali subiri.',
        advisoryTitle: 'Ushauri wa Kilimo',
        advisorySubtitle: 'Pata ushauri wa vitendo wa kutunza zao na kudhibiti ugonjwa',
        advisoryApiTitle: 'Ushauri Kutoka API',
        advisoryApiHint: 'Baada ya detection, ushauri unaotolewa na API kulingana na mmea uliotambuliwa na mkoa uliouchagua utaonekana hapa.',
        advisoryApiWaiting: 'Inasubiri ushauri kutoka API baada ya detection.',
        advisoryApiError: 'Ushauri haupatikani kwa muda huu. Tafadhali jaribu tena baada ya muda mfupi.',
        irrigationTitle: 'Mwongozo wa Umwagiliaji',
        irrigationDesc: '<strong>Ratiba bora ya kumwagilia:</strong> mara 2-3 kwa wiki wakati wa kiangazi. Hakikisha maji yanatoka vizuri ili kuepuka kuoza kwa mizizi.',
        pestTitle: 'Udhibiti wa Wadudu',
        pestDesc: '<strong>Suluhisho za asili:</strong> tumia neem oil na mimea shirikishi. Epuka matumizi yasiyo ya lazima ya kemikali.',
        soilTitle: 'Afya ya Udongo',
        soilDesc: '<strong>Dumisha ubora wa udongo:</strong> ongeza mboji, badilisha mazao kila mwaka, na pima pH ya udongo mara kwa mara.',
        climateTitle: 'Mazingira na Hali ya Hewa',
        climateDesc: '<strong>Kujipanga na hali ya hewa:</strong> fuatilia utabiri wa hali ya hewa na badili mbinu za kilimo inapohitajika.',
        learnMore: 'Soma Zaidi',
        contactTitle: 'Wasiliana Nasi',
        contactSubtitle: 'Una ushauri kwa mfumo wetu? Tuko hapa kusikiliza na kuboresha.',
        contactPhoneLabel: 'Simu',
        contactEmailLabel: 'Barua Pepe',
        contactLocationLabel: 'Mahali',
        contactNamePlaceholder: 'Jina Lako',
        contactEmailPlaceholder: 'Barua Pepe Yako',
        contactMessagePlaceholder: 'Ujumbe Wako',
        contactSendBtn: 'Tuma Ujumbe',
        contactSending: 'Inatuma...',
        footerText: '&copy; 2026 CROPIX. Haki zote zimehifadhiwa. | Kuwawezesha Wakulima kwa Teknolojia ya AI',
        notSelected: 'Haijachaguliwa',
        resultMetaRegion: 'Mkoa',
        resultMetaCrop: 'Mmea Uliotambuliwa',
        resultMetaDisease: 'Ugonjwa',
        confidence: 'Uhakika',
        top3Title: 'Makadirio 3 Bora',
        cropChoiceTitle: 'Chagua Mmea Sahihi',
        cropChoiceHint: 'System imepata mazao haya yanayowezekana. Chagua mmea unaofanana na picha yako ili upate ushauri.',
        cropChoiceButton: 'Tumia mmea huu',
        cropChoicePending: 'Chagua prediction moja hapa chini',
        noAlternative: 'Hakuna makadirio mbadala yaliyopatikana.',
        summaryTitle: 'Maelezo ya Matokeo',
        summaryLoading: 'Matokeo yanatafsiriwa kwa lugha uliyochagua...',
        advisoryLoading: 'Ushauri unaandaliwa kwa lugha yako kulingana na mkoa uliouchagua...',
        annotatedTitle: 'Sehemu Iliyoathirika Imeonyeshwa',
        annotatedCaption: '<strong>Mduara wa kijani</strong> unaonyesha sehemu iliyoathirika | <strong>Ramani ya joto</strong> inaonyesha eneo la ugonjwa',
        qualityGood: 'Picha imepokelewa.',
        qualityWarningPrefix: 'Tahadhari ya ubora wa picha',
        qualityErrorPrefix: 'Ubora wa picha ni mdogo sana kwa utambuzi wa kuaminika',
        qualityReasonSmall: 'picha ni ndogo sana',
        qualityReasonDark: 'picha ni nyeusi sana',
        qualityReasonBright: 'picha ina mwanga mwingi sana',
        qualityReasonLowContrast: 'picha haina utofauti wa kutosha',
        qualityReasonBlurry: 'picha imeblur sana',
        qualityTryAgain: 'Tafadhali pakia au piga picha nyingine iliyo wazi zaidi.',
        selectCropBeforeUpload: 'Tafadhali pakia picha ya jani. System itatambua jina la mmea yenyewe.',
        selectImageFile: 'Tafadhali chagua faili la picha.',
        selectCropBeforeCamera: 'Tafadhali piga picha ya jani. System itatambua jina la mmea yenyewe.',
        browserNoCamera: 'Browser yako haiungi mkono matumizi ya webcam.',
        cameraAccessFailed: 'Imeshindikana kufungua webcam. Ruhusu camera permission kisha jaribu tena.',
        startCameraFirst: 'Anza kamera kwanza, kisha piga picha.',
        captureFailed: 'Imeshindikana kupiga picha kutoka kamera. Tafadhali jaribu tena.',
        selectRegionBeforeDetection: 'Tafadhali chagua mkoa wako Tanzania kabla ya utambuzi.',
        selectCropBeforeDetection: 'Jina la mmea litatambuliwa moja kwa moja kutoka kwenye picha.',
        uploadBeforeDetection: 'Tafadhali pakia au piga picha kabla ya kuanza utambuzi.',
        reselectImage: 'Tafadhali chagua au piga picha tena kwa utambuzi sahihi.',
        predictionApiError: 'Imeshindikana kukamilisha utambuzi kwa sasa.',
        predictionFailed: 'Samahani, hatukuweza kushughulikia ombi lako sasa hivi. Tafadhali jaribu tena baada ya muda mfupi.',
        invalidLeafImage: 'Picha hii haionekani kama jani la mmea. Tafadhali pakia picha iliyo wazi ya jani.',
        noAdvisoryResponse: 'Ushauri unaandaliwa. Tafadhali jaribu tena baada ya muda mfupi.',
        advisoryFallbackSuffix: '(ushauri wa muda umetolewa)',
        resultFallbackSummary: 'Model imegundua hali hii, lakini maelezo ya kina yaliyotafsiriwa hayajapatikana kwa sasa.',
        contactSuccess: 'Asante, {name}! Ujumbe wako umetumwa kwa mafanikio.\nTutakujibu kupitia {email} hivi karibuni.',
        contactError: 'Hitilafu: {message}',
        contactFailedGeneric: 'Imeshindikana kutuma ujumbe',
        contactSendFailed: 'Hitilafu katika kutuma ujumbe. Tafadhali jaribu tena baadaye.',
        chatApiOffline: 'Samahani, huduma ya chat haipatikani kwa muda huu. Tafadhali jaribu tena baada ya muda mfupi.',
        qualityStatusTitle: 'Hali ya picha',
        localizedDiseaseLoading: 'Matokeo yanatafsiriwa...',
        translationUnknownDisease: 'Ugonjwa haujulikani'
    }
};

let currentLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'sw';
let lastDetectionData = null;
let chatLoadingSequence = 0;

function t(key, vars = {}) {
    const langPack = translations[currentLanguage] || translations.en;
    let text = langPack[key] ?? translations.en[key] ?? key;
    Object.entries(vars).forEach(([varKey, value]) => {
        text = text.replace(new RegExp(`\\{${varKey}\\}`, 'g'), value);
    });
    return text;
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setHTML(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = value;
}

function showSystemMessage(message, type = 'info') {
    const text = String(message || '').trim();
    if (!text) return;

    let container = document.getElementById('systemMessageContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'systemMessageContainer';
        container.className = 'system-message-container';
        container.setAttribute('aria-live', 'polite');
        document.body.appendChild(container);
    }

    const notice = document.createElement('div');
    notice.className = `system-message ${type}`;
    notice.innerHTML = `
        <span class="system-message-text">${escapeHtml(text)}</span>
        <button type="button" class="system-message-close" aria-label="Close message">&times;</button>
    `;

    const close = () => {
        notice.classList.add('leaving');
        window.setTimeout(() => notice.remove(), 180);
    };

    notice.querySelector('.system-message-close')?.addEventListener('click', close);
    container.appendChild(notice);
    window.setTimeout(close, type === 'error' ? 5200 : 3600);
}

function formatConversationTitle(text, fallback = t('newChatBtn')) {
    const cleaned = (text || '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return fallback;
    return cleaned.length > 48 ? `${cleaned.slice(0, 48)}...` : cleaned;
}

function formatConversationTime(ts) {
    if (!ts || Number.isNaN(Number(ts))) return '';
    try {
        return new Date(ts).toLocaleString([], {
            hour: '2-digit',
            minute: '2-digit',
            month: 'short',
            day: 'numeric'
        });
    } catch (_) {
        return '';
    }
}

function normalizeAssistantReply(text) {
    const raw = (text || '').trim();
    const technicalSignals = [
        'OPENAI_API_KEY',
        'backend server',
        'Chat API is currently unavailable',
        'chat api haipatikani',
        'configured correctly'
    ];
    if (technicalSignals.some((s) => raw.toLowerCase().includes(s.toLowerCase()))) {
        return t('chatApiOffline');
    }
    return raw || t('chatIntro');
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatChatMessage(text, role = 'ai') {
    const safeText = String(text || '').trim();
    if (!safeText) {
        return `<p>${escapeHtml(role === 'ai' ? t('chatIntro') : '')}</p>`;
    }

    if (role !== 'ai') {
        return `<p>${escapeHtml(safeText).replace(/\n/g, '<br>')}</p>`;
    }

    const normalized = safeText.replace(/\r\n/g, '\n');
    const blocks = normalized.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
    const htmlParts = [];

    blocks.forEach((block) => {
        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
        if (!lines.length) return;

        const numberedLines = lines.filter((line) => /^\d+[\.\)]\s+/.test(line));
        const bulletLines = lines.filter((line) => /^[-*•]\s+/.test(line));

        if (numberedLines.length === lines.length) {
            const items = lines
                .map((line) => line.replace(/^\d+[\.\)]\s+/, '').trim())
                .filter(Boolean)
                .map((line) => `<li>${escapeHtml(line)}</li>`)
                .join('');
            htmlParts.push(`<ol>${items}</ol>`);
            return;
        }

        if (bulletLines.length === lines.length) {
            const items = lines
                .map((line) => line.replace(/^[-*•]\s+/, '').trim())
                .filter(Boolean)
                .map((line) => `<li>${escapeHtml(line)}</li>`)
                .join('');
            htmlParts.push(`<ul>${items}</ul>`);
            return;
        }

        htmlParts.push(`<p>${escapeHtml(lines.join(' '))}</p>`);
    });

    return htmlParts.join('');
}

function sanitizeStoredConversations() {
    let changed = false;
    conversations.forEach((conv) => {
        if (!conv || !Array.isArray(conv.messages)) return;
        conv.messages = conv.messages.map((msg) => {
            if (!msg || typeof msg.text !== 'string') return msg;
            const normalized = msg.role === 'ai' ? normalizeAssistantReply(msg.text) : msg.text;
            if (normalized !== msg.text) changed = true;
            return { ...msg, text: normalized };
        });
    });
    if (changed) saveConversations();
}

function updateCropOptionLabels() {
    const cropSelect = document.getElementById('cropSelect');
    if (!cropSelect) return;

    [...cropSelect.options].forEach((option) => {
        if (!option.value) {
            option.textContent = t('cropPlaceholder');
            return;
        }
        option.textContent = option.dataset[currentLanguage] || option.dataset.en || option.textContent;
    });
}

function getSelectedCropLabel() {
    const selectedOption = document.getElementById('cropSelect')?.selectedOptions?.[0];
    if (!selectedOption || !selectedOption.value) return t('notSelected');
    return selectedOption.dataset[currentLanguage] || selectedOption.dataset.en || selectedOption.textContent;
}

function formatCropName(rawCrop) {
    if (!rawCrop) return '';
    return String(rawCrop)
        .replace(/_/g, ' ')
        .replace(/,/g, ' ')
        .replace(/[()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function getDetectedCropLabel(data, predictedClass) {
    return data?.detected_crop_label
        || formatCropName(data?.detected_crop)
        || (String(predictedClass || '').includes('___') ? formatCropName(String(predictedClass).split('___', 1)[0]) : '')
        || t('notSelected');
}

function normalizePredictionOption(option, fallbackRank = 1) {
    const predictedClass = option?.class || option?.predicted_class || option?.predictedLabel || option?.predicted_label || '';
    const cropLabel = option?.detected_crop_label
        || formatCropName(option?.detected_crop)
        || (String(option?.predicted_label || '').includes('___') ? formatCropName(String(option.predicted_label).split('___', 1)[0]) : '')
        || getDetectedCropLabel({}, predictedClass);
    const confidenceValue = Number(option?.confidence || 0);

    return {
        rank: Number(option?.rank || fallbackRank),
        predictedClass: formatDiseaseName(predictedClass),
        predictedLabel: option?.predicted_label || '',
        crop: cropLabel || t('notSelected'),
        detectedCrop: option?.detected_crop || '',
        confidence: Math.round(confidenceValue > 1 ? confidenceValue : confidenceValue * 100),
        diseaseConfidence: Math.round(Number(option?.disease_confidence || confidenceValue || 0) > 1
            ? Number(option?.disease_confidence || confidenceValue || 0)
            : Number(option?.disease_confidence || confidenceValue || 0) * 100),
        index: option?.index
    };
}

function buildCropPredictionOptions(data, fallbackPrediction) {
    const sourceOptions = Array.isArray(data?.top_3_crops) && data.top_3_crops.length
        ? data.top_3_crops
        : (Array.isArray(data?.top_3) ? data.top_3 : []);
    const normalized = sourceOptions.map((option, index) => normalizePredictionOption(option, index + 1));
    const uniqueByCrop = [];
    const seen = new Set();

    normalized.forEach((option) => {
        const key = option.crop.toLowerCase();
        if (!key || seen.has(key)) return;
        seen.add(key);
        uniqueByCrop.push(option);
    });

    if (!uniqueByCrop.length && fallbackPrediction) {
        uniqueByCrop.push(fallbackPrediction);
    }

    return uniqueByCrop.slice(0, 3).map((option, index) => ({ ...option, rank: index + 1 }));
}

function getAdvisoryDetails() {
    if (currentLanguage === 'sw') {
        return {
            irrigation: {
                title: 'Mwongozo wa Kina wa Umwagiliaji',
                content: `
                    <h3>Ratiba Bora ya Kumwagilia</h3>
                    <p>Umwagiliaji sahihi ni muhimu kwa afya ya mazao na ongezeko la mavuno.</p>
                    <h4>Kiangazi</h4>
                    <ul>
                        <li>Mwagilia mara 2 hadi 3 kwa wiki kulingana na ukavu wa udongo</li>
                        <li>Mwagilia asubuhi au jioni ili kupunguza upotevu wa maji</li>
                        <li>Epuka maji kusimama shambani</li>
                    </ul>
                    <h4>Wakati wa Mvua</h4>
                    <ul>
                        <li>Punguza umwagiliaji kama udongo una unyevunyevu wa kutosha</li>
                        <li>Hakiki mifereji ya maji mara kwa mara</li>
                        <li>Tumia matandazo kuhifadhi unyevu</li>
                    </ul>
                `
            },
            pest: {
                title: 'Udhibiti wa Wadudu kwa Vitendo',
                content: `
                    <h3>Suluhisho Rahisi kwa Mkulima</h3>
                    <ul>
                        <li>Tumia neem oil au sabuni laini ya wadudu kwa kiwango kinachofaa</li>
                        <li>Ondoa majani au matawi yaliyoathirika sana</li>
                        <li>Safisha mabaki ya mimea shambani baada ya mavuno</li>
                        <li>Chunguza mimea mara kwa mara ili ugundue mapema</li>
                    </ul>
                `
            },
            soil: {
                title: 'Usimamizi wa Afya ya Udongo',
                content: `
                    <h3>Njia Rahisi za Kuboresha Udongo</h3>
                    <ul>
                        <li>Ongeza mboji au samadi iliyooza vizuri</li>
                        <li>Badilisha aina ya zao kila msimu inapowezekana</li>
                        <li>Epuka kutumia mbolea kupita kiasi bila mpango</li>
                        <li>Funika udongo kwa matandazo kupunguza upotevu wa unyevu</li>
                    </ul>
                `
            },
            climate: {
                title: 'Namna ya Kujipanga na Hali ya Hewa',
                content: `
                    <h3>Kubadilika Kulingana na Mazingira</h3>
                    <ul>
                        <li>Fuatilia hali ya hewa ya eneo lako kabla ya kunyunyizia dawa au kumwagilia</li>
                        <li>Weka matandazo wakati wa joto kali ili kuhifadhi unyevu</li>
                        <li>Rekebisha mifereji kipindi cha mvua nyingi</li>
                        <li>Tumia kivuli au vizuizi vya upepo inapohitajika</li>
                    </ul>
                `
            }
        };
    }

    return {
        irrigation: {
            title: 'Detailed Irrigation Guide',
            content: `
                <h3>Optimal Watering Schedule</h3>
                <p>Proper irrigation is important for crop health and good yields.</p>
                <h4>Dry Season</h4>
                <ul>
                    <li>Water 2 to 3 times per week depending on soil dryness</li>
                    <li>Water early in the morning or evening</li>
                    <li>Prevent standing water around roots</li>
                </ul>
                <h4>Rainy Season</h4>
                <ul>
                    <li>Reduce watering if the soil already has enough moisture</li>
                    <li>Keep drainage channels open</li>
                    <li>Use mulch to preserve moisture</li>
                </ul>
            `
        },
        pest: {
            title: 'Practical Pest Control',
            content: `
                <h3>Simple Solutions for Farmers</h3>
                <ul>
                    <li>Use neem oil or mild insecticidal soap carefully</li>
                    <li>Remove heavily affected leaves or branches</li>
                    <li>Clear crop residues after harvest</li>
                    <li>Inspect plants regularly for early signs of pests</li>
                </ul>
            `
        },
        soil: {
            title: 'Soil Health Management',
            content: `
                <h3>Simple Ways to Improve Soil</h3>
                <ul>
                    <li>Add compost or well-rotted manure</li>
                    <li>Rotate crops when possible</li>
                    <li>Avoid overusing fertilizer without a plan</li>
                    <li>Use mulch to reduce moisture loss</li>
                </ul>
            `
        },
        climate: {
            title: 'Climate and Weather Adaptation',
            content: `
                <h3>Adjust Farming to Local Conditions</h3>
                <ul>
                    <li>Check local weather before spraying or watering</li>
                    <li>Use mulch during hot weather to keep moisture</li>
                    <li>Improve drainage during heavy rains</li>
                    <li>Use shade or wind protection when needed</li>
                </ul>
            `
        }
    };
}

function applyLanguage() {
    document.documentElement.lang = currentLanguage;
    document.title = t('appTitle');

    setText('navHome', t('navHome'));
    setText('navFeatures', t('navFeatures'));
    setText('navDetection', t('navDetection'));
    setText('navAdvisory', t('navAdvisory'));
    setText('navContact', t('navContact'));
    setText('languageLabel', t('languageLabel'));
    setText('newChatBtn', t('newChatBtn'));
    setText('chatNewBtn', t('newChatBtn'));
    setText('chatCurrentLabel', t('chatCurrentLabel'));
    setText('sidebarToggle', t('sidebarToggle'));
    setText('heroTitle', t('heroTitle'));
    setText('heroSubtitle', t('heroSubtitle'));
    setText('heroStartBtn', t('heroStartBtn'));
    setText('heroAdvisoryBtn', t('heroAdvisoryBtn'));
    setText('featuresTitle', t('featuresTitle'));
    setText('featureRecognitionTitle', t('featureRecognitionTitle'));
    setText('featureRecognitionDesc', t('featureRecognitionDesc'));
    setText('featureAdviceTitle', t('featureAdviceTitle'));
    setText('featureAdviceDesc', t('featureAdviceDesc'));
    setText('featureMobileTitle', t('featureMobileTitle'));
    setText('featureMobileDesc', t('featureMobileDesc'));
    setText('featureAnalyticsTitle', t('featureAnalyticsTitle'));
    setText('featureAnalyticsDesc', t('featureAnalyticsDesc'));
    setText('featureSupportTitle', t('featureSupportTitle'));
    setText('featureSupportDesc', t('featureSupportDesc'));
    setText('featureSecurityTitle', t('featureSecurityTitle'));
    setText('featureSecurityDesc', t('featureSecurityDesc'));
    setText('chatTitle', t('chatTitle'));
    setText('detectionTitle', t('detectionTitle'));
    setText('detectionSubtitle', t('detectionSubtitle'));
    setText('regionLabel', t('regionLabel'));
    setText('regionPlaceholder', t('regionPlaceholder'));
    setText('cropLabel', t('cropLabel'));
    setText('cropPlaceholder', t('cropPlaceholder'));
    setText('uploadFileBtn', t('uploadFileBtn'));
    setText('useCameraBtn', t('useCameraBtn'));
    setText('uploadBoxTitle', t('uploadBoxTitle'));
    setText('uploadBoxDesc', t('uploadBoxDesc'));
    setText('cameraPlaceholderText', t('cameraPlaceholderDefault'));
    setText('cameraHelp', t('cameraHelp'));
    setText('startCameraBtn', t('startCameraBtn'));
    setText('captureBtn', t('captureBtn'));
    setText('retakeBtn', t('retakeBtn'));
    setText('detectionStartBtn', t('detectionStartBtn'));
    setText('resultTitle', t('resultTitle'));
    setText('placeholderText', t('placeholderReady'));
    setText('advisoryTitle', t('advisoryTitle'));
    setText('advisorySubtitle', t('advisorySubtitle'));
    setText('advisoryApiTitle', t('advisoryApiTitle'));
    setText('advisoryApiHint', t('advisoryApiHint'));
    setText('advisoryApiContent', t('advisoryApiWaiting'));
    setText('irrigationTitle', t('irrigationTitle'));
    setHTML('irrigationDesc', t('irrigationDesc'));
    setText('irrigationBtn', t('learnMore'));
    setText('pestTitle', t('pestTitle'));
    setHTML('pestDesc', t('pestDesc'));
    setText('pestBtn', t('learnMore'));
    setText('soilTitle', t('soilTitle'));
    setHTML('soilDesc', t('soilDesc'));
    setText('soilBtn', t('learnMore'));
    setText('climateTitle', t('climateTitle'));
    setHTML('climateDesc', t('climateDesc'));
    setText('climateBtn', t('learnMore'));
    setText('contactTitle', t('contactTitle'));
    setText('contactSubtitle', t('contactSubtitle'));
    setText('contactPhoneLabel', t('contactPhoneLabel'));
    setText('contactEmailLabel', t('contactEmailLabel'));
    setText('contactLocationLabel', t('contactLocationLabel'));
    document.getElementById('contactNameInput')?.setAttribute('placeholder', t('contactNamePlaceholder'));
    document.getElementById('contactEmailInput')?.setAttribute('placeholder', t('contactEmailPlaceholder'));
    document.getElementById('contactMessageInput')?.setAttribute('placeholder', t('contactMessagePlaceholder'));
    setText('contactSendBtn', t('contactSendBtn'));
    setHTML('footerText', t('footerText'));
    document.getElementById('chatInput')?.setAttribute('placeholder', t('chatInputPlaceholder'));
    setText('chatSend', t('chatSend'));
    updateActiveChatTitle();
    document.getElementById('languageSelect').value = currentLanguage;
    updateCropOptionLabels();

    const qualityBox = document.getElementById('imageQualityMessage');
    if (qualityBox && qualityBox.dataset.state === 'good') {
        showImageQualityMessage(t('qualityGood'), 'info');
    }

    if (!getCurrentConversation() || !getCurrentConversation()?.messages?.length) {
        renderConversationMessages();
    }

    if (lastDetectionData) {
        displayDetectionResult(lastDetectionData);
        if (lastDetectionData.selectedCropPrediction) {
            fetchAdvisory(lastDetectionData.predictedClass, lastDetectionData.region, lastDetectionData.crop, lastDetectionData.confidence);
        }
    }
}

function initializeLanguageControls() {
    const languageSelect = document.getElementById('languageSelect');
    if (!languageSelect) return;

    languageSelect.value = currentLanguage;
    languageSelect.addEventListener('change', (event) => {
        currentLanguage = event.target.value === 'en' ? 'en' : 'sw';
        localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
        applyLanguage();
    });
}

function getRegionWeather(region) {
    return regionWeatherContext[region] || 'typical local weather conditions for the selected region';
}

function getDemoDiseasePrediction(region) {
    const predictedClass = demoDiseaseClasses[Math.floor(Math.random() * demoDiseaseClasses.length)];
    return {
        name: formatDiseaseName(predictedClass),
        predictedClass,
        confidence: 87,
        crop: getDetectedCropLabel({}, predictedClass),
        top3: [
            { class: predictedClass, index: 0, confidence: 0.87 }
        ],
        region: region || 'Unknown region'
    };
}

let currentImageFile = null;
let currentUploadMode = 'file';
let webcamStream = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeLanguageControls();
    applyLanguage();
    setupFileUpload();
    setupHamburgerMenu();
    setupScrollBehavior();
    window.addEventListener('beforeunload', stopWebcamStream);
});

// Hamburger Menu Toggle
function setupHamburgerMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }

    // Close menu when a link is clicked
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
            if (hamburger) hamburger.classList.remove('active');
        });
    });
}

// File Upload Setup
function setupFileUpload() {
    const uploadBox = document.getElementById('uploadBox');
    const fileInput = document.getElementById('fileInput');
    const methodButtons = document.querySelectorAll('.upload-method-btn');
    const startCameraBtn = document.getElementById('startCameraBtn');
    const captureBtn = document.getElementById('captureBtn');
    const retakeBtn = document.getElementById('retakeBtn');

    if (!uploadBox || !fileInput) return;

    methodButtons.forEach((button) => {
        button.addEventListener('click', () => switchUploadMode(button.dataset.mode));
    });

    uploadBox.addEventListener('click', () => {
        if (currentUploadMode === 'file') {
            fileInput.click();
        }
    });
    
    uploadBox.addEventListener('dragover', (e) => {
        if (currentUploadMode !== 'file') return;
        e.preventDefault();
        uploadBox.style.borderColor = '#558b2f';
        uploadBox.style.backgroundColor = 'rgba(123, 179, 66, 0.15)';
    });

    uploadBox.addEventListener('dragleave', () => {
        if (currentUploadMode !== 'file') return;
        uploadBox.style.borderColor = '#7cb342';
        uploadBox.style.backgroundColor = '#e8f5e9';
    });

    uploadBox.addEventListener('drop', (e) => {
        if (currentUploadMode !== 'file') return;
        e.preventDefault();
        uploadBox.style.borderColor = '#7cb342';
        uploadBox.style.backgroundColor = '#e8f5e9';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    if (startCameraBtn) {
        startCameraBtn.addEventListener('click', startWebcamCamera);
    }

    if (captureBtn) {
        captureBtn.addEventListener('click', captureWebcamPhoto);
    }

    if (retakeBtn) {
        retakeBtn.addEventListener('click', retakeWebcamPhoto);
    }
}

function showImageQualityMessage(message, type = 'info') {
    const qualityBox = document.getElementById('imageQualityMessage');
    if (!qualityBox) return;

    qualityBox.className = `image-quality-message ${type}`;
    qualityBox.dataset.state = type === 'info' && message === t('qualityGood') ? 'good' : type;
    qualityBox.textContent = `${t('qualityStatusTitle')}: ${message}`;
    qualityBox.style.display = 'block';
}

function hideImageQualityMessage() {
    const qualityBox = document.getElementById('imageQualityMessage');
    if (!qualityBox) return;
    qualityBox.style.display = 'none';
    qualityBox.textContent = '';
    qualityBox.className = 'image-quality-message';
    qualityBox.dataset.state = '';
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function loadImageElement(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

async function assessImageQuality(imageSrc) {
    // IMAGE QUALITY CHECKS BYPASSED - Raw image sent directly to model
    // (All quality validation removed: blur detection, brightness checks, contrast analysis, size validation)
    return {
        ok: true,
        reasons: []
    };
}

async function validateImageQuality(imageSrc) {
    // IMAGE QUALITY VALIDATION BYPASSED - Skipping all checks
    // (All preprocessing validation removed: blur check, quality validation, filtering)
    showImageQualityMessage(t('qualityGood'), 'info');
    return { ok: true };
}

// Handle File Selection
async function handleFileSelect(file) {
    if (!file.type.startsWith('image/')) {
        showSystemMessage(t('selectImageFile'), 'error');
        return;
    }

    try {
        const imageSrc = await readFileAsDataURL(file);
        const quality = await validateImageQuality(imageSrc);
        if (!quality.ok) {
            currentImageFile = null;
            const fileInput = document.getElementById('fileInput');
            if (fileInput) fileInput.value = '';
            showSystemMessage(quality.message, 'error');
            return;
        }

        currentImageFile = file;
        showPreviewImage(imageSrc);
    } catch (error) {
        console.error('Image quality validation failed:', error);
        showSystemMessage(t('selectImageFile'), 'error');
    }
}

function switchUploadMode(mode) {
    if (!mode || mode === currentUploadMode) return;

    currentUploadMode = mode;
    const fileUploadPanel = document.getElementById('fileUploadPanel');
    const webcamPanel = document.getElementById('webcamPanel');

    document.querySelectorAll('.upload-method-btn').forEach((button) => {
        button.classList.toggle('active', button.dataset.mode === mode);
    });

    if (fileUploadPanel) {
        fileUploadPanel.classList.toggle('active', mode === 'file');
    }

    if (webcamPanel) {
        webcamPanel.classList.toggle('active', mode === 'camera');
    }

    clearSelectedImage();

    if (mode === 'camera') {
        showCameraPlaceholder(t('cameraPlaceholderDefault'));
    } else {
        stopWebcamStream();
        showCameraPlaceholder(t('cameraPlaceholderDefault'));
    }
}

function showPreviewImage(imageSrc) {
    const previewImage = document.getElementById('previewImage');
    if (!previewImage) return;

    previewImage.src = imageSrc;
    previewImage.style.display = 'block';
    resetDetectionFeedback();
}

function resetDetectionFeedback() {
    const resultContainer = document.getElementById('resultContainer');
    const placeholder = document.getElementById('placeholderMessage');

    if (resultContainer) {
        resultContainer.style.display = 'none';
    }

    if (placeholder) {
        placeholder.style.display = 'block';
        const message = placeholder.querySelector('p');
        if (message) {
            message.textContent = t('placeholderReady');
        }
    }
}

function clearSelectedImage() {
    currentImageFile = null;

    const fileInput = document.getElementById('fileInput');
    const previewImage = document.getElementById('previewImage');

    if (fileInput) {
        fileInput.value = '';
    }

    if (previewImage) {
        previewImage.removeAttribute('src');
        previewImage.style.display = 'none';
    }

    hideImageQualityMessage();
    resetDetectionFeedback();
}

function showCameraPlaceholder(message) {
    const cameraVideo = document.getElementById('cameraVideo');
    const cameraPlaceholder = document.getElementById('cameraPlaceholder');

    if (cameraVideo) {
        cameraVideo.classList.remove('active');
    }

    if (cameraPlaceholder) {
        cameraPlaceholder.style.display = 'flex';
        const text = cameraPlaceholder.querySelector('p');
        if (text) {
            text.textContent = message || t('cameraPlaceholderDefault');
        }
    }
}

function showLiveCamera() {
    const cameraVideo = document.getElementById('cameraVideo');
    const cameraPlaceholder = document.getElementById('cameraPlaceholder');

    if (cameraVideo) {
        cameraVideo.classList.add('active');
    }

    if (cameraPlaceholder) {
        cameraPlaceholder.style.display = 'none';
    }
}

function stopWebcamStream() {
    if (webcamStream) {
        webcamStream.getTracks().forEach((track) => track.stop());
        webcamStream = null;
    }

    const cameraVideo = document.getElementById('cameraVideo');
    if (cameraVideo) {
        cameraVideo.pause();
        cameraVideo.srcObject = null;
        cameraVideo.classList.remove('active');
    }
}

async function startWebcamCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showSystemMessage(t('browserNoCamera'), 'error');
        return;
    }

    const cameraVideo = document.getElementById('cameraVideo');
    if (!cameraVideo) return;

    clearSelectedImage();
    stopWebcamStream();

    try {
        webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        });
    } catch (error) {
        try {
            webcamStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });
        } catch (fallbackError) {
            console.error('Webcam error:', fallbackError);
            showCameraPlaceholder(t('cameraAccessFailed'));
            showSystemMessage(t('cameraAccessFailed'), 'error');
            return;
        }
    }

    cameraVideo.srcObject = webcamStream;
    showLiveCamera();

    try {
        await cameraVideo.play();
    } catch (error) {
        console.error('Camera playback error:', error);
    }
}

function captureWebcamPhoto() {
    const cameraVideo = document.getElementById('cameraVideo');
    const cameraCanvas = document.getElementById('cameraCanvas');

    if (!webcamStream || !cameraVideo || !cameraCanvas || !cameraVideo.videoWidth) {
        showSystemMessage(t('startCameraFirst'), 'error');
        return;
    }

    cameraCanvas.width = cameraVideo.videoWidth;
    cameraCanvas.height = cameraVideo.videoHeight;

    const ctx = cameraCanvas.getContext('2d');
    ctx.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);

    const previewDataUrl = cameraCanvas.toDataURL('image/jpeg', 0.92);
    cameraCanvas.toBlob(async (blob) => {
        if (!blob) {
            showSystemMessage(t('captureFailed'), 'error');
            return;
        }

        const quality = await validateImageQuality(previewDataUrl);
        if (!quality.ok) {
            currentImageFile = null;
            showSystemMessage(quality.message, 'error');
            return;
        }

        currentImageFile = new File([blob], `webcam-capture-${Date.now()}.jpg`, {
            type: 'image/jpeg'
        });

        showPreviewImage(previewDataUrl);
        stopWebcamStream();
        showCameraPlaceholder(t('cameraPlaceholderDefault'));
    }, 'image/jpeg', 0.92);
}

function retakeWebcamPhoto() {
    if (currentUploadMode !== 'camera') {
        switchUploadMode('camera');
    }
    startWebcamCamera();
}

function formatDiseaseName(rawClass) {
    if (!rawClass) return 'Unknown disease';
    let name = rawClass;
    const parts = name.split('___');
    if (parts.length > 1) {
        parts.shift();
        name = parts.join(' - ');
    }
    name = name.replace(/_/g, ' ');
    name = name.replace(/\s+/g, ' ').trim();
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function normalizeAdviceList(value) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item || '').trim()).filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) {
        return value
            .split(/\n|;/)
            .map((item) => item.replace(/^[-*•\d\.\)\s]+/, '').trim())
            .filter(Boolean);
    }
    return [];
}

function renderAdviceList(items) {
    const normalized = normalizeAdviceList(items);
    if (!normalized.length) return '<p class="result-empty">-</p>';
    return `<ul class="result-list">${normalized.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderResultParagraph(text) {
    const safe = String(text || '').trim();
    return `<p>${escapeHtml(safe || '-')}</p>`;
}

function renderCropPredictionChoices(disease) {
    const options = Array.isArray(disease.cropOptions) ? disease.cropOptions : [];
    if (!options.length || disease.selectedCropPrediction) return '';

    const selectedIndex = disease.selectedCropPrediction?.index;
    const buttons = options.map((option) => {
        const isSelected = option.index === selectedIndex;
        return `
            <button type="button" class="crop-choice-btn ${isSelected ? 'active' : ''}" onclick="selectPredictedCrop(${Number(option.index)})">
                <span class="crop-choice-rank">#${option.rank}</span>
                <span class="crop-choice-main">${escapeHtml(option.crop)}</span>
                <span class="crop-choice-sub">${escapeHtml(formatDiseaseName(option.predictedClass))}</span>
                <span class="crop-choice-action">${t('cropChoiceButton')}</span>
            </button>
        `;
    }).join('');

    return `
        <section class="crop-choice-section">
            <h4>${t('cropChoiceTitle')}</h4>
            <p>${t('cropChoiceHint')}</p>
            <div class="crop-choice-grid">${buttons}</div>
        </section>
    `;
}

function displayInvalidLeafImage(message) {
    const resultContainer = document.getElementById('resultContainer');
    const resultBody = document.getElementById('resultBody');
    const placeholderMessage = document.getElementById('placeholderMessage');

    if (placeholderMessage) placeholderMessage.style.display = 'none';
    if (!resultContainer || !resultBody) return;

    resultContainer.style.display = 'block';
    resultBody.innerHTML = `
        <div class="disease-result">
            <div class="disease-name">${escapeHtml(currentLanguage === 'en' ? 'Invalid Image' : 'Picha Si Sahihi')}</div>
            <section class="model-advisory">
                <p>${escapeHtml(message || t('invalidLeafImage'))}</p>
            </section>
        </div>
    `;
}

function selectPredictedCrop(optionIndex) {
    if (!lastDetectionData || !Array.isArray(lastDetectionData.cropOptions)) return;
    const selected = lastDetectionData.cropOptions.find((option) => Number(option.index) === Number(optionIndex));
    if (!selected) return;

    lastDetectionData = {
        ...lastDetectionData,
        name: formatDiseaseName(selected.predictedClass),
        predictedClass: selected.predictedClass,
        confidence: selected.diseaseConfidence || selected.confidence,
        crop: selected.crop,
        selectedCropPrediction: selected
    };

    displayDetectionResult(lastDetectionData);
    fetchAdvisory(
        lastDetectionData.predictedClass,
        lastDetectionData.region,
        lastDetectionData.crop,
        lastDetectionData.confidence
    );
}

function detectMessageLanguage(text) {
    const value = String(text || '').trim().toLowerCase();
    if (!value) return currentLanguage;

    const swahiliSignals = [
        'habari', 'shamba', 'kilimo', 'mazao', 'ugonjwa', 'majani', 'naomba', 'tafadhali',
        'asante', 'nifanye', 'vipi', 'nini', 'kwanini', 'je', 'zao', 'mti', 'udongo',
        'maji', 'dawa', 'tatizo', 'imekuwa', 'sana', 'hapo', 'kwenye', 'hii', 'yangu'
    ];

    const englishSignals = [
        'hello', 'please', 'disease', 'crop', 'leaf', 'plant', 'soil', 'water', 'advice',
        'treatment', 'prevention', 'how', 'what', 'why', 'when', 'where', 'help', 'system'
    ];

    const swScore = swahiliSignals.reduce((count, word) => count + (value.includes(word) ? 1 : 0), 0);
    const enScore = englishSignals.reduce((count, word) => count + (value.includes(word) ? 1 : 0), 0);

    if (swScore > enScore) return 'sw';
    if (enScore > swScore) return 'en';
    return currentLanguage;
}

function fetchAdvisory(predictedClass, region, crop, confidence) {
    const advisoryContainer = document.getElementById('modelAdvisory');
    const summaryContainer = document.getElementById('localizedResultSummary');
    const diseaseNameContainer = document.getElementById('localizedDiseaseName');
    const diseaseMetaValueContainer = document.getElementById('resultMetaDiseaseValue');
    const causeContainer = document.getElementById('localizedDiseaseCause');
    const storeContainer = document.getElementById('storeTreatmentList');
    const preventionContainer = document.getElementById('preventionList');
    if (!advisoryContainer || !summaryContainer || !diseaseNameContainer) return;

    advisoryContainer.innerHTML = `<p>${escapeHtml(t('advisoryLoading'))}</p>`;
    summaryContainer.innerHTML = `<p>${escapeHtml(t('summaryLoading'))}</p>`;
    diseaseNameContainer.textContent = currentLanguage === 'en' ? formatDiseaseName(predictedClass) : t('localizedDiseaseLoading');
    if (causeContainer) causeContainer.innerHTML = `<p>${escapeHtml(t('summaryLoading'))}</p>`;
    if (storeContainer) storeContainer.innerHTML = `<p>${escapeHtml(t('advisoryLoading'))}</p>`;
    if (preventionContainer) preventionContainer.innerHTML = `<p>${escapeHtml(t('advisoryLoading'))}</p>`;

    fetch(apiUrl('/api/detection-advice'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            predictedClass,
            region,
            crop,
            confidence,
            weatherContext: getRegionWeather(region),
            language: currentLanguage
        })
    })
    .then(resp => parseApiResponse(resp, 'Advisory API request failed'))
    .then(result => {
        const localizedDiseaseName = result.localized_name || formatDiseaseName(predictedClass);
        diseaseNameContainer.textContent = localizedDiseaseName;
        if (diseaseMetaValueContainer) diseaseMetaValueContainer.textContent = localizedDiseaseName;
        summaryContainer.innerHTML = renderResultParagraph(result.summary || t('resultFallbackSummary'));
        advisoryContainer.innerHTML = renderAdviceList(result.home_remedies || []);
        if (causeContainer) causeContainer.innerHTML = renderResultParagraph(result.cause || t('resultFallbackSummary'));
        if (storeContainer) storeContainer.innerHTML = renderAdviceList(result.store_options || []);
        if (preventionContainer) preventionContainer.innerHTML = renderAdviceList(result.prevention || []);
    })
    .catch(err => {
        console.error('Advisory API error:', err);
        const fallbackDiseaseName = formatDiseaseName(predictedClass || t('translationUnknownDisease'));
        diseaseNameContainer.textContent = fallbackDiseaseName;
        if (diseaseMetaValueContainer) diseaseMetaValueContainer.textContent = fallbackDiseaseName;
        summaryContainer.innerHTML = renderResultParagraph(t('advisoryApiError'));
        advisoryContainer.innerHTML = renderResultParagraph(t('advisoryApiError'));
        if (causeContainer) causeContainer.innerHTML = renderResultParagraph(t('advisoryApiError'));
        if (storeContainer) storeContainer.innerHTML = renderResultParagraph(t('advisoryApiError'));
        if (preventionContainer) preventionContainer.innerHTML = renderResultParagraph(t('advisoryApiError'));
    });
}

// Display Detection Result
function displayDetectionResult(disease) {
    const resultContainer = document.getElementById('resultContainer');
    const resultBody = document.getElementById('resultBody');
    const placeholderMessage = document.getElementById('placeholderMessage');

    placeholderMessage.style.display = 'none';
    resultContainer.style.display = 'block';

    const confidencePercentage = disease.confidence;
    const hasUserCropChoice = Boolean(disease.selectedCropPrediction);
    const displayedCrop = hasUserCropChoice ? disease.crop : t('cropChoicePending');
    const displayedDisease = hasUserCropChoice
        ? formatDiseaseName(disease.predictedClass || disease.name || t('translationUnknownDisease'))
        : t('cropChoicePending');
    const loadingText = hasUserCropChoice ? t('summaryLoading') : t('cropChoicePending');
    const adviceLoadingText = hasUserCropChoice ? t('advisoryLoading') : t('cropChoicePending');

    let html = `
        <div class="disease-result">
            <div class="disease-name" id="localizedDiseaseName">${hasUserCropChoice ? (currentLanguage === 'en' ? disease.name : t('localizedDiseaseLoading')) : t('cropChoiceTitle')}</div>
            <div class="result-meta">
                <span><strong>${t('resultMetaRegion')}:</strong> ${disease.region || t('notSelected')}</span>
                <span><strong>${t('resultMetaCrop')}:</strong> ${displayedCrop}</span>
                <span><strong>${t('resultMetaDisease')}:</strong> <span id="resultMetaDiseaseValue">${hasUserCropChoice && currentLanguage !== 'en' ? t('localizedDiseaseLoading') : displayedDisease}</span></span>
            </div>
            ${renderCropPredictionChoices(disease)}
            <div class="result-sections">
                <section class="model-advisory">
                    <h4>${t('summaryTitle')}</h4>
                    <div id="localizedResultSummary"><p>${escapeHtml(loadingText)}</p></div>
                </section>
                <section class="model-advisory">
                    <h4>${currentLanguage === 'en' ? 'Cause of this disease' : 'Chanzo cha tatizo hili'}</h4>
                    <div id="localizedDiseaseCause"><p>${escapeHtml(loadingText)}</p></div>
                </section>
            </div>
    `;

    if (disease.annotatedImage) {
        html += `
            <div class="annotated-image-section">
                <h4>${t('annotatedTitle')}</h4>
                <div style="text-align: center; margin: 10px 0;">
                    <img src="${disease.annotatedImage}" alt="Disease detection with localization circle" 
                         style="max-width: 100%; max-height: 300px; border: 2px solid #7cb342; border-radius: 8px; padding: 5px;">
                </div>
                <p style="font-size: 0.9em; color: #666; text-align: center;">
                    ${t('annotatedCaption')}
                </p>
            </div>
        `;
    }

    html += `
            <div class="result-sections">
                <section class="model-advisory">
                    <h4>${currentLanguage === 'en' ? 'Simple home remedies' : 'Dawa za kawaida za nyumbani'}</h4>
                    <div id="modelAdvisory"><p>${escapeHtml(adviceLoadingText)}</p></div>
                </section>
                <section class="model-advisory">
                    <h4>${currentLanguage === 'en' ? 'If buying from agrovet/shop' : 'Kama atanunua dukani'}</h4>
                    <div id="storeTreatmentList"><p>${escapeHtml(adviceLoadingText)}</p></div>
                </section>
                <section class="model-advisory">
                    <h4>${currentLanguage === 'en' ? 'How to prevent it' : 'Jinsi ya kuzuia isitokee tena'}</h4>
                    <div id="preventionList"><p>${escapeHtml(adviceLoadingText)}</p></div>
                </section>
            </div>
        </div>
    `;

    resultBody.innerHTML = html;
}

// Reset Detection
function resetDetection() {
    clearSelectedImage();
    stopWebcamStream();
    showCameraPlaceholder(t('cameraPlaceholderDefault'));
    lastDetectionData = null;
}

// Conversations and Sidebar (localStorage)
let conversations = [];
let currentConversationId = null;
const STORAGE_KEY = 'cropix_chats_v1';

function loadConversations() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        conversations = raw ? JSON.parse(raw) : [];
    } catch (e) {
        conversations = [];
    }
}

function saveConversations() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (e) {
        console.error('Failed to save conversations', e);
    }
}

function renderConvoList() {
    const list = document.getElementById('convoList');
    if (!list) return;
    list.innerHTML = '';

    if (!conversations.length) {
        const empty = document.createElement('li');
        empty.className = 'convo-empty';
        empty.textContent = currentLanguage === 'sw'
            ? 'Bado hakuna chat. Bonyeza "+ Chat Mpya".'
            : 'No conversations yet. Click "+ New Chat".';
        list.appendChild(empty);
        return;
    }

    conversations.forEach(conv => {
        const li = document.createElement('li');
        li.className = 'convo-item' + (conv.id === currentConversationId ? ' active' : '');
        li.dataset.id = conv.id;
        const firstUser = conv.messages?.find((m) => m.role === 'user')?.text || '';
        const title = formatConversationTitle(conv.title || firstUser || t('newChatBtn'));
        const lastMessage = conv.messages && conv.messages.length ? conv.messages[conv.messages.length - 1] : null;
        const meta = formatConversationTime(lastMessage?.time || conv.created);

        const titleEl = document.createElement('div');
        titleEl.className = 'convo-title';
        titleEl.textContent = title;
        const metaEl = document.createElement('div');
        metaEl.className = 'convo-meta';
        metaEl.textContent = meta;
        li.appendChild(titleEl);
        li.appendChild(metaEl);
        li.addEventListener('click', () => selectConversation(conv.id));
        list.appendChild(li);
    });
}

function createNewConversation() {
    const id = 'c-' + Date.now();
    const conv = { id, title: t('newChatBtn'), messages: [], created: Date.now() };
    conversations.unshift(conv);
    currentConversationId = id;
    saveConversations();
    renderConvoList();
    renderConversationMessages();
}

function selectConversation(id) {
    currentConversationId = id;
    renderConvoList();
    renderConversationMessages();
    updateActiveChatTitle();
}

function getCurrentConversation() {
    if (!currentConversationId) return null;
    return conversations.find(c => c.id === currentConversationId) || null;
}

function renderConversationMessages() {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    container.innerHTML = '';
    const conv = getCurrentConversation();
    if (!conv || !conv.messages || conv.messages.length === 0) {
        const aiMsg = document.createElement('div');
        aiMsg.className = 'chat-message ai';
        aiMsg.innerHTML = `<div class="message">${t('chatIntro')}</div>`;
        container.appendChild(aiMsg);
        container.scrollTop = container.scrollHeight;
        return;
    }
    conv.messages.forEach(m => {
        const msg = document.createElement('div');
        msg.className = `chat-message ${m.role}`;
        const bubble = document.createElement('div');
        bubble.className = 'message';
        bubble.innerHTML = formatChatMessage(m.text, m.role);
        msg.appendChild(bubble);
        container.appendChild(msg);
    });
    container.scrollTop = container.scrollHeight;
    updateActiveChatTitle();
}

function appendChatMessage(who, text, save = true) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    const msg = document.createElement('div');
    msg.className = `chat-message ${who}`;
    const bubble = document.createElement('div');
    bubble.className = 'message';
    bubble.innerHTML = formatChatMessage(text, who);
    msg.appendChild(bubble);
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;

    if (save) {
        let conv = getCurrentConversation();
        if (!conv) {
            // auto-create a conversation if none
            const id = 'c-' + Date.now();
            conv = { id, title: t('newChatBtn'), messages: [] };
            conversations.unshift(conv);
            currentConversationId = id;
        }
        conv.messages.push({ role: who === 'user' ? 'user' : 'ai', text, time: Date.now() });
        // update title to first message snippet
        if (conv.messages.length && (!conv.title || conv.title === 'New Chat' || conv.title === 'Chat' || conv.title === t('newChatBtn'))) {
            conv.title = formatConversationTitle(conv.messages.find(m => m.role === 'user')?.text || t('newChatBtn'));
        }
        saveConversations();
        renderConvoList();
        updateActiveChatTitle();
    }
}

function appendChatLoadingIndicator() {
    const container = document.getElementById('chatMessages');
    if (!container) return null;

    const loadingId = `chat-loading-${Date.now()}-${chatLoadingSequence++}`;
    const msg = document.createElement('div');
    msg.className = 'chat-message ai chat-loading';
    msg.dataset.loadingId = loadingId;
    msg.setAttribute('aria-live', 'polite');

    const bubble = document.createElement('div');
    bubble.className = 'message';
    bubble.innerHTML = `
        <div class="typing-indicator" aria-label="${escapeHtml(t('chatTyping'))}">
            <span class="typing-label">${escapeHtml(t('chatTyping'))}</span>
            <span class="typing-dots" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
            </span>
        </div>
    `;

    msg.appendChild(bubble);
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    return loadingId;
}

function removeChatLoadingIndicator(loadingId) {
    if (!loadingId) return;
    const indicator = document.querySelector(`.chat-message.chat-loading[data-loading-id="${loadingId}"]`);
    if (indicator) {
        indicator.remove();
    }
}

function updateActiveChatTitle() {
    const el = document.getElementById('activeChatTitle');
    if (!el) return;
    const conv = getCurrentConversation();
    const firstUser = conv?.messages?.find((m) => m.role === 'user')?.text || '';
    const title = formatConversationTitle(conv?.title || firstUser || t('newChatBtn'));
    el.textContent = title;
}

// Show Advisory Details in Modal
function showAdvisoryDetail(type) {
    const modal = document.getElementById('advisoryModal');
    const modalBody = document.getElementById('modalBody');

    const advisoryDetails = {
        irrigation: {
            title: '💧 Detailed Irrigation Guide',
            content: `
                <h3>Optimal Watering Schedule</h3>
                <p>Proper irrigation is crucial for crop health and productivity.</p>
                
                <h4>Dry Season (November to March)</h4>
                <ul>
                    <li>Water 2-3 times per week</li>
                    <li>Each session: 1.5-2 hours</li>
                    <li>Best time: Early morning or evening</li>
                </ul>
                
                <h4>Rainy Season (April to October)</h4>
                <ul>
                    <li>Water as needed based on rainfall</li>
                    <li>Ensure proper drainage to prevent waterlogging</li>
                    <li>Monitor soil moisture regularly</li>
                </ul>
                
                <h4>Water Quality</h4>
                <ul>
                    <li>Use clean, disease-free water</li>
                    <li>Avoid saline or contaminated sources</li>
                    <li>Consider mulching to retain soil moisture</li>
                </ul>
                
                <h4>Drip Irrigation Benefits</h4>
                <ul>
                    <li>More water-efficient than flooding</li>
                    <li>Reduces fungal diseases</li>
                    <li>Delivers nutrients directly to roots</li>
                    <li>Saves labor and time</li>
                </ul>
            `
        },
        pest: {
            title: '🐛 Comprehensive Pest Control',
            content: `
                <h3>Natural & Organic Solutions</h3>
                
                <h4>Common Pests & Solutions</h4>
                <ul>
                    <li><strong>Aphids:</strong> Spray with neem oil or insecticidal soap</li>
                    <li><strong>Caterpillars:</strong> Hand-pick or use Bt (Bacillus thuringiensis)</li>
                    <li><strong>Whiteflies:</strong> Yellow sticky traps and neem oil spray</li>
                    <li><strong>Mites:</strong> Spray with sulfur dust or neem oil</li>
                </ul>
                
                <h4>Companion Planting</h4>
                <ul>
                    <li>Marigolds repel harmful insects</li>
                    <li>Basil deters flies and mosquitoes</li>
                    <li>Garlic prevents many pests</li>
                    <li>Herbs attract beneficial insects</li>
                </ul>
                
                <h4>Preventive Measures</h4>
                <ul>
                    <li>Remove plant debris promptly</li>
                    <li>Rotate crops annually</li>
                    <li>Maintain field hygiene</li>
                    <li>Scout regularly for early detection</li>
                    <li>Encourage natural predators</li>
                </ul>
            `
        },
        soil: {
            title: '🌱 Soil Health Management',
            content: `
                <h3>Building Healthy, Productive Soil</h3>
                
                <h4>Soil Testing & Analysis</h4>
                <ul>
                    <li>Test pH levels annually (target: 6.0-7.0 for most crops)</li>
                    <li>Check NPK (Nitrogen, Phosphorus, Potassium) levels</li>
                    <li>Assess organic matter content</li>
                    <li>Contact extension office for affordable testing</li>
                </ul>
                
                <h4>Organic Matter Addition</h4>
                <ul>
                    <li>Add 2-4 inches of compost annually</li>
                    <li>Use animal manure (well-aged)</li>
                    <li>Incorporate crop residues</li>
                    <li>Grow cover crops in off-season</li>
                </ul>
                
                <h4>Crop Rotation Schedule</h4>
                <ul>
                    <li>Leafy vegetables → Legumes → Root crops → Grains</li>
                    <li>Rotate annually to break pest cycles</li>
                    <li>Prevents nutrient depletion</li>
                    <li>Improves soil structure over time</li>
                </ul>
                
                <h4>Erosion Control</h4>
                <ul>
                    <li>Contour plowing on slopes</li>
                    <li>Windbreaks and hedgerows</li>
                    <li>Mulching between rows</li>
                </ul>
            `
        },
        climate: {
            title: '☀️ Climate & Weather Adaptation',
            content: `
                <h3>Adapting Farming to Climate Conditions</h3>
                
                <h4>Weather Monitoring Tools</h4>
                <ul>
                    <li>Use local weather apps for forecasts</li>
                    <li>Subscribe to agricultural advisory services</li>
                    <li>Keep a farm weather journal</li>
                    <li>Share information with farming community</li>
                </ul>
                
                <h4>Heat Management (High Temperatures)</h4>
                <ul>
                    <li>Plant shade crops or use shade cloth</li>
                    <li>Increase irrigation frequency</li>
                    <li>Mulch heavily to retain moisture</li>
                    <li>Select heat-tolerant varieties</li>
                </ul>
                
                <h4>Cold Protection (Low Temperatures)</h4>
                <ul>
                    <li>Use row covers for frost protection</li>
                    <li>Plant windbreaks</li>
                    <li>Water soil before frost to provide thermal mass</li>
                    <li>Choose cold-hardy varieties</li>
                </ul>
                
                <h4>Drought Management</h4>
                <ul>
                    <li>Install drip irrigation systems</li>
                    <li>Use drought-tolerant crop varieties</li>
                    <li>Increase mulch depths</li>
                    <li>Reduce evaporation with proper scheduling</li>
                </ul>
                
                <h4>Flood Prevention</h4>
                <ul>
                    <li>Improve field drainage systems</li>
                    <li>Raise beds in low-lying areas</li>
                    <li>Clear drains and ditches before rains</li>
                    <li>Plant flood-tolerant crops in vulnerable areas</li>
                </ul>
            `
        }
    };

    const detail = advisoryDetails[type];
    modalBody.innerHTML = `<h2>${detail.title}</h2>${detail.content}`;
    modal.style.display = 'block';
}

function showAdvisoryDetail(type) {
    const modal = document.getElementById('advisoryModal');
    const modalBody = document.getElementById('modalBody');
    const advisoryDetails = getAdvisoryDetails();
    const detail = advisoryDetails[type];
    if (!detail) return;
    modalBody.innerHTML = `<h2>${detail.title}</h2>${detail.content}`;
    modal.style.display = 'block';
}

// Close Advisory Modal
function closeAdvisoryModal() {
    document.getElementById('advisoryModal').style.display = 'none';
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    const modal = document.getElementById('advisoryModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Handle Contact Form Submission
function handleContactSubmit(event) {
    event.preventDefault();
    
    // Get form values
    const form = event.target;
    const name = form.querySelector('input[type="text"]').value;
    const email = form.querySelector('input[type="email"]').value;
    const message = form.querySelector('textarea').value;

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = t('contactSending');

    // Send to backend
    fetch(apiUrl('/api/send-contact'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: name,
            email: email,
            message: message
        })
    })
    .then(response => parseApiResponse(response, 'Contact API request failed'))
    .then(data => {
        if (data.success) {
            showSystemMessage(t('contactSuccess', { name, email }), 'success');
            form.reset();
        } else {
            showSystemMessage(t('contactError', { message: data.error || t('contactFailedGeneric') }), 'error');
        }
    })
    .catch(error => {
        console.error('Error sending contact:', error);
        showSystemMessage(t('contactSendFailed'), 'error');
    })
    .finally(() => {
        // Restore button state
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    });
}

// Smooth Scroll to Section
function scrollToSection(sectionId) {
    if (sectionId === 'chat') {
        openChatWidget(true);
        return;
    }

    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

function setChatWidgetOpen(isOpen, focusInput = false) {
    const widget = document.getElementById('chat');
    const toggle = document.getElementById('chatToggle');
    const panel = document.getElementById('chatPanel');
    if (!widget || !toggle || !panel) return;

    widget.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    panel.setAttribute('aria-hidden', String(!isOpen));
    if (isOpen) {
        panel.removeAttribute('inert');
    } else {
        panel.setAttribute('inert', '');
    }

    if (isOpen) {
        renderConversationMessages();
        updateActiveChatTitle();
    }

    if (isOpen && focusInput) {
        window.setTimeout(() => {
            document.getElementById('chatInput')?.focus();
        }, 80);
    }
}

function openChatWidget(focusInput = false) {
    setChatWidgetOpen(true, focusInput);
}

function closeChatWidget() {
    setChatWidgetOpen(false);
}

function setChatWidgetExpanded(isExpanded) {
    const widget = document.getElementById('chat');
    const expandBtn = document.getElementById('chatExpandBtn');
    if (!widget || !expandBtn) return;

    widget.classList.toggle('expanded', isExpanded);
    expandBtn.setAttribute('aria-label', isExpanded ? 'Shrink chat' : 'Expand chat');
    expandBtn.setAttribute('title', isExpanded ? 'Shrink chat' : 'Expand chat');

    const icon = expandBtn.querySelector('i');
    if (icon) {
        icon.classList.toggle('fa-expand', !isExpanded);
        icon.classList.toggle('fa-compress', isExpanded);
    }
}

function toggleChatExpanded() {
    const widget = document.getElementById('chat');
    setChatWidgetExpanded(!widget?.classList.contains('expanded'));
}

function setupChatWidget() {
    const widget = document.getElementById('chat');
    const toggle = document.getElementById('chatToggle');
    const closeBtn = document.getElementById('chatCloseBtn');
    const expandBtn = document.getElementById('chatExpandBtn');
    const navAdvisory = document.getElementById('navAdvisory');

    if (toggle) {
        toggle.addEventListener('click', () => openChatWidget(true));
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeChatWidget);
    }

    if (expandBtn) {
        expandBtn.addEventListener('click', toggleChatExpanded);
    }

    if (navAdvisory) {
        navAdvisory.addEventListener('click', (event) => {
            event.preventDefault();
            openChatWidget(true);
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && widget?.classList.contains('open')) {
            closeChatWidget();
            toggle?.focus();
        }
    });
}

// Start Detection from hero: require region selection before scrolling
function startDetection() {
    scrollToSection('detection');
    const regionSelect = document.getElementById('regionSelect');
    if (regionSelect) regionSelect.focus && regionSelect.focus();
}

// Run detection when user clicks local Start Detection button
function runDetection() {
    const regionSelect = document.getElementById('regionSelect');
    if (!regionSelect || !regionSelect.value) {
        showSystemMessage(t('selectRegionBeforeDetection'), 'error');
        return;
    }
    const fileInput = document.getElementById('fileInput');
    if (!currentImageFile && (!fileInput || !fileInput.files || fileInput.files.length === 0)) {
        showSystemMessage(t('uploadBeforeDetection'), 'error');
        return;
    }

    // Show processing message
    const placeholder = document.getElementById('placeholderMessage');
    if (placeholder) {
        placeholder.style.display = 'block';
        placeholder.querySelector('p').textContent = t('placeholderProcessing');
    }

    // Get the file
    let file = currentImageFile;
    if (!file && fileInput && fileInput.files && fileInput.files.length > 0) {
        file = fileInput.files[0];
    }

    if (!file) {
        showSystemMessage(t('reselectImage'), 'error');
        return;
    }

    // Send to API
    const fd = new FormData();
    fd.append('image', file);

    console.log('Sending image to predict API...');

    fetch(apiUrl('/predict'), {
        method: 'POST',
        body: fd
    })
    .then(resp => {
        console.log('API Response status:', resp.status);
        return parseApiResponse(resp, 'Prediction API request failed');
    })
    .then(data => {
        console.log('API Response data:', data);
        
        if (data.error) {
            console.error('API Error:', data.error);
            showSystemMessage(t('predictionApiError'), 'error');
            return;
        }

        if (data.is_leaf_like === false) {
            lastDetectionData = null;
            displayInvalidLeafImage(t('invalidLeafImage'));
            return;
        }
        
        // Get the prediction from model
        const predictedClass = data.predicted_class;
        const rawConfidence = data.confidence; // 0-1 value
        const confidence = Math.round(rawConfidence * 100); // Convert to percentage
        const selectedRegion = document.getElementById('regionSelect')?.value || t('notSelected');
        const detectedCropLabel = getDetectedCropLabel(data, predictedClass);
        const formattedName = formatDiseaseName(predictedClass);
        const annotatedImage = data.annotated_image || null; // 🎯 Get annotated image with localization
        const fallbackPrediction = {
            rank: 1,
            predictedClass: formattedName,
            predictedLabel: data.predicted_label || '',
            crop: detectedCropLabel,
            detectedCrop: data.detected_crop || '',
            confidence,
            diseaseConfidence: confidence,
            index: data.predicted_index ?? 0
        };
        const cropOptions = buildCropPredictionOptions(data, fallbackPrediction);
        
        console.log('Predicted class:', predictedClass, 'Confidence:', confidence + '%');
        console.log('Has annotated image:', data.has_localization ? '✅ Yes' : '❌ No');

        lastDetectionData = {
            name: formattedName,
            predictedClass,
            confidence,
            region: selectedRegion,
            crop: detectedCropLabel,
            cropOptions,
            selectedCropPrediction: null,
            annotatedImage: annotatedImage
        };

        displayDetectionResult(lastDetectionData);
    })
    .catch(e => {
        console.error('Prediction error:', e);
        console.error('Error details:', e.message, e.stack);
        showSystemMessage(t('predictionFailed'), 'error');
    });
}

// Chat assistant behavior
document.addEventListener('DOMContentLoaded', function() {
    // Initialize sidebar and chat storage
    loadConversations();
    sanitizeStoredConversations();
    if (!conversations.length) {
        createNewConversation();
    }
    if (!currentConversationId && conversations.length) {
        currentConversationId = conversations[0].id;
    }
    renderConvoList();
    renderConversationMessages();
    updateActiveChatTitle();
    setupChatWidget();

    // Sidebar controls
    const newChatBtn = document.getElementById('newChatBtn');
    if (newChatBtn) newChatBtn.addEventListener('click', createNewConversation);
    const chatNewBtn = document.getElementById('chatNewBtn');
    if (chatNewBtn) chatNewBtn.addEventListener('click', createNewConversation);

    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarEl = document.getElementById('sidebar');
    if (sidebarEl) {
        sidebarEl.classList.add('collapsed');
    }
    if (sidebarToggle && sidebarEl) {
        sidebarToggle.addEventListener('click', () => {
            sidebarEl.classList.toggle('collapsed');
        });
    }

    // Chat send/input
    const chatSend = document.getElementById('chatSend');
    const chatInput = document.getElementById('chatInput');
    if (chatSend && chatInput) {
        chatSend.addEventListener('click', () => sendChatMessage(chatInput));
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendChatMessage(chatInput);
        });
    }

    function sendChatMessage(inputEl) {
        const text = inputEl.value.trim();
        if (!text) return;
        const convBeforeSend = getCurrentConversation();
        const historyBeforeSend = convBeforeSend && Array.isArray(convBeforeSend.messages)
            ? convBeforeSend.messages.map((m) => ({ role: m.role, text: m.text, time: m.time }))
            : [];
        inputEl.value = '';
        appendChatMessage('user', text, true);
        const loadingId = appendChatLoadingIndicator();

        // Send to server proxy for real AI response
        (async () => {
            try {
                const selectedRegion = document.getElementById('regionSelect')?.value || '';
                const selectedCrop = lastDetectionData?.crop || getSelectedCropLabel();
                const payload = {
                    conversationId: convBeforeSend ? convBeforeSend.id : null,
                    message: text,
                    messages: historyBeforeSend,
                    selectedRegion,
                    selectedCrop,
                    language: currentLanguage,
                    messageLanguage: detectMessageLanguage(text)
                };

                const resp = await fetch(apiUrl('/api/chat'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await parseApiResponse(resp, 'Chat API request failed');
                const reply = normalizeAssistantReply(data.reply || t('chatIntro'));
                removeChatLoadingIndicator(loadingId);
                appendChatMessage('ai', reply, true);
            } catch (err) {
                console.error('Chat API error', err);
                removeChatLoadingIndicator(loadingId);
                appendChatMessage('ai', t('chatApiOffline'), true);
            }
        })();
    }
});

// Add active state to navigation on scroll
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;

        if (window.scrollY >= sectionTop - 200 && window.scrollY < sectionTop + sectionHeight - 200) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${section.id}`) {
                    link.classList.add('active');
                }
            });
        }
    });
});

// Add animation on scroll for feature cards
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeIn 0.6s ease forwards';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.feature-card, .advisory-card').forEach(card => {
    card.style.animation = 'none'; // Reset animation
    observer.observe(card);
});

// Add fade-in animation if not already defined in CSS
if (!document.querySelector('style[data-custom]')) {
    const style = document.createElement('style');
    style.setAttribute('data-custom', 'true');
    style.textContent = `
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
}
