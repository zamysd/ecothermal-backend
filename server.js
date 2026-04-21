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

// 🔥 WAJIB
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});