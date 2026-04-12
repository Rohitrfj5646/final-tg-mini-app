const express = require('express');
const router = express.Router();
const { getBinancePrice, getMultiplePrices } = require('../services/binance');
const { authMiddleware } = require('../middleware/auth');

/**
 * GET /api/prices/:symbol
 * Get live price for a symbol
 */
router.get('/:symbol', authMiddleware, async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const price = await getBinancePrice(symbol);
    res.json({ success: true, symbol, price });
  } catch (err) {
    console.error('Price fetch error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch price' });
  }
});

/**
 * GET /api/prices
 * Get prices for multiple symbols
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const symbols = (req.query.symbols || 'BTCUSDT,ETHUSDT,BNBUSDT,SOLUSDT').split(',');
    const prices = await getMultiplePrices(symbols);
    res.json({ success: true, prices });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch prices' });
  }
});

module.exports = router;
