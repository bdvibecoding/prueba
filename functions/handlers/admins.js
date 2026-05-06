// Handler: admin management panel
const { sendMessage, editMessage, inlineKeyboard } = require("../helpers/telegram");
const { getAdmins } = require("../helpers/firestore");

async function handleAdmins(chatId, msgId = null) {
  const admins = await getAdmins();

  let text = `⚙️ <b>Administradores del Bot</b>\n\n`;
  if (admins.length) {
    admins.forEach((a, i) => {
      const uname = a.username ? `@${a.username}` : "sin username";
      text += `${i + 1}. ${uname} <code>(${a.chatId})</code>\n`;
    });
  } else {
    text += "No hay admins registrados.\n";
  }

  text += `\n<i>Para añadirte como admin, escribe <b>/addme</b>\nPara quitar un admin: <b>/removeadmin @usuario</b></i>`;

  const kb = inlineKeyboard([[{ text: "🔙 Volver", callback_data: "cmd:start" }]]);
  if (msgId) return editMessage(chatId, msgId, text, kb);
  return sendMessage(chatId, text, kb);
}

module.exports = { handleAdmins };
