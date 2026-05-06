// =============================================================
//  TGWL – Telegram Bot + Activity Notification Functions
//  Firebase Cloud Functions v2
// =============================================================
const { onRequest }         = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin                 = require("firebase-admin");

admin.initializeApp();

// Helpers
const { sendMessage, editMessage, answerCallback, inlineKeyboard, setWebhook } = require("./helpers/telegram");
const { getAdminChatIds, saveAdmin, removeAdmin, getUser, _ts } = require("./helpers/firestore");

// Handlers
const { handleStart }     = require("./handlers/start");
const { handleClients }   = require("./handlers/clients");
const { handleClientCard} = require("./handlers/clientCard");
const { handleHistory }   = require("./handlers/history");
const { handleBiomedidas }= require("./handlers/biomedidas");
const { handleHealth }    = require("./handlers/health");
const { handleRecent }    = require("./handlers/recent");
const { handleAdmins }    = require("./handlers/admins");

// Authorized usernames that can register themselves as admins
const SEED_ADMINS = ["fityhab", "jpncol"];

// ── Notification helper ─────────────────────────────────────────
async function notifyAdmins(text, kb = {}) {
  const chatIds = await getAdminChatIds();
  if (!chatIds.length) {
    console.warn("[TGWL] No admin chatIds registered — skipping notification");
    return;
  }
  await Promise.all(chatIds.map(id => sendMessage(id, text, kb).catch(e => console.error(`Notify fail ${id}:`, e))));
}

// ── Notification formatters ─────────────────────────────────────
function _fmtTs(val) {
  if (!val) return "";
  const d = new Date(_ts(val) * 1000);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("es-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function _fmtDur(ms) {
  if (!ms || ms <= 0) return "";
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return m > 0 ? ` · ⏱ ${m}m ${s}s` : ` · ⏱ ${s}s`;
}

// ─────────────────────────────────────────────────────────────────
// FIRESTORE TRIGGERS — Activity notifications
// ─────────────────────────────────────────────────────────────────

// 1. Workout session completed
exports.onWorkoutCreated = onDocumentCreated(
  { document: "users/{uid}/workoutSessions/{sessionId}" },
  async (event) => {
    try {
      const uid  = event.params.uid;
      const data = event.data?.data() || {};
      const user = await getUser(uid);
      const name = user?.name || user?.email || uid;

      const exercises = data.exercises || [];
      const exCount   = exercises.length;
      const exNames   = exercises.slice(0, 4).map(e => e.name || e.n || "?").join(", ");
      const moreEx    = exCount > 4 ? ` y ${exCount - 4} más` : "";

      const sets      = Object.values(data.completedSets || {}).reduce((a, v) => a + (Array.isArray(v) ? v.length : 0), 0);
      const dur       = data.durationMs || 0;

      // Volume
      let vol = 0;
      Object.values(data.setData || {}).forEach(exData => {
        const arr = Array.isArray(exData) ? exData : (exData?.sets || []);
        arr.forEach(s => { vol += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0); });
      });

      const rpe     = data.rpe ? ` · RPE ${data.rpe}` : "";
      const volStr  = vol > 0 ? `\n📦 <b>Volumen:</b> ${(vol / 1000).toFixed(1)} t` : "";
      const noteStr = data.note ? `\n📝 <i>${data.note}</i>` : "";
      const when    = _fmtTs(data.endedAt || data.startedAt);
      const whenStr = when ? `\n🕐 <b>Hora:</b> ${when}` : "";

      const text =
        `🏋️ <b>Entreno completado</b>\n\n` +
        `👤 <b>${name}</b>\n` +
        `🎯 <b>${data.routineName || data.name || "Entreno libre"}</b>${_fmtDur(dur)}\n` +
        (exCount ? `💪 ${exNames}${moreEx}\n` : "") +
        `📊 <b>${sets} series</b>${rpe}` +
        volStr + whenStr + noteStr;

      const kb = inlineKeyboard([[
        { text: "👤 Ver cliente", callback_data: `client:${uid}` },
        { text: "🏋️ Historial",  callback_data: `history:${uid}` },
      ]]);

      await notifyAdmins(text, kb);
    } catch (e) {
      console.error("[onWorkoutCreated]", e);
    }
  }
);

