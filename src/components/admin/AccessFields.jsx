import { useQuery } from '@tanstack/react-query';
import { batchAPI } from '../../services/api';
import { unwrap } from '../../lib/queryClient';
import { Select } from '../ui/primitives';
import { cn } from '../../lib/cn';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Toggle chips, one per batch. `value` is an array of batch numbers. */
export const BatchPicker = ({ value, onChange, id }) => {
  const batches = useQuery({ queryKey: ['admin', 'batches'], queryFn: () => batchAPI.getAll().then(unwrap) });
  const list = [...(batches.data ?? [])].sort((a, b) => b.batchNumber - a.batchNumber);
  const toggle = (n) => onChange(value.includes(n) ? value.filter((x) => x !== n) : [...value, n]);
  if (batches.isPending) return <p className="text-sm text-ink-3">Loading batches…</p>;
  if (!list.length) return <p className="text-sm text-ink-2">No batches yet. Create one under Batches first.</p>;
  return (
    <div id={id} role="group" className="flex flex-wrap gap-2">
      {list.map((b) => {
        const on = value.includes(b.batchNumber);
        return (
          <button key={b.id} type="button" aria-pressed={on} onClick={() => toggle(b.batchNumber)}
            className={cn('h-9 px-3 rounded-full border text-sm font-medium transition-colors tabular',
              on ? 'bg-brand text-on-brand border-brand' : 'bg-surface border-line text-ink-2 hover:border-line-strong')}>
            {b.batchNumber}
          </button>
        );
      })}
    </div>
  );
};

/** Which month's fee unlocks the content. Empty month = free for the selected batches. */
export const PeriodPicker = ({ month, year, onChange, id }) => {
  const thisYear = new Date().getFullYear();
  const years = [thisYear - 1, thisYear, thisYear + 1, thisYear + 2];
  return (
    <div className="flex gap-2">
      <Select id={id} aria-label="Fee month" value={month} onChange={(e) => onChange({ month: e.target.value, year: year || (e.target.value ? String(thisYear) : '') })} className="flex-1">
        <option value="">Free (no fee needed)</option>
        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </Select>
      <Select aria-label="Fee year" value={year} disabled={!month} onChange={(e) => onChange({ month, year: e.target.value })} className="w-28">
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </Select>
    </div>
  );
};
