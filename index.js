"use strict";

// 🔥 HANDLE ERROR GLOBAL
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

// Gunakan Native Fetch Node.js 18+ (tidak perlu node-fetch)
const nativeFetch = globalThis.fetch;

// ─── SYSTEM PROMPT ───────────────────────────────────────────────────────────
const SYSTEM_INSTRUCTION = \`
You are an AI Physics Tutor in a mobile learning application focused on Global Warming.
Your role is to guide students through discussion using the Socratic method.
You are NOT allowed to give direct answers.
Always guide, ask, and scaffold thinking.
\`;

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

    // 🔥 FORMAT CONTENT UNTUK REST API GEMINI (termasuk Socratic logic bypass 400 error)
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

    if (formattedContents.length > 0) {
      formattedContents[0].parts[0].text = SYSTEM_INSTRUCTION + "\\n\\nContext User:\\n" + formattedContents[0].parts[0].text;
    } else {
      formattedContents.push({
        role: 'user',
        parts: [{ text: SYSTEM_INSTRUCTION + "\\n\\nUser Question:\\n" + message }]
      });
    }

    if (formattedContents.length > 0 && formattedContents[0].parts[0].text !== (SYSTEM_INSTRUCTION + "\\n\\nUser Question:\\n" + message)) {
       formattedContents.push({
         role: 'user',
         parts: [{ text: message }]
       });
    }

    const payload = {
      contents: formattedContents,
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.7,
      }
    };

    const url = \`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=\${apiKey}\`;

    const response = await nativeFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      data = "Failed to parse JSON response from Google: " + parseError.message;
    }

    // 🔥 HANDLE ERROR DARI GEMINI SECARA LANGSUNG
    if (!response.ok) {
      console.error("API Google menolak request:", response.status, data);
      return res.status(500).json({
        error: "Gemini API Error",
        details: data,
      });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "AI did not return a response";

    // ✅ PASTI RETURNING RESPONSE KE CLIENT
    return res.status(200).json({ reply });

  } catch (error) {
    console.error("SERVER ERROR CRASHED:", error);

    // ❗ JANGAN BIARKAN TANPA RESPONSE
    return res.status(500).json({
      error: "Server crashed",
      details: error.message || String(error),
    });
  }
};