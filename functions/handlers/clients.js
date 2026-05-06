// Handler: client list
const { sendMessage, editMessage, inlineKeyboard } = require("../helpers/telegram");
const { getAllClients } = require("../helpers/firestore");

async function handleClients(chatId, msgId = null) {
  const clients = await getAllClients();

  if (!clients.length) {
    const text = "😕 No hay clientes registrados aún.";
    if (msgId) return editMessage(chatId, msgId, text, inlineKeyboard([[{ text: "🔙 Volver", callback_data: "cmd:start" }]]));
    return sendMessage(chatId, text, inlineKeyboard([[{ text: "🔙 Volver", callback_data: "cmd:start" }]]));
  }

  const text = `👥 <b>Clientes (${clients.length})</b>\n\nSelecciona un cliente para ver su perfil:`;

  // Build grid: 2 buttons per row
  const rows = [];
  for (let i = 0; i < clients.length; i += 2) {
    const row = [{ text: clients[i].name || clients[i].email || "Sin nombre", callback_data: `client:${clients[i].id}` }];
    if (clients[i + 1]) {
      row.push({ text: clients[i + 1].name || clients[i + 1].email || "Sin nombre", callback_data: `client:${clients[i + 1].id}` });
    }
    rows.push(row);
  }
  rows.push([{ text: "🔙 Volver", callback_data: "cmd:start" }]);

  if (msgId) return editMessage(chatId, msgId, text, inlineKeyboard(rows));
  return sendMessage(chatId, text, inlineKeyboard(rows));
}

module.exports = { handleClients };
