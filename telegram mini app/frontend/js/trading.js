/* ================================================
   TRADING.JS — Demo Trading controller
   ================================================ */

const Trading = {
  currentType: 'BUY',
  currentSymbol: 'BTCUSDT',
  pendingTrade: null,
  priceRefreshTimer: null,

  init() {
    this.loadBalance();
    this.loadTrades();
    this.updateSymbolPrice();
    this.startPriceRefresh();
  },

  setType(type, btn) {
    this.currentType = type;

    document.querySelectorAll('.trade-tab').forEach((b) => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    // Update submit button
    const submitBtn = document.getElementById('place-trade-btn');
    if (submitBtn) {
      submitBtn.style.background = type === 'BUY'
        ? 'linear-gradient(135deg, var(--green), #00b87a)'
        : 'linear-gradient(135deg, var(--red), #d63851)';
      submitBtn.textContent = `${type === 'BUY' ? '🟢 Place Buy Order' : '🔴 Place Sell Order'}`;
    }
  },

  async loadBalance() {
    try {
      const resp = await Api.getMe();
      if (resp.success) {
        App.user = resp.user;
        const el = document.getElementById('trade-balance');
        if (el) el.textContent = `$${App.formatNumber(resp.user.balance)}`;
      }
    } catch (e) {}
  },

  updateSymbolPrice() {
    const sym = document.getElementById('trade-symbol');
    if (sym) this.currentSymbol = sym.value;

    this.fetchCurrentPrice();
  },

  async fetchCurrentPrice() {
    try {
      const resp = await Api.getPrice(this.currentSymbol);
      const el = document.getElementById('trade-current-price');
      if (el && resp.success) {
        el.textContent = `$${App.formatPrice(resp.price)}`;
      }
    } catch (e) {
      const el = document.getElementById('trade-current-price');
      if (el) el.textContent = 'Unable to fetch';
    }
  },

  startPriceRefresh() {
    if (this.priceRefreshTimer) clearInterval(this.priceRefreshTimer);
    this.priceRefreshTimer = setInterval(() => {
      if (App.currentPage === 'trading') this.fetchCurrentPrice();
    }, 10000);
  },

  setAmount(amount) {
    const inp = document.getElementById('trade-amount');
    if (inp) inp.value = amount;
  },

  setMax() {
    const balance = App.user?.balance || 0;
    const inp = document.getElementById('trade-amount');
    if (inp) inp.value = Math.floor(balance);
  },

  async placeTrade() {
    const amountInp = document.getElementById('trade-amount');
    const amount = parseFloat(amountInp?.value || 0);

    if (!amount || amount < 10) {
      App.showToast('Minimum amount is $10', 'error');
      return;
    }

    if (amount > (App.user?.balance || 0)) {
      App.showToast('Insufficient balance', 'error');
      return;
    }

    // Get current price for display
    let price = 0;
    try {
      const resp = await Api.getPrice(this.currentSymbol);
      price = resp.price || 0;
    } catch (e) {}

    // Store pending trade data
    this.pendingTrade = {
      symbol: this.currentSymbol,
      type: this.currentType,
      amount,
      entryPrice: price,
    };

    // Show confirmation modal
    const symName = this.currentSymbol.replace('USDT', '');
    document.getElementById('modal-icon').textContent = this.currentType === 'BUY' ? '🟢' : '🔴';
    document.getElementById('modal-title').textContent = `Confirm ${this.currentType} Order`;
    document.getElementById('modal-details').innerHTML = `
      <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:8px;margin-bottom:8px;">
        <span>Symbol</span><strong style="color:var(--text-primary)">${symName}/USDT</strong>
      </div>
      <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:8px;margin-bottom:8px;">
        <span>Type</span>
        <strong style="color:${this.currentType === 'BUY' ? 'var(--green)' : 'var(--red)'}">${this.currentType}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:8px;margin-bottom:8px;">
        <span>Amount</span><strong style="color:var(--text-primary)">$${App.formatNumber(amount)}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span>Entry Price</span><strong style="color:var(--text-primary)">$${App.formatPrice(price)}</strong>
      </div>
    `;

    document.getElementById('trade-modal').classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('trade-modal').classList.add('hidden');
    this.pendingTrade = null;
  },

  async confirmTrade() {
    if (!this.pendingTrade) return;

    const btn = document.getElementById('modal-confirm-btn');
    if (btn) { btn.textContent = '⏳ Placing...'; btn.disabled = true; }

    try {
      const resp = await Api.placeTrade(this.pendingTrade);

      if (resp.success) {
        App.showToast(`✅ ${this.pendingTrade.type} order placed!`, 'success');
        this.closeModal();
        this.loadBalance();
        this.loadTrades();
        App.updateHeader();

        // Clear amount input
        const inp = document.getElementById('trade-amount');
        if (inp) inp.value = '';
      } else {
        throw new Error(resp.message);
      }
    } catch (err) {
      App.showToast('Trade failed: ' + err.message, 'error');
    } finally {
      if (btn) { btn.textContent = 'Confirm'; btn.disabled = false; }
    }
  },

  async loadTrades() {
    await Promise.allSettled([
      this.loadOpenTrades(),
      this.loadClosedTrades(),
    ]);
  },

  async loadOpenTrades() {
    const container = document.getElementById('open-trades-list');
    if (!container) return;

    try {
      const resp = await Api.getTrades('open');

      if (!resp.success || !resp.trades.length) {
        container.innerHTML = '<div class="empty-state">No open positions</div>';
        return;
      }

      container.innerHTML = resp.trades.map((t) => this.renderOpenTrade(t)).join('');
    } catch (err) {
      container.innerHTML = '<div class="empty-state">Failed to load trades</div>';
    }
  },

  renderOpenTrade(trade) {
    const typeClass = trade.type.toLowerCase();
    const symName = trade.symbol.replace('USDT', '');
    return `
      <div class="trade-card">
        <div class="trade-card-icon ${typeClass}">
          ${trade.type === 'BUY' ? '📈' : '📉'}
        </div>
        <div class="trade-card-info">
          <div class="trade-card-symbol">${symName}/USDT</div>
          <div class="trade-card-meta">
            ${trade.type} · $${App.formatNumber(trade.amount)} · Entry: $${App.formatPrice(trade.entryPrice)}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <div class="trade-card-pnl-val positive">🔄 OPEN</div>
          <button class="trade-card-close-btn" onclick="Trading.closeTrade('${trade.id}')">Close</button>
        </div>
      </div>
    `;
  },

  async closeTrade(tradeId) {
    if (!confirm('Close this trade now?')) return;

    try {
      const resp = await Api.closeTrade(tradeId);

      if (resp.success) {
        const pnl = resp.trade.pnl;
        const sign = pnl >= 0 ? '+' : '';
        App.showToast(`Trade closed: ${sign}$${App.formatNumber(Math.abs(pnl))}`, pnl >= 0 ? 'success' : 'error');
        this.loadBalance();
        this.loadTrades();
      }
    } catch (err) {
      App.showToast('Failed to close trade: ' + err.message, 'error');
    }
  },

  async loadClosedTrades() {
    const container = document.getElementById('closed-trades-list');
    if (!container) return;

    try {
      const resp = await Api.getTrades('closed');

      if (!resp.success || !resp.trades.length) {
        container.innerHTML = '<div class="empty-state">No trade history yet</div>';
        return;
      }

      container.innerHTML = resp.trades.slice(0, 10).map((t) => this.renderClosedTrade(t)).join('');
    } catch (err) {
      container.innerHTML = '<div class="empty-state">Failed to load history</div>';
    }
  },

  renderClosedTrade(trade) {
    const typeClass = trade.type.toLowerCase();
    const symName = trade.symbol.replace('USDT', '');
    const pnl = trade.pnl || 0;
    const pnlPositive = pnl >= 0;

    return `
      <div class="trade-card">
        <div class="trade-card-icon ${typeClass}">
          ${trade.type === 'BUY' ? '📈' : '📉'}
        </div>
        <div class="trade-card-info">
          <div class="trade-card-symbol">${symName}/USDT <span style="font-size:11px;color:var(--text-muted);">${trade.type}</span></div>
          <div class="trade-card-meta">
            $${App.formatNumber(trade.amount)} · ${App.timeAgo(trade.closedAt || trade.createdAt)}
          </div>
        </div>
        <div class="trade-card-pnl">
          <div class="trade-card-pnl-val ${pnlPositive ? 'positive' : 'negative'}">
            ${pnlPositive ? '+' : ''}$${App.formatNumber(Math.abs(pnl))}
          </div>
          <div style="font-size:11px;color:var(--text-muted);">
            ${pnlPositive ? '▲' : '▼'} ${Math.abs(trade.pnlPercentage || 0).toFixed(1)}%
          </div>
        </div>
      </div>
    `;
  },

  openFromSignal(signalId, symbol, type) {
    App.navigate('trading');
    setTimeout(() => {
      const symSelect = document.getElementById('trade-symbol');
      if (symSelect) {
        const pair = symbol.includes('USDT') ? symbol : symbol + 'USDT';
        symSelect.value = pair;
        this.currentSymbol = pair;
        this.updateSymbolPrice();
      }

      const typeBtn = document.querySelector(`.trade-tab[data-type="${type}"]`);
      if (typeBtn) this.setType(type, typeBtn);
    }, 300);
  },

  openFromChart(type) {
    const sym = Chart.currentSymbol || 'BTCUSDT';
    this.openFromSignal(null, sym, type);
  },
};
