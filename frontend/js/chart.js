/* ================================================
   CHART.JS — TradingView Chart Integration
   ================================================ */

const Chart = {
  currentSymbol: 'BTCUSDT',
  currentInterval: '60',
  widget: null,

  init() {
    this.loadChart(this.currentSymbol);
  },

  loadChart(symbol, btn) {
    this.currentSymbol = symbol;

    // Update active button
    if (btn) {
      document.querySelectorAll('.chart-sym-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    } else {
      document.querySelectorAll('.chart-sym-btn').forEach((b) => {
        if (b.getAttribute('onclick')?.includes(symbol)) b.classList.add('active');
        else b.classList.remove('active');
      });
    }

    this.renderTradingView(symbol, this.currentInterval);
  },

  setInterval(interval, btn) {
    this.currentInterval = interval;

    document.querySelectorAll('.chart-int-btn').forEach((b) => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    this.renderTradingView(this.currentSymbol, interval);
  },

  renderTradingView(symbol, interval) {
    const container = document.getElementById('tradingview-widget');
    if (!container) return;

    // Clean the symbol for TradingView (BTCUSDT → BINANCE:BTCUSDT)
    const tvSymbol = `BINANCE:${symbol.toUpperCase()}`;

    container.innerHTML = '';

    try {
      this.widget = new TradingView.widget({
        autosize: true,
        symbol: tvSymbol,
        interval: interval,
        timezone: 'Asia/Kolkata',
        theme: 'dark',
        style: '1',
        locale: 'en',
        toolbar_bg: '#0a0e1a',
        enable_publishing: false,
        allow_symbol_change: false,
        container_id: 'tradingview-widget',
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        backgroundColor: '#0a0e1a',
        gridColor: 'rgba(255,255,255,0.05)',
        studies: ['RSI@tv-basicstudies', 'MACD@tv-basicstudies'],
        overrides: {
          'paneProperties.background': '#0a0e1a',
          'paneProperties.backgroundType': 'solid',
          'scalesProperties.textColor': '#8b90a7',
          'mainSeriesProperties.candleStyle.upColor': '#00d68f',
          'mainSeriesProperties.candleStyle.downColor': '#ff4c61',
          'mainSeriesProperties.candleStyle.borderUpColor': '#00d68f',
          'mainSeriesProperties.candleStyle.borderDownColor': '#ff4c61',
          'mainSeriesProperties.candleStyle.wickUpColor': '#00d68f',
          'mainSeriesProperties.candleStyle.wickDownColor': '#ff4c61',
        },
      });
    } catch (err) {
      // Fallback — embed TradingView as iframe
      console.warn('TradingView widget error, using iframe fallback:', err.message);
      this.renderIframeFallback(symbol, interval);
    }
  },

  renderIframeFallback(symbol, interval) {
    const container = document.getElementById('tradingview-widget');
    if (!container) return;

    const cleanSym = symbol.toUpperCase();
    const iframeUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tv_chart&symbol=BINANCE%3A${cleanSym}&interval=${interval}&hidesidetoolbar=0&symboledit=1&saveimage=0&toolbarbg=0a0e1a&theme=Dark&style=1&timezone=Asia%2FKolkata&studies=RSI%4044tv-basicstudies&hidevolume=0`;

    container.innerHTML = `
      <iframe
        src="${iframeUrl}"
        frameborder="0"
        allowtransparency="true"
        style="width:100%;height:100%;min-height:400px;border:none;"
        loading="lazy"
      ></iframe>
    `;
  },

  loadChartFromDash(symbol) {
    this.currentSymbol = symbol;
    App.navigate('chart');
    setTimeout(() => this.loadChart(symbol), 200);
  },
};
