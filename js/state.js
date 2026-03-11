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
