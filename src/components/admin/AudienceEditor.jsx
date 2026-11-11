import { CopyCheck } from 'lucide-react';
import { useBatchList } from '../../lib/useBatchList';
import { Input } from '../ui/primitives';
import { PeriodPicker, FeeSelect } from './AccessFields';
import Button from '../ui/Button';
import { cn } from '../../lib/cn';

const WORDS = {
  quiz: { opens: 'Opens', closes: 'Closes', opensHint: 'Empty = open now', closesHint: 'Correct answers are shown after this',
    feeHint: 'Students who haven\'t paid this month see the quiz locked.' },
  lesson: { opens: 'Available from', closes: 'Until', opensHint: 'Empty = straight away', closesHint: 'Empty = no end',
    feeHint: 'Students who haven\'t paid this month see the lesson locked.' },
};

/**
 * "Who can see it": pick batches, when each can see the lesson or quiz, and which
 * month's fee unlocks it for them. Simple mode is one window and one fee month for
 * every chosen batch; per-batch mode gives each its own (batches on different
 * timelines pay for the same content in different months). Switching to per-batch
 * copies the shared settings into every row.
 */
const AudienceEditor = ({ value, onChange, kind = 'quiz' }) => {
  const w = WORDS[kind];
  const batches = useBatchList();
  const { mode, rows } = value;
  const set = (patch) => onChange({ ...value, ...patch });
  const setRow = (id, patch) => set({ rows: { ...rows, [id]: { ...rows[id], ...patch } } });
  const toggle = (id) => {
    const next = { ...rows };
    if (next[id]) delete next[id];
    else next[id] = { opens: value.opens, closes: value.closes, month: value.month, year: value.year };
    set({ rows: next });
  };

  const ids = Object.keys(rows);
  const allSame = ids.every((id) => ['opens', 'closes', 'month', 'year'].every((k) => rows[id][k] === rows[ids[0]][k]));
  const switchTo = (m) => {
    if (m === mode) return;
    if (m === 'each') {
      set({ mode: 'each', rows: Object.fromEntries(ids.map((id) => [id, { opens: value.opens, closes: value.closes, month: value.month, year: value.year }])) });
    } else {
      // Back to one setting for all: keep the first chosen batch's (the hint says so).
      const first = rows[ids[0]] ?? { opens: '', closes: '', month: '', year: '' };
      set({ mode: 'same', opens: first.opens, closes: first.closes, month: first.month, year: first.year });
    }
  };
  const copyToAll = (id) => set({ rows: Object.fromEntries(ids.map((k) => [k, { ...rows[id] }])) });

  if (batches.isPending) return <p className="text-sm text-ink-3">Loading batches…</p>;
  if (!batches.list.length) return <p className="text-sm text-ink-2">No batches yet. Create one under Batches first.</p>;

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-medium">Who can see it <span className="text-debit" aria-hidden>*</span></legend>

      <div role="radiogroup" aria-label="Times" className="inline-flex rounded-control border border-line bg-sunken p-0.5 text-sm">
        {[['same', 'Same for every batch'], ['each', 'Different per batch']].map(([m, label]) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => switchTo(m)}
            className={cn('h-8 px-3 rounded-[7px] font-medium transition-colors',
              mode === m ? 'bg-surface text-ink shadow-sm' : 'text-ink-2 hover:text-ink')}>
            {label}
          </button>
        ))}
      </div>
      {mode === 'each' && ids.length > 1 && !allSame && (
        <p className="text-xs text-ink-3 -mt-2">Switching back keeps the first batch's dates and fee month for everyone.</p>
      )}

      {mode === 'same' ? (
        <>
          <div role="group" aria-label="Batches" className="flex flex-wrap gap-2">
            {batches.list.map((b) => {
              const on = !!rows[b.id];
              return (
                <button key={b.id} type="button" aria-pressed={on} onClick={() => toggle(b.id)}
                  className={cn('h-9 px-3 rounded-full border text-sm font-medium transition-colors',
                    on ? 'bg-brand text-on-brand border-brand' : 'bg-surface border-line text-ink-2 hover:border-line-strong')}>
                  {b.name}
                </button>
              );
            })}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TimeField label={w.opens} hint={w.opensHint} value={value.opens} onChange={(v) => set({ opens: v })} />
            <TimeField label={w.closes} hint={w.closesHint} value={value.closes} onChange={(v) => set({ closes: v })}
              invalid={value.opens && value.closes && value.closes <= value.opens} />
          </div>
          <label className="block">
            <span className="block text-sm font-medium mb-1.5">Unlocks with the fee for</span>
            <PeriodPicker month={value.month} year={value.year} onChange={({ month, year }) => set({ month, year })} />
            <span className="block text-xs text-ink-3 mt-1.5">{w.feeHint}</span>
          </label>
        </>
      ) : (
        <div className="rounded-panel border border-line divide-y divide-line">
          {batches.list.map((b) => {
            const r = rows[b.id];
            const bad = r && r.opens && r.closes && r.closes <= r.opens;
            return (
              <div key={b.id} className={cn('px-3 py-2.5', !r && 'bg-sunken/40')}>
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer min-w-0">
                    <input type="checkbox" checked={!!r} onChange={() => toggle(b.id)} className="h-4 w-4 accent-[var(--brand)] shrink-0" />
                    <span className="truncate">{b.name}</span>
                  </label>
                  {r ? (
                    <Button variant="ghost" size="sm" icon={CopyCheck} disabled={ids.length < 2} onClick={() => copyToAll(b.id)}
                      aria-label={`Copy ${b.name}'s settings to every batch`}>Copy to all</Button>
                  ) : <span className="text-sm text-ink-3">Can't see it</span>}
                </div>
                {r && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem] sm:pl-6.5">
                    <RowField label={w.opens}>
                      <Input type="datetime-local" aria-label={`${b.name}: ${w.opens}`} value={r.opens} onChange={(e) => setRow(b.id, { opens: e.target.value })} className="h-9 px-2.5 text-[13.5px]" />
                    </RowField>
                    <RowField label={w.closes}>
                      <Input type="datetime-local" aria-label={`${b.name}: ${w.closes}`} value={r.closes} aria-invalid={bad || undefined}
                        onChange={(e) => setRow(b.id, { closes: e.target.value })} className={cn('h-9 px-2.5 text-[13.5px]', bad && 'border-debit')} />
                    </RowField>
                    <RowField label="Fee month">
                      <FeeSelect aria-label={`${b.name}: fee month`} month={r.month} year={r.year} onChange={(fee) => setRow(b.id, fee)} className="h-9 text-[13.5px]" />
                    </RowField>
                    {bad && <p className="text-xs text-debit sm:col-span-3">Must close after it opens.</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-ink-3">Times are Sri Lanka time. A batch with no fee month sees it free.</p>
    </fieldset>
  );
};

const RowField = ({ label, children }) => (
  <div className="min-w-0">
    <span className="block text-xs text-ink-3 mb-1" aria-hidden>{label}</span>
    {children}
  </div>
);

const TimeField = ({ label, hint, value, onChange, invalid }) => (
  <label className="block">
    <span className="block text-sm font-medium mb-1.5">{label}</span>
    <Input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid || undefined}
      className={cn(invalid && 'border-debit')} />
    <span className={cn('block text-xs mt-1.5', invalid ? 'text-debit' : 'text-ink-3')}>{invalid ? 'Must be after the opening time.' : hint}</span>
  </label>
);

export default AudienceEditor;
