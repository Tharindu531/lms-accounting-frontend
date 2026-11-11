import { useQuery } from '@tanstack/react-query';
import { lessonAPI, quizAPI, paymentAPI, unitAPI } from '../services/api';
import { unwrap } from './queryClient';
import { unitTree } from './units';

/** Query keys in one place, so a mutation can invalidate exactly what it changed. */
export const keys = {
  lessons: ['lessons'],
  units: ['units'],
  quizzes: ['quizzes'],
  myResults: ['my-results'],
  myResult: (quizId) => ['my-results', quizId],
  paymentStatus: ['payments', 'status'],
  paymentHistory: ['payments', 'history'],
};

export const useLessons = () => useQuery({ queryKey: keys.lessons, queryFn: () => lessonAPI.getAll().then(unwrap) });
export const useUnits = () => useQuery({ queryKey: keys.units, queryFn: () => unitAPI.getActive().then(unwrap), staleTime: 5 * 60_000 });
export const useQuizzes = () => useQuery({ queryKey: keys.quizzes, queryFn: () => quizAPI.getAll().then(unwrap) });
export const useMyResults = () => useQuery({ queryKey: keys.myResults, queryFn: () => quizAPI.getMyResults().then(unwrap) });
export const usePaymentStatus = () => useQuery({ queryKey: keys.paymentStatus, queryFn: () => paymentAPI.getStatus().then(unwrap) });
export const usePaymentHistory = () => useQuery({ queryKey: keys.paymentHistory, queryFn: () => paymentAPI.getHistory().then(unwrap) });

const MONTH_NAMES = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

/** Payment rows store the month as "01".."12" (older rows: "NOVEMBER"). Returns 1–12. */
export const monthNumber = (m) => {
  if (m == null) return null;
  const n = parseInt(m, 10);
  if (!Number.isNaN(n)) return n;
  const i = MONTH_NAMES.indexOf(String(m).toUpperCase());
  return i >= 0 ? i + 1 : null;
};

/** Set of "YYYY-M" strings for every month this student has paid. */
export const paidSet = (history) => new Set((history ?? []).map((p) => `${p.year}-${monthNumber(p.month)}`));

/** Current year and month (1–12) in Sri Lanka, where fees fall due. */
export const colomboNow = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hour12: false })
    .formatToParts(new Date());
  const get = (t) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') };
};

/** YouTube video id from any common link format, or null. */
export const youTubeId = (url) => {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|shorts\/|live\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return m ? m[1] : null;
};

/** Lessons in curriculum order: by unit display order, then the lesson's own order. */
export const orderLessons = (lessons, units) => {
  // Course order: each unit, then its sub-units (see unitTree).
  const unitOrder = new Map(unitTree(units ?? []).map((u, i) => [u.id, i]));
  return [...(lessons ?? [])].sort((a, b) =>
    (unitOrder.get(a.unitId) ?? 999) - (unitOrder.get(b.unitId) ?? 999) ||
    (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id - b.id);
};

/** The lesson to resume: one already started, else the next one not yet done. */
export const nextLesson = (ordered) =>
  ordered.find((l) => !l.locked && !l.notYetOpen && !l.completed && (l.watchedSeconds ?? 0) > 0) ??
  ordered.find((l) => !l.locked && !l.notYetOpen && !l.completed) ?? null;

export const formatDuration = (seconds) => {
  const s = Math.max(0, Math.round(seconds ?? 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
};
