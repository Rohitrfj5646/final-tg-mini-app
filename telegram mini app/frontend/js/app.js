/* ================================================
   APP.JS — Core App Controller
   Handles: Telegram init, auth, routing, global state
   ================================================ */

const App = {
  user: null,
  currentPage: 'dashboard',
  tg: null,

  async init() {
    console.log('🚀 CryptoSignal Pro initializing...');

    // Init Telegram WebApp
    this.initTelegram();

    // Show loading screen for 2.5s minimum
    await this.delay(2500);

    // Check for existing session
    const savedToken = localStorage.getItem('trading_token');
    const savedUser = localStorage.getItem('trading_user');

    if (savedToken && savedUser) {
      try {
        // Verify token is still valid
        const resp = await Api.getMe();
        if (resp.success) {
          this.user = resp.user;
          this.showApp();
          return;
        }
      } catch (e) {
        Api.clearToken();
      }
    }

    // Try auto-login with Telegram
    if (this.tg && this.tg.initData) {
      try {
        await this.loginWithTelegram();
        return;
      } catch (e) {
        console.warn('Auto Telegram login failed:', e.message);
      }
    }

    // Show auth screen
    this.hideLoading();
    this.showAuthScreen();
  },

  initTelegram() {
    if (window.Telegram && window.Telegram.WebApp) {
      this.tg = window.Telegram.WebApp;
      this.tg.ready();
      this.tg.expand();

      // Match Telegram theme
      if (this.tg.colorScheme === 'dark') {
        document.body.classList.add('tg-dark');
      }

      // Set header color
      try {
        this.tg.setHeaderColor('#0a0e1a');
        this.tg.setBackgroundColor('#0a0e1a');
      } catch (e) {}

      console.log('✅ Telegram WebApp SDK initialized');
    } else {
      console.warn('⚠️ Not running inside Telegram. Demo mode available.');
    }
  },

  async loginWithTelegram() {
    try {
      const btn = document.getElementById('auth-btn');
      if (btn) { btn.textContent = '⏳ Connecting...'; btn.disabled = true; }

      const initData = this.tg?.initData || '';
      const resp = await Api.loginTelegram(initData, !initData);

      if (resp.success) {
        Api.setToken(resp.token);
        localStorage.setItem('trading_user', JSON.stringify(resp.user));
        this.user = resp.user;

        // Log Supabase connection (frontend client already initialized)
        console.log('✅ Auth OK — Supabase connected:', !!window.supabaseClient);

        this.showApp();
      } else {
        throw new Error(resp.message || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      this.hideLoading(); // FIX: Hide loading screen on error
      this.showAuthScreen(); // Show auth screen instead
      this.showToast('Login failed: ' + err.message, 'error');
      const btn = document.getElementById('auth-btn');
      if (btn) { btn.textContent = '🚀 Continue with Telegram'; btn.disabled = false; }
      throw err; // Rethrow so init() knows it failed
    }
  },

  async loginDemo() {
    try {
      const btn = document.getElementById('demo-btn');
      if (btn) { btn.textContent = '⏳ Loading demo...'; btn.disabled = true; }

      const resp = await Api.loginTelegram('', true);

      if (resp.success) {
        Api.setToken(resp.token);
        localStorage.setItem('trading_user', JSON.stringify(resp.user));
        this.user = resp.user;
        this.showApp();
      }
    } catch (err) {
      this.showToast('Demo mode unavailable: ' + err.message, 'error');
    }
  },

  async signInFirebase(customToken) {
    try {
      const { getAuth, signInWithCustomToken } = window._firebaseModules || {};
      if (!getAuth || !window.firebaseApp) return;

      const auth = getAuth(window.firebaseApp);
      await signInWithCustomToken(auth, customToken);
      console.log('✅ Firebase auth successful');
    } catch (e) {
      console.warn('Firebase sign-in skipped:', e.message);
    }
  },

  showApp() {
    this.hideLoading();
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');

    // Update header
    this.updateHeader();

    // Initialize all modules
    Dashboard.init();
    Signals.init();

    // Navigate to dashboard
    this.navigate('dashboard');

    // Start price ticker
    this.startPriceTicker();
  },

  updateHeader() {
    if (!this.user) return;

    const name = document.getElementById('user-name');
    const avatar = document.getElementById('user-avatar');
    const balance = document.getElementById('user-balance-header');

    if (name) name.textContent = this.user.firstName
      ? `${this.user.firstName} ${this.user.lastName || ''}`.trim()
      : `@${this.user.username}`;

    if (avatar) {
      if (this.user.photoUrl) {
        avatar.innerHTML = `<img src="${this.user.photoUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" alt="avatar" />`;
      } else {
        avatar.textContent = (this.user.firstName || this.user.username || 'U')[0].toUpperCase();
      }
    }

    if (balance) balance.textContent = `$${this.formatNumber(this.user.balance)}`;
  },

  navigate(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));

    // Show target page
    const pageEl = document.getElementById(`page-${page}`);
    const navBtn = document.getElementById(`nav-${page}`);

    if (pageEl) pageEl.classList.add('active');
    if (navBtn) navBtn.classList.add('active');

    this.currentPage = page;

    // Page-specific init
    switch (page) {
      case 'dashboard': Dashboard.refresh(); break;
      case 'signals': Signals.load(); break;
      case 'trading': Trading.init(); break;
      case 'chart': Chart.init(); break;
      case 'wallet': Wallet.init(); break;
    }

    // Telegram haptic feedback
    try { this.tg?.HapticFeedback?.impactOccurred('light'); } catch (e) {}
  },

  async startPriceTicker() {
    const symbols = ['BTC', 'ETH', 'BNB', 'SOL'];

    const updatePrices = async () => {
      try {
        const resp = await Api.getPrices(symbols.map((s) => `${s}USDT`));
        if (resp.success && resp.prices) {
          Dashboard.updatePriceCards(resp.prices);

          // Update balance in header
          const me = await Api.getMe();
          if (me.success) {
            this.user = me.user;
            const balance = document.getElementById('user-balance-header');
            if (balance) balance.textContent = `$${this.formatNumber(me.user.balance)}`;
          }
        }
      } catch (e) {
        console.warn('Price update failed:', e.message);
      }
    };

    await updatePrices();
    setInterval(updatePrices, 15000); // Refresh every 15s
  },

  toggleNotifications() {
    this.showToast('🔔 Notifications enabled via Telegram Bot', 'info');
  },

  showToast(message, type = 'info', duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
      toast.className = 'toast hidden';
    }, duration);
  },

  hideLoading() {
    const loading = document.getElementById('loading-screen');
    if (loading) {
      loading.style.opacity = '0';
      loading.style.transition = 'opacity 0.5s ease';
      setTimeout(() => loading.remove(), 500);
    }
  },

  showAuthScreen() {
    document.getElementById('auth-screen').classList.remove('hidden');
  },

  formatNumber(n, decimals = 2) {
    if (!n && n !== 0) return '0.00';
    return parseFloat(n).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  },

  formatPrice(n) {
    if (n >= 1000) return this.formatNumber(n, 2);
    if (n >= 1) return this.formatNumber(n, 4);
    return this.formatNumber(n, 6);
  },

  timeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  },

  delay: (ms) => new Promise((r) => setTimeout(r, ms)),

  logout() {
    Api.clearToken();
    this.user = null;
    window.location.reload();
  },
};

// Auto-init when DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
