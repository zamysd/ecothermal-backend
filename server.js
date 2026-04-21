const express = require('express');
const cors = require('cors');
const { chat } = require('./index');

const app = express();
app.use(cors());
app.use(express.json());

// root
app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

// chat endpoint
app.post('/chat', (req, res) => chat(req, res));

// 🔥 STABILITY FIX: Railway PORT + Keep-Alive
const PORT = parseInt(process.env.PORT) || 3000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Avoid "Connection reset by peer" errors on Railway/Proxies
// Ensure server timeout is longer than the proxy timeout (120s)
server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;