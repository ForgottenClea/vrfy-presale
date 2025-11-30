const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint for presale stats (can be connected to contract later)
app.get('/api/stats', (req, res) => {
  res.json({
    totalRaised: '847,250',
    targetRaise: '2,000,000',
    tokensSold: '423,625,000',
    totalTokens: '1,000,000,000',
    currentPrice: '0.002',
    nextPrice: '0.003',
    participants: 1847,
    percentComplete: 42.36
  });
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`VRFY Presale running on port ${PORT}`);
});
