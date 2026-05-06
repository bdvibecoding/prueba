// Handler: latest activity across all clients
const { sendMessage, editMessage, inlineKeyboard } = require("../helpers/telegram");
const admin = require("firebase-admin");
const { _ts } = require("../helpers/firestore");

function _fmtDate(val) {
  if (!val) return "—";
  const d = new Date(_ts(val) * 1000);
  if (isNaN(d.getTime())) return "—";
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 60)  return `Hace ${diffMin} min`;
  if (diffMin < 1440) return `Hace ${Math.floor(diffMin / 60)}h`;
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

async function handleRecent(chatId, msgId = null) {
  // Gather recent events from all subcollections
  const db = admin.firestore();

  // Get all client users
  const usersSnap = await db.collection("users").get();
  const STAFF = ["admin", "coach", "medico", "fisio", "psicologo", "nutricionista"];
  const clients = usersSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(u => !STAFF.includes(u.role));

  const events = [];
  const now = Date.now();
  const cutoff = now - 7 * 24 * 60 * 60 * 1000; // last 7 days

  await Promise.all(clients.map(async (u) => {
    // Workout sessions
    try {
      const wSnap = await db.collection("users").doc(u.id).collection("workoutSessions").get();
      wSnap.docs.forEach(d => {
        const s = d.data();
        const ts = _ts(s.endedAt || s.startedAt) * 1000;
        if (ts >= cutoff) {
          events.push({
            type: "workout",
            userName: u.name || u.email || "?",
            uid: u.id,
            ts,
            detail: s.routineName || s.name || "Entreno libre",
          });
        }
      });
    } catch (_) {}

    // Biomedidas
    try {
      const bSnap = await db.collection("users").doc(u.id).collection("biomedidas").get();
      bSnap.docs.forEach(d => {
        const s = d.data();
        const ts = _ts(s.createdAt || s.date) * 1000;
        if (ts >= cutoff) {
          events.push({ type: "bio", userName: u.name || u.email || "?", uid: u.id, ts, detail: "" });
        }
      });
    } catch (_) {}

    // Health check-ins
    try {
      const hSnap = await db.collection("users").doc(u.id).collection("health").get();
      hSnap.docs.forEach(d => {
        const s = d.data();
        const ts = _ts(s.createdAt || s.date) * 1000;
        if (ts >= cutoff) {
          events.push({ type: "health", userName: u.name || u.email || "?", uid: u.id, ts, detail: "" });
        }
      });
    } catch (_) {}
  }));

  // Sort by time descending, take top 20
  events.sort((a, b) => b.ts - a.ts);
  const recent = events.slice(0, 20);

  if (!recent.length) {
    const text = "📭 Sin actividad reciente en los últimos 7 días.";
    const kb   = inlineKeyboard([[{ text: "🔙 Volver", callback_data: "cmd:start" }]]);
    if (msgId) return editMessage(chatId, msgId, text, kb);
    return sendMessage(chatId, text, kb);
  }

  const iconMap = { workout: "🏋️", bio: "📏", health: "❤️" };
  const labelMap = { workout: "Entreno", bio: "Biomedidas", health: "Salud" };

  let text = `⚡ <b>Actividad reciente (7 días)</b>\n\n`;
  for (const e of recent) {
    const icon   = iconMap[e.type] || "📌";
    const label  = labelMap[e.type] || e.type;
    const detail = e.detail ? ` · ${e.detail}` : "";
    text += `${icon} <b>${e.userName}</b>${detail}\n   ${label} · ${_fmtDate(e.ts / 1000)}\n\n`;
  }

  const kb = inlineKeyboard([[{ text: "🔙 Volver", callback_data: "cmd:start" }]]);
  if (msgId) return editMessage(chatId, msgId, text.trim(), kb);
  return sendMessage(chatId, text.trim(), kb);
}

module.exports = { handleRecent };
