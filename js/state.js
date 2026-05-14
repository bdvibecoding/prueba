/* ═══════════════════════════════════════════════
   TGWL — state.js
   Reactive Application State Store
═══════════════════════════════════════════════ */

class Store {
  constructor(initialState) {
    this._state = { ...initialState };
    this._listeners = {};
    this._globalListeners = [];
  }

  get(key) {
    return key ? this._state[key] : { ...this._state };
  }

  set(key, value) {
    const prev = this._state[key];
    this._state[key] = value;
    this._notify(key, value, prev);
    this._notifyGlobal(key, value, prev);
  }

  update(updates) {
    const entries = Object.entries(updates);
    entries.forEach(([key, value]) => {
      const prev = this._state[key];
      this._state[key] = value;
      this._notify(key, value, prev);
    });
    this._notifyGlobal('*', this._state, null);
  }

  on(key, callback) {
    if (!this._listeners[key]) this._listeners[key] = [];
    this._listeners[key].push(callback);
    return () => this.off(key, callback);
  }

  onAny(callback) {
    this._globalListeners.push(callback);
    return () => {
      this._globalListeners = this._globalListeners.filter(l => l !== callback);
    };
  }

  off(key, callback) {
    if (this._listeners[key]) {
      this._listeners[key] = this._listeners[key].filter(l => l !== callback);
    }
  }

  _notify(key, value, prev) {
    (this._listeners[key] || []).forEach(fn => fn(value, prev));
  }
  _notifyGlobal(key, value, prev) {
    this._globalListeners.forEach(fn => fn(key, value, prev));
  }
}

// ── App State ─────────────────────────────────
export const appState = new Store({
  user:              null,         // Firebase user object
  userProfile:       null,         // Firestore user document
  currentRoute:      'home',
  prevRoute:         null,
  settings: {
    language:        'es',
    darkMode:        true,
    notifications:   true,
    keepAwake:       false,
    showMuscleMap:   true,
    units:           'metric',   // 'metric' (kg, cm) | 'imperial' (lb, ft/in)
  },
  // Active workout session
  activeSession: {
    routineId:       null,
    routineName:     null,
    exercises:       [],
    startTime:       null,
    isPaused:        false,
    pauseTime:       null,
    totalPauseMs:    0,
    completedSets:   {},   // { exerciseId: [setIndex, ...] }
    setData:         {},   // { exerciseId: { sets: [{reps, weight}, ...] } }
    notes:           '',
    rpe:             null,
  },
  // Rest timer
  restTimer: {
    active:          false,
    seconds:         60,
    remaining:       60,
    exerciseId:      null,
  },
  isLoading:         false,
  toastQueue:        [],
});

// ── Persist settings to localStorage ─────────
const SETTINGS_KEY = 'tgwl_settings';

export function loadPersistedSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      appState.set('settings', { ...appState.get('settings'), ...parsed });
    }
  } catch (e) { /* ignore */ }
}

export function persistSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(appState.get('settings')));
  } catch (e) { /* ignore */ }
}

// Auto-persist when settings change
appState.on('settings', () => persistSettings());

// ── Persist active workout session to localStorage ─────────
const SESSION_KEY = 'tgwl_active_session';

export function loadPersistedSession() {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    if (!parsed?.routineId) return;

    const now = Date.now();
    let restored = { ...parsed };

    if (parsed.isPaused && parsed.pauseTime) {
      // Was paused when browser closed — keep paused, pauseTime stays valid
      // (getElapsedMs will account for it correctly)
    } else {
      // Was running when browser closed — add time-away as pause offset so
      // elapsed workout time stays accurate (doesn't count browser-closed time)
      const savedAt  = parsed._savedAt || now;
      const timeAway = Math.max(0, now - savedAt);
      restored.totalPauseMs = (parsed.totalPauseMs || 0) + timeAway;
      restored.isPaused  = false;
      restored.pauseTime = null;
    }
    delete restored._savedAt;
    appState.set('activeSession', restored);
  } catch (e) { /* ignore */ }
}

function _persistSession(session) {
  try {
    if (session?.routineId) {
      // Store _savedAt so we can compute time-away on restore
      localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, _savedAt: Date.now() }));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch (e) { /* ignore */ }
}

// Auto-persist whenever activeSession changes
appState.on('activeSession', session => _persistSession(session));

// ── Helpers ───────────────────────────────────
export const getUser = () => appState.get('user');
export const getUserProfile = () => appState.get('userProfile');
export const getSettings = () => appState.get('settings');
export const getRoute = () => appState.get('currentRoute');
export const getActiveSession = () => appState.get('activeSession');

export function updateSettings(updates) {
  const current = appState.get('settings');
  appState.set('settings', { ...current, ...updates });
}

export function setUser(user, profile) {
  appState.update({ user, userProfile: profile });
}

export function clearUser() {
  appState.update({ user: null, userProfile: null });
}

export function startWorkoutSession(routineId, routineName, exercises) {
  appState.set('activeSession', {
    routineId,
    routineName,
    exercises,
    startTime: Date.now(),
    isPaused: false,
    pauseTime: null,
    totalPauseMs: 0,
    completedSets: {},
    setData: {},
    notes: '',
    rpe: null,
  });
}

export function pauseSession() {
  const s = getActiveSession();
  if (!s.routineId || s.isPaused) return;
  appState.set('activeSession', { ...s, isPaused: true, pauseTime: Date.now() });
}

export function resumeSession() {
  const s = getActiveSession();
  if (!s.isPaused) return;
  const pauseDuration = Date.now() - s.pauseTime;
  appState.set('activeSession', {
    ...s,
    isPaused: false,
    pauseTime: null,
    totalPauseMs: s.totalPauseMs + pauseDuration,
  });
}

export function endSession() {
  appState.set('activeSession', {
    routineId: null, routineName: null, exercises: [],
    startTime: null, isPaused: false, pauseTime: null, totalPauseMs: 0,
    completedSets: {}, setData: {}, notes: '', rpe: null,
  });
}

export function markSetDone(exerciseId, setIndex) {
  const s = getActiveSession();
  const completed = { ...s.completedSets };
  if (!completed[exerciseId]) completed[exerciseId] = [];
  if (!completed[exerciseId].includes(setIndex)) {
    completed[exerciseId] = [...completed[exerciseId], setIndex];
  }
  appState.set('activeSession', { ...s, completedSets: completed });
}

export function unmarkSetDone(exerciseId, setIndex) {
  const s = getActiveSession();
  const completed = { ...s.completedSets };
  if (completed[exerciseId]) {
    completed[exerciseId] = completed[exerciseId].filter(i => i !== setIndex);
  }
  appState.set('activeSession', { ...s, completedSets: completed });
}

export function updateSetData(exerciseId, setIndex, field, value) {
  const s = getActiveSession();
  const setData = JSON.parse(JSON.stringify(s.setData));
  if (!setData[exerciseId]) setData[exerciseId] = { sets: [] };
  if (!setData[exerciseId].sets[setIndex]) setData[exerciseId].sets[setIndex] = {};
  setData[exerciseId].sets[setIndex][field] = value;
  appState.set('activeSession', { ...s, setData });
}