// 2. Biomedidas (body measurements) added
exports.onBiomedidasCreated = onDocumentCreated(
  { document: "users/{uid}/biomedidas/{bioId}" },
  async (event) => {
    try {
      const uid  = event.params.uid;
      const data = event.data?.data() || {};
      const user = await getUser(uid);
      const name = user?.name || user?.email || uid;

      const fields = [
        data.weight  !== undefined && `⚖️ Peso: ${data.weight} kg`,
        data.peso    !== undefined && `⚖️ Peso: ${data.peso} kg`,
        data.waist   !== undefined && `📏 Cintura: ${data.waist} cm`,
        data.cintura !== undefined && `📏 Cintura: ${data.cintura} cm`,
        data.hip     !== undefined && `📏 Cadera: ${data.hip} cm`,
        data.cadera  !== undefined && `📏 Cadera: ${data.cadera} cm`,
        data.bodyFat !== undefined && `🔬 % Grasa: ${data.bodyFat}%`,
        data.grasaCorporal !== undefined && `🔬 % Grasa: ${data.grasaCorporal}%`,
      ].filter(Boolean).join("\n");

      const text =
        `📏 <b>Nueva medición registrada</b>\n\n` +
        `👤 <b>${name}</b>\n` +
        (fields ? `\n${fields}\n` : "");

      const kb = inlineKeyboard([[
        { text: "👤 Ver cliente",  callback_data: `client:${uid}`     },
        { text: "📏 Mediciones",   callback_data: `biomedidas:${uid}` },
      ]]);

      await notifyAdmins(text, kb);
    } catch (e) {
      console.error("[onBiomedidasCreated]", e);
    }
  }
);

// 3. Health check-in added
exports.onHealthCreated = onDocumentCreated(
  { document: "users/{uid}/health/{healthId}" },
  async (event) => {
    try {
      const uid  = event.params.uid;
      const data = event.data?.data() || {};
      const user = await getUser(uid);
      const name = user?.name || user?.email || uid;

      const _star = (v, max = 5) => v !== undefined ? "⭐".repeat(Math.min(Math.round(v), max)) : null;

      const lines = [
        data.sleep   !== undefined && `😴 Sueño: ${data.sleep}h`,
        _star(data.mood)   && `😊 Humor: ${_star(data.mood)}`,
        _star(data.energy) && `⚡ Energía: ${_star(data.energy)}`,
        _star(data.stress) && `😰 Estrés: ${_star(data.stress)}`,
        data.pain  && `🩹 Dolor: ${data.pain}`,
        (data.notes || data.nota) && `📝 ${data.notes || data.nota}`,
      ].filter(Boolean).join("\n");

      const text =
        `❤️ <b>Check-in de salud</b>\n\n` +
        `👤 <b>${name}</b>\n` +
        (lines ? `\n${lines}\n` : "");

      const kb = inlineKeyboard([[
        { text: "👤 Ver cliente", callback_data: `client:${uid}` },
        { text: "❤️ Salud",       callback_data: `health:${uid}` },
      ]]);

      await notifyAdmins(text, kb);
    } catch (e) {
      console.error("[onHealthCreated]", e);
    }
  }
);

