import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  FileQuestion, Plus, Pencil, Trash2, Copy, Eye, Wand2, ArrowUp, ArrowDown, GripVertical, ChevronLeft, Lock, Paperclip, PenLine, CheckCircle2,
} from 'lucide-react';
import { quizAPI, unitAPI } from '../../services/api';
import { unwrap } from '../../lib/queryClient';
import { errorMessage } from '../../lib/errors';
import { periodLabel } from '../../lib/period';
import { colomboWallClockToMs, formatDateTime } from '../../lib/time';
import { Panel, PageHeader, Badge, SkeletonRows, EmptyState, ErrorState, Field, Input, Textarea, Checkbox, Table, Th, Td } from '../../components/ui/primitives';
import { Modal } from '../../components/ui/Dialog';
import { useConfirm } from '../../components/ui/Confirm';
import Button from '../../components/ui/Button';
import { BatchPicker, PeriodPicker } from '../../components/admin/AccessFields';
import QuestionEditor from '../../components/admin/QuestionEditor';
import QuizPlayer from '../../components/quiz/QuizPlayer';
import { cn } from '../../lib/cn';

/* ---------- Status from the schedule ---------- */

const windowState = (q, now = Date.now()) => {
  const start = colomboWallClockToMs(q.startTime);
  const end = colomboWallClockToMs(q.endTime);
  if (start && now < start) return { label: 'Scheduled', tone: 'brand' };
  if (end && now > end) return { label: 'Closed', tone: 'neutral' };
  if (start || end) return { label: 'Open', tone: 'credit' };
  return { label: 'Always open', tone: 'credit' };
};

const windowText = (q) => {
  const s = q.startTime && formatDateTime(colomboWallClockToMs(q.startTime));
  const e = q.endTime && formatDateTime(colomboWallClockToMs(q.endTime));
  if (s && e) return `${s} – ${e}`;
  if (s) return `From ${s}`;
  if (e) return `Until ${e}`;
  return 'No time window';
};

/* ---------- Quiz details form ---------- */

const emptyDetails = { title: '', description: '', accessibleBatches: [], timeLimit: '30', month: '', year: '', startTime: '', endTime: '' };
const detailsFrom = (q) => (q ? {
  title: q.title ?? '', description: q.description ?? '', accessibleBatches: Array.from(q.accessibleBatches ?? []), timeLimit: String(q.timeLimit ?? 0),
  month: q.month ? String(q.month) : '', year: q.year ? String(q.year) : '',
  startTime: q.startTime ? q.startTime.slice(0, 16) : '', endTime: q.endTime ? q.endTime.slice(0, 16) : '',
} : emptyDetails);

