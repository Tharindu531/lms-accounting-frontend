import { colomboWallClockToMs, formatDateTime } from './time';

/*
 * "Who can see it" for lessons and quizzes: one row per batch with its own window.
 * Form state: { mode: 'same' | 'each', opens, closes, month, year,
 *               rows: { [batchId]: { opens, closes, month, year } } }
 * where a batch is selected when it has a row. Times are datetime-local strings
 * (Sri Lanka wall-clock, "YYYY-MM-DDTHH:mm"), as the API sends and expects them.
 * month/year is the fee month that unlocks it for that batch ('' = free).
 */

const cut = (t) => (t ? String(t).slice(0, 16) : '');

export const emptyAudience = { mode: 'same', opens: '', closes: '', month: '', year: '', rows: {} };

const str = (v) => (v == null ? '' : String(v));
const sameRow = (a, b) => a.opens === b.opens && a.closes === b.closes && a.month === b.month && (a.month === '' || a.year === b.year);

/** Form state from an admin lesson or quiz response. */
export const audienceFrom = (item) => {
  const list = item?.audience ?? [];
  if (!list.length) return emptyAudience;
  const rows = Object.fromEntries(list.map((a) => [a.batchId,
    { opens: cut(a.opensAt), closes: cut(a.closesAt), month: str(a.month), year: str(a.year) }]));
  const first = rows[list[0].batchId];
  const same = Object.values(rows).every((r) => sameRow(r, first));
  return same
    ? { mode: 'same', ...first, rows }
    : { mode: 'each', opens: '', closes: '', month: '', year: '', rows };
};

/** API payload: [{ batchId, opensAt, closesAt }]. */
export const audiencePayload = (a) => Object.entries(a.rows).map(([batchId, r]) => {
  const src = a.mode === 'same' ? a : r;
  return {
    batchId: Number(batchId),
    opensAt: src.opens || null,
    closesAt: src.closes || null,
    month: src.month ? Number(src.month) : null,
    year: src.month ? Number(src.year || new Date().getFullYear()) : null,
  };
});

/** First problem with the form, or null. `names` maps batchId -> batch name. */
export const audienceProblem = (a, names = {}, closeWord = 'close') => {
  const ids = Object.keys(a.rows);
  if (!ids.length) return 'Choose at least one batch.';
  const bad = (o, c) => o && c && c <= o;
  if (a.mode === 'same') return bad(a.opens, a.closes) ? `It must ${closeWord} after it opens.` : null;
  const id = ids.find((k) => bad(a.rows[k].opens, a.rows[k].closes));
  return id ? `${names[id] ?? 'A batch'}: it must ${closeWord} after it opens.` : null;
};

const fmt = (t) => (t ? formatDateTime(colomboWallClockToMs(t)) : null);
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "Nov 2026 fee", or null when free. */
export const feeText = (month, year) => (month ? `${SHORT[month - 1]}${year ? ` ${year}` : ''} fee` : null);

export const windowText = (opens, closes, { from = 'From', until = 'Until', none = 'No time window' } = {}) => {
  const s = fmt(opens), e = fmt(closes);
  if (s && e) return `${s} – ${e}`;
  if (s) return `${from} ${s}`;
  if (e) return `${until} ${e}`;
  return none;
};

/** One row's state at `now`: 'scheduled' | 'open' | 'closed'. */
const rowState = (a, now) => {
  const s = colomboWallClockToMs(a.opensAt), e = colomboWallClockToMs(a.closesAt);
  if (s && now < s) return 'scheduled';
  if (e && now > e) return 'closed';
  return 'open';
};

/**
 * Summary for admin lists: a status badge plus a line, taking every batch into
 * account. Batches with the same times read as one window; otherwise the line says
 * they differ and `rows` carries the detail.
 */
export const audienceSummary = (item, now = Date.now(), words) => {
  const list = [...(item?.audience ?? [])].sort((x, y) => x.batchNumber - y.batchNumber);
  if (!list.length) return { label: 'No batches', tone: 'due', text: 'Hidden from students: no batch can see it', rows: [] };
  const states = list.map((a) => rowState(a, now));
  const label = states.includes('open') ? (states.every((s) => s === 'open') ? 'Open' : 'Open for some')
    : states.every((s) => s === 'closed') ? 'Closed' : 'Scheduled';
  const tone = label.startsWith('Open') ? 'credit' : label === 'Closed' ? 'neutral' : 'brand';
  const same = list.every((a) => cut(a.opensAt) === cut(list[0].opensAt) && cut(a.closesAt) === cut(list[0].closesAt));
  const sameFee = list.every((a) => a.month === list[0].month && a.year === list[0].year);
  const anyTime = list.some((a) => a.opensAt || a.closesAt);
  const text = same ? windowText(list[0].opensAt, list[0].closesAt, words)
    : `${list.length} batches, different times`;
  return {
    label: !anyTime && label === 'Open' ? (words?.always ?? 'Always open') : label,
    tone, text, same, sameFee,
    fee: sameFee ? feeText(list[0].month, list[0].year) : 'Fee month varies by batch',
    rows: list.map((a) => ({ ...a, text: windowText(a.opensAt, a.closesAt, words), fee: feeText(a.month, a.year) })),
    batches: list.map((a) => a.batchNumber),
  };
};
