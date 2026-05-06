// Handler: individual client profile card
const { sendMessage, editMessage, inlineKeyboard } = require("../helpers/telegram");
const { getUser } = require("../helpers/firestore");

function _formatDate(val) {
  if (!val) return "—";
  let d;
  if (val._seconds !== undefined) d = new Date(val._seconds * 1000);
  else if (val.seconds !== undefined) d = new Date(val.seconds * 1000);
  else d = new Date(val);
  if (isNaN(d.getTime())) return "—";
  const diffDays = Math.round((Date.now() - d.getTime()) / 86400000);
  const dateStr  = d.toLocaleDateString("es-ES");
  if (diffDays === 0) return `Hoy (${dateStr})`;
  if (diffDays === 1) return `Ayer (${dateStr})`;
  if (diffDays < 7)  return `Hace ${diffDays} días (${dateStr})`;
  return dateStr;
}

async function handleClientCard(chatId, uid, msgId = null) {
  const u = await getUser(uid);
  if (!u) {
    const err = "❌ Cliente no encontrado.";
    const kb  = inlineKeyboard([[{ text: "🔙 Clientes", callback_data: "cmd:clients" }]]);
    if (msgId) return editMessage(chatId, msgId, err, kb);
    return sendMessage(chatId, err, kb);
  }

  const st      = u.stats || {};
  const gender  = u.gender === "female" ? "♀️" : (u.gender === "male" ? "♂️" : "");
  const roleMap = { atleta: "Atleta", cliente: "Cliente" };
  const role    = roleMap[u.role] || u.role || "Cliente";

  const volTotal = ((st.totalKg || 0) / 1000).toFixed(1);
  const text =
    `👤 <b>${u.name || "Sin nombre"}</b> ${gender}\n` +
    `📧 ${u.email || "—"}  ·  ${role}\n` +
    `\n─────────────────\n` +
    `🏋️ <b>Entrenos totales:</b> ${st.workouts || 0}\n` +
    `📦 <b>Volumen total:</b> ${volTotal} t\n` +
    `🔁 <b>Series totales:</b> ${st.totalSets || 0}\n` +
    `⚡ <b>Reps totales:</b> ${st.totalReps || 0}\n` +
    `⏰ <b>Último entreno:</b> ${_formatDate(u.lastWorkoutDate)}\n`;

  const kb = inlineKeyboard([
    [
      { text: "🏋️ Entrenos",    callback_data: `history:${uid}`    },
      { text: "📏 Biomedidas",  callback_data: `biomedidas:${uid}` },
    ],
    [
      { text: "❤️ Salud",       callback_data: `health:${uid}`     },
    ],
    [{ text: "🔙 Clientes", callback_data: "cmd:clients" }],
  ]);

  if (msgId) return editMessage(chatId, msgId, text, kb);
  return sendMessage(chatId, text, kb);
}

module.exports = { handleClientCard };
