const AdminSignals = {
  editingId: null,

  async load() {
    const container = document.getElementById('signals-table');
    if (!container) return;

    try {
      const resp = await AdminApi.get('/admin/signals');

      if (!resp.success || !resp.signals.length) {
        container.innerHTML = '<div class="empty-state">No signals yet. Create your first signal!</div>';
        return;
      }

      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Type</th>
              <th>Entry</th>
              <th>Stop Loss</th>
              <th>Take Profit</th>
              <th>Conf.</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${resp.signals.map((s) => this.renderRow(s)).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      container.innerHTML = `<div class="empty-state">Error: ${err.message}</div>`;
    }
  },

  renderRow(s) {
    return `
      <tr>
        <td class="td-primary">${s.symbol}</td>
        <td><span class="badge ${s.type === 'BUY' ? 'badge-buy' : 'badge-sell'}">${s.type}</span></td>
        <td>$${parseFloat(s.entry || 0).toFixed(2)}</td>
        <td style="color:var(--red)">$${parseFloat(s.stopLoss || 0).toFixed(2)}</td>
        <td style="color:var(--green)">$${parseFloat(s.takeProfit || 0).toFixed(2)}</td>
        <td>${s.confidence}%</td>
        <td><span class="badge ${s.status === 'active' ? 'badge-active' : 'badge-closed'}">${s.status}</span></td>
        <td>${this.formatDate(s.createdAt)}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-sm btn-info" onclick="AdminSignals.openModal('${s.id}')">✏️</button>
            ${s.status === 'active'
              ? `<button class="btn btn-sm btn-warning" onclick="AdminSignals.closeSignal('${s.id}')">🔒</button>`
              : ''}
            <button class="btn btn-sm btn-danger" onclick="AdminSignals.deleteSignal('${s.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  },

  openModal(signalId) {
    this.editingId = signalId || null;
    const title = document.getElementById('signal-modal-title');
    const submitBtn = document.getElementById('sig-submit-btn');

    if (signalId) {
      if (title) title.textContent = 'Edit Signal';
      if (submitBtn) submitBtn.textContent = '💾 Update Signal';
      // would pre-fill form here from data
    } else {
      if (title) title.textContent = 'Add New Signal';
      if (submitBtn) submitBtn.textContent = '📡 Create Signal';
      // Clear form
      ['sig-symbol', 'sig-type', 'sig-entry', 'sig-confidence', 'sig-sl', 'sig-tp', 'sig-description'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
    }

    document.getElementById('signal-modal').classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('signal-modal').classList.add('hidden');
    this.editingId = null;
  },

  async submitSignal() {
    const data = {
      symbol: document.getElementById('sig-symbol')?.value,
      type: document.getElementById('sig-type')?.value,
      entry: document.getElementById('sig-entry')?.value,
      confidence: document.getElementById('sig-confidence')?.value,
      stopLoss: document.getElementById('sig-sl')?.value,
      takeProfit: document.getElementById('sig-tp')?.value,
      description: document.getElementById('sig-description')?.value,
    };

    if (!data.entry || !data.stopLoss || !data.takeProfit || !data.confidence) {
      AdminApp.showToast('Please fill all required fields', 'error');
      return;
    }

    const btn = document.getElementById('sig-submit-btn');
    if (btn) { btn.textContent = 'Saving...'; btn.disabled = true; }

    try {
      let resp;
      if (this.editingId) {
        resp = await AdminApi.put(`/admin/signals/${this.editingId}`, data);
      } else {
        resp = await AdminApi.post('/admin/signals', data);
      }

      if (resp.success) {
        AdminApp.showToast(`✅ Signal ${this.editingId ? 'updated' : 'created'} successfully`, 'success');
        this.closeModal();
        this.load();
      } else {
        throw new Error(resp.message);
      }
    } catch (err) {
      AdminApp.showToast('Error: ' + err.message, 'error');
    } finally {
      if (btn) { btn.textContent = '📡 Create Signal'; btn.disabled = false; }
    }
  },

  async closeSignal(id) {
    if (!confirm('Close this signal?')) return;
    const resp = await AdminApi.patch(`/admin/signals/${id}/close`, {});
    if (resp.success) {
      AdminApp.showToast('Signal closed', 'success');
      this.load();
    }
  },

  async deleteSignal(id) {
    if (!confirm('Delete this signal permanently?')) return;
    const resp = await AdminApi.delete(`/admin/signals/${id}`);
    if (resp.success) {
      AdminApp.showToast('Signal deleted', 'success');
      this.load();
    }
  },

  formatDate(ts) {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '—'; }
  },
};
