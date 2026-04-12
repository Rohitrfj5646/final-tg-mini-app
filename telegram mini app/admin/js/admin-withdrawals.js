/* ================================================
   ADMIN-WITHDRAWALS.JS — Withdrawal Management
   ================================================ */

const AdminWithdrawals = {
  currentFilter: 'pending',

  async load() {
    await this.filter(this.currentFilter);
  },

  async filter(status, btn) {
    this.currentFilter = status || '';

    if (btn) {
      document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    }

    const container = document.getElementById('withdrawals-table');
    if (!container) return;
    container.innerHTML = '<div class="empty-state">Loading...</div>';

    try {
      let url = '/admin/transactions?type=withdraw';
      if (status) url += `&status=${status}`;

      const resp = await AdminApi.get(url);

      if (!resp.success || !resp.transactions.length) {
        container.innerHTML = `<div class="empty-state">No ${status || ''} withdrawal requests</div>`;
        return;
      }

      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Address</th>
              <th>Note</th>
              <th>Status</th>
              <th>Requested</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${resp.transactions.map((tx) => this.renderRow(tx)).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      container.innerHTML = `<div class="empty-state">Error: ${err.message}</div>`;
    }
  },

  renderRow(tx) {
    const isPending = tx.status === 'pending';
    const userId = tx.userId ? tx.userId.replace('telegram_', '') : '—';
    return `
      <tr>
        <td class="td-primary" style="font-size:12px;">ID: ${userId}</td>
        <td style="color:var(--yellow);font-weight:700;">$${parseFloat(tx.amount || 0).toFixed(2)}</td>
        <td>${tx.method || '—'}</td>
        <td style="font-size:12px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${tx.address || ''}">
          ${tx.address || '—'}
        </td>
        <td style="font-size:12px;color:var(--text2);">${tx.note || '—'}</td>
        <td><span class="badge badge-${tx.status}">${tx.status}</span></td>
        <td style="font-size:12px;">${this.formatDate(tx.createdAt)}</td>
        <td>
          <div class="action-btns">
            ${isPending ? `
              <button class="btn btn-sm btn-success" onclick="AdminWithdrawals.approve('${tx.id}')">✓ Approve</button>
              <button class="btn btn-sm btn-danger" onclick="AdminWithdrawals.reject('${tx.id}')">✕ Reject</button>
            ` : `<span style="color:var(--text3);font-size:12px;">${tx.reviewNote || 'Processed'}</span>`}
          </div>
        </td>
      </tr>
    `;
  },

  async approve(id) {
    const note = prompt('Approval note (optional - e.g. TX hash):') || '';
    try {
      const resp = await AdminApi.patch(`/admin/transactions/${id}/approve`, { note });
      if (resp.success) {
        AdminApp.showToast('✅ Withdrawal approved & balance updated', 'success');
        this.load();
        AdminApp.loadDashboard();
      } else {
        AdminApp.showToast('Error: ' + resp.message, 'error');
      }
    } catch (err) {
      AdminApp.showToast('Error: ' + err.message, 'error');
    }
  },

  async reject(id) {
    const note = prompt('Rejection reason (required):');
    if (!note) return;

    try {
      const resp = await AdminApi.patch(`/admin/transactions/${id}/reject`, { note });
      if (resp.success) {
        AdminApp.showToast('Withdrawal rejected & balance refunded to user', 'info');
        this.load();
        AdminApp.loadDashboard();
      } else {
        AdminApp.showToast('Error: ' + resp.message, 'error');
      }
    } catch (err) {
      AdminApp.showToast('Error: ' + err.message, 'error');
    }
  },

  formatDate(ts) {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return '—'; }
  },
};
