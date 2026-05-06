// Handler: /start and main menu
const { sendMessage, editMessage, inlineKeyboard } = require("../helpers/telegram");

async function handleStart(chatId, msgId = null) {
  const text =
    `🏋️ <b>TGWL Admin Bot</b>\n\n` +
    `Hola coach 👋\n` +
    `Aquí puedes monitorear en tiempo real toda la actividad de tus clientes.\n\n` +
    `Usa los botones para navegar:`;

  const kb = inlineKeyboard([
    [{ text: "👥 Ver Clientes",          callback_data: "cmd:clients" }],
    [{ text: "⚡ Última Actividad",       callback_data: "cmd:recent"  }],
    [{ text: "⚙️ Gestionar Admins",      callback_data: "cmd:admins"  }],
    [{ text: "❓ Ayuda",                  callback_data: "cmd:help"    }],
  ]);

  if (msgId) return editMessage(chatId, msgId, text, kb);
  return sendMessage(chatId, text, kb);
}

module.exports = { handleStart };
