/* ================================================
   API WRAPPER — All backend API calls
   ================================================ */
const API_BASE = window.API_BASE || 'http://localhost:5000/api';

const Api = {
  _token: null,

  setToken(token) {
    this._token = token;
    localStorage.setItem('trading_token', token);
  },

  getToken() {
    if (!this._token) {
      this._token = localStorage.getItem('trading_token');
    }
    return this._token;
  },

  clearToken() {
    this._token = null;
    localStorage.removeItem('trading_token');
    localStorage.removeItem('trading_user');
  },

  async request(method, path, data = null, isAdmin = false) {
    const token = isAdmin
      ? localStorage.getItem('admin_token')
      : this.getToken();

    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = { method, headers };
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    const url = `${API_BASE}${path}`;

    try {
      const response = await fetch(url, options);
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || `HTTP ${response.status}`);
      }

      return json;
    } catch (err) {
      console.error(`API Error [${method} ${path}]:`, err.message);
      throw err;
    }
  },

  get: (path, isAdmin) => Api.request('GET', path, null, isAdmin),
  post: (path, data, isAdmin) => Api.request('POST', path, data, isAdmin),
  put: (path, data, isAdmin) => Api.request('PUT', path, data, isAdmin),
  patch: (path, data, isAdmin) => Api.request('PATCH', path, data, isAdmin),
  delete: (path, isAdmin) => Api.request('DELETE', path, null, isAdmin),

  // Auth
  loginTelegram: (initData, testMode = false) =>
    Api.post('/auth/telegram', { initData, testMode }),
  adminLogin: (username, password) =>
    Api.post('/auth/admin-login', { username, password }),
  getMe: () => Api.get('/auth/me'),

  // Signals
  getSignals: () => Api.get('/signals'),
  getActiveSignals: () => Api.get('/signals/active'),

  // Trades
  placeTrade: (data) => Api.post('/trades', data),
  getTrades: (status) => Api.get(`/trades${status ? `?status=${status}` : ''}`),
  closeTrade: (id, closePrice) => Api.put(`/trades/${id}/close`, { closePrice }),
  getTradeStats: () => Api.get('/trades/stats'),

  // Wallet
  getWallet: () => Api.get('/wallet'),
  deposit: (data) => Api.post('/wallet/deposit', data),
  withdraw: (data) => Api.post('/wallet/withdraw', data),

  // Prices
  getPrices: (symbols = []) => Api.get(`/prices?symbols=${symbols.join(',')}`),
  getPrice: (symbol) => Api.get(`/prices/${symbol}`),

  // News
  getNews: () => Api.get('/news'),

  // Admin APIs
  admin: {
    getStats: () => Api.get('/admin/stats', true),
    getSignals: () => Api.get('/admin/signals', true),
    createSignal: (data) => Api.post('/admin/signals', data, true),
    updateSignal: (id, data) => Api.put(`/admin/signals/${id}`, data, true),
    deleteSignal: (id) => Api.delete(`/admin/signals/${id}`, true),
    closeSignal: (id) => Api.patch(`/admin/signals/${id}/close`, {}, true),
    getUsers: () => Api.get('/admin/users', true),
    updateUserBalance: (id, amount, operation) =>
      Api.patch(`/admin/users/${id}/balance`, { amount, operation }, true),
    updateUserStatus: (id, isActive) =>
      Api.patch(`/admin/users/${id}/status`, { isActive }, true),
    getTransactions: (status, type) =>
      Api.get(`/admin/transactions${status ? `?status=${status}` : ''}${type ? `&type=${type}` : ''}`, true),
    approveTransaction: (id, note) =>
      Api.patch(`/admin/transactions/${id}/approve`, { note }, true),
    rejectTransaction: (id, note) =>
      Api.patch(`/admin/transactions/${id}/reject`, { note }, true),
    getNews: () => Api.get('/admin/news', true),
    createNews: (data) => Api.post('/admin/news', data, true),
    updateNews: (id, data) => Api.put(`/admin/news/${id}`, data, true),
    deleteNews: (id) => Api.delete(`/admin/news/${id}`, true),
    getSettings: () => Api.get('/admin/settings', true),
    updateSetting: (key, value) => Api.post('/admin/settings', { key, value }, true),
  },
};
