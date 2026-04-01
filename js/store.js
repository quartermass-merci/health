// store.js — localStorage data layer

const PROFILE_KEY = 'mt_profile';
const INDEX_KEY = 'mt_day_index';
const DAY_PREFIX = 'mt_day_';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function defaultProfile() {
  return {
    startWeight: 310,
    goalWeight: 250,
    startDate: todayStr(),
    feedWindowStart: 12,
    feedWindowEnd: 18,
    waterGoalMl: 3000,
    walkGoalMin: 150,
    pmrReminderTime: '21:30'
  };
}

function defaultDay(dateStr) {
  return {
    date: dateStr,
    weight: null,
    waterMl: 0,
    waterLogs: [],
    stayedInWindow: null,
    stayedLowCarb: null,
    walkingMin: 0,
    walkingLogs: [],
    sleepQuality: null,
    pmrDone: false,
    nesMarkers: {
      ateAfterWindow: false,
      needFoodToSleep: false,
      moodWorsening: false,
      morningAnorexia: false
    },
    cravingTimerUsed: 0
  };
}

// Profile
export function getProfile() {
  const raw = localStorage.getItem(PROFILE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function hasProfile() {
  return localStorage.getItem(PROFILE_KEY) !== null;
}

// Day index
export function getDayIndex() {
  const raw = localStorage.getItem(INDEX_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveDayIndex(index) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

// Day records
export function getDay(dateStr) {
  const raw = localStorage.getItem(DAY_PREFIX + dateStr);
  if (raw) return JSON.parse(raw);
  return defaultDay(dateStr);
}

export function saveDay(dateStr, dayData) {
  localStorage.setItem(DAY_PREFIX + dateStr, JSON.stringify(dayData));
  const index = getDayIndex();
  if (!index.includes(dateStr)) {
    index.push(dateStr);
    index.sort();
    saveDayIndex(index);
  }
}

export function getToday() {
  return getDay(todayStr());
}

export function saveToday(dayData) {
  saveDay(todayStr(), dayData);
}

// Active date system — allows editing past days
let activeDate = null;

export function setActiveDate(dateStr) {
  activeDate = dateStr;
}

export function getActiveDate() {
  return activeDate || todayStr();
}

export function isViewingPastDay() {
  return activeDate !== null && activeDate !== todayStr();
}

export function getActiveDay() {
  return getDay(getActiveDate());
}

export function saveActiveDay(dayData) {
  saveDay(getActiveDate(), dayData);
}

export function resetToToday() {
  activeDate = null;
}

// Aggregations
export function getAllWeights() {
  const index = getDayIndex();
  const weights = [];
  for (const dateStr of index) {
    const day = getDay(dateStr);
    if (day.weight !== null) {
      weights.push({ date: dateStr, weight: day.weight });
    }
  }
  return weights;
}

export function getLastWeight() {
  const weights = getAllWeights();
  return weights.length > 0 ? weights[weights.length - 1] : null;
}

export function getCarbStreak() {
  const index = getDayIndex();
  let streak = 0;
  for (let i = index.length - 1; i >= 0; i--) {
    const day = getDay(index[i]);
    if (day.stayedLowCarb === true) {
      streak++;
    } else if (day.stayedLowCarb === false) {
      break;
    } else {
      // null means not answered yet — if it's today, skip; otherwise break
      if (index[i] === todayStr()) continue;
      break;
    }
  }
  return streak;
}

export function getRecentDays(n) {
  const index = getDayIndex();
  const recent = index.slice(-n);
  return recent.map(d => getDay(d));
}

export function getDayNumber() {
  const profile = getProfile();
  if (!profile) return 1;
  const start = new Date(profile.startDate + 'T00:00:00');
  const now = new Date(todayStr() + 'T00:00:00');
  return Math.floor((now - start) / 86400000) + 1;
}

// Export
export function exportCSV() {
  const index = getDayIndex();
  const rows = ['date,weight,waterMl,stayedInWindow,stayedLowCarb,walkingMin,sleepQuality,pmrDone,cravingTimerUsed'];
  for (const dateStr of index) {
    const d = getDay(dateStr);
    rows.push([
      d.date,
      d.weight ?? '',
      d.waterMl,
      d.stayedInWindow ?? '',
      d.stayedLowCarb ?? '',
      d.walkingMin,
      d.sleepQuality ?? '',
      d.pmrDone,
      d.cravingTimerUsed
    ].join(','));
  }
  downloadFile(rows.join('\n'), 'metabolic-tracker-export.csv', 'text/csv');
}

export function exportJSON() {
  const data = {
    version: 1,
    exportDate: new Date().toISOString(),
    profile: getProfile(),
    dayIndex: getDayIndex(),
    days: {}
  };
  for (const dateStr of data.dayIndex) {
    data.days[dateStr] = getDay(dateStr);
  }
  downloadFile(JSON.stringify(data, null, 2), 'metabolic-tracker-backup.json', 'application/json');
  localStorage.setItem('mt_last_backup', todayStr());
}

export function importJSON(jsonString) {
  const data = JSON.parse(jsonString);
  if (!data.version || !data.profile || !data.dayIndex) {
    throw new Error('Invalid backup file');
  }
  saveProfile(data.profile);
  saveDayIndex(data.dayIndex);
  for (const dateStr of data.dayIndex) {
    if (data.days[dateStr]) {
      localStorage.setItem(DAY_PREFIX + dateStr, JSON.stringify(data.days[dateStr]));
    }
  }
}

export function clearAllData() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('mt_')) keys.push(key);
  }
  keys.forEach(k => localStorage.removeItem(k));
}

export function getLastBackupDate() {
  return localStorage.getItem('mt_last_backup');
}

export function todayString() {
  return todayStr();
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
