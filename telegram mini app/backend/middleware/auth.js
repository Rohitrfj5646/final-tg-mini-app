const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getDb } = require('../config/supabase');

/**
 * Validates Telegram WebApp initData HMAC signature
 */
function validateTelegramData(initData) {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return null;

    urlParams.delete('hash');

    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const botToken = (process.env.TELEGRAM_BOT_TOKEN || 'test_token').trim();
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (computedHash !== hash) {
      console.warn('Telegram auth failed: Hash mismatch', { computedHash, receivedHash: hash });
      return null;
    }

    const userStr = urlParams.get('user');
    if (!userStr) return null;

    return JSON.parse(decodeURIComponent(userStr));
  } catch (err) {
    return null;
  }
}

/**
 * JWT Auth Middleware — verifies Bearer token
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    req.user = decoded;

    // Fetch fresh user from Supabase
    const db = getDb();
    const { data: user, error } = await db
      .from('users')
      .select('*')
      .eq('id', decoded.uid)
      .single();

    if (error || !user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account suspended' });
    }

    req.userData = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

module.exports = { authMiddleware, validateTelegramData };
