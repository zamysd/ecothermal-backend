"use strict";

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

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
    const apiKey = process.env.NVIDIA_API_KEY || "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";
    if (!apiKey) {
      console.error("❌ NVIDIA_API_KEY MISSING");
      return res.status(500).json({ error: 'NVIDIA API key not configured on server.' });
    }

    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Format content for NVIDIA API (OpenAI compatible)
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

    messages.push({ role: "user", content: message });

    const url = "https://integrate.api.nvidia.com/v1/chat/completions";

    const payload = {
      model: "z-ai/glm4.7",
      messages: messages,
      temperature: 1.0,
      top_p: 1.0,
      max_tokens: 4096,
      extra_body: {
        chat_template_kwargs: {
          enable_thinking: true,
          clear_thinking: false
        }
      }
    };

    const response = await nativeFetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("NVIDIA API Error:", response.status, data);
      return res.status(500).json({
        error: "NVIDIA API Error",
        details: data
      });
    }

    // Extract standard response content
    const reply = data?.choices?.[0]?.message?.content || "AI did not return a response";
    
    // Note: reasoning_content is typically used internally by GLM 4.7 when enable_thinking is true.
    // In a non-streaming response, choices[0].message.content is the final result.
    
    return res.status(200).json({ reply });

  } catch (error) {
    console.error("SERVER ERROR:", error);
    return res.status(500).json({
      error: "Server error",
      details: error.message || String(error)
    });
  }
};