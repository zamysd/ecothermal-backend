const { GoogleGenerativeAI } = require('@google/generative-ai');

// 🔥 HANDLE ERROR GLOBAL (biar tidak crash)
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
Always guide, ask, and scaffold thinking.
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
  // Preflight
  if (req.method === 'OPTIONS') {
    res.set(CORS_HEADERS).status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.set(CORS_HEADERS).status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ API KEY MISSING");
    res.set(CORS_HEADERS).status(500).json({ error: 'API key not configured on server.' });
    return;
  }

  try {
    const { message, history } = req.body;

    console.log("📩 REQUEST:", req.body);

    if (!message || typeof message !== 'string') {
      res.set(CORS_HEADERS).status(400).json({ error: 'Missing required field: message' });
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    // 🔥 SAFE HISTORY
    const rawHistory = Array.isArray(history) ? history : [];

    let formattedHistory = [];
    let expectedRole = 'user';

    for (const msg of rawHistory) {
      const msgRole = msg.isUser ? 'user' : 'model';

      if (msgRole === expectedRole && msg.text) {
        formattedHistory.push({
          role: msgRole,
          parts: [{ text: msg.text }],
        });

        expectedRole = expectedRole === 'user' ? 'model' : 'user';
      }
    }

    // 🔥 FIX: pastikan tidak berakhir dengan user
    if (
      formattedHistory.length > 0 &&
      formattedHistory[formattedHistory.length - 1].role === 'user'
    ) {
      formattedHistory.pop();
    }

    console.log("🧠 FORMATTED HISTORY:", formattedHistory);

    const chat = model.startChat({
      history: formattedHistory,
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    console.log("🤖 RESPONSE:", responseText);

    res.set(CORS_HEADERS).status(200).json({ reply: responseText });

  } catch (error) {
    console.error('🔥 GEMINI ERROR FULL:', error);

    res.set(CORS_HEADERS).status(500).json({
      error: 'Failed to get response from AI.',
      details: error.message || String(error),
    });
  }
};