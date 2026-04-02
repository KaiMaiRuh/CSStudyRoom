const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function isValidDateParts(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const candidate = new Date(year, month - 1, day);
  return (
    candidate.getFullYear() === year
    && candidate.getMonth() === month - 1
    && candidate.getDate() === day
  );
}

function parseTimeParts(timeValue) {
  const raw = String(timeValue || '').trim();
  if (!raw) return { hours: 0, minutes: 0, ok: true };

  const m = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return { hours: 0, minutes: 0, ok: false };

  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return { hours: 0, minutes: 0, ok: false };
  if (hours < 0 || hours > 23) return { hours: 0, minutes: 0, ok: false };
  if (minutes < 0 || minutes > 59) return { hours: 0, minutes: 0, ok: false };

  return { hours, minutes, ok: true };
}

function asPositiveHours(rawHours) {
  const n = Number(rawHours);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return n;
}

export function buildTutorSessionStart(dateValue, timeValue) {
  const dateRaw = String(dateValue || '').trim();
  if (!dateRaw) return null;

  const dateMatch = dateRaw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  if (!isValidDateParts(year, month, day)) return null;

  const { hours, minutes, ok } = parseTimeParts(timeValue);
  if (!ok) return null;

  const startAt = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (Number.isNaN(startAt.getTime())) return null;

  return startAt;
}

export function getTutorSessionWindowFromRaw({ date, time, hours }, nowInput = Date.now()) {
  const startAt = buildTutorSessionStart(date, time);
  const nowMillis = nowInput instanceof Date ? nowInput.getTime() : Number(nowInput);
  const safeNow = Number.isFinite(nowMillis) ? nowMillis : Date.now();

  if (!startAt) {
    return {
      hasSchedule: false,
      startAt: null,
      endAt: null,
      joinLeaveDeadlineAt: null,
      hours: asPositiveHours(hours),
      canJoinLeave: true,
      isStarted: false,
      isEnded: false,
      isReminderWindow: false,
      msUntilStart: null,
    };
  }

  const safeHours = asPositiveHours(hours);
  const startMillis = startAt.getTime();
  const endAt = new Date(startMillis + safeHours * HOUR_MS);
  const joinLeaveDeadlineAt = new Date(startMillis - DAY_MS);

  const endMillis = endAt.getTime();
  const deadlineMillis = joinLeaveDeadlineAt.getTime();

  return {
    hasSchedule: true,
    startAt,
    endAt,
    joinLeaveDeadlineAt,
    hours: safeHours,
    canJoinLeave: safeNow <= deadlineMillis,
    isStarted: safeNow >= startMillis,
    isEnded: safeNow >= endMillis,
    isReminderWindow: safeNow >= startMillis - HOUR_MS && safeNow < startMillis,
    msUntilStart: startMillis - safeNow,
  };
}

export function getTutorSessionWindowFromPost(postLike, nowInput = Date.now()) {
  const schedule = postLike?.schedule && typeof postLike.schedule === 'object' ? postLike.schedule : {};

  return getTutorSessionWindowFromRaw(
    {
      date: schedule.date ?? postLike?.date ?? '',
      time: schedule.time ?? postLike?.time ?? '',
      hours: schedule.hours ?? postLike?.hours ?? 1,
    },
    nowInput
  );
}
