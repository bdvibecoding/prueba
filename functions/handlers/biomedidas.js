// Handler: biomedidas (body measurements) for a client
const { sendMessage, editMessage, inlineKeyboard } = require("../helpers/telegram");
const { getUser, getBiomedidas, _ts } = require("../helpers/firestore");

function _fmtDate(val) {
  if (!val) return "—";
  const d = new Date(_ts(val) * 1000);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function _row(label, val, unit = "") {
  if (val === undefined || val === null || val === "") return "";
  return `   • <b>${label}:</b> ${val}${unit}\n`;
}

async function handleBiomedidas(chatId, uid, msgId = null) {
  const [u, entries] = await Promise.all([getUser(uid), getBiomedidas(uid, 3)]);
  if (!u) {
    const err = "❌ Cliente no encontrado.";
    if (msgId) return editMessage(chatId, msgId, err);
    return sendMessage(chatId, err);
  }

  if (!entries.length) {
    const text = `📭 <b>${u.name}</b> aún no tiene mediciones registradas.`;
    const kb   = inlineKeyboard([[{ text: "🔙 Volver", callback_data: `client:${uid}` }]]);
    if (msgId) return editMessage(chatId, msgId, text, kb);
    return sendMessage(chatId, text, kb);
  }

  let text = `📏 <b>Biomedidas — ${u.name}</b>\n\n`;

  for (const e of entries) {
    text += `📅 <b>${_fmtDate(e.date || e.createdAt)}</b>\n`;
    text += _row("Peso",         e.weight || e.peso,       " kg");
    text += _row("Cintura",      e.waist  || e.cintura,    " cm");
    text += _row("Cadera",       e.hip    || e.cadera,     " cm");
    text += _row("Pecho",        e.chest  || e.pecho,      " cm");
    text += _row("Brazo",        e.arm    || e.brazo,      " cm");
    text += _row("Muslo",        e.thigh  || e.muslo,      " cm");
    text += _row("% Grasa",      e.bodyFat || e.grasaCorporal, "%");
    text += _row("Masa muscular",e.muscleMass || e.masaMuscular, " kg");
    text += "\n";
  }

  const kb = inlineKeyboard([[{ text: "🔙 Volver al perfil", callback_data: `client:${uid}` }]]);
  if (msgId) return editMessage(chatId, msgId, text.trim(), kb);
  return sendMessage(chatId, text.trim(), kb);
}

module.exports = { handleBiomedidas };
