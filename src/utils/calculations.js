// ========================================
// PERCENTAGE / NUMBER SAFETY HELPERS
// ========================================

// Calculate percentage safely (never NaN/Infinity, always 0-100 by default)
export function calculatePercentage(completed, total) {
  if (!total || total <= 0) {
    return 0;
  }

  const value = Math.round((completed / total) * 100);
  return clampPercentage(value);
}

// Clamp any number into the 0-100 range
export function clampPercentage(value) {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

// Calculate remaining topics/items, never negative
export function calculateRemaining(total, completed, inProgress = 0) {
  const remaining = total - completed - inProgress;
  return Math.max(0, remaining);
}

// Calculate water percentage (capped at 100 for the progress bar)
export function calculateWaterPercentage(consumedMl, targetMl) {
  if (!targetMl || targetMl <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((consumedMl / targetMl) * 100));
}

// Safe division-based average, returns 0 instead of NaN when list is empty
export function average(numbers) {
  if (!numbers || numbers.length === 0) return 0;
  const total = numbers.reduce((sum, n) => sum + (Number(n) || 0), 0);
  return Math.round(total / numbers.length);
}

// ========================================
// LOCAL DATE HELPERS
// All daily-tracking logic (streaks, "today",
// days remaining) uses the LOCAL calendar day,
// never UTC, to avoid off-by-one-day bugs.
// ========================================

// Returns "YYYY-MM-DD" for a Date/date-string using LOCAL time (not UTC).
export function getLocalDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Today's local date key, e.g. "2026-09-08"
export function getTodayLocalDateKey() {
  return getLocalDateKey(new Date());
}

// Number of whole local-calendar days between "from" and "to" (to - from).
// Positive = "to" is in the future relative to "from".
export function diffInLocalDays(fromDateLike, toDateLike) {
  const from = new Date(fromDateLike);
  const to = new Date(toDateLike);

  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

// Calculate days remaining until a target date (can be negative if overdue).
// NOTE: unlike a naive version, this DOES allow negative numbers so callers
// can correctly show "3 days overdue" instead of clamping to 0.
export function calculateDaysRemaining(targetDate) {
  if (!targetDate) return null;
  return diffInLocalDays(new Date(), targetDate);
}

// Human friendly label for a days-remaining number.
export function formatDaysRemaining(days) {
  if (days === null || days === undefined || Number.isNaN(days)) {
    return "No date set";
  }
  if (days === 0) return "Due today";
  if (days === 1) return "1 day left";
  if (days > 1) return `${days} days left`;
  if (days === -1) return "1 day overdue";
  return `${Math.abs(days)} days overdue`;
}

// Returns an array of the last N local date keys, oldest first, including today.
export function getLastNLocalDateKeys(n) {
  const keys = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    keys.push(getLocalDateKey(d));
  }
  return keys;
}

// Short weekday label ("Mon", "Tue"...) for a "YYYY-MM-DD" key
export function getWeekdayLabel(dateKey) {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString("en-IN", { weekday: "short" });
}

// Short "8 Sep" style label for a "YYYY-MM-DD" key
export function getShortDateLabel(dateKey) {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ========================================
// STREAK CALCULATION
// A day counts if it appears (at least once)
// in `activeDateKeys` (an array of "YYYY-MM-DD"
// strings, one per completed learning activity).
// ========================================

export function calculateStreak(activeDateKeys) {
  if (!activeDateKeys || activeDateKeys.length === 0) {
    return { current: 0, best: 0 };
  }

  // Unique, sorted ascending
  const uniqueDays = Array.from(new Set(activeDateKeys)).sort();

  let best = 1;
  let run = 1;

  for (let i = 1; i < uniqueDays.length; i++) {
    const gap = diffInLocalDays(uniqueDays[i - 1], uniqueDays[i]);
    if (gap === 1) {
      run += 1;
    } else if (gap > 1) {
      run = 1;
    }
    // gap === 0 shouldn't happen since the set is unique
    best = Math.max(best, run);
  }

  // Current streak: walk backwards from today (or yesterday, since today
  // might simply not have an entry yet without breaking the streak).
  const todayKey = getTodayLocalDateKey();
  const daySet = new Set(uniqueDays);

  let current = 0;
  let cursor = new Date();

  // If today has no activity yet, streak isn't broken until the day ends -
  // start checking from today, and if missing, check yesterday.
  if (!daySet.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (daySet.has(getLocalDateKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current, best: Math.max(best, current) };
}

// ========================================
// FORMATTING HELPERS
// ========================================

// Format minutes as "3h 40m" / "45m"
export function formatMinutes(totalMinutes) {
  const minutes = Math.max(0, Math.round(Number(totalMinutes) || 0));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

// Format millilitres as "1.8 L"
export function formatLitres(ml) {
  const litres = (Number(ml) || 0) / 1000;
  return `${litres.toFixed(1)} L`;
}

// Sum a numeric field across a list of objects
export function sumBy(list, field) {
  return list.reduce((total, item) => total + (Number(item[field]) || 0), 0);
}

// Group a list of objects by a "YYYY-MM-DD" style field into a Map
export function groupByDate(list, dateField) {
  const map = new Map();
  for (const item of list) {
    const key = item[dateField];
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}
