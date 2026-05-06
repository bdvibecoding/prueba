// Handler: workout history for a client
const { sendMessage, editMessage, inlineKeyboard } = require("../helpers/telegram");
const { getUser, getWorkoutSessions, _ts } = require("../helpers/firestore");

function _fmtDuration(ms) {
  if (!ms) return "—";
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function _fmtDate(val) {
  if (!val) return "—";
  const d = new Date(_ts(val) * 1000);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

async function handleHistory(chatId, uid, msgId = null) {
  const [u, sessions] = await Promise.all([getUser(uid), getWorkoutSessions(uid, 8)]);
  if (!u) {
    const err = "❌ Cliente no encontrado.";
    if (msgId) return editMessage(chatId, msgId, err);
    return sendMessage(chatId, err);
  }

  if (!sessions.length) {
    const text = `📭 <b>${u.name}</b> aún no tiene entrenos registrados.`;
    const kb   = inlineKeyboard([[{ text: "🔙 Volver", callback_data: `client:${uid}` }]]);
    if (msgId) return editMessage(chatId, msgId, text, kb);
    return sendMessage(chatId, text, kb);
  }

  let text = `🏋️ <b>Últimos entrenos — ${u.name}</b>\n\n`;

  for (const s of sessions) {
    const exNames = (s.exercises || []).map(e => e.name || e.n || "?").slice(0, 3).join(", ");
    const more    = (s.exercises || []).length > 3 ? ` +${(s.exercises || []).length - 3}` : "";
    const sets    = Object.values(s.completedSets || {}).reduce((acc, v) => acc + (Array.isArray(v) ? v.length : 0), 0);
    const dur     = s.durationMs || (s.endedAt && s.startedAt
      ? (_ts(s.endedAt) - _ts(s.startedAt)) * 1000 : 0);

    text += `📅 <b>${_fmtDate(s.endedAt || s.startedAt || s.date)}</b>\n`;
    text += `   🎯 ${s.routineName || s.name || "Libre"}\n`;
    if (exNames) text += `   💪 ${exNames}${more}\n`;
    text += `   📊 ${sets} series · ⏱ ${_fmtDuration(dur)}\n\n`;
  }

  const kb = inlineKeyboard([[{ text: "🔙 Volver al perfil", callback_data: `client:${uid}` }]]);
  if (msgId) return editMessage(chatId, msgId, text.trim(), kb);
  return sendMessage(chatId, text.trim(), kb);
}

module.exports = { handleHistory };
