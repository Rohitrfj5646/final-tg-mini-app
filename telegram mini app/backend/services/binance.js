const axios = require('axios');

const BINANCE_BASE = 'https://api.binance.com';

// Map clean symbols to Binance trading pairs
const symbolMap = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  BNB: 'BNBUSDT',
  SOL: 'SOLUSDT',
  ADA: 'ADAUSDT',
  XRP: 'XRPUSDT',
  DOGE: 'DOGEUSDT',
  MATIC: 'MATICUSDT',
};

function normalizePair(symbol) {
  const upper = symbol.toUpperCase();
  if (symbolMap[upper]) return symbolMap[upper];
  if (!upper.endsWith('USDT')) return upper + 'USDT';
  return upper;
}

/**
 * Get single price from Binance
 */
async function getBinancePrice(symbol) {
  try {
    const pair = normalizePair(symbol);
    const response = await axios.get(`${BINANCE_BASE}/api/v3/ticker/price`, {
      params: { symbol: pair },
      timeout: 5000,
    });
    return parseFloat(response.data.price);
  } catch (err) {
    console.error(`Binance price error for ${symbol}:`, err.message);
    // Return mock prices as fallback
    const mockPrices = {
      BTCUSDT: 65000, ETHUSDT: 3200, BNBUSDT: 580,
      SOLUSDT: 170, ADAUSDT: 0.45, XRPUSDT: 0.6,
      DOGEUSDT: 0.15, MATICUSDT: 0.85,
    };
    return mockPrices[normalizePair(symbol)] || 100;
  }
}

/**
 * Get multiple prices at once
 */
async function getMultiplePrices(symbols) {
  try {
    const response = await axios.get(`${BINANCE_BASE}/api/v3/ticker/price`, { timeout: 5000 });
    const allPrices = response.data;

    const result = {};
    symbols.forEach((sym) => {
      const pair = normalizePair(sym);
      const found = allPrices.find((p) => p.symbol === pair);
      result[sym.toUpperCase()] = found ? parseFloat(found.price) : 0;
    });

    return result;
  } catch (err) {
    console.error('Binance multi-price error:', err.message);
    return {
      BTC: 65000, ETH: 3200, BNB: 580, SOL: 170,
    };
  }
}

/**
 * Get 24h ticker stats for a symbol
 */
async function get24hStats(symbol) {
  try {
    const pair = normalizePair(symbol);
    const response = await axios.get(`${BINANCE_BASE}/api/v3/ticker/24hr`, {
      params: { symbol: pair },
      timeout: 5000,
    });
    return {
      price: parseFloat(response.data.lastPrice),
      change: parseFloat(response.data.priceChange),
      changePercent: parseFloat(response.data.priceChangePercent),
      high: parseFloat(response.data.highPrice),
      low: parseFloat(response.data.lowPrice),
      volume: parseFloat(response.data.volume),
    };
  } catch (err) {
    console.error('24h stats error:', err.message);
    return { price: 65000, change: 0, changePercent: 0, high: 0, low: 0, volume: 0 };
  }
}

module.exports = { getBinancePrice, getMultiplePrices, get24hStats };
