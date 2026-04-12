const express = require('express');
const router = express.Router();
const { getDb } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');

/**
 * GET /api/wallet — balance + transactions
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = getDb();

    const { data: transactions, error } = await db
      .from('transactions')
      .select('*')
      .eq('user_id', req.userData.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    res.json({
      success: true,
      balance: parseFloat(req.userData.balance || 0),
      transactions: transactions || [],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch wallet' });
  }
});

/**
 * POST /api/wallet/deposit — submit deposit request
 */
router.post('/deposit', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const { amount, note, method } = req.body;

    if (!amount || parseFloat(amount) < 10) {
      return res.status(400).json({ success: false, message: 'Minimum deposit is $10' });
    }

    const { data, error } = await db
      .from('transactions')
      .insert([{
        user_id: req.userData.id,
        type: 'deposit',
        amount: parseFloat(amount),
        method: method || 'manual',
        note: note || '',
        status: 'pending',
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Deposit request submitted. Awaiting admin approval.',
      transactionId: data.id,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to submit deposit: ' + err.message });
  }
});

/**
 * POST /api/wallet/withdraw — submit withdrawal request
 */
router.post('/withdraw', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const { amount, method, address, note } = req.body;
    const currentBalance = parseFloat(req.userData.balance);

    if (!amount || parseFloat(amount) < 10) {
      return res.status(400).json({ success: false, message: 'Minimum withdrawal is $10' });
    }

    if (currentBalance < parseFloat(amount)) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    if (!address || !address.trim()) {
      return res.status(400).json({ success: false, message: 'Wallet address is required' });
    }

    const { data, error } = await db
      .from('transactions')
      .insert([{
        user_id: req.userData.id,
        type: 'withdraw',
        amount: parseFloat(amount),
        method: method || 'crypto',
        address: address,
        note: note || '',
        status: 'pending',
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;

    // Hold funds — deduct from balance
    await db
      .from('users')
      .update({ balance: currentBalance - parseFloat(amount) })
      .eq('id', req.userData.id);

    res.json({
      success: true,
      message: 'Withdrawal request submitted. Admin will process within 24h.',
      transactionId: data.id,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to submit withdrawal: ' + err.message });
  }
});

module.exports = router;
