const express = require('express');
const router = express.Router();
const { getDb } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');

/**
 * GET /api/signals — all signals (latest 20)
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const { data: signals, error } = await db
      .from('signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    res.json({ success: true, signals: signals || [] });
  } catch (err) {
    console.error('Signals fetch error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch signals' });
  }
});

/**
 * GET /api/signals/active — active signals only
 */
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const { data: signals, error } = await db
      .from('signals')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, signals: signals || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch active signals' });
  }
});

/**
 * POST /api/signals — create signal (admin only)
 */
router.post('/', authMiddleware, async (req, res) => {
  if (req.userData.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin only' });
  }

  try {
    const db = getDb();
    const { symbol, type, entry, stopLoss, takeProfit, confidence, description } = req.body;

    const { data, error } = await db
      .from('signals')
      .insert([{
        symbol: symbol.toUpperCase(),
        type,
        entry: parseFloat(entry),
        stop_loss: parseFloat(stopLoss),
        take_profit: parseFloat(takeProfit),
        confidence: parseInt(confidence),
        description: description || '',
        status: 'active',
        created_by: req.userData.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;

    // Telegram alert
    try {
      const { sendSignalAlert } = require('../services/telegram');
      await sendSignalAlert(data);
    } catch (e) { console.warn('Alert skipped:', e.message); }

    res.json({ success: true, signal: data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create signal: ' + err.message });
  }
});

module.exports = router;