// 4. Note added by staff (notes are written by staff, not client — still worth notifying)
exports.onNoteCreated = onDocumentCreated(
  { document: "users/{uid}/notes/{noteId}" },
  async (event) => {
    try {
      const uid  = event.params.uid;
      const data = event.data?.data() || {};
      const user = await getUser(uid);
      const name = user?.name || user?.email || uid;

      const noteText = data.text || data.content || data.nota || "";
      const author   = data.authorName || data.author || "";

      const text =
        `📝 <b>Nueva nota registrada</b>\n\n` +
        `👤 <b>${name}</b>\n` +
        (author ? `✍️ Por: ${author}\n` : "") +
        (noteText ? `\n<i>${noteText.slice(0, 300)}</i>` : "");

      const kb = inlineKeyboard([[
        { text: "👤 Ver cliente", callback_data: `client:${uid}` },
      ]]);

      await notifyAdmins(text, kb);
    } catch (e) {
      console.error("[onNoteCreated]", e);
    }
  }
);

// 5. Meal logged
exports.onMealCreated = onDocumentCreated(
  { document: "users/{uid}/meals/{mealId}" },
  async (event) => {
    try {
      const uid  = event.params.uid;
      const data = event.data?.data() || {};
      const user = await getUser(uid);
      const name = user?.name || user?.email || uid;

      const mealType = data.type || data.tipo || data.meal || "Comida";
      const kcal     = data.calories || data.kcal || data.calorias;
      const kcalStr  = kcal ? ` · ${kcal} kcal` : "";

      const text =
        `🥗 <b>Comida registrada</b>\n\n` +
        `👤 <b>${name}</b>\n` +
        `🍽 ${mealType}${kcalStr}`;

      const kb = inlineKeyboard([[
        { text: "👤 Ver cliente", callback_data: `client:${uid}` },
      ]]);

      await notifyAdmins(text, kb);
    } catch (e) {
      console.error("[onMealCreated]", e);
    }
  }
);

// ─────────────────────────────────────────────────────────────────
// WEBHOOK REGISTRATION
// ─────────────────────────────────────────────────────────────────
exports.registerWebhook = onRequest(
  { region: "us-central1", invoker: "public" },
  async (req, res) => {
    const fnUrl = req.query.url ||
      `https://us-central1-fasepruebasw.cloudfunctions.net/telegramBot`;
    const result = await setWebhook(fnUrl);
    res.json(result);
  }
);

