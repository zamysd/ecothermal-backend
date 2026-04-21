"use strict";

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

// Use Native Fetch (Node 18+), no need for node-fetch
const nativeFetch = globalThis.fetch;

// ─── SYSTEM PROMPT ───────────────────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `
You are an AI Physics Tutor in a mobile learning application focused on Global Warming.
Your role is to guide students through discussion using the Socratic method.
You are NOT allowed to give direct answers.
Always guide, ask, scaffold thinking, and use Bahasa Indonesia.
Keep responses concise and encouraging.
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
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("❌ OPENROUTER_API_KEY MISSING");
      return res.status(500).json({ error: 'OpenRouter API key not configured on server.' });
    }

    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Prepare messages for OpenRouter (OpenAI compatible format)
    const rawHistory = Array.isArray(history) ? history : [];
    let messages = [
      { role: "system", content: SYSTEM_INSTRUCTION }
    ];

    for (const msg of rawHistory) {
      messages.push({
        role: msg.isUser ? "user" : "assistant",
        content: msg.text
      });
    }

    // Add current message
    messages.push({ role: "user", content: message });

    const openRouterUrl = "https://openrouter.ai/api/v1/chat/completions";

    const response = await nativeFetch(openRouterUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ecothermal-tutor.up.railway.app",
        "X-Title": "EcoThermal AI Tutor"
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo", // Highly stable
        messages: messages,
        temperature: 0.7,
        max_tokens: 400
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter API Error:", response.status, data);
      return res.status(500).json({
        error: "OpenRouter API Error",
        details: data
      });
    }

    const reply = data?.choices?.[0]?.message?.content || "No response received";
    
    // ✅ Always return JSON with 'reply' key
    return res.status(200).json({ reply });

  } catch (error) {
    console.error("SERVER ERROR:", error);
    return res.status(500).json({
      error: "Server error",
      details: error.message || String(error)
    });
  }
};