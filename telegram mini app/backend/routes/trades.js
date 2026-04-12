const express = require('express');
const router = express.Router();
const { getDb } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');
const { getBinancePrice } = require('../services/binance');

/**
 * POST /api/trades — place demo trade
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const { symbol, type, amount, signalId } = req.body;
    const userId = req.userData.id;
    const currentBalance = parseFloat(req.userData.balance);

    if (!amount || parseFloat(amount) < 10) {
      return res.status(400).json({ success: false, message: 'Minimum trade amount is $10' });
    }

    if (currentBalance < parseFloat(amount)) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    // Get live price
    let entryPrice = 0;
    try {
      entryPrice = await getBinancePrice(symbol);
    } catch (e) {
      entryPrice = parseFloat(req.body.entryPrice) || 0;
    }

    // Insert trade
    const { data: trade, error: tradeError } = await db
      .from('trades')
      .insert([{
        user_id: userId,
        signal_id: signalId || null,
        symbol: symbol.toUpperCase(),
        type,
        amount: parseFloat(amount),
        entry_price: entryPrice,
        status: 'open',
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (tradeError) throw tradeError;

    // Deduct balance
    await db
      .from('users')
      .update({ balance: currentBalance - parseFloat(amount) })
      .eq('id', userId);

    res.json({ success: true, tradeId: trade.id, trade });
  } catch (err) {
    console.error('Trade error:', err);
    res.status(500).json({ success: false, message: 'Failed to place trade: ' + err.message });
  }
});

/**
 * GET /api/trades — user trade history
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const { status } = req.query;

    let query = db
      .from('trades')
      .select('*')
      .eq('user_id', req.userData.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (status) query = query.eq('status', status);

    const { data: trades, error } = await query;
    if (error) throw error;

    res.json({ success: true, trades: trades || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch trades' });
  }
});

/**
 * PUT /api/trades/:id/close — close trade + calculate P&L
 */
router.put('/:id/close', authMiddleware, async (req, res) => {
  try {
    const db = getDb();

    const { data: trade, error: fetchErr } = await db
      .from('trades')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !trade) {
      return res.status(404).json({ success: false, message: 'Trade not found' });
    }

    if (trade.user_id !== req.userData.id) {
      return res.status(403).json({ success: false, message: 'Not your trade' });
    }

    if (trade.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Trade already closed' });
    }

    // Get close price
    let closePrice = 0;
    try {
      closePrice = await getBinancePrice(trade.symbol);
    } catch (e) {
      closePrice = parseFloat(req.body.closePrice) || trade.entry_price;
    }

    // Calculate P&L
    const priceChange = closePrice - trade.entry_price;
    const pnlMultiplier = trade.type === 'BUY' ? 1 : -1;
    const pnlPercentage = (priceChange / trade.entry_price) * 100 * pnlMultiplier;
    const pnl = (trade.amount * pnlPercentage) / 100;
    const returnAmount = Math.max(0, trade.amount + pnl);

    // Update trade
    await db
      .from('trades')
      .update({
        close_price: closePrice,
        pnl: parseFloat(pnl.toFixed(2)),
        pnl_percentage: parseFloat(pnlPercentage.toFixed(2)),
        status: 'closed',
        closed_at: new Date().toISOString(),
      })
      .eq('id', req.params.id);

    // Update user balance + profit/loss
    const currentBalance = parseFloat(req.userData.balance);
    const updateData = { balance: currentBalance + returnAmount };

    if (pnl > 0) {
      updateData.total_profit = parseFloat(req.userData.total_profit || 0) + pnl;
    } else if (pnl < 0) {
      updateData.total_loss = parseFloat(req.userData.total_loss || 0) + Math.abs(pnl);
    }

    await db.from('users').update(updateData).eq('id', req.userData.id);

    res.json({
      success: true,
      trade: {
        id: req.params.id,
        closePrice,
        pnl: parseFloat(pnl.toFixed(2)),
        pnlPercentage: parseFloat(pnlPercentage.toFixed(2)),
        status: 'closed',
      },
    });
  } catch (err) {
    console.error('Close trade error:', err);
    res.status(500).json({ success: false, message: 'Failed to close trade' });
  }
});

/**
 * GET /api/trades/stats — user P&L summary
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const { data: trades, error } = await db
      .from('trades')
      .select('pnl')
      .eq('user_id', req.userData.id)
      .eq('status', 'closed');

    if (error) throw error;

    let totalPnl = 0;
    let winCount = 0;
    let lossCount = 0;

    (trades || []).forEach((t) => {
      const p = parseFloat(t.pnl || 0);
      totalPnl += p;
      if (p > 0) winCount++;
      else if (p < 0) lossCount++;
    });

    const totalTrades = (trades || []).length;
    const winRate = totalTrades > 0 ? ((winCount / totalTrades) * 100).toFixed(1) : '0.0';

    res.json({
      success: true,
      stats: {
        totalTrades,
        winCount,
        lossCount,
        winRate,
        totalPnl: parseFloat(totalPnl.toFixed(2)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

module.exports = router;