// ─────────────────────────────────────────────────────────────────
// MAIN BOT WEBHOOK
// ─────────────────────────────────────────────────────────────────
exports.telegramBot = onRequest(
  { region: "us-central1", timeoutSeconds: 30, invoker: "public" },
  async (req, res) => {
    try {
      const body = req.body;
      console.log("[BOT] update type:", body.message ? "message" : body.callback_query ? "callback" : "other");

      // ── Plain messages (commands) ──────────────────────────────
      if (body.message) {
        const msg      = body.message;
        const chatId   = msg.chat.id;
        const username = (msg.from?.username || "").toLowerCase();
        const text     = (msg.text || "").trim();

        console.log(`[BOT] msg from @${username} (${chatId}): ${text}`);

        // Auto-save admins from seed list on first contact
        if (SEED_ADMINS.includes(username)) {
          await saveAdmin(chatId, username);
        }

        // Security: only admins (seed list OR registered) can use the bot
        const registeredIds = await getAdminChatIds();
        const isSeed        = SEED_ADMINS.includes(username);
        const isRegistered  = registeredIds.map(String).includes(String(chatId));

        if (!isSeed && !isRegistered) {
          await sendMessage(chatId,
            "⛔ No estás autorizado para usar este bot.\n\n" +
            "Si eres coach de TGWL, pide a un admin que te agregue con <code>/addadmin @tuusername</code>"
          );
          return res.sendStatus(200);
        }

        // Commands
        if (text === "/start" || text === "/menu") {
          await handleStart(chatId);
        } else if (text === "/clientes" || text === "/clients") {
          await handleClients(chatId);
        } else if (text === "/addme") {
          await saveAdmin(chatId, username);
          await sendMessage(chatId, `✅ <b>¡Listo!</b> Tu cuenta (@${username}) ha sido registrada como admin.\nAhora recibirás todas las notificaciones de actividad de los clientes.`);
        } else if (text.startsWith("/addadmin ")) {
          const target = text.replace("/addadmin ", "").replace("@", "").trim().toLowerCase();
          if (!target) {
            await sendMessage(chatId, "⚠️ Uso: <code>/addadmin @username</code>");
          } else {
            await saveAdmin(`pending_${target}`, target);
            await sendMessage(chatId,
              `✅ <b>${target}</b> añadido a la lista de admins.\n` +
              `Dile que abra el bot y escriba <b>/addme</b> para activar las notificaciones.`
            );
          }
        } else if (text.startsWith("/removeadmin ")) {
          const target = text.replace("/removeadmin ", "").replace("@", "").trim().toLowerCase();
          await removeAdmin(target);
          await sendMessage(chatId, `✅ Admin <b>@${target}</b> eliminado.`);
        } else if (text === "/admins") {
          await handleAdmins(chatId);
        } else if (text === "/reciente" || text === "/recent") {
          await handleRecent(chatId);
        } else {
          // Default: show menu
          await handleStart(chatId);
        }
        return res.sendStatus(200);
      }

      // ── Callback queries (inline buttons) ─────────────────────
      if (body.callback_query) {
        const cb       = body.callback_query;
        const chatId   = cb.message.chat.id;
        const username = (cb.from?.username || "").toLowerCase();
        const msgId    = cb.message.message_id;
        const data     = cb.data || "";

        console.log(`[BOT] callback @${username}: ${data}`);

        await answerCallback(cb.id);

        // Auth check for callbacks
        const registeredIds = await getAdminChatIds();
        const isSeed        = SEED_ADMINS.includes(username);
        const isRegistered  = registeredIds.map(String).includes(String(chatId));
        if (!isSeed && !isRegistered) {
          await sendMessage(chatId, "⛔ No estás autorizado.");
          return res.sendStatus(200);
        }

        const [action, uid] = data.split(":");

        if (data === "cmd:start")        await handleStart(chatId, msgId);
        else if (data === "cmd:clients") await handleClients(chatId, msgId);
        else if (data === "cmd:recent")  await handleRecent(chatId, msgId);
        else if (data === "cmd:admins")  await handleAdmins(chatId, msgId);
        else if (data === "cmd:help")    await handleHelp(chatId, msgId);
        else if (action === "client")    await handleClientCard(chatId, uid, msgId);
        else if (action === "history")   await handleHistory(chatId, uid, msgId);
        else if (action === "biomedidas")await handleBiomedidas(chatId, uid, msgId);
        else if (action === "health")    await handleHealth(chatId, uid, msgId);

        else await sendMessage(chatId, "❓ Opción no reconocida. Usa /start.");
        return res.sendStatus(200);
      }

      // Unknown update type
      return res.sendStatus(200);
    } catch (err) {
      console.error("[telegramBot]", err);
      return res.sendStatus(200);
    }
  }
);

// ─────────────────────────────────────────────────────────────────
// HELP HANDLER
// ─────────────────────────────────────────────────────────────────
function handleHelp(chatId, msgId = null) {
  const text =
    `❓ <b>Comandos disponibles</b>\n\n` +
    `• <b>/start</b> — Menú principal\n` +
    `• <b>/clientes</b> — Lista de clientes\n` +
    `• <b>/reciente</b> — Actividad reciente\n` +
    `• <b>/admins</b> — Ver admins registrados\n` +
    `• <b>/addme</b> — Registrarte como admin\n` +
    `• <b>/addadmin @usuario</b> — Añadir otro admin\n` +
    `• <b>/removeadmin @usuario</b> — Quitar un admin\n\n` +
    `<i>El bot notifica automáticamente cuando un cliente completa un entreno, registra mediciones, hace un check-in de salud o añade una comida.</i>`;

  const kb = inlineKeyboard([[{ text: "🔙 Volver", callback_data: "cmd:start" }]]);
  if (msgId) return editMessage(chatId, msgId, text, kb);
  return sendMessage(chatId, text, kb);
}
