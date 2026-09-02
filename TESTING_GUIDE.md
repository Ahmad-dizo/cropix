# 🌾 Plant Disease Detection - Testing & Debugging Guide

## Current System Status

✅ **Model**: Loaded from `plant_disease_model.keras`  
✅ **Labels**: 17 disease classes loaded  
✅ **API**: Running on `http://localhost:5000`  
✅ **Frontend**: Real predictions integrated  

## Testing the API

### 1. **Quick Test** (Recommended)
Open `test-api.html` in your browser:
- Shows raw API response
- Displays **Top 3 predictions** for debugging
- Shows confidence percentages

### 2. **Main Application**
Open `index.html`:
- Upload plant image
- See disease prediction + treatment advice

## Understanding the Results

### Low Confidence (9%, 15%, etc.)

**Possible causes:**

1. **Image Quality**: Blurry, dark, or low-resolution images
   - **Solution**: Use clear, well-lit photos from multiple angles

2. **Image Angle**: Disease symptoms not clearly visible
   - **Solution**: Upload photo showing affected area clearly

3. **Preprocessing Mismatch**: Model trained on specific image format
   - **Solution**: Try standardized dataset images first

4. **Model Confidence**: Model genuinely uncertain
   - **Action**: Check Top 3 predictions to see alternatives

### What To Do If Prediction Is Wrong

1. **Check Top 3 Predictions**: Your disease might be #2 or #3
2. **Verify Image**: Is the disease actually visible in your photo?
3. **Try Different Angle**: Diseases appear differently from different sides
4. **Check Dataset**: Compare your image with training dataset photos

## Server Logs for Debugging

Check container logs for prediction details:

```bash
docker logs frontend-api-1 | tail -50
```

Look for:
- `Raw predictions min/max`: Confidence range
- `After softmax`: Normalized probabilities
- `Top 3 predictions`: Alternative classifications

## Available Disease Classes

1. Apple - Healthy
2. Apple Scab
3. Apple Black Rot
4. Cedar Apple Rust
5. Blueberry - Healthy
6. Cherry - Healthy
7. Cherry Powdery Mildew
8. Corn Leaf Spot
9. Corn Common Rust
10. Corn - Healthy
11. Corn Northern Leaf Blight
12. Grape Black Rot
13. Grape Esca (Black Measles)
14. Grape - Healthy
15. Grape Leaf Blight
16. Citrus Greening
17. Peach Bacterial Spot

## Troubleshooting

### "9% confidence but different disease expected"

This could mean:
- Model saw signs of the predicted disease (even subtle)
- Your image angle might not show typical symptoms
- Try the test page to see Top 3 predictions

### "No connection to API"

Check:
```bash
docker compose ps          # Is container running?
docker compose logs        # Any errors?
http://localhost:5000      # Try accessing directly
```

### "Model not loading"

```bash
docker compose down && docker compose up --build
```

## Next Steps

1. Test with images from `plantvillage dataset/color/` subdirectories
2. Compare results with Top 3 predictions
3. If consistently wrong, model may need retraining
4. Check browser console (F12) for detailed error messages

---

**Debug Mode**: Open browser Developer Tools (F12) → Console tab to see detailed logs from the API
