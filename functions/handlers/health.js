// Handler: health check-ins for a client
const { sendMessage, editMessage, inlineKeyboard } = require("../helpers/telegram");
const { getUser, getHealthEntries, _ts } = require("../helpers/firestore");

function _fmtDate(val) {
  if (!val) return "—";
  const d = new Date(_ts(val) * 1000);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

function _stars(val, max = 5) {
  if (val === undefined || val === null) return "—";
  const n = Math.round(Number(val));
  return "⭐".repeat(Math.min(n, max)) + "☆".repeat(Math.max(0, max - n));
}

function _row(label, val) {
  if (val === undefined || val === null || val === "") return "";
  return `   • <b>${label}:</b> ${val}\n`;
}

async function handleHealth(chatId, uid, msgId = null) {
  const [u, entries] = await Promise.all([getUser(uid), getHealthEntries(uid, 5)]);
  if (!u) {
    const err = "❌ Cliente no encontrado.";
    if (msgId) return editMessage(chatId, msgId, err);
    return sendMessage(chatId, err);
  }

  if (!entries.length) {
    const text = `📭 <b>${u.name}</b> aún no tiene registros de salud.`;
    const kb   = inlineKeyboard([[{ text: "🔙 Volver", callback_data: `client:${uid}` }]]);
    if (msgId) return editMessage(chatId, msgId, text, kb);
    return sendMessage(chatId, text, kb);
  }

  let text = `❤️ <b>Salud — ${u.name}</b>\n\n`;

  for (const e of entries) {
    text += `📅 <b>${_fmtDate(e.date || e.createdAt)}</b>\n`;
    if (e.sleep      !== undefined) text += _row("Sueño",   `${e.sleep}h`);
    if (e.mood       !== undefined) text += _row("Humor",   _stars(e.mood));
    if (e.energy     !== undefined) text += _row("Energía", _stars(e.energy));
    if (e.stress     !== undefined) text += _row("Estrés",  _stars(e.stress));
    if (e.pain       !== undefined && e.pain) text += _row("Dolor", e.pain);
    if (e.notes      || e.nota)               text += _row("Nota",  e.notes || e.nota);
    text += "\n";
  }

  const kb = inlineKeyboard([[{ text: "🔙 Volver al perfil", callback_data: `client:${uid}` }]]);
  if (msgId) return editMessage(chatId, msgId, text.trim(), kb);
  return sendMessage(chatId, text.trim(), kb);
}

module.exports = { handleHealth };
