import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronLeft, Dices, PenLine, RefreshCw, Shuffle } from 'lucide-react';
import { quizAPI } from '../../services/api';
import { unwrap } from '../../lib/queryClient';
import { errorMessage } from '../../lib/errors';
import { Modal } from '../ui/Dialog';
import { Field, Input, Select, Checkbox } from '../ui/primitives';
import Button from '../ui/Button';
import UnitChecklist from './UnitChecklist';
import { cn } from '../../lib/cn';
import { emptyDraw, drawPayload } from '../../lib/draw';

/** The draw settings shared by "Add random questions" and creating a quiz from the bank. */
export const DrawSettings = ({ form, setForm, units }) => {
  const stats = useQuery({ queryKey: ['admin', 'bank-stats'], queryFn: () => quizAPI.getQuestionBankStats().then(unwrap) });
  const counts = Object.fromEntries((stats.data ?? []).map((s) => [s.unitId, s.totalCount]));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="text-sm font-medium mb-1">Units</legend>
        <p className="text-xs text-ink-3 mb-2">A unit includes its sub-units. Nothing ticked draws from the whole bank.</p>
        <div className="max-h-56 overflow-y-auto scroll-thin rounded-control border border-line px-3 py-1.5">
          <UnitChecklist units={units} value={form.unitIds} counts={counts} onChange={(unitIds) => setForm((f) => ({ ...f, unitIds }))} />
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="How many" required>{(p) => <Input {...p} type="number" min="1" max="200" value={form.count} onChange={set('count')} />}</Field>
        <Field label="Type">
          {(p) => (
            <Select {...p} value={form.type} onChange={set('type')}>
              <option value="">Any</option><option value="MCQ">Multiple choice</option><option value="WRITING">Written</option>
            </Select>
          )}
        </Field>
        <Field label="Marks each" hint="Empty = any">{(p) => <Input {...p} type="number" min="1" max="100" value={form.marks} onChange={set('marks')} placeholder="Any" />}</Field>
      </div>
      <Checkbox label="Take the same number from each ticked unit" checked={form.even} disabled={form.unitIds.length < 2}
        onChange={(e) => setForm((f) => ({ ...f, even: e.target.checked }))} />
      <Field label="Leave out questions used in the last" hint="Days. Empty = use any question.">
        {(p) => <Input {...p} type="number" min="1" max="3650" value={form.days} onChange={set('days')} className="w-32" placeholder="e.g. 90" />}
      </Field>
    </div>
  );
};

/**
 * Random questions for a quiz that already exists: draw, look them over, swap or
 * untick any, then add. Nothing is saved until "Add".
 */
const RandomDrawDialog = ({ quiz, units, onClose, onAdded }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyDraw);
  const [drawn, setDrawn] = useState(null);     // [{ ...question, keep }]
  const [busy, setBusy] = useState(false);
  const [swapping, setSwapping] = useState(null);

  const draw = async (count, exclude = []) => unwrap(await quizAPI.randomDraw({
    ...drawPayload(form), count, quizId: quiz.id, excludeIds: exclude.length ? exclude : null,
  }));

  const start = async (e) => {
    e?.preventDefault();
    const count = Number(form.count);
    if (!count || count < 1) { toast.error('Draw at least one question.'); return; }
    setBusy(true);
    try {
      const list = await draw(count);
      if (!list.length) { toast.error('No questions in the bank match those choices.'); return; }
      if (list.length < count) toast(`Only ${list.length} question${list.length === 1 ? '' : 's'} match. Showing all of them.`);
      setDrawn(list.map((q) => ({ ...q, keep: true })));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const swap = async (i) => {
    setSwapping(i);
    try {
      const [next] = await draw(1, drawn.map((q) => q.id));
      if (!next) { toast('No other matching question to swap in.'); return; }
      setDrawn((list) => list.map((q, j) => (j === i ? { ...next, keep: true } : q)));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSwapping(null);
    }
  };

  const kept = (drawn ?? []).filter((q) => q.keep);
  const add = async () => {
    setBusy(true);
    try {
      const saved = unwrap(await quizAPI.addFromBank(quiz.id, kept.map((q) => q.id)));
      toast.success(`${kept.length} question${kept.length === 1 ? '' : 's'} added`);
      qc.invalidateQueries({ queryKey: ['admin', 'bank-search'] });
      onAdded(saved);
    } catch (err) {
      toast.error(errorMessage(err, 'The questions weren\'t added.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} size="lg"
      title={drawn ? `${drawn.length} random question${drawn.length === 1 ? '' : 's'}` : 'Add random questions'}
      description={drawn ? 'Swap or untick any you don\'t want, then add them.' : `Drawn from the bank for ${quiz.title}. You'll see them before anything is added.`}
      footer={drawn ? (
        <div className="flex w-full flex-wrap items-center gap-2">
          <Button variant="ghost" icon={ChevronLeft} onClick={() => setDrawn(null)}>Change settings</Button>
          <Button variant="secondary" icon={Shuffle} loading={busy && !kept.length} onClick={start}>Draw again</Button>
          <span className="flex-1" />
          <Button disabled={!kept.length} loading={busy} onClick={add}>Add {kept.length} question{kept.length === 1 ? '' : 's'}</Button>
        </div>
      ) : (
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="draw-form" icon={Dices} loading={busy}>Draw questions</Button>
        </>
      )}>
      {drawn ? (
        <ol className="divide-y divide-line rounded-panel border border-line">
          {drawn.map((q, i) => (
            <li key={q.id} className={cn('flex gap-3 px-3 py-2.5', !q.keep && 'opacity-50')}>
              <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[var(--brand)]" checked={q.keep}
                aria-label={`Keep: ${q.questionText.slice(0, 80)}`}
                onChange={(e) => setDrawn((list) => list.map((x, j) => (j === i ? { ...x, keep: e.target.checked } : x)))} />
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] leading-[1.6] line-clamp-3 whitespace-pre-wrap">{q.questionText}</p>
                <p className="mt-1 flex flex-wrap gap-x-2.5 text-xs text-ink-3">
                  <span>{q.parentUnitName ? `${q.parentUnitName} › ${q.unitName}` : q.unitName ?? 'No unit'}</span>
                  <span className="inline-flex items-center gap-1">{q.questionType === 'WRITING' ? <><PenLine size={12} aria-hidden />Written</> : 'Multiple choice'}</span>
                  <span className="tabular">{q.marks} mark{q.marks === 1 ? '' : 's'}</span>
                  <span>{q.usageCount ? `Used in ${q.usageCount}` : 'Not used yet'}</span>
                </p>
              </div>
              <Button variant="ghost" size="sm" icon={RefreshCw} loading={swapping === i} onClick={() => swap(i)} aria-label={`Swap question ${i + 1} for another`}>Swap</Button>
            </li>
          ))}
        </ol>
      ) : (
        <form id="draw-form" onSubmit={start}><DrawSettings form={form} setForm={setForm} units={units} /></form>
      )}
    </Modal>
  );
};

export default RandomDrawDialog;
