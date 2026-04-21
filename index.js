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
    // API KEY FALLBACK
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
      model: "z-ai/glm4.7",
      messages: messages,
      temperature: 1.0,
      top_p: 1.0,
      max_tokens: 4096,
      chat_template_kwargs: {
        enable_thinking: true,
        clear_thinking: false
      },
      stream: true,
    });

    // Stream the chunks to the client
    for await (const chunk of stream) {
      const reasoning = chunk.choices[0]?.delta?.reasoning_content;
      const content = chunk.choices[0]?.delta?.content;

      if (reasoning) {
        // Send thinking/reasoning chunks
        res.write(`data: ${JSON.stringify({ reasoning })}\n\n`);
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
      // If we've already started streaming, send error as a data chunk
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
};