const express = require('express');
const router = express.Router();
const {
  sendTelegramMessage,
  subscribeUser,
  unsubscribeUser,
} = require('../services/telegram');

/**
 * POST /api/webhook/telegram
 * Receives updates from Telegram Bot API
 * Set this as webhook: https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_HTTPS_URL>/api/webhook/telegram
 */
router.post('/telegram', async (req, res) => {
  // Always respond 200 immediately so Telegram doesn't retry
  res.sendStatus(200);

  try {
    const { message } = req.body;
    if (!message || !message.text) return;

    const chatId = message.chat.id;
    const username = message.from?.username || message.from?.first_name || 'User';
    const text = message.text.trim().toLowerCase();

    if (text === '/start') {
      await sendTelegramMessage(
        chatId,
        `👋 <b>Welcome to CryptoSignal Pro, @${username}!</b>\n\n` +
        `🚀 Get live crypto trading signals directly in Telegram.\n\n` +
        `📲 <b>Commands:</b>\n` +
        `/subscribe — Get signal alerts\n` +
        `/unsubscribe — Stop alerts\n\n` +
        `💎 Open the app below to start trading!`
      );
    } else if (text === '/subscribe') {
      await subscribeUser(chatId, username);
      await sendTelegramMessage(
        chatId,
        `✅ <b>Subscribed!</b>\n\nYou will now receive signal alerts from CryptoSignal Pro.\n\nUse /unsubscribe to stop.`
      );
    } else if (text === '/unsubscribe') {
      await unsubscribeUser(chatId);
      await sendTelegramMessage(
        chatId,
        `🔕 <b>Unsubscribed.</b>\n\nYou will no longer receive signal alerts.\n\nUse /subscribe to re-enable.`
      );
    } else {
      await sendTelegramMessage(
        chatId,
        `🤖 <b>CryptoSignal Pro Bot</b>\n\nAvailable commands:\n/start — Welcome message\n/subscribe — Enable alerts\n/unsubscribe — Disable alerts`
      );
    }
  } catch (err) {
    console.error('Webhook error:', err.message);
  }
});

module.exports = router;
