"use strict";

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

// Use Native Fetch Node.js 18+ 
const nativeFetch = globalThis.fetch;

// ─── SYSTEM PROMPT ───────────────────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `
You are an AI Physics Tutor in a mobile learning application focused on Global Warming.
Your role is to guide students through discussion using the Socratic method.
You are NOT allowed to give direct answers.
Always guide, ask, scaffold thinking, and use Bahasa Indonesia.
`;

// ─── CORS HEADERS ────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
exports.chat = async (req, res) => {
  // Set CORS for all responses
  res.set(CORS_HEADERS);

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("❌ API KEY MISSING");
      return res.status(500).json({ error: 'API key not configured on server.' });
    }

    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // FORMAT CONTENT FOR REST API GEMINI
    const rawHistory = Array.isArray(history) ? history : [];
    let formattedContents = [];
    let expectedRole = 'user';

    for (const msg of rawHistory) {
      const msgRole = msg.isUser ? 'user' : 'model';
      if (msgRole === expectedRole && msg.text) {
        formattedContents.push({
          role: msgRole,
          parts: [{ text: msg.text }],
        });
        expectedRole = expectedRole === 'user' ? 'model' : 'user';
      }
    }

    // Prepare the contents with System Instruction
    let finalContents = [];
    
    // Create the base conversation
    if (formattedContents.length > 0) {
      // First user message gets the system instruction
      formattedContents[0].parts[0].text = SYSTEM_INSTRUCTION + "\n\nContext:\n" + formattedContents[0].parts[0].text;
      finalContents = formattedContents;
      
      // If last message was from model, add current user message
      if (finalContents[finalContents.length - 1].role === 'model') {
        finalContents.push({
          role: 'user',
          parts: [{ text: message }]
        });
      }
    } else {
      // No history, start new with system instruction
      finalContents.push({
        role: 'user',
        parts: [{ text: SYSTEM_INSTRUCTION + "\n\nUser Question:\n" + message }]
      });
    }

    const payload = {
      contents: finalContents,
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.7,
      }
    };

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // Robust fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let response;
    try {
      response = await nativeFetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } catch (fetchErr) {
      if (fetchErr.name === 'AbortError') {
        return res.status(504).json({ error: "Gemini API Timeout (15s)" });
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeout);
    }

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", response.status, data);
      return res.status(500).json({
        error: "Gemini API Error",
        details: data,
      });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "AI did not return a response";
    return res.status(200).json({ reply });

  } catch (error) {
    console.error("SERVER ERROR:", error);
    return res.status(500).json({
      error: "Server error",
      details: error.message || String(error),
    });
  }
};