import { useEffect, useState } from 'react';
import i18n from '../i18n';

const locale = () => (i18n.language === 'si' ? 'si-LK' : 'en-LK');
const TZ = 'Asia/Colombo';

/** "Tue, 5 Nov, 6:33 pm" in Sri Lanka time, in the current language. */
export const formatDateTime = (value, opts = {}) => {
  if (value == null) return '';
  const d = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale(), { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', ...opts }).format(d);
};

export const formatDate = (value, opts = {}) => formatDateTime(value, { weekday: undefined, hour: undefined, minute: undefined, year: 'numeric', ...opts });

/**
 * A Sri Lanka wall-clock time sent without a zone (e.g. quiz startTime
 * "2026-11-05T18:33:00") as epoch ms. Sri Lanka has no daylight saving: +05:30.
 */
export const colomboWallClockToMs = (s) => (s ? Date.parse(`${s.length === 16 ? `${s}:00` : s}+05:30`) : null);

/** "in 4 days", "in 3 hours", "2 minutes ago". */
export const relativeTime = (ms, now = Date.now()) => {
  const diff = ms - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
  if (abs < 60_000) return rtf.format(Math.round(diff / 1000), 'second');
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), 'minute');
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), 'hour');
  return rtf.format(Math.round(diff / 86_400_000), 'day');
};

/** Remaining time as "2d 4h", "4:12:09" or "12:09". */
export const formatCountdown = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  if (d) return i18n.language === 'si' ? `දින ${d} පැය ${h}` : `${d}d ${h}h`;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
};

/**
 * Milliseconds until `target`, corrected for the device clock being wrong
 * (`serverTime` is the server's clock when the data was fetched). Ticks every
 * second, or every 30 s while more than an hour is left.
 */
export const useCountdown = (target, serverTime, fetchedAt) => {
  const offset = serverTime && fetchedAt ? serverTime - fetchedAt : 0;
  const compute = () => (target == null ? null : target - (Date.now() + offset));
  const [left, setLeft] = useState(compute);
  useEffect(() => {
    if (target == null) return undefined;
    const tick = () => setLeft(target - (Date.now() + offset));
    tick();
    const id = setInterval(tick, (target - Date.now()) > 3_600_000 ? 30_000 : 1000);
    return () => clearInterval(id);
  }, [target, offset]);
  return left;
};
