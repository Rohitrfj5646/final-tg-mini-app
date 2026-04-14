/* ================================================
   WALLET.JS — Wallet controller
   ================================================ */

const Wallet = {
  currentTab: 'deposit',

  async init() {
    await this.loadWallet();
    this.showTab('deposit');
  },

  async loadWallet() {
    try {
      const resp = await Api.getWallet();

      if (resp.success) {
        // Update balance displays
        const bal = document.getElementById('wallet-balance');
        if (bal) bal.textContent = `$${App.formatNumber(resp.balance)}`;
        App.user = { ...App.user, balance: resp.balance };

        // Profit/Loss from user data
        const me = await Api.getMe();
        if (me.success) {
          const profitEl = document.getElementById('wallet-total-profit');
          const lossEl = document.getElementById('wallet-total-loss');
          if (profitEl) profitEl.textContent = `+$${App.formatNumber(me.user.totalProfit || 0)}`;
          if (lossEl) lossEl.textContent = `-$${App.formatNumber(me.user.totalLoss || 0)}`;
        }

        // Render transactions
        this.renderTransactions(resp.transactions || []);
      }
    } catch (err) {
      console.error('Wallet load error:', err);
    }
  },

  showTab(tab, btn) {
    this.currentTab = tab;

    // Toggle tab contents
    document.querySelectorAll('.wallet-tab-content').forEach((el) => el.classList.add('hidden'));
    const targetTab = document.getElementById(`wallet-${tab}-tab`);
    if (targetTab) targetTab.classList.remove('hidden');

    // Toggle tab buttons
    document.querySelectorAll('.wallet-tab').forEach((b) => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    // Load transactions when showing history
    if (tab === 'history') {
      this.loadWallet();
    }
  },

  async submitDeposit() {
    const amount = parseFloat(document.getElementById('deposit-amount')?.value || 0);
    const method = document.getElementById('deposit-method')?.value || 'bitcoin';
    const note = document.getElementById('deposit-note')?.value || '';

    if (!amount || amount < 10) {
      App.showToast('Minimum deposit is $10', 'error');
      return;
    }

    try {
      const resp = await Api.deposit({ amount, method, note });

      if (resp.success) {
        App.showToast('✅ Deposit request submitted! Admin will approve soon.', 'success', 4000);
        document.getElementById('deposit-amount').value = '';
        document.getElementById('deposit-note').value = '';
      } else {
        throw new Error(resp.message);
      }
    } catch (err) {
      App.showToast('Deposit failed: ' + err.message, 'error');
    }
  },

  async submitWithdraw() {
    const amount = parseFloat(document.getElementById('withdraw-amount')?.value || 0);
    const method = document.getElementById('withdraw-method')?.value || 'bitcoin';
    const address = document.getElementById('withdraw-address')?.value || '';
    const note = document.getElementById('withdraw-note')?.value || '';

    if (!amount || amount < 10) {
      App.showToast('Minimum withdrawal is $10', 'error');
      return;
    }

    if (amount > (App.user?.balance || 0)) {
      App.showToast('Insufficient balance', 'error');
      return;
    }

    if (!address.trim()) {
      App.showToast('Please enter your wallet address/account', 'error');
      return;
    }

    try {
      const resp = await Api.withdraw({ amount, method, address, note });

      if (resp.success) {
        App.showToast('✅ Withdrawal request submitted! Processing within 24h.', 'success', 4000);
        document.getElementById('withdraw-amount').value = '';
        document.getElementById('withdraw-address').value = '';
        document.getElementById('withdraw-note').value = '';
        await this.loadWallet();
      } else {
        throw new Error(resp.message);
      }
    } catch (err) {
      App.showToast('Withdrawal failed: ' + err.message, 'error');
    }
  },

  renderTransactions(transactions) {
    const container = document.getElementById('transaction-history');
    if (!container) return;

    if (!transactions.length) {
      container.innerHTML = '<div class="empty-state">No transactions yet</div>';
      return;
    }

    container.innerHTML = transactions.map((tx) => `
      <div class="tx-card">
        <div class="tx-icon ${tx.type}">
          ${tx.type === 'deposit' ? '💰' : '🏦'}
        </div>
        <div class="tx-info">
          <div class="tx-type">${tx.type}</div>
          <div class="tx-date">${App.timeAgo(tx.createdAt)} · ${tx.method || 'manual'}</div>
        </div>
        <div style="text-align:right;">
          <div class="tx-amount ${tx.type === 'deposit' ? 'positive' : 'negative'}">
            ${tx.type === 'deposit' ? '+' : '-'}$${App.formatNumber(tx.amount)}
          </div>
          <div class="tx-status ${tx.status}">${tx.status}</div>
        </div>
      </div>
    `).join('');
  },

  async watchAdReward() {
    if (!window.Adsgram) {
      App.showToast('Ads system is initializing...', 'error');
      return;
    }

    const btn = document.querySelector('.watch-ad-btn');
    if (btn) btn.disabled = true;

    try {
      // Create Adsgram controller with a Placeholder Block ID. 
      // User must replace this with their real Block ID from adsgram.ai
      const AdController = window.Adsgram.init({ blockId: "your-adsgram-block-id" });

      App.showToast('Loading Video Ad...', 'info');
      
      const result = await AdController.show();
      
      if (result.done) {
        // User watched the ad. Reward them in the UI directly or via an API call.
        // For security, an API route like POST /api/wallet/reward should be made.
        // Here we do a client-side mock reward for immediate UX demonstration.
        App.user.balance += 5.00;
        
        const balEl = document.getElementById('dash-balance');
        if (balEl) balEl.textContent = `$${App.formatNumber(App.user.balance)}`;
        App.updateHeader();

        App.showToast('🎉 You watched the ad! $5.00 added to your account.', 'success', 5000);
      } else {
        App.showToast('Ad was not completed.', 'error');
      }
    } catch (err) {
      console.warn("Adsgram Error:", err);
      // Usually means Ads are not filled/no ads available right now for this user/region.
      App.showToast('No ads available right now. Please try again later.', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }
};
