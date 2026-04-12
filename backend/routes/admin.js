const express = require('express');
const router = express.Router();
const { getDb } = require('../config/supabase');
const { adminAuthMiddleware } = require('../middleware/adminAuth');

// ================================================
// DASHBOARD STATS
// ================================================
router.get('/stats', adminAuthMiddleware, async (req, res) => {
  try {
    const db = getDb();

    const [
      { count: totalUsers },
      { count: totalTrades },
      { count: pendingTx },
      { count: activeSignals },
      { data: volumeData },
    ] = await Promise.all([
      db.from('users').select('*', { count: 'exact', head: true }),
      db.from('trades').select('*', { count: 'exact', head: true }),
      db.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      db.from('signals').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      db.from('trades').select('amount'),
    ]);

    const totalVolume = (volumeData || []).reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        totalTrades: totalTrades || 0,
        pendingTransactions: pendingTx || 0,
        activeSignals: activeSignals || 0,
        totalVolume: parseFloat(totalVolume.toFixed(2)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

// ================================================
// SIGNALS CRUD
// ================================================
router.get('/signals', adminAuthMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const { data: signals, error } = await db
      .from('signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json({ success: true, signals: signals || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/signals', adminAuthMiddleware, async (req, res) => {
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
        created_by: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;

    try {
      const { sendSignalAlert } = require('../services/telegram');
      await sendSignalAlert(data);
    } catch (e) { console.warn('Alert skipped:', e.message); }

    res.json({ success: true, signal: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/signals/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const { symbol, type, entry, stopLoss, takeProfit, confidence, description, status } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (symbol) updates.symbol = symbol.toUpperCase();
    if (type) updates.type = type;
    if (entry) updates.entry = parseFloat(entry);
    if (stopLoss) updates.stop_loss = parseFloat(stopLoss);
    if (takeProfit) updates.take_profit = parseFloat(takeProfit);
    if (confidence) updates.confidence = parseInt(confidence);
    if (description !== undefined) updates.description = description;
    if (status) updates.status = status;

    const { error } = await db.from('signals').update(updates).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Signal updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/signals/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const { error } = await db.from('signals').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Signal deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/signals/:id/close', adminAuthMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const { error } = await db
      .from('signals')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================================================
// USER MANAGEMENT
// ================================================
router.get('/users', adminAuthMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const { data: users, error } = await db
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, users: users || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/users/:id/balance', adminAuthMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const { amount, operation } = req.body;

    if (operation === 'set') {
      await db.from('users').update({ balance: parseFloat(amount) }).eq('id', req.params.id);
    } else {
      const { data: user } = await db.from('users').select('balance').eq('id', req.params.id).single();
      const newBalance = parseFloat(user.balance || 0) + parseFloat(amount);
      await db.from('users').update({ balance: newBalance }).eq('id', req.params.id);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/users/:id/status', adminAuthMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const { error } = await db.from('users').update({ is_active: req.body.isActive }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================================================
// TRANSACTIONS (DEPOSITS + WITHDRAWALS)
// ================================================
router.get('/transactions', adminAuthMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const { status, type } = req.query;

    let query = db
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (status) query = query.eq('status', status);
    if (type) query = query.eq('type', type);

    const { data: transactions, error } = await query;
    if (error) throw error;
    res.json({ success: true, transactions: transactions || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/transactions/:id/approve', adminAuthMiddleware, async (req, res) => {
  try {
    const db = getDb();

    const { data: tx, error: fetchErr } = await db
      .from('transactions')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !tx) return res.status(404).json({ success: false, message: 'Not found' });

    await db.from('transactions').update({
      status: 'approved',
      review_note: req.body.note || '',
      reviewed_at: new Date().toISOString(),
    }).eq('id', req.params.id);

    // For deposits: credit user balance
    if (tx.type === 'deposit') {
      const { data: user } = await db.from('users').select('balance').eq('id', tx.user_id).single();
      await db.from('users').update({
        balance: parseFloat(user.balance || 0) + parseFloat(tx.amount),
      }).eq('id', tx.user_id);
    }

    res.json({ success: true, message: 'Transaction approved' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/transactions/:id/reject', adminAuthMiddleware, async (req, res) => {
  try {
    const db = getDb();

    const { data: tx, error: fetchErr } = await db
      .from('transactions')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !tx) return res.status(404).json({ success: false, message: 'Not found' });

    await db.from('transactions').update({
      status: 'rejected',
      review_note: req.body.note || '',
      reviewed_at: new Date().toISOString(),
    }).eq('id', req.params.id);

    // For withdrawals: refund balance
    if (tx.type === 'withdraw') {
      const { data: user } = await db.from('users').select('balance').eq('id', tx.user_id).single();
      await db.from('users').update({
        balance: parseFloat(user.balance || 0) + parseFloat(tx.amount),
      }).eq('id', tx.user_id);
    }

    res.json({ success: true, message: 'Transaction rejected + balance refunded' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================================================
// NEWS
// ================================================
router.get('/news', adminAuthMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const { data, error } = await db.from('news').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, news: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/news', adminAuthMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const { title, content, imageUrl, category } = req.body;
    const { data, error } = await db.from('news').insert([{
      title, content,
      image_url: imageUrl || '',
      category: category || 'crypto',
      published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]).select().single();
    if (error) throw error;
    res.json({ success: true, id: data.id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/news/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const { title, content, imageUrl, category, published } = req.body;
    const { error } = await db.from('news').update({
      title, content,
      image_url: imageUrl,
      category,
      published,
      updated_at: new Date().toISOString(),
    }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/news/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const { error } = await db.from('news').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================================================
// SETTINGS
// ================================================
router.get('/settings', adminAuthMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const { data, error } = await db.from('settings').select('*');
    if (error) throw error;
    const settings = {};
    (data || []).forEach((s) => { settings[s.key] = s.value; });
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/settings', adminAuthMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const { key, value } = req.body;
    const { error } = await db.from('settings').upsert({
      key, value, updated_at: new Date().toISOString()
    });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
