const AdminNews = {
  editingId: null,

  async load() {
    const container = document.getElementById('news-table');
    if (!container) return;

    try {
      const resp = await AdminApi.get('/admin/news');

      if (!resp.success || !resp.news.length) {
        container.innerHTML = '<div class="empty-state">No news articles. Add the first one!</div>';
        return;
      }

      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${resp.news.map((n) => this.renderRow(n)).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      container.innerHTML = `<div class="empty-state">Error: ${err.message}</div>`;
    }
  },

  renderRow(n) {
    return `
      <tr>
        <td>
          <div class="td-primary" style="max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${n.title}
          </div>
        </td>
        <td><span class="badge badge-closed">${n.category || 'crypto'}</span></td>
        <td><span class="badge ${n.published !== false ? 'badge-active' : 'badge-pending'}">
          ${n.published !== false ? 'Published' : 'Draft'}
        </span></td>
        <td>${this.formatDate(n.createdAt)}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-sm btn-info" onclick="AdminNews.openModal('${n.id}', ${JSON.stringify(n).replace(/"/g, '&quot;')})">✏️ Edit</button>
            <button class="btn btn-sm btn-danger" onclick="AdminNews.deleteNews('${n.id}')">🗑️ Delete</button>
          </div>
        </td>
      </tr>
    `;
  },

  openModal(id, data) {
    this.editingId = id || null;
    const title = document.getElementById('news-modal-title');
    const submitBtn = document.getElementById('news-submit-btn');

    if (id && data) {
      if (title) title.textContent = 'Edit Article';
      if (submitBtn) submitBtn.textContent = '💾 Update Article';
      try {
        const n = typeof data === 'string' ? JSON.parse(data.replace(/&quot;/g, '"')) : data;
        document.getElementById('news-title').value = n.title || '';
        document.getElementById('news-content').value = n.content || '';
        document.getElementById('news-image').value = n.imageUrl || '';
        document.getElementById('news-category').value = n.category || 'crypto';
      } catch (e) {}
    } else {
      if (title) title.textContent = 'Add News Article';
      if (submitBtn) submitBtn.textContent = '📰 Publish';
      ['news-title', 'news-content', 'news-image'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
    }

    document.getElementById('news-modal').classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('news-modal').classList.add('hidden');
    this.editingId = null;
  },

  async submitNews() {
    const data = {
      title: document.getElementById('news-title')?.value.trim(),
      content: document.getElementById('news-content')?.value.trim(),
      imageUrl: document.getElementById('news-image')?.value.trim(),
      category: document.getElementById('news-category')?.value,
    };

    if (!data.title || !data.content) {
      AdminApp.showToast('Title and content are required', 'error');
      return;
    }

    const btn = document.getElementById('news-submit-btn');
    if (btn) { btn.textContent = 'Publishing...'; btn.disabled = true; }

    try {
      let resp;
      if (this.editingId) {
        resp = await AdminApi.put(`/admin/news/${this.editingId}`, data);
      } else {
        resp = await AdminApi.post('/admin/news', data);
      }

      if (resp.success) {
        AdminApp.showToast(`✅ Article ${this.editingId ? 'updated' : 'published'}!`, 'success');
        this.closeModal();
        this.load();
      } else {
        throw new Error(resp.message);
      }
    } catch (err) {
      AdminApp.showToast('Error: ' + err.message, 'error');
    } finally {
      if (btn) { btn.textContent = '📰 Publish'; btn.disabled = false; }
    }
  },

  async deleteNews(id) {
    if (!confirm('Delete this article permanently?')) return;
    const resp = await AdminApi.delete(`/admin/news/${id}`);
    if (resp.success) {
      AdminApp.showToast('Article deleted', 'success');
      this.load();
    }
  },

  formatDate(ts) {
    if (!ts) return '—';
    try { return new Date(ts).toLocaleDateString(); } catch (e) { return '—'; }
  },
};

const AdminSettings = {
  async load() {
    try {
      const resp = await AdminApi.get('/admin/settings');
      if (resp.success) {
        const s = resp.settings;
        if (s.app_name) document.getElementById('set-app-name').value = s.app_name;
        if (s.welcome_bonus) document.getElementById('set-welcome-bonus').value = s.welcome_bonus;
        if (s.maintenance) document.getElementById('set-maintenance').value = s.maintenance;
      }
    } catch (e) {}
  },

  async saveApiKeys() {
    const binanceKey = document.getElementById('set-binance-key')?.value;
    const botToken = document.getElementById('set-bot-token')?.value;
    const newsKey = document.getElementById('set-news-key')?.value;

    try {
      const promises = [];
      if (binanceKey) promises.push(AdminApi.post('/admin/settings', { key: 'binance_api_key', value: binanceKey }));
      if (botToken) promises.push(AdminApi.post('/admin/settings', { key: 'bot_token', value: botToken }));
      if (newsKey) promises.push(AdminApi.post('/admin/settings', { key: 'news_api_key', value: newsKey }));

      await Promise.all(promises);
      AdminApp.showToast('✅ API keys saved', 'success');
    } catch (err) {
      AdminApp.showToast('Error saving keys', 'error');
    }
  },

  async saveAppSettings() {
    const appName = document.getElementById('set-app-name')?.value;
    const welcomeBonus = document.getElementById('set-welcome-bonus')?.value;
    const maintenance = document.getElementById('set-maintenance')?.value;

    try {
      const promises = [
        AdminApi.post('/admin/settings', { key: 'app_name', value: appName }),
        AdminApi.post('/admin/settings', { key: 'welcome_bonus', value: welcomeBonus }),
        AdminApi.post('/admin/settings', { key: 'maintenance', value: maintenance }),
      ];

      await Promise.all(promises);
      AdminApp.showToast('✅ Settings saved', 'success');
    } catch (err) {
      AdminApp.showToast('Error saving settings', 'error');
    }
  },
};
