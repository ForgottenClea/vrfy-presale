const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Staging password protection
const STAGING_PASSWORD = process.env.STAGING_PASSWORD || 'vrfy2024';

app.use((req, res, next) => {
  // Skip auth if disabled
  if (process.env.DISABLE_AUTH === 'true') return next();

  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="VRFY Presale Staging"');
    return res.status(401).send('Authentication required');
  }

  const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString();
  const [user, pass] = credentials.split(':');

  if (user === 'vrfy' && pass === STAGING_PASSWORD) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="VRFY Presale Staging"');
  return res.status(401).send('Invalid credentials');
});

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
