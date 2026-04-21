"use strict";

const OpenAI = require('openai');

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

// ─── SYSTEM PROMPT ───────────────────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `
You are an AI Physics Tutor using the Socratic method.

IMPORTANT:
- Do NOT reveal reasoning steps
- Do NOT show analysis
- ONLY give the final response to the student

Always guide using questions, not direct answers.
Use simple Bahasa Indonesia.
Be concise and encouraging.
`;

// ─── CORS HEADERS ────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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
    // UPDATED API KEY FALLBACK
    const apiKey = process.env.NVIDIA_API_KEY || "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";
    
    // Initialize OpenAI client for NVIDIA NIM
    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    });

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

    // Set headers for SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await client.chat.completions.create({
      model: "openai/gpt-oss-20b", // UPDATED MODEL
      messages: messages,
      temperature: 1.0,
      top_p: 1.0,
      max_tokens: 4096,
      stream: true,
    });

    // Stream the chunks to the client
    for await (const chunk of stream) {
      const reasoning = chunk.choices[0]?.delta?.reasoning_content;
      const content = chunk.choices[0]?.delta?.content;

      // Log reasoning to server console as per snippet intent, 
      // but do NOT send to student per behavioral rules.
      if (reasoning) {
        process.stdout.write(reasoning);
      }
      
      if (content) {
        // Send final content chunks
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Signal completion
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error("SERVER ERROR:", error);
    
    if (!res.headersSent) {
      return res.status(500).json({
        error: "Server error",
        details: error.message || String(error)
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
};