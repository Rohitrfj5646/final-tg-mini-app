/* ================================================
   DASHBOARD.JS — Dashboard page controller
   ================================================ */

const Dashboard = {
  priceData: {},

  init() {
    this.refresh();
  },

  async refresh() {
    if (App.currentPage !== 'dashboard') return;
    await Promise.allSettled([
      this.loadStats(),
      this.loadSignalsPreview(),
      this.loadNews(),
    ]);
  },

  async loadStats() {
    try {
      const [tradeStats, signalsResp, user] = await Promise.all([
        Api.getTradeStats(),
        Api.getActiveSignals(),
        Api.getMe(),
      ]);

      if (user.success) {
        App.user = user.user;
        const bal = document.getElementById('dash-balance');
        if (bal) bal.textContent = `$${App.formatNumber(user.user.balance)}`;

        // Update header balance
        const hdrBal = document.getElementById('user-balance-header');
        if (hdrBal) hdrBal.textContent = `$${App.formatNumber(user.user.balance)}`;

        // P&L
        const totalPnl = (user.user.totalProfit || 0) - (user.user.totalLoss || 0);
        const pnlEl = document.getElementById('dash-pnl-text');
        if (pnlEl) {
          pnlEl.textContent = `${totalPnl >= 0 ? '+' : ''}$${App.formatNumber(Math.abs(totalPnl))} net`;
          pnlEl.parentElement.style.color = totalPnl >= 0 ? 'var(--green)' : 'var(--red)';
        }
      }

      if (tradeStats.success) {
        const s = tradeStats.stats;
        this.setEl('dash-win-rate', `${s.winRate}%`);
        this.setEl('dash-total-pnl', `$${App.formatNumber(Math.abs(s.totalPnl))}`);

        const pnlEl = document.getElementById('dash-total-pnl');
        if (pnlEl) pnlEl.style.color = s.totalPnl >= 0 ? 'var(--green)' : 'var(--red)';
      }

      if (signalsResp.success) {
        const count = signalsResp.signals.length;
        this.setEl('dash-active-signals', count);

        // Update badge
        const badge = document.getElementById('signal-count-badge');
        if (badge && count > 0) {
          badge.textContent = count;
          badge.style.display = 'inline-block';
        }
      }

      // Get open trades count
      const openTrades = await Api.getTrades('open');
      if (openTrades.success) {
        this.setEl('dash-open-trades', openTrades.trades.length);
      }
    } catch (err) {
      console.warn('Dashboard stats error:', err.message);
    }
  },

  async loadSignalsPreview() {
    const container = document.getElementById('dash-signals-list');
    if (!container) return;

    try {
      const resp = await Api.getActiveSignals();

      if (!resp.success || !resp.signals.length) {
        container.innerHTML = '<div class="empty-state">No active signals right now</div>';
        return;
      }

      container.innerHTML = resp.signals
        .slice(0, 3)
        .map((s) => this.renderMiniSignal(s))
        .join('');
    } catch (err) {
      container.innerHTML = '<div class="empty-state">Could not load signals</div>';
    }
  },

  renderMiniSignal(signal) {
    const typeClass = signal.type.toLowerCase();
    const conf = signal.confidence || 0;
    const confClass =
      conf >= 85 ? 'confidence-excellent' :
      conf >= 70 ? 'confidence-high' :
      conf >= 55 ? 'confidence-medium' : 'confidence-low';

    return `
      <div class="signal-card ${typeClass}" onclick="App.navigate('signals')">
        <div class="signal-header">
          <span class="signal-symbol">${signal.symbol}</span>
          <span class="signal-badge ${typeClass}">${signal.type}</span>
        </div>
        <div class="signal-prices">
          <div class="signal-price-item">
            <div class="signal-price-label">Entry</div>
            <div class="signal-price-val">$${App.formatPrice(signal.entry)}</div>
          </div>
          <div class="signal-price-item">
            <div class="signal-price-label">Stop Loss</div>
            <div class="signal-price-val" style="color:var(--red)">$${App.formatPrice(signal.stopLoss)}</div>
          </div>
          <div class="signal-price-item">
            <div class="signal-price-label">Target</div>
            <div class="signal-price-val" style="color:var(--green)">$${App.formatPrice(signal.takeProfit)}</div>
          </div>
        </div>
        <div class="signal-confidence ${confClass}">
          <div class="confidence-bar">
            <div class="confidence-fill" style="width:${conf}%"></div>
          </div>
          <span class="confidence-text">${conf}%</span>
        </div>
      </div>
    `;
  },

  async loadNews() {
    const container = document.getElementById('dash-news-list');
    if (!container) return;

    try {
      const resp = await Api.getNews();

      if (!resp.success || !resp.news.length) {
        container.innerHTML = '<div class="empty-state">No news available</div>';
        return;
      }

      container.innerHTML = resp.news
        .slice(0, 4)
        .map((n) => this.renderNewsCard(n))
        .join('');
    } catch (err) {
      container.innerHTML = '<div class="empty-state">Could not load news</div>';
    }
  },

  renderNewsCard(news) {
    const imgContent = news.imageUrl
      ? `<img src="${news.imageUrl}" class="news-thumb" alt="${news.title}" onerror="this.outerHTML='<div class=\\'news-thumb\\'>📰</div>'" />`
      : '<div class="news-thumb">📰</div>';

    return `
      <div class="news-card" onclick="window.open('${news.url || '#'}', '_blank')">
        ${imgContent}
        <div class="news-content">
          <div class="news-title">${news.title}</div>
          <div class="news-meta">
            <span class="news-source">${news.source || 'CryptoNews'}</span>
            <span>${App.timeAgo(news.publishedAt || news.createdAt)}</span>
          </div>
        </div>
      </div>
    `;
  },

  updatePriceCards(prices) {
    const container = document.getElementById('prices-row');
    if (!container) return;

    const symbols = ['BTC', 'ETH', 'BNB', 'SOL'];
    const symbolPairs = { BTC: 'BTCUSDT', ETH: 'ETHUSDT', BNB: 'BNBUSDT', SOL: 'SOLUSDT' };

    container.innerHTML = symbols.map((sym) => {
      const pair = symbolPairs[sym];
      const price = prices[pair] || prices[sym] || 0;
      const prevPrice = this.priceData[sym] || price;
      const change = ((price - prevPrice) / (prevPrice || 1)) * 100;
      const isUp = price >= prevPrice;
      const flashClass = price !== prevPrice ? (isUp ? 'price-flash-up' : 'price-flash-down') : '';

      this.priceData[sym] = price;

      return `
        <div class="price-card ${flashClass}" onclick="Chart.loadChartFromDash('${pair}')">
          <div class="price-symbol">${sym}</div>
          <div class="price-value">$${App.formatPrice(price)}</div>
          <div class="price-change ${isUp ? 'up' : 'down'}">
            ${isUp ? '▲' : '▼'} ${Math.abs(change).toFixed(2)}%
          </div>
        </div>
      `;
    }).join('');

    const timeEl = document.getElementById('price-refresh-time');
    if (timeEl) timeEl.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
  },

  setEl(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  },
};
