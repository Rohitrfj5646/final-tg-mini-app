const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getDb } = require('../config/supabase');
const { validateTelegramData } = require('../middleware/auth');

/**
 * POST /api/auth/telegram
 * Validates Telegram initData, creates/fetches user in Supabase
 */
router.post('/telegram', async (req, res) => {
  try {
    const { initData, testMode } = req.body;

    let telegramUser;

    if (testMode && process.env.NODE_ENV !== 'production') {
      telegramUser = {
        id: 999999999,
        first_name: 'Demo',
        last_name: 'User',
        username: 'demo_user',
        photo_url: '',
      };
    } else {
      if (!initData) {
        return res.status(400).json({ success: false, message: 'initData is required' });
      }
      telegramUser = validateTelegramData(initData);
      if (!telegramUser) {
        return res.status(401).json({ success: false, message: 'Invalid Telegram data' });
      }
    }

    const db = getDb();
    const uid = `telegram_${telegramUser.id}`;

    // Check if user exists
    const { data: existingUser } = await db
      .from('users')
      .select('*')
      .eq('id', uid)
      .single();

    let userData;

    if (!existingUser) {
      // Create new user
      const newUser = {
        id: uid,
        telegram_id: telegramUser.id,
        username: telegramUser.username || `user${telegramUser.id}`,
        first_name: telegramUser.first_name || '',
        last_name: telegramUser.last_name || '',
        photo_url: telegramUser.photo_url || '',
        balance: 10000,
        total_profit: 0,
        total_loss: 0,
        role: 'user',
        is_active: true,
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
      };

      const { data: created, error } = await db
        .from('users')
        .insert([newUser])
        .select()
        .single();

      if (error) {
        console.error('Create user error:', error);
        return res.status(500).json({ success: false, message: 'Failed to create user: ' + error.message });
      }

      userData = created;
    } else {
      // Update last login
      await db
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', uid);

      userData = existingUser;
    }

    // Generate JWT
    const jwtToken = jwt.sign(
      {
        uid,
        telegramId: telegramUser.id,
        username: userData.username,
        role: userData.role,
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token: jwtToken,
      user: {
        uid,
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
        photoUrl: userData.photo_url,
        balance: userData.balance,
        role: userData.role,
      },
    });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ success: false, message: 'Authentication failed', error: err.message });
  }
});

/**
 * POST /api/auth/admin-login
 */
router.post('/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { username, isAdmin: true },
      process.env.ADMIN_JWT_SECRET || 'admin_secret',
      { expiresIn: '24h' }
    );

    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', require('../middleware/auth').authMiddleware, async (req, res) => {
  const u = req.userData;
  res.json({
    success: true,
    user: {
      uid: u.id,
      username: u.username,
      firstName: u.first_name,
      lastName: u.last_name,
      photoUrl: u.photo_url,
      balance: parseFloat(u.balance),
      totalProfit: parseFloat(u.total_profit || 0),
      totalLoss: parseFloat(u.total_loss || 0),
      role: u.role,
    },
  });
});

module.exports = router;
