/* ================================================
   SIGNALS.JS — Live Signals controller
   ================================================ */

const Signals = {
  allSignals: [],
  currentFilter: 'all',
  refreshInterval: null,

  init() {
    this.load();
    // Auto-refresh every 30 seconds
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    this.refreshInterval = setInterval(() => {
      if (App.currentPage === 'signals') this.load();
    }, 30000);
  },

  async load() {
    const container = document.getElementById('signals-list');
    if (!container) return;

    try {
      const resp = await Api.getSignals();

      if (!resp.success) {
        container.innerHTML = '<div class="empty-state">Failed to load signals</div>';
        return;
      }

      this.allSignals = resp.signals || [];
      this.render();

      // Update badge
      const activeCount = this.allSignals.filter((s) => s.status === 'active').length;
      const badge = document.getElementById('signal-count-badge');
      if (badge) {
        badge.textContent = activeCount;
        badge.style.display = activeCount > 0 ? 'inline-block' : 'none';
      }
    } catch (err) {
      console.error('Signals load error:', err);
      container.innerHTML = '<div class="empty-state">Could not connect to server</div>';
    }
  },

  filter(type, btn) {
    this.currentFilter = type;
    document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this.render();
  },

  render() {
    const container = document.getElementById('signals-list');
    if (!container) return;

    let signals = this.allSignals;

    if (this.currentFilter !== 'all') {
      signals = signals.filter((s) => s.type === this.currentFilter);
    }

    if (!signals.length) {
      container.innerHTML = `<div class="empty-state">No ${this.currentFilter === 'all' ? '' : this.currentFilter} signals found</div>`;
      return;
    }

    container.innerHTML = signals.map((s) => this.renderSignalCard(s)).join('');
  },

  renderSignalCard(signal) {
    const typeClass = signal.type.toLowerCase();
    const conf = signal.confidence || 0;
    const confClass =
      conf >= 85 ? 'confidence-excellent' :
      conf >= 70 ? 'confidence-high' :
      conf >= 55 ? 'confidence-medium' : 'confidence-low';

    const statusBadge = signal.status === 'closed'
      ? '<span style="font-size:11px;color:var(--text-muted);background:var(--glass);padding:2px 8px;border-radius:10px;">CLOSED</span>'
      : '';

    return `
      <div class="signal-card ${typeClass}">
        <div class="signal-header">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="signal-symbol">${signal.symbol}</span>
            ${statusBadge}
          </div>
          <span class="signal-badge ${typeClass}">${signal.type}</span>
        </div>

        ${signal.description ? `<p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;line-height:1.4;">${signal.description}</p>` : ''}

        <div class="signal-prices">
          <div class="signal-price-item">
            <div class="signal-price-label">📍 Entry</div>
            <div class="signal-price-val">$${App.formatPrice(signal.entry)}</div>
          </div>
          <div class="signal-price-item">
            <div class="signal-price-label">🛑 Stop Loss</div>
            <div class="signal-price-val" style="color:var(--red)">$${App.formatPrice(signal.stopLoss)}</div>
          </div>
          <div class="signal-price-item">
            <div class="signal-price-label">🎯 Target</div>
            <div class="signal-price-val" style="color:var(--green)">$${App.formatPrice(signal.takeProfit)}</div>
          </div>
        </div>

        <div class="signal-confidence ${confClass}">
          <span style="font-size:12px;color:var(--text-muted);">Confidence</span>
          <div class="confidence-bar">
            <div class="confidence-fill" style="width:${conf}%"></div>
          </div>
          <span class="confidence-text">${conf}%</span>
        </div>

        <div style="display:flex;gap:8px;margin-top:4px;">
          ${signal.status === 'active' ? `
            <button class="signal-trade-btn ${typeClass}" onclick="Trading.openFromSignal('${signal.id}', '${signal.symbol}', '${signal.type}')">
              ${signal.type === 'BUY' ? '🟢 Trade Now' : '🔴 Short Now'}
            </button>
          ` : ''}
          <button onclick="Chart.loadChart('${signal.symbol}USDT')" style="
            flex: ${signal.status === 'active' ? '0 0 44px' : '1'};
            padding: 10px;
            border-radius: var(--border-radius-sm);
            background: var(--glass);
            border: 1px solid var(--border);
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 13px;
          " onclick="App.navigate('chart')">📊</button>
        </div>

        <div style="margin-top:8px;font-size:11px;color:var(--text-muted);">
          ⏰ ${App.timeAgo(signal.createdAt)}
        </div>
      </div>
    `;
  },
};
