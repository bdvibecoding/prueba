// =========================================
// Firestore helpers — TGWL Bot
// =========================================
const admin = require("firebase-admin");

const STAFF_ROLES = ["admin", "coach", "medico", "fisio", "psicologo", "nutricionista"];

/** Get all admin chatIds from settings/telegramAdmins */
async function getAdminChatIds() {
  const snap = await admin.firestore().collection("settings").doc("telegramAdmins").get();
  if (!snap.exists) return [];
  const data = snap.data();
  // Support both array of strings and array of objects {chatId, username}
  return (data.admins || []).map(a => (typeof a === "object" ? a.chatId : a)).filter(Boolean);
}

/** Get full admin records [{chatId, username}] */
async function getAdmins() {
  const snap = await admin.firestore().collection("settings").doc("telegramAdmins").get();
  if (!snap.exists) return [];
  return snap.data().admins || [];
}

/** Add or update an admin entry */
async function saveAdmin(chatId, username) {
  const ref  = admin.firestore().collection("settings").doc("telegramAdmins");
  const snap = await ref.get();
  let admins = snap.exists ? (snap.data().admins || []) : [];

  const existing = admins.findIndex(a => String(a.chatId) === String(chatId));
  if (existing >= 0) {
    admins[existing] = { chatId: String(chatId), username: username || admins[existing].username };
  } else {
    admins.push({ chatId: String(chatId), username: username || "" });
  }

  await ref.set({ admins }, { merge: true });
}

/** Remove an admin by username */
async function removeAdmin(username) {
  const ref  = admin.firestore().collection("settings").doc("telegramAdmins");
  const snap = await ref.get();
  if (!snap.exists) return;
  const admins = (snap.data().admins || []).filter(
    a => a.username.toLowerCase() !== username.toLowerCase()
  );
  await ref.set({ admins }, { merge: true });
}

/** Get a single user by UID */
async function getUser(uid) {
  const snap = await admin.firestore().collection("users").doc(uid).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

/** Get all client users (non-staff) */
async function getAllClients() {
  const snap = await admin.firestore().collection("users").get();
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(u => !STAFF_ROLES.includes(u.role))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

/** Get last N workout sessions for a user */
async function getWorkoutSessions(uid, limit = 5) {
  const snap = await admin.firestore()
    .collection("users").doc(uid)
    .collection("workoutSessions")
    .get();

  const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  sessions.sort((a, b) => {
    const ta = _ts(a.endedAt || a.startedAt || a.date);
    const tb = _ts(b.endedAt || b.startedAt || b.date);
    return tb - ta;
  });
  return sessions.slice(0, limit);
}

/** Get last N biomedidas entries for a user */
async function getBiomedidas(uid, limit = 3) {
  const snap = await admin.firestore()
    .collection("users").doc(uid)
    .collection("biomedidas")
    .get();

  const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  entries.sort((a, b) => _ts(b.date || b.createdAt) - _ts(a.date || a.createdAt));
  return entries.slice(0, limit);
}

/** Get last N health check-ins for a user */
async function getHealthEntries(uid, limit = 3) {
  const snap = await admin.firestore()
    .collection("users").doc(uid)
    .collection("health")
    .get();

  const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  entries.sort((a, b) => _ts(b.date || b.createdAt) - _ts(a.date || a.createdAt));
  return entries.slice(0, limit);
}

/** Timestamp normalizer → seconds */
function _ts(val) {
  if (!val) return 0;
  if (typeof val === "number") return val;
  if (val._seconds !== undefined) return val._seconds;
  if (val.seconds  !== undefined) return val.seconds;
  return new Date(val).getTime() / 1000;
}

module.exports = {
  getAdminChatIds, getAdmins, saveAdmin, removeAdmin,
  getUser, getAllClients,
  getWorkoutSessions, getBiomedidas, getHealthEntries,
  _ts,
};
