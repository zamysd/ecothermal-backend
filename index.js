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

    if (!message || typeof message !== 'string') {
      res.set(CORS_HEADERS).status(400).json({ error: 'Missing required field: message' });
      return;
    }

    // 🔥 FORMAT CONTENT UNTUK REST API GEMINI
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

    // 🔥 PANGGIL REST API LANGSUNG (v1 stabil tidak mendukung field systemInstruction secara native di semua region)
    // Solusi: kita gabungkan system instruction ke pesan user/history PERTAMA
    if (formattedContents.length > 0) {
      formattedContents[0].parts[0].text = SYSTEM_INSTRUCTION + "\n\nContext User:\n" + formattedContents[0].parts[0].text;
    } else {
      // Jika history kosong, pesannya hanya 1
      formattedContents.push({
        role: 'user',
        parts: [{ text: SYSTEM_INSTRUCTION + "\n\nUser Question:\n" + message }]
      });
    }

    // Jika history terisi, kita masukkan message baru ke array contents
    if (formattedContents.length > 0 && formattedContents[0].parts[0].text !== (SYSTEM_INSTRUCTION + "\n\nUser Question:\n" + message)) {
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

    // 🔥 PANGGIL REST API LANGSUNG (v1 stabil)
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.0-pro:generateContent?key=${apiKey}`;
    
    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
        throw new Error(`Gemini API Error: ${apiResponse.status} - ${JSON.stringify(data)}`);
    }

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, ada gangguan saat berpikir.";

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