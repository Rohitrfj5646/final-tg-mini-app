/* ================================================
   ADMIN-APP.JS — Core Admin Controller
   ================================================ */

const API_BASE = 'http://localhost:5000/api';

// Auth guard
if (!localStorage.getItem('admin_token')) {
  window.location.href = 'login.html';
}

const AdminApp = {
  currentPage: 'dashboard',
  sidebarOpen: true,

  init() {
    this.navigate('dashboard');
    this.loadDashboard();
  },

  navigate(page, linkEl) {
    // Update pages
    document.querySelectorAll('.admin-page').forEach((p) => p.classList.remove('active'));
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');

    // Update nav links
    document.querySelectorAll('.nav-item').forEach((a) => a.classList.remove('active'));
    if (linkEl) linkEl.classList.add('active');
    else {
      const link = document.querySelector(`.nav-item[data-page="${page}"]`);
      if (link) link.classList.add('active');
    }

    // Update title
    const titles = {
      dashboard: 'Dashboard',
      signals: 'Signal Management',
      users: 'User Management',
      withdrawals: 'Withdrawal Management',
      news: 'News Management',
      settings: 'Settings',
    };
    const titleEl = document.getElementById('topbar-title');
    if (titleEl) titleEl.textContent = titles[page] || page;

    this.currentPage = page;

    // Load page data
    switch (page) {
      case 'dashboard': this.loadDashboard(); break;
      case 'signals': AdminSignals.load(); break;
      case 'users': AdminUsers.load(); break;
      case 'withdrawals': AdminWithdrawals.load(); break;
      case 'news': AdminNews.load(); break;
      case 'settings': AdminSettings.load(); break;
    }

    // Close mobile sidebar
    if (window.innerWidth < 900) this.closeSidebar();

    return false;
  },

  async loadDashboard() {
    try {
      const resp = await AdminApi.get('/admin/stats');
      if (resp.success) {
        const s = resp.stats;
        document.getElementById('stat-users').textContent = s.totalUsers;
        document.getElementById('stat-trades').textContent = s.totalTrades;
        document.getElementById('stat-signals').textContent = s.activeSignals;
        document.getElementById('stat-pending').textContent = s.pendingTransactions;
        document.getElementById('stat-volume').textContent = `$${s.totalVolume?.toLocaleString() || '0'}`;

        // Update sidebar badges
        const pendingBadge = document.getElementById('sidebar-pending-badge');
        if (pendingBadge && s.pendingTransactions > 0) {
          pendingBadge.textContent = s.pendingTransactions;
          pendingBadge.style.display = 'inline-block';
        }
      }
    } catch (e) {
      console.error('Dashboard stats error:', e);
    }

    // Load mini tables
    this.loadDashboardWithdrawals();
    this.loadDashboardSignals();

    const lastUpdated = document.getElementById('last-updated');
    if (lastUpdated) lastUpdated.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
  },

  async loadDashboardWithdrawals() {
    try {
      const resp = await AdminApi.get('/admin/transactions?status=pending&type=withdraw');
      const container = document.getElementById('dash-withdrawals');
      if (!container) return;

      if (!resp.success || !resp.transactions.length) {
        container.innerHTML = '<div class="empty-state">No pending withdrawals</div>';
        return;
      }

      container.innerHTML = `
        <table>
          <thead><tr><th>User</th><th>Amount</th><th>Method</th><th>Action</th></tr></thead>
          <tbody>
            ${resp.transactions.slice(0, 5).map((tx) => `
              <tr>
                <td class="td-primary">${tx.userId?.substring(9, 20) || '—'}</td>
                <td>$${tx.amount?.toFixed(2) || '0'}</td>
                <td>${tx.method || '—'}</td>
                <td>
                  <div class="action-btns">
                    <button class="btn btn-sm btn-success" onclick="AdminWithdrawals.approve('${tx.id}')">✓</button>
                    <button class="btn btn-sm btn-danger" onclick="AdminWithdrawals.reject('${tx.id}')">✕</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (e) {
      console.error('Dashboard withdrawals error:', e);
    }
  },

  async loadDashboardSignals() {
    try {
      const resp = await AdminApi.get('/admin/signals');
      const container = document.getElementById('dash-signals');
      if (!container) return;

      if (!resp.success || !resp.signals.length) {
        container.innerHTML = '<div class="empty-state">No signals yet</div>';
        return;
      }

      container.innerHTML = `
        <table>
          <thead><tr><th>Symbol</th><th>Type</th><th>Entry</th><th>Conf.</th><th>Status</th></tr></thead>
          <tbody>
            ${resp.signals.slice(0, 5).map((s) => `
              <tr>
                <td class="td-primary">${s.symbol}</td>
                <td><span class="badge ${s.type === 'BUY' ? 'badge-buy' : 'badge-sell'}">${s.type}</span></td>
                <td>$${s.entry?.toFixed(2)}</td>
                <td>${s.confidence}%</td>
                <td><span class="badge ${s.status === 'active' ? 'badge-active' : 'badge-closed'}">${s.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (e) {
      console.error('Dashboard signals error:', e);
    }
  },

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
  },

  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
  },

  logout() {
    localStorage.removeItem('admin_token');
    window.location.href = 'login.html';
  },

  showToast(msg, type = 'info') {
    const toast = document.getElementById('admin-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `admin-toast ${type} show`;
    setTimeout(() => { toast.className = 'admin-toast hidden'; }, 3500);
  },
};

/* ================================================
   Admin API Helper
   ================================================ */
const AdminApi = {
  async get(path) {
    const resp = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
    });
    const data = await resp.json();
    if (resp.status === 401) { AdminApp.logout(); }
    return data;
  },
  async post(path, body) {
    const resp = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
      },
      body: JSON.stringify(body),
    });
    return resp.json();
  },
  async put(path, body) {
    const resp = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
      },
      body: JSON.stringify(body),
    });
    return resp.json();
  },
  async patch(path, body) {
    const resp = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
      },
      body: JSON.stringify(body),
    });
    return resp.json();
  },
  async delete(path) {
    const resp = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
    });
    return resp.json();
  },
};

document.addEventListener('DOMContentLoaded', () => AdminApp.init());
