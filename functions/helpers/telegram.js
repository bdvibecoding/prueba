// =========================================
// Telegram Bot API helper — TGWL
// =========================================
const TOKEN = "8622382711:AAFGor2YOLi3XZ9KxGl7bkuOQCtoaupM9Qw";
const API   = `https://api.telegram.org/bot${TOKEN}`;

async function callTG(method, body) {
  const res = await fetch(`${API}/${method}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  return res.json();
}

/** Send a plain or HTML message */
function sendMessage(chatId, text, extra = {}) {
  return callTG("sendMessage", {
    chat_id:                  chatId,
    text,
    parse_mode:               "HTML",
    disable_web_page_preview: true,
    ...extra,
  });
}

/** Edit an existing message (inline navigation) */
function editMessage(chatId, messageId, text, extra = {}) {
  return callTG("editMessageText", {
    chat_id:                  chatId,
    message_id:               messageId,
    text,
    parse_mode:               "HTML",
    disable_web_page_preview: true,
    ...extra,
  });
}

/** Acknowledge a callback query (remove spinner) */
function answerCallback(callbackQueryId, text = "") {
  return callTG("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}

/** Delete a message */
function deleteMessage(chatId, messageId) {
  return callTG("deleteMessage", {
    chat_id:    chatId,
    message_id: messageId,
  });
}

/** Build inline keyboard from rows array */
function inlineKeyboard(rows) {
  return { reply_markup: { inline_keyboard: rows } };
}

/** Register webhook URL with Telegram */
async function setWebhook(url) {
  return callTG("setWebhook", { url, allowed_updates: ["message", "callback_query"] });
}

module.exports = { sendMessage, editMessage, deleteMessage, answerCallback, inlineKeyboard, setWebhook };
