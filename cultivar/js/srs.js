// Leitner-style levels 0–6 with intervals in days:
// 0=new/failed (due now), 1→1d, 2→3d, 3→7d, 4→30d, 5→90d, 6→365d
const INTERVALS = [0, 1, 3, 7, 30, 90, 365];

export function nextInterval(currentLevel, correct) {
  if (!correct) {
    return { level: 0, dueDate: startOfToday() };
  }
  const newLevel = Math.min(currentLevel + 1, INTERVALS.length - 1);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + INTERVALS[newLevel]);
  dueDate.setHours(0, 0, 0, 0);
  return { level: newLevel, dueDate };
}

export function levelLabel(level) {
  const labels = ['New', '1 day', '3 days', '1 week', '1 month', '3 months', '1 year'];
  return labels[level] ?? '?';
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
