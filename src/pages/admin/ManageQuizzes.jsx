import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  FileQuestion, Plus, Pencil, Trash2, Copy, Eye, Wand2, ArrowUp, ArrowDown, GripVertical, ChevronLeft, Lock, Paperclip, PenLine, CheckCircle2,
  Library, Dices,
} from 'lucide-react';
import { quizAPI, unitAPI } from '../../services/api';
import { unwrap } from '../../lib/queryClient';
import { errorMessage } from '../../lib/errors';
import { periodLabel } from '../../lib/period';
import { audienceFrom, audiencePayload, audienceProblem, audienceSummary, emptyAudience } from '../../lib/audience';
import { useBatchList } from '../../lib/useBatchList';
import { emptyDraw, drawPayload } from '../../lib/draw';
import { unitTree } from '../../lib/units';
import { Panel, PageHeader, Badge, SkeletonRows, EmptyState, ErrorState, Field, Input, Textarea, Table, Th, Td } from '../../components/ui/primitives';
import { Modal } from '../../components/ui/Dialog';
import { useConfirm } from '../../components/ui/Confirm';
import Button from '../../components/ui/Button';
import { PeriodPicker } from '../../components/admin/AccessFields';
import AudienceEditor from '../../components/admin/AudienceEditor';
import BankPicker from '../../components/admin/BankPicker';
import RandomDrawDialog, { DrawSettings } from '../../components/admin/RandomDrawDialog';
import QuestionEditor from '../../components/admin/QuestionEditor';
import QuizPlayer from '../../components/quiz/QuizPlayer';
import { cn } from '../../lib/cn';
import { OPTION_KEYS, optionLabel } from '../../lib/options';

/* ---------- Status from the schedule (every batch's window) ---------- */

const QUIZ_WORDS = { from: 'From', until: 'Until', none: 'No time window', always: 'Always open' };
const summary = (q) => audienceSummary(q, Date.now(), QUIZ_WORDS);

/** "Batches 2026, 2027" or each batch with its own window when they differ. */
const WindowLine = ({ sum, className }) => (sum.same || !sum.rows.length ? (
  <p className={className}>{sum.text}</p>
) : (
  <ul className={className}>
    {sum.rows.map((r) => <li key={r.batchId}><span className="font-medium text-ink-2">{r.batchName}:</span> {r.text}</li>)}
  </ul>
));

/* ---------- Quiz details form ---------- */

const emptyDetails = { title: '', description: '', audience: emptyAudience, timeLimit: '30', month: '', year: '' };
const detailsFrom = (q) => (q ? {
  title: q.title ?? '', description: q.description ?? '', audience: audienceFrom(q), timeLimit: String(q.timeLimit ?? 0),
  month: q.month ? String(q.month) : '', year: q.year ? String(q.year) : '',
} : emptyDetails);

const DetailsForm = ({ form, setForm, fromUnits, units }) => {
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="space-y-5">
      <Field label="Title" required>{(p) => <Input {...p} value={form.title} onChange={set('title')} placeholder="November monthly paper" />}</Field>
      <Field label="Description" hint="Shown to students before they start.">{(p) => <Textarea {...p} rows={2} value={form.description} onChange={set('description')} />}</Field>

      {fromUnits && (
        <fieldset className="pt-5 border-t border-line">
          <legend className="text-sm font-medium">Random questions from the bank</legend>
          <p className="text-xs text-ink-3 mt-1 mb-4">The quiz is created with these questions. You can reorder, remove or add more afterwards.</p>
          <DrawSettings form={form.draw} setForm={(fn) => setForm((f) => ({ ...f, draw: typeof fn === 'function' ? fn(f.draw) : fn }))} units={units} />
        </fieldset>
      )}

      <div className="pt-5 border-t border-line">
        <AudienceEditor kind="quiz" value={form.audience} onChange={(audience) => setForm((f) => ({ ...f, audience }))} />
      </div>

      <div className="grid gap-4 pt-5 border-t border-line sm:grid-cols-2">
        <Field label="Time limit (minutes)" hint="0 for no limit. The clock starts when a student opens the quiz.">
          {(p) => <Input {...p} type="number" min="0" max="600" value={form.timeLimit} onChange={set('timeLimit')} className="w-32" />}
        </Field>
        {!fromUnits && (
          <Field label="Unlocks with the fee for">
            {(p) => <PeriodPicker id={p.id} month={form.month} year={form.year} onChange={({ month, year }) => setForm((f) => ({ ...f, month, year }))} />}
          </Field>
        )}
      </div>
    </div>
  );
};

const detailsPayload = (form) => ({
  title: form.title.trim(), description: form.description, audience: audiencePayload(form.audience),
  timeLimit: Number(form.timeLimit) || 0,
  month: form.month ? Number(form.month) : null, year: form.month ? Number(form.year || new Date().getFullYear()) : null,
});

const validDetails = (form, names) => {
  const problem = audienceProblem(form.audience, names, 'close');
  if (problem) { toast.error(problem); return false; }
  if (form.draw && !(Number(form.draw.count) >= 1)) { toast.error('Choose how many questions to draw.'); return false; }
  return true;
};

