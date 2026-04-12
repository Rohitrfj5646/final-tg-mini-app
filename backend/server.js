require('dotenv').config();
const express = require('express');require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initSupabase } = require('./config/supabase');

// Initialize Supabase
initSupabase();

const app = express();
const PORT = process.env.PORT || 5000;

// ================================================
// MIDDLEWARE
// ================================================
app.use(helmet({ crossOriginEmbedderPolicy: false }));

const allowedOrigins = [
  'http://localhost',
  'http://localhost:3000',
  'http://127.0.0.1',
  'http://localhost:5500',
  process.env.FRONTEND_URL,
  process.env.NGROK_URL,      // set in .env when using ngrok
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Telegram WebApp, mobile apps)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) || 
      origin.endsWith('.ngrok-free.app') || 
      origin.endsWith('.ngrok.io') ||
      origin.endsWith('.replit.app') ||
      origin.endsWith('.replit.dev') ||
      origin.endsWith('.onrender.com') ||
      origin.endsWith('.up.railway.app') ||
      origin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests. Please slow down.' },
});
app.use('/api/', limiter);

// Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ================================================
// ROUTES
// ================================================
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/signals', require('./routes/signals'));
app.use('/api/trades',  require('./routes/trades'));
app.use('/api/wallet',  require('./routes/wallet'));
app.use('/api/news',    require('./routes/news'));
app.use('/api/prices',  require('./routes/prices'));
app.use('/api/admin',   require('./routes/admin'));
app.use('/api/webhook', require('./routes/webhook'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'running',
    database: 'Supabase PostgreSQL',
    supabase: process.env.SUPABASE_URL,
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.path} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ================================================
// FRONTEND STATIC SERVING (For Replit / Single Port)
// ================================================
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// Redirect root to frontend
app.get('/', (req, res) => {
  res.redirect('/frontend');
});

// ================================================
// START
// ================================================
app.listen(PORT, () => {
  const ngrok = process.env.NGROK_URL || '<your-ngrok-url>';
  console.log(`\n🚀 CryptoSignal Pro Backend — Port ${PORT}`);
  console.log(`📡 Health:   http://localhost:${PORT}/api/health`);
  console.log(`🗄️  Database: Supabase @ ${process.env.SUPABASE_URL}`);
  console.log(`🌍 Env:      ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n🤖 Telegram Webhook URL (set via BotFather):`);
  console.log(`   ${ngrok}/api/webhook/telegram\n`);
});

module.exports = app;

const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initSupabase } = require('./config/supabase');

// Initialize Supabase
initSupabase();

const app = express();
const PORT = process.env.PORT || 5000;

// ================================================
// MIDDLEWARE
// ================================================
app.use(helmet({ crossOriginEmbedderPolicy: false }));

const allowedOrigins = [
  'http://localhost',
  'http://localhost:3000',
  'http://127.0.0.1',
  'http://localhost:5500',
  process.env.FRONTEND_URL,
  process.env.NGROK_URL,      // set in .env when using ngrok
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Telegram WebApp, mobile apps)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) || 
      origin.endsWith('.ngrok-free.app') || 
      origin.endsWith('.ngrok.io') ||
      origin.endsWith('.replit.app') ||
      origin.endsWith('.replit.dev')
    ) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests. Please slow down.' },
});
app.use('/api/', limiter);

// Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ================================================
// ROUTES
// ================================================
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/signals', require('./routes/signals'));
app.use('/api/trades',  require('./routes/trades'));
app.use('/api/wallet',  require('./routes/wallet'));
app.use('/api/news',    require('./routes/news'));
app.use('/api/prices',  require('./routes/prices'));
app.use('/api/admin',   require('./routes/admin'));
app.use('/api/webhook', require('./routes/webhook'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'running',
    database: 'Supabase PostgreSQL',
    supabase: process.env.SUPABASE_URL,
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.path} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ================================================
// FRONTEND STATIC SERVING (For Replit / Single Port)
// ================================================
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// Redirect root to frontend
app.get('/', (req, res) => {
  res.redirect('/frontend');
});

// ================================================
// START
// ================================================
app.listen(PORT, () => {
  const ngrok = process.env.NGROK_URL || '<your-ngrok-url>';
  console.log(`\n🚀 CryptoSignal Pro Backend — Port ${PORT}`);
  console.log(`📡 Health:   http://localhost:${PORT}/api/health`);
  console.log(`🗄️  Database: Supabase @ ${process.env.SUPABASE_URL}`);
  console.log(`🌍 Env:      ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n🤖 Telegram Webhook URL (set via BotFather):`);
  console.log(`   ${ngrok}/api/webhook/telegram\n`);
});

module.exports = app;