const DetailsForm = ({ form, setForm, fromUnits, units }) => {
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="space-y-5">
      <Field label="Title" required>{(p) => <Input {...p} value={form.title} onChange={set('title')} placeholder="November monthly paper" />}</Field>
      <Field label="Description" hint="Shown to students before they start.">{(p) => <Textarea {...p} rows={2} value={form.description} onChange={set('description')} />}</Field>

      {fromUnits && (
        <fieldset className="space-y-3 pt-5 border-t border-line">
          <legend className="text-sm font-medium">Questions from the bank</legend>
          <div className="grid sm:grid-cols-2 gap-1">
            {units.map((u) => (
              <Checkbox key={u.id} label={`${u.name} (${u.questionCount ?? 0})`} checked={form.unitIds.includes(u.id)}
                onChange={() => setForm((f) => ({ ...f, unitIds: f.unitIds.includes(u.id) ? f.unitIds.filter((x) => x !== u.id) : [...f.unitIds, u.id] }))} />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-[10rem_1fr] items-end">
            <Field label="How many questions" required>{(p) => <Input {...p} type="number" min="1" max="200" value={form.numberOfQuestions} onChange={set('numberOfQuestions')} />}</Field>
            <Checkbox label="Take the same number from each unit" checked={form.evenDistribution} onChange={(e) => setForm((f) => ({ ...f, evenDistribution: e.target.checked }))} />
          </div>
          <p className="text-xs text-ink-3">No units ticked picks from the whole bank. Questions are chosen at random.</p>
        </fieldset>
      )}

      <fieldset className="space-y-4 pt-5 border-t border-line">
        <legend className="text-sm font-medium">When students can take it</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Opens" hint="Sri Lanka time. Empty = open now.">{(p) => <Input {...p} type="datetime-local" value={form.startTime} onChange={set('startTime')} />}</Field>
          <Field label="Closes" hint="Correct answers are shown after this.">{(p) => <Input {...p} type="datetime-local" value={form.endTime} onChange={set('endTime')} />}</Field>
        </div>
        <Field label="Time limit (minutes)" hint="0 for no limit. The clock starts when a student opens the quiz.">
          {(p) => <Input {...p} type="number" min="0" max="600" value={form.timeLimit} onChange={set('timeLimit')} className="w-32" />}
        </Field>
      </fieldset>

      <fieldset className="space-y-4 pt-5 border-t border-line">
        <Field label="Batches who can take it" required>{(p) => <BatchPicker id={p.id} value={form.accessibleBatches} onChange={(v) => setForm((f) => ({ ...f, accessibleBatches: v }))} />}</Field>
        {!fromUnits && (
          <Field label="Unlocks with the fee for">
            {(p) => <PeriodPicker id={p.id} month={form.month} year={form.year} onChange={({ month, year }) => setForm((f) => ({ ...f, month, year }))} />}
          </Field>
        )}
      </fieldset>
    </div>
  );
};

const detailsPayload = (form) => ({
  title: form.title.trim(), description: form.description, accessibleBatches: form.accessibleBatches,
  timeLimit: Number(form.timeLimit) || 0, startTime: form.startTime || null, endTime: form.endTime || null,
  month: form.month ? Number(form.month) : null, year: form.month ? Number(form.year || new Date().getFullYear()) : null,
});

const validDetails = (form) => {
  if (!form.accessibleBatches.length) { toast.error('Choose at least one batch.'); return false; }
  if (form.startTime && form.endTime && form.endTime <= form.startTime) { toast.error('The quiz must close after it opens.'); return false; }
  return true;
};

/* ---------- Builder for one quiz ---------- */

const QuestionCard = ({ q, index, count, locked, onEdit, onRemove, onMove, dragProps }) => (
  <li {...dragProps} className="group flex gap-3 px-4 py-4 bg-surface">
    <div className="flex flex-col items-center gap-0.5 pt-0.5">
      <GripVertical size={16} className="text-ink-3 cursor-grab hidden sm:block" aria-hidden />
      <Button variant="ghost" size="icon-sm" aria-label={`Move question ${index + 1} up`} disabled={index === 0} onClick={() => onMove(index, -1)}><ArrowUp size={14} /></Button>
      <Button variant="ghost" size="icon-sm" aria-label={`Move question ${index + 1} down`} disabled={index === count - 1} onClick={() => onMove(index, 1)}><ArrowDown size={14} /></Button>
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium whitespace-pre-wrap"><span className="text-ink-3 tabular mr-1.5">{index + 1}.</span>{q.questionText}</p>
        <div className="flex items-center gap-1 shrink-0">
          <Badge>{q.marks} mark{q.marks === 1 ? '' : 's'}</Badge>
          {!locked && <>
            <Button variant="ghost" size="icon-sm" aria-label={`Edit question ${index + 1}`} onClick={() => onEdit(q)}><Pencil size={15} /></Button>
            <Button variant="danger-ghost" size="icon-sm" aria-label={`Remove question ${index + 1}`} onClick={() => onRemove(q)}><Trash2 size={15} /></Button>
          </>}
        </div>
      </div>
      <p className="text-xs text-ink-3 mt-0.5 flex flex-wrap gap-x-3">
        {q.questionType === 'WRITING' ? <span className="inline-flex items-center gap-1"><PenLine size={12} aria-hidden />Written answer</span> : <span>Multiple choice</span>}
        {q.unitName && <span>{q.unitName}</span>}
        {q.attachments?.length > 0 && <span className="inline-flex items-center gap-1"><Paperclip size={12} aria-hidden />{q.attachments.length} file{q.attachments.length === 1 ? '' : 's'}</span>}
      </p>
      {q.questionType !== 'WRITING' && (
        <ol className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
          {['A', 'B', 'C', 'D', 'E'].filter((l) => q[`option${l}`]).map((l) => (
            <li key={l} className={cn('flex gap-2', q.correctAnswer === l ? 'text-credit font-medium' : 'text-ink-2')}>
              <span className="w-4 shrink-0">{l}.</span><span>{q[`option${l}`]}</span>
              {q.correctAnswer === l && <CheckCircle2 size={14} className="mt-0.5 shrink-0" aria-label="correct answer" />}
            </li>
          ))}
        </ol>
      )}
    </div>
  </li>
);

const QuizBuilder = ({ quiz, units, onBack, onChanged, onDuplicate, onEditDetails }) => {
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);   // null | 'new' | question
  const [editorKey, setEditorKey] = useState(0);
  const [preview, setPreview] = useState(false);
  const [order, setOrder] = useState(null);       // optimistic order of ids while saving
  const [dragIndex, setDragIndex] = useState(null);
  const locked = (quiz.attemptCount ?? 0) > 0;
  const state = windowState(quiz);

  const questions = useMemo(() => {
    const qs = quiz.questions ?? [];
    if (!order) return qs;
    const byId = new Map(qs.map((q) => [q.id, q]));
    return order.map((id) => byId.get(id)).filter(Boolean);
  }, [quiz.questions, order]);

  const saveOrder = async (ids) => {
    setOrder(ids);
    try { await quizAPI.reorderQuestions(quiz.id, ids); await onChanged(); }
    catch (e) { toast.error(errorMessage(e, 'The order wasn\'t saved.')); }
    finally { setOrder(null); }
  };
  const move = (i, d) => {
    const ids = questions.map((q) => q.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    saveOrder(ids);
  };
  const drop = (to) => {
    if (dragIndex == null || dragIndex === to) return;
    const ids = questions.map((q) => q.id);
    const [moved] = ids.splice(dragIndex, 1);
    ids.splice(to, 0, moved);
    setDragIndex(null);
    saveOrder(ids);
  };

  const remove = async (q) => {
    if (!(await confirm({ title: 'Remove this question?', description: q.questionText.slice(0, 140), confirmLabel: 'Remove question', tone: 'danger' }))) return;
    try { await quizAPI.removeQuestion(quiz.id, q.id); toast.success('Question removed'); onChanged(); } catch (e) { toast.error(errorMessage(e)); }
  };

  const totalMarks = questions.reduce((s, q) => s + (q.marks ?? 0), 0);
  const previewQuiz = useMemo(() => (preview ? {
    ...quiz, questions, serverTime: Date.now(), attemptDeadline: quiz.timeLimit ? Date.now() + quiz.timeLimit * 60000 : null,
  } : null), [preview, quiz, questions]);

  if (previewQuiz) return <QuizPlayer preview quiz={previewQuiz} user={null} onExit={() => setPreview(false)} onSubmitted={() => { setPreview(false); toast('Preview finished. Nothing was submitted.'); }} />;

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink"><ChevronLeft size={16} aria-hidden /> All quizzes</button>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1"><Badge tone={state.tone}>{state.label}</Badge>{quiz.month && <Badge tone="brand">{periodLabel(quiz.month, quiz.year)} fee</Badge>}</div>
          <h1 className="text-[26px] font-semibold">{quiz.title}</h1>
          <p className="text-sm text-ink-2 mt-1 tabular">
            {windowText(quiz)} · {quiz.timeLimit ? `${quiz.timeLimit} min` : 'no time limit'} · batches {Array.from(quiz.accessibleBatches ?? []).sort().join(', ')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={Eye} disabled={!questions.length} onClick={() => setPreview(true)}>Preview as student</Button>
          <Button variant="secondary" icon={Pencil} onClick={onEditDetails}>Edit details</Button>
          <Button variant="secondary" icon={Copy} onClick={onDuplicate}>Duplicate</Button>
        </div>
      </header>

      {locked && (
        <div className="flex items-start gap-3 rounded-panel border border-line bg-surface px-4 py-3 text-sm">
          <Lock size={18} className="text-ink-3 shrink-0 mt-0.5" aria-hidden />
          <p>{quiz.attemptCount} student{quiz.attemptCount === 1 ? ' has' : 's have'} attempted this quiz, so questions can't be edited or removed (that would change marks already given). You can still reorder them, add new ones, or duplicate the quiz to make a changed version.</p>
        </div>
      )}

      <Panel>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line">
          <p className="text-sm"><span className="font-semibold tabular">{questions.length}</span> questions · <span className="ledger-total font-semibold">{totalMarks} marks</span></p>
          <Button icon={Plus} onClick={() => { setEditorKey((k) => k + 1); setEditing('new'); }}>Add question</Button>
        </div>
        {questions.length === 0 ? (
          <EmptyState icon={FileQuestion} title="No questions yet" description="Add questions one by one, or create the quiz from the question bank instead." />
        ) : (
          <ol className={cn('divide-y divide-line', order && 'opacity-70')}>
            {questions.map((q, i) => (
              <QuestionCard key={q.id} q={q} index={i} count={questions.length} locked={locked}
                onEdit={(x) => { setEditorKey((k) => k + 1); setEditing(x); }} onRemove={remove} onMove={move}
                dragProps={{
                  draggable: true,
                  onDragStart: () => setDragIndex(i),
                  onDragOver: (e) => e.preventDefault(),
                  onDrop: () => drop(i),
                  className: dragIndex === i ? 'opacity-50' : undefined,
                }} />
            ))}
          </ol>
        )}
      </Panel>

      {editing && (
        <QuestionEditor key={editorKey} open onOpenChange={(o) => { if (!o) { setEditing(null); onChanged(); } }} units={units}
          question={editing === 'new' ? null : editing}
          onSave={async (data, id) => unwrap(await (id ? quizAPI.updateQuestion(quiz.id, id, data) : quizAPI.addQuestion(quiz.id, data)))} />
      )}
    </div>
  );
};

/* ---------- Page ---------- */

const ManageQuizzes = () => {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const quizzes = useQuery({ queryKey: ['admin', 'quizzes'], queryFn: () => quizAPI.getAllAdmin().then(unwrap) });
  const units = useQuery({ queryKey: ['admin', 'units'], queryFn: () => unitAPI.getAll().then(unwrap) });
  const unitList = (units.data ?? []).filter((u) => u.isActive !== false).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState(null);     // { mode: 'new' | 'edit' | 'fromUnits', form }

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'quizzes'] });
  const list = useMemo(() => [...(quizzes.data ?? [])].sort((a, b) => b.id - a.id), [quizzes.data]);
  const current = list.find((q) => q.id === openId);

  const saveDetails = useMutation({
    mutationFn: async ({ mode, form }) => {
      if (mode === 'fromUnits') {
        return unwrap(await quizAPI.createFromUnits({ ...detailsPayload(form), unitIds: form.unitIds.length ? form.unitIds : null,
          numberOfQuestions: Number(form.numberOfQuestions) || 10, evenDistribution: form.evenDistribution }));
      }
      return unwrap(await (mode === 'edit' ? quizAPI.update(openId, detailsPayload(form)) : quizAPI.create(detailsPayload(form))));
    },
    onSuccess: async (saved, { mode }) => {
      await refresh();
      setDetails(null);
      toast.success(mode === 'edit' ? 'Quiz saved' : 'Quiz created');
      if (saved?.id) setOpenId(saved.id);
    },
    onError: (e) => toast.error(errorMessage(e, 'The quiz wasn\'t saved.')),
  });

  const duplicate = async (q) => {
    try { const copy = unwrap(await quizAPI.duplicate(q.id)); await refresh(); setOpenId(copy.id); toast.success('Quiz duplicated', { description: 'Set a time window before students can take it.' }); }
    catch (e) { toast.error(errorMessage(e)); }
  };

  const remove = async (q) => {
    const ok = await confirm({
      title: `Delete "${q.title}"?`,
      description: q.attemptCount ? `${q.attemptCount} student result${q.attemptCount === 1 ? '' : 's'} are kept, but students can no longer open it.` : 'Students can no longer see it.',
      confirmLabel: 'Delete quiz', tone: 'danger',
    });
    if (!ok) return;
    try { await quizAPI.delete(q.id); toast.success('Quiz deleted'); if (openId === q.id) setOpenId(null); refresh(); } catch (e) { toast.error(errorMessage(e)); }
  };

  const detailsModal = details && (
    <Modal open onOpenChange={(o) => !o && setDetails(null)} size="lg"
      title={details.mode === 'edit' ? 'Quiz details' : details.mode === 'fromUnits' ? 'Build a quiz from the question bank' : 'New quiz'}
      footer={<>
        <Button variant="secondary" onClick={() => setDetails(null)}>Cancel</Button>
        <Button type="submit" form="quiz-details" loading={saveDetails.isPending}>{details.mode === 'edit' ? 'Save details' : 'Create quiz'}</Button>
      </>}>
      <form id="quiz-details" onSubmit={(e) => { e.preventDefault(); if (validDetails(details.form)) saveDetails.mutate(details); }}>
        <DetailsForm form={details.form} setForm={(fn) => setDetails((d) => ({ ...d, form: typeof fn === 'function' ? fn(d.form) : fn }))}
          fromUnits={details.mode === 'fromUnits'} units={unitList} />
      </form>
    </Modal>
  );

  if (current) {
    return (
      <>
        <QuizBuilder quiz={current} units={unitList} onBack={() => setOpenId(null)} onChanged={refresh}
          onDuplicate={() => duplicate(current)} onEditDetails={() => setDetails({ mode: 'edit', form: detailsFrom(current) })} />
        {detailsModal}
      </>
    );
  }

  return (
    <div>
      <PageHeader title="Quizzes" description="Schedule quizzes, write questions, and preview them exactly as students see them."
        actions={<>
          <Button variant="secondary" icon={Wand2} onClick={() => setDetails({ mode: 'fromUnits', form: { ...emptyDetails, unitIds: [], numberOfQuestions: '10', evenDistribution: false } })}>From question bank</Button>
          <Button icon={Plus} onClick={() => setDetails({ mode: 'new', form: emptyDetails })}>New quiz</Button>
        </>} />
      <Panel>
        {quizzes.isPending ? <SkeletonRows rows={5} /> : quizzes.isError ? <ErrorState description={errorMessage(quizzes.error)} onRetry={quizzes.refetch} />
          : list.length === 0 ? <EmptyState icon={FileQuestion} title="No quizzes yet" action={<Button icon={Plus} onClick={() => setDetails({ mode: 'new', form: emptyDetails })}>New quiz</Button>} />
          : (
            <Table minWidth={820}>
              <thead><tr><Th>Quiz</Th><Th>When</Th><Th className="text-right">Questions</Th><Th className="text-right">Attempts</Th><Th className="w-28" /></tr></thead>
              <tbody>
                {list.map((q) => {
                  const st = windowState(q);
                  return (
                    <tr key={q.id} className="hover:bg-sunken/50 cursor-pointer" onClick={() => setOpenId(q.id)}>
                      <Td>
                        <p className="font-medium">{q.title}</p>
                        <p className="text-xs text-ink-3 mt-0.5">Batches {Array.from(q.accessibleBatches ?? []).sort().join(', ')}{q.month ? ` · ${periodLabel(q.month, q.year)} fee` : ''}{q.timeLimit ? ` · ${q.timeLimit} min` : ''}</p>
                      </Td>
                      <Td><Badge tone={st.tone}>{st.label}</Badge><p className="text-xs text-ink-3 mt-1">{windowText(q)}</p></Td>
                      <Td className="text-right tabular">{q.questionCount}<span className="text-ink-3"> · {q.totalMarks} marks</span></Td>
                      <Td className="text-right tabular">{q.attemptCount ?? 0}</Td>
                      <Td onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" aria-label={`Duplicate ${q.title}`} onClick={() => duplicate(q)}><Copy size={16} /></Button>
                          <Button variant="danger-ghost" size="icon-sm" aria-label={`Delete ${q.title}`} onClick={() => remove(q)}><Trash2 size={16} /></Button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
      </Panel>
      {detailsModal}
    </div>
  );
};

export default ManageQuizzes;