/* ---------- Builder for one quiz ---------- */

const QuestionCard = ({ q, index, count, locked, onEdit, onRemove, onMove, dragProps, unitLabel }) => (
  <li {...dragProps} className="group flex gap-3 px-4 py-3.5 bg-surface">
    <div className="flex flex-col items-center gap-0.5 pt-0.5">
      <GripVertical size={16} className="text-ink-3 cursor-grab hidden sm:block" aria-hidden />
      <Button variant="ghost" size="icon-sm" aria-label={`Move question ${index + 1} up`} disabled={index === 0} onClick={() => onMove(index, -1)}><ArrowUp size={14} /></Button>
      <Button variant="ghost" size="icon-sm" aria-label={`Move question ${index + 1} down`} disabled={index === count - 1} onClick={() => onMove(index, 1)}><ArrowDown size={14} /></Button>
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] leading-[1.65] whitespace-pre-wrap max-w-[75ch]"><span className="font-semibold text-ink-3 tabular mr-1.5">{index + 1}.</span>{q.questionText}</p>
        <div className="flex items-center gap-1 shrink-0">
          <Badge>{q.marks} mark{q.marks === 1 ? '' : 's'}</Badge>
          {!locked && <>
            <Button variant="ghost" size="icon-sm" aria-label={`Edit question ${index + 1}`} title={q.bankQuestionId ? 'Edit in the question bank' : 'Edit'} onClick={() => onEdit(q)}><Pencil size={15} /></Button>
            <Button variant="danger-ghost" size="icon-sm" aria-label={`Remove question ${index + 1}`} onClick={() => onRemove(q)}><Trash2 size={15} /></Button>
          </>}
        </div>
      </div>
      <p className="text-xs text-ink-3 mt-0.5 flex flex-wrap gap-x-3">
        {q.questionType === 'WRITING' ? <span className="inline-flex items-center gap-1"><PenLine size={12} aria-hidden />Written answer</span> : <span>Multiple choice</span>}
        {q.unitName && <span>{unitLabel?.get(q.unitId) ?? q.unitName}</span>}
        {q.attachments?.length > 0 && <span className="inline-flex items-center gap-1"><Paperclip size={12} aria-hidden />{q.attachments.length} file{q.attachments.length === 1 ? '' : 's'}</span>}
      </p>
      {q.questionType !== 'WRITING' && (
        <OptionList q={q} />
      )}
    </div>
  </li>
);

/* Options read top-to-bottom, A to E, like the paper. Short options use two columns
   filled down (A B C | D E) instead of across, which read A, C, E down the left. */
const OptionList = ({ q }) => {
  const letters = OPTION_KEYS.filter((l) => q[`option${l}`]);
  const short = letters.every((l) => q[`option${l}`].length <= 38);
  return (
    <ol className={cn('mt-2 max-w-2xl gap-x-8 gap-y-0.5 text-[13.5px] leading-normal', short ? 'grid sm:grid-flow-col sm:grid-rows-3 sm:auto-cols-fr' : 'space-y-0.5')}>
      {letters.map((l) => (
        <li key={l} className={cn('flex gap-2', q.correctAnswer === l ? 'text-credit font-medium' : 'text-ink-2')}>
          <span className="w-4 shrink-0 tabular">{optionLabel(l)}.</span><span>{q[`option${l}`]}</span>
          {q.correctAnswer === l && <CheckCircle2 size={14} className="mt-0.5 shrink-0" aria-label="correct answer" />}
        </li>
      ))}
    </ol>
  );
};

