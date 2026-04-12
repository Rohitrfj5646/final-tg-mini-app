/* ================================================
   ADMIN-USERS.JS — User Management
   ================================================ */

const AdminUsers = {
  allUsers: [],
  editingUserId: null,

  async load() {
    const container = document.getElementById('users-table');
    if (!container) return;
    container.innerHTML = '<div class="empty-state">Loading users...</div>';

    try {
      const resp = await AdminApi.get('/admin/users');
      if (!resp.success) throw new Error(resp.message);

      this.allUsers = resp.users || [];
      this.render(this.allUsers);
    } catch (err) {
      container.innerHTML = `<div class="empty-state">Error: ${err.message}</div>`;
    }
  },

  render(users) {
    const container = document.getElementById('users-table');
    if (!container) return;

    if (!users.length) {
      container.innerHTML = '<div class="empty-state">No users found</div>';
      return;
    }

    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Telegram ID</th>
            <th>Balance</th>
            <th>Profit</th>
            <th>Loss</th>
            <th>Role</th>
            <th>Status</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users.map((u) => this.renderRow(u)).join('')}
        </tbody>
      </table>
    `;
  },

  renderRow(u) {
    const isActive = u.isActive !== false;
    const initials = (u.firstName || u.username || 'U')[0].toUpperCase();
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="
              width:34px;height:34px;border-radius:50%;
              background:linear-gradient(135deg,var(--accent),var(--green));
              display:flex;align-items:center;justify-content:center;
              font-weight:700;font-size:13px;color:white;flex-shrink:0;
            ">${initials}</div>
            <div>
              <div class="td-primary">${(u.firstName || '') + ' ' + (u.lastName || '')}</div>
              <div style="font-size:11px;color:var(--text3);">@${u.username || '—'}</div>
            </div>
          </div>
        </td>
        <td style="font-size:12px;">${u.telegramId || '—'}</td>
        <td style="color:var(--green);font-weight:600;">$${parseFloat(u.balance || 0).toFixed(2)}</td>
        <td style="color:var(--green);">+$${parseFloat(u.totalProfit || 0).toFixed(2)}</td>
        <td style="color:var(--red);">-$${parseFloat(u.totalLoss || 0).toFixed(2)}</td>
        <td>
          <span class="badge ${u.role === 'admin' ? 'badge-buy' : 'badge-closed'}">
            ${u.role || 'user'}
          </span>
        </td>
        <td>
          <span class="badge ${isActive ? 'badge-active' : 'badge-rejected'}">
            ${isActive ? 'Active' : 'Banned'}
          </span>
        </td>
        <td style="font-size:12px;">${this.formatDate(u.createdAt)}</td>
        <td>
          <div class="action-btns">
            <button
              class="btn btn-sm btn-info"
              title="Adjust Balance"
              onclick="AdminUsers.openBalanceModal('${u.id}', '${u.username || u.firstName || ''}', ${u.balance || 0})">
              💰
            </button>
            <button
              class="btn btn-sm ${isActive ? 'btn-danger' : 'btn-success'}"
              title="${isActive ? 'Ban user' : 'Unban user'}"
              onclick="AdminUsers.toggleStatus('${u.id}', ${!isActive})">
              ${isActive ? '🚫' : '✅'}
            </button>
          </div>
        </td>
      </tr>
    `;
  },

  search() {
    const query = (document.getElementById('user-search')?.value || '').toLowerCase();
    const filtered = this.allUsers.filter((u) =>
      (u.username || '').toLowerCase().includes(query) ||
      (u.firstName || '').toLowerCase().includes(query) ||
      (u.lastName || '').toLowerCase().includes(query) ||
      String(u.telegramId || '').includes(query)
    );
    this.render(filtered);
  },

  openBalanceModal(userId, username, currentBalance) {
    this.editingUserId = userId;
    const info = document.getElementById('balance-user-info');
    if (info) {
      info.textContent = `User: @${username} | Current Balance: $${parseFloat(currentBalance).toFixed(2)}`;
    }
    const amountEl = document.getElementById('balance-amount');
    if (amountEl) amountEl.value = '';
    document.getElementById('balance-modal').classList.remove('hidden');
  },

  closeBalanceModal() {
    document.getElementById('balance-modal').classList.add('hidden');
    this.editingUserId = null;
  },

  async confirmBalance() {
    const amount = document.getElementById('balance-amount')?.value;
    const operation = document.getElementById('balance-operation')?.value || 'add';

    if (!amount || isNaN(parseFloat(amount))) {
      AdminApp.showToast('Enter a valid amount', 'error');
      return;
    }

    try {
      const resp = await AdminApi.patch(`/admin/users/${this.editingUserId}/balance`, {
        amount: parseFloat(amount),
        operation,
      });

      if (resp.success) {
        AdminApp.showToast('✅ Balance updated successfully', 'success');
        this.closeBalanceModal();
        this.load();
      } else {
        throw new Error(resp.message);
      }
    } catch (err) {
      AdminApp.showToast('Error: ' + err.message, 'error');
    }
  },

  async toggleStatus(userId, newStatus) {
    const action = newStatus ? 'activate' : 'ban';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      const resp = await AdminApi.patch(`/admin/users/${userId}/status`, { isActive: newStatus });
      if (resp.success) {
        AdminApp.showToast(`User ${newStatus ? '✅ activated' : '🚫 banned'}`, newStatus ? 'success' : 'info');
        this.load();
      } else {
        throw new Error(resp.message);
      }
    } catch (err) {
      AdminApp.showToast('Error: ' + err.message, 'error');
    }
  },

  formatDate(ts) {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch (e) { return '—'; }
  },
};
