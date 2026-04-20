// Local development server wrapper for the Cloud Function
// This lets you test locally before deploying to Cloud Run / Firebase Functions
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
const express = require('express');
const cors = require('cors');
const { chat } = require('./index');

const app = express();
app.use(cors());
app.use(express.json());

// Mount the function handler at /chat
app.post('/chat', (req, res) => chat(req, res));
app.options('/chat', (req, res) => chat(req, res));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`EcoThermal AI Tutor backend running on http://localhost:${PORT}`);
  console.log(`POST http://localhost:${PORT}/chat`);
});