const QuizBuilder = ({ quiz, units, onBack, onChanged, onDuplicate, onEditDetails }) => {
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);   // null | quiz question
  const [editorKey, setEditorKey] = useState(0);
  const [adding, setAdding] = useState(null);     // null | 'pick' | 'random'
  const [preview, setPreview] = useState(false);
  const [order, setOrder] = useState(null);       // optimistic order of ids while saving
  const [dragIndex, setDragIndex] = useState(null);
  const locked = (quiz.attemptCount ?? 0) > 0;
  const state = summary(quiz);
  const unitLabel = useMemo(() => new Map(unitTree(units).map((u) => [u.id, u.parentName ? `${u.parentName} › ${u.name}` : u.name])), [units]);

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
          <h1 className="text-2xl font-semibold">{quiz.title}</h1>
          <p className="text-sm text-ink-2 mt-1">
            {quiz.timeLimit ? `${quiz.timeLimit} min` : 'No time limit'}{state.same && state.batches?.length ? ` · ${state.rows.map((r) => r.batchName).join(', ')}: ${state.text}` : ''}
          </p>
          {!state.same && <WindowLine sum={state} className="mt-1 text-sm text-ink-3 space-y-0.5" />}
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
          <p>{quiz.attemptCount} student{quiz.attemptCount === 1 ? ' has' : 's have'} attempted this quiz, so its questions can't be added, edited or removed (that would change marks already given). You can still reorder them, or duplicate the quiz to make a changed version.</p>
        </div>
      )}

      <Panel>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line">
          <p className="text-sm"><span className="font-semibold tabular">{questions.length}</span> questions · <span className="ledger-total font-semibold">{totalMarks} marks</span></p>
          {!locked && (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={Dices} onClick={() => setAdding('random')}>Add random questions</Button>
              <Button icon={Library} onClick={() => setAdding('pick')}>Add from bank</Button>
            </div>
          )}
        </div>
        {questions.length === 0 ? (
          <EmptyState icon={FileQuestion} title="No questions yet"
            description="Questions come from the question bank. Pick them yourself, or let the bank choose some at random."
            action={!locked && <Button icon={Library} onClick={() => setAdding('pick')}>Add from bank</Button>} />
        ) : (
          <ol className={cn('divide-y divide-line', order && 'opacity-70')}>
            {questions.map((q, i) => (
              <QuestionCard key={q.id} q={q} index={i} count={questions.length} locked={locked} unitLabel={unitLabel}
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
        // Linked questions are edited in the bank; the change reaches this quiz (and
        // any other unattempted quiz using it). Older unlinked copies are edited here.
        <QuestionEditor key={editorKey} open onOpenChange={(o) => { if (!o) { setEditing(null); onChanged(); } }} units={units}
          question={editing.bankQuestionId ? { ...editing, id: editing.bankQuestionId } : editing}
          note={editing.bankQuestionId
            ? 'This question lives in the question bank. Saving updates the bank and every quiz using it that nobody has attempted yet.'
            : 'This question isn\'t linked to the bank, so this change applies to this quiz only.'}
          onSave={async (data, id) => unwrap(await (editing.bankQuestionId
            ? quizAPI.updateBankQuestion(id, data)
            : quizAPI.updateQuestion(quiz.id, id, data)))} />
      )}
      {adding === 'pick' && <BankPicker quiz={quiz} units={units} onClose={() => setAdding(null)} onAdded={async () => { setAdding(null); await onChanged(); }} />}
      {adding === 'random' && <RandomDrawDialog quiz={quiz} units={units} onClose={() => setAdding(null)} onAdded={async () => { setAdding(null); await onChanged(); }} />}
    </div>
  );
};

/* ---------- Page ---------- */

const ManageQuizzes = () => {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const quizzes = useQuery({ queryKey: ['admin', 'quizzes'], queryFn: () => quizAPI.getAllAdmin().then(unwrap) });
  const units = useQuery({ queryKey: ['admin', 'units'], queryFn: () => unitAPI.getAll().then(unwrap) });
  const unitList = (units.data ?? []).filter((u) => u.isActive !== false);
  const batches = useBatchList();
  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState(null);     // { mode: 'new' | 'edit' | 'fromUnits', form }

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'quizzes'] });
  const list = useMemo(() => [...(quizzes.data ?? [])].sort((a, b) => b.id - a.id), [quizzes.data]);
  const current = list.find((q) => q.id === openId);

  const saveDetails = useMutation({
    mutationFn: async ({ mode, form }) => {
      if (mode === 'fromUnits') {
        return unwrap(await quizAPI.createFromUnits({ ...detailsPayload(form), ...drawPayload(form.draw), numberOfQuestions: Number(form.draw.count) || 10 }));
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
    try { const copy = unwrap(await quizAPI.duplicate(q.id)); await refresh(); setOpenId(copy.id); toast.success('Quiz duplicated', { description: 'Same batches, no dates yet: set when each batch can take it.' }); }
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
      title={details.mode === 'edit' ? 'Quiz details' : details.mode === 'fromUnits' ? 'New quiz with random questions' : 'New quiz'}
      footer={<>
        <Button variant="secondary" onClick={() => setDetails(null)}>Cancel</Button>
        <Button type="submit" form="quiz-details" loading={saveDetails.isPending}>{details.mode === 'edit' ? 'Save details' : 'Create quiz'}</Button>
      </>}>
      <form id="quiz-details" onSubmit={(e) => { e.preventDefault(); if (validDetails(details.form, batches.names)) saveDetails.mutate(details); }}>
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
      <PageHeader title="Quizzes" description="Schedule quizzes for each batch, fill them from the question bank, and preview them as students see them."
        actions={<>
          <Button variant="secondary" icon={Wand2} onClick={() => setDetails({ mode: 'fromUnits', form: { ...emptyDetails, draw: emptyDraw } })}>Random from bank</Button>
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
                  const st = summary(q);
                  return (
                    <tr key={q.id} className="hover:bg-sunken/50 cursor-pointer" onClick={() => setOpenId(q.id)}>
                      <Td>
                        <p className="font-medium">{q.title}</p>
                        <p className="text-xs text-ink-3 mt-0.5">{st.rows.length ? st.rows.map((r) => r.batchName).join(', ') : 'No batches'}{q.month ? ` · ${periodLabel(q.month, q.year)} fee` : ''}{q.timeLimit ? ` · ${q.timeLimit} min` : ''}</p>
                      </Td>
                      <Td><Badge tone={st.tone}>{st.label}</Badge><WindowLine sum={st} className="text-xs text-ink-3 mt-1 space-y-0.5" /></Td>
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
