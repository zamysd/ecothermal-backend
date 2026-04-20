# EcoThermal AI Tutor - Backend Proxy

This is a simple Node.js backend that proxies requests from the Flutter app to the Gemini API.
The `GEMINI_API_KEY` is stored **only here** on the server — it is never exposed to the app.

## Files
- `index.js` — Cloud Function handler (works on Google Cloud Run, Firebase Functions, Render, Railway)
- `server.js` — Local Express wrapper for development
- `package.json` — Dependencies

---

## 🚀 Deployment Options

### Option 1: Google Cloud Run (Recommended)

```bash
# 1. Install Google Cloud CLI: https://cloud.google.com/sdk/docs/install
# 2. Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 3. Deploy directly from this folder
cd backend
gcloud run deploy ecothermal-tutor \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=YOUR_API_KEY_HERE
```

After deployment, Cloud Run gives you a URL like:
`https://ecothermal-tutor-XXXX.run.app`

Paste this URL in the Flutter app: `lib/utils/app_links.dart` as `chatEndpoint`.

---

### Option 2: Railway (Easiest — no gcloud needed)

1. Push this `backend/` folder to a GitHub repo
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add environment variable: `GEMINI_API_KEY = YOUR_KEY`
4. Railway gives you a URL like `https://your-app.up.railway.app`
5. Your endpoint will be `https://your-app.up.railway.app/chat`

---

### Option 3: Render (Free Tier Available)

1. Push backend to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Root directory: `backend`
4. Build command: `npm install`
5. Start command: `node server.js`
6. Add environment variable: `GEMINI_API_KEY = YOUR_KEY`

---

## 🧪 Local Testing

```bash
cd backend
npm install

# Set API key
export GEMINI_API_KEY=YOUR_KEY_HERE

# Start local server
npm start

# Test in another terminal
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the greenhouse effect?", "history": []}'
```

---

## API Reference

**POST** `/chat`

Request body:
```json
{
  "message": "What causes global warming?",
  "history": [
    { "text": "Hello!", "isUser": true },
    { "text": "Hi! Let's explore this together 😊", "isUser": false }
  ]
}
```

Response:
```json
{
  "reply": "Good question! What do you think happens when sunlight hits Earth's surface?"
}
```
