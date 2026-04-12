const axios = require('axios');
const { getDb } = require('../config/supabase');

/**
 * Send a message via the Telegram Bot API
 */
async function sendTelegramMessage(chatId, message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token === 'your_telegram_bot_token_here') {
    console.warn('⚠️  Telegram bot token not configured. Skipping notification.');
    return;
  }

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
    });
  } catch (err) {
    console.error('Telegram send error:', err.message);
  }
}

/**
 * Broadcast a signal alert to all active subscribers (Supabase)
 */
async function sendSignalAlert(signal) {
  const emoji = signal.type === 'BUY' ? '🟢' : '🔴';
  const message = `
${emoji} <b>NEW ${signal.type} SIGNAL</b>

💎 <b>Coin:</b> ${signal.symbol}
📈 <b>Entry:</b> $${signal.entry}
🛑 <b>Stop Loss:</b> $${signal.stop_loss || signal.stopLoss}
🎯 <b>Take Profit:</b> $${signal.take_profit || signal.takeProfit}
🔥 <b>Confidence:</b> ${signal.confidence}%

${signal.description ? `📝 ${signal.description}` : ''}

⚡ Trade responsibly. This is not financial advice.
`;

  try {
    const db = getDb();
    const { data: subscribers, error } = await db
      .from('subscribers')
      .select('chat_id')
      .eq('active', true);

    if (error) throw error;

    if (!subscribers || subscribers.length === 0) {
      console.log('ℹ️  No active subscribers to notify.');
      return;
    }

    const promises = subscribers.map((sub) =>
      sendTelegramMessage(sub.chat_id, message)
    );

    await Promise.allSettled(promises);
    console.log(`✅ Signal alert sent to ${subscribers.length} subscribers`);
  } catch (err) {
    console.error('Signal broadcast error:', err.message);
  }
}

/**
 * Subscribe a user to signal alerts
 */
async function subscribeUser(chatId, username) {
  try {
    const db = getDb();
    await db
      .from('subscribers')
      .upsert({ chat_id: chatId, username: username || '', active: true }, { onConflict: 'chat_id' });
    console.log(`✅ Subscribed chat_id: ${chatId}`);
  } catch (err) {
    console.error('Subscribe error:', err.message);
  }
}

/**
 * Unsubscribe a user from signal alerts
 */
async function unsubscribeUser(chatId) {
  try {
    const db = getDb();
    await db
      .from('subscribers')
      .update({ active: false })
      .eq('chat_id', chatId);
    console.log(`✅ Unsubscribed chat_id: ${chatId}`);
  } catch (err) {
    console.error('Unsubscribe error:', err.message);
  }
}

/**
 * Send a personal notification to a user
 */
async function sendUserNotification(chatId, message) {
  await sendTelegramMessage(chatId, message);
}

module.exports = {
  sendTelegramMessage,
  sendSignalAlert,
  subscribeUser,
  unsubscribeUser,
  sendUserNotification,
};
