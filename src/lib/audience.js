import { colomboWallClockToMs, formatDateTime } from './time';

/*
 * "Who can see it" for lessons and quizzes: one row per batch with its own window.
 * Form state: { mode: 'same' | 'each', opens, closes, rows: { [batchId]: { opens, closes } } }
 * where a batch is selected when it has a row. Times are datetime-local strings
 * (Sri Lanka wall-clock, "YYYY-MM-DDTHH:mm"), as the API sends and expects them.
 */

const cut = (t) => (t ? String(t).slice(0, 16) : '');

export const emptyAudience = { mode: 'same', opens: '', closes: '', rows: {} };

/** Form state from an admin lesson or quiz response. */
export const audienceFrom = (item) => {
  const list = item?.audience ?? [];
  if (!list.length) return emptyAudience;
  const rows = Object.fromEntries(list.map((a) => [a.batchId, { opens: cut(a.opensAt), closes: cut(a.closesAt) }]));
  const first = list[0];
  const same = list.every((a) => cut(a.opensAt) === cut(first.opensAt) && cut(a.closesAt) === cut(first.closesAt));
  return same
    ? { mode: 'same', opens: cut(first.opensAt), closes: cut(first.closesAt), rows }
    : { mode: 'each', opens: '', closes: '', rows };
};

/** API payload: [{ batchId, opensAt, closesAt }]. */
export const audiencePayload = (a) => Object.entries(a.rows).map(([batchId, r]) => ({
  batchId: Number(batchId),
  opensAt: (a.mode === 'same' ? a.opens : r.opens) || null,
  closesAt: (a.mode === 'same' ? a.closes : r.closes) || null,
}));

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
  const anyTime = list.some((a) => a.opensAt || a.closesAt);
  const text = same ? windowText(list[0].opensAt, list[0].closesAt, words)
    : `${list.length} batches, different times`;
  return {
    label: !anyTime && label === 'Open' ? (words?.always ?? 'Always open') : label,
    tone, text, same,
    rows: list.map((a) => ({ ...a, text: windowText(a.opensAt, a.closesAt, words) })),
    batches: list.map((a) => a.batchNumber),
  };
};
