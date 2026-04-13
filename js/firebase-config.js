/* ═══════════════════════════════════════════════
   TGWL — firebase-config.js
   Firebase initialization & exports
═══════════════════════════════════════════════ */

const firebaseConfig = {
  apiKey:            "AIzaSyAPlw6AhNY3mhpj3Gc24-f0-K7ifp8Fnj8",
  authDomain:        "fasepruebasw.firebaseapp.com",
  projectId:         "fasepruebasw",
  storageBucket:     "fasepruebasw.firebasestorage.app",
  messagingSenderId: "226098437552",
  appId:             "1:226098437552:web:5dbd8faf66618406770a75"
};

// Initialize Firebase (compat SDK loaded via CDN in index.html)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth      = firebase.auth();
export const db        = firebase.firestore();
export const storage   = firebase.storage();
export const firestore = firebase.firestore;

// ── Firestore helpers ─────────────────────────
export const timestamp = () => firebase.firestore.FieldValue.serverTimestamp();
export const arrayUnion = (...items) => firebase.firestore.FieldValue.arrayUnion(...items);
export const arrayRemove = (...items) => firebase.firestore.FieldValue.arrayRemove(...items);
export const increment = (n = 1) => firebase.firestore.FieldValue.increment(n);

// ── Collection References ─────────────────────
export const collections = {
  users:           () => db.collection('users'),
  routines:        () => db.collection('routines'),
  dietTemplates:   () => db.collection('dietTemplates'),
  assignments:     (uid) => db.collection('users').doc(uid).collection('assignments'),
  workoutSessions: (uid) => db.collection('users').doc(uid).collection('workoutSessions'),
  meals:           (uid) => db.collection('users').doc(uid).collection('meals'),
  biomedidas:      (uid) => db.collection('users').doc(uid).collection('biomedidas'),
  health:          (uid) => db.collection('users').doc(uid).collection('health'),
  progress:        (uid) => db.collection('users').doc(uid).collection('progress'),
  dietas:          (uid) => db.collection('users').doc(uid).collection('dietas'),
  supplements:     (uid) => db.collection('users').doc(uid).collection('supplements'),
  notes:           (uid) => db.collection('users').doc(uid).collection('notes'),
  restaurants:     () => db.collection('restaurants'),
  invitations:     () => db.collection('invitations'),
  inquiries:       () => db.collection('inquiries'),
  chatMessages:    (chatId) => db.collection('chats').doc(chatId).collection('messages'),
};

// ── Storage paths ────────────────────────────
export const storagePaths = {
  progressPhoto: (uid, date, angle) => `progress/${uid}/${date}/${angle}.jpg`,
  avatar:        (uid) => `avatars/${uid}.jpg`,
  dietPdf:       (uid, dietId) => `diets/${uid}/${dietId}.pdf`,
};
