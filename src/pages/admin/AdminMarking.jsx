import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClipboardCheck, ChevronLeft, Paperclip, Image as ImageIcon, FileText, BookmarkPlus, X, CheckCircle2, Keyboard, ArrowRight } from 'lucide-react';
import { quizAPI, fileAPI } from '../../services/api';
import { unwrap } from '../../lib/queryClient';
import { errorMessage } from '../../lib/errors';
import { formatDateTime } from '../../lib/time';
import { Panel, PageHeader, Badge, SkeletonRows, EmptyState, ErrorState, Select, Textarea } from '../../components/ui/primitives';
import Button from '../../components/ui/Button';
import FileViewer from '../../components/FileViewer';
import { cn } from '../../lib/cn';

const DEFAULT_SNIPPETS = ['Well explained.', 'Add an example from the syllabus.', 'Show your workings.', 'Check the format of your answer.'];
const loadSnippets = () => { try { return JSON.parse(localStorage.getItem('marking:snippets')) || DEFAULT_SNIPPETS; } catch { return DEFAULT_SNIPPETS; } };
const saveSnippets = (s) => { try { localStorage.setItem('marking:snippets', JSON.stringify(s)); } catch { /* ignore */ } };

const Attachments = ({ quizMarksId, questionId, onView }) => {
  const q = useQuery({ queryKey: ['answer-files', quizMarksId, questionId], queryFn: () => fileAPI.getAnswerAttachments(quizMarksId, questionId).then(unwrap) });
  if (!q.data?.length) return null;
  return (
    <div className="mt-3">
      <p className="text-sm text-ink-2 mb-2 flex items-center gap-1.5"><Paperclip size={14} aria-hidden /> Student's files</p>
      <div className="flex flex-wrap gap-2">
        {q.data.map((f) => (f.fileType === 'IMAGE' ? (
          <button key={f.id} type="button" onClick={() => onView(f)} className="h-24 w-32 rounded-control overflow-hidden border border-line bg-sunken" aria-label={`Open ${f.originalFileName}`}>
            <img src={f.presignedUrl || f.url} alt="" className="h-full w-full object-cover" />
          </button>
        ) : (
          <Button key={f.id} variant="secondary" size="sm" icon={f.fileType === 'PDF' ? FileText : ImageIcon} onClick={() => onView(f)}>{f.originalFileName}</Button>
        )))}
      </div>
    </div>
  );
};

/** One written answer: question, guide, student's answer, quick score and comment. */
const AnswerMarker = ({ answer, quizMarksId, value, onChange, snippets, onAddSnippet, onView, index }) => {
  const max = answer.maxMarks ?? 0;
  const marked = answer.status === 'MARKED';
  const scores = Array.from({ length: max + 1 }, (_, i) => i);
  return (
    <section className="py-5 border-b border-line last:border-b-0" aria-labelledby={`q-${answer.questionId}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 id={`q-${answer.questionId}`} className="font-medium leading-relaxed"><span className="text-ink-3 tabular mr-1.5">{index + 1}.</span>{answer.questionText}</h3>
        {marked ? <Badge tone="credit" icon={CheckCircle2}>{answer.adminMarks}/{max}</Badge> : <Badge tone="due">{max} marks</Badge>}
      </div>
      {answer.expectedAnswer && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-brand select-none">Marking guide</summary>
          <p className="mt-1.5 text-ink-2 whitespace-pre-wrap border-l-2 border-line pl-3">{answer.expectedAnswer}</p>
        </details>
      )}
      <div className="mt-3 rounded-control bg-sunken/70 px-4 py-3.5 whitespace-pre-wrap leading-[1.75] max-w-[72ch]">
        {answer.studentAnswer?.trim() || <span className="italic text-ink-3">No written answer. Check the student's files.</span>}
      </div>
      <Attachments quizMarksId={quizMarksId} questionId={answer.questionId} onView={onView} />

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-sm font-medium mb-1.5" id={`m-${answer.questionId}`}>Marks</p>
          <div role="radiogroup" aria-labelledby={`m-${answer.questionId}`} className="flex flex-wrap gap-1.5">
            {scores.map((s) => (
              <button key={s} type="button" role="radio" aria-checked={value.marks === String(s)} onClick={() => onChange({ ...value, marks: String(s) })}
                className={cn('h-10 min-w-10 px-2 rounded-[8px] border text-sm font-semibold tabular transition-colors',
                  value.marks === String(s) ? 'bg-brand text-on-brand border-brand' : 'bg-surface border-line hover:border-line-strong')}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor={`c-${answer.questionId}`} className="text-sm font-medium">Comment for the student</label>
          <div className="flex flex-wrap gap-1.5 my-1.5">
            {snippets.map((s) => (
              <button key={s} type="button" onClick={() => onChange({ ...value, comment: value.comment ? `${value.comment.trim()} ${s}` : s })}
                className="h-7 px-2.5 rounded-full border border-line bg-surface text-xs text-ink-2 hover:text-ink hover:border-line-strong">{s}</button>
            ))}
          </div>
          <Textarea id={`c-${answer.questionId}`} rows={2} value={value.comment} onChange={(e) => onChange({ ...value, comment: e.target.value })} />
          {value.comment?.trim() && !snippets.includes(value.comment.trim()) && (
            <button type="button" onClick={() => onAddSnippet(value.comment.trim())} className="mt-1 inline-flex items-center gap-1 text-xs text-brand hover:underline">
              <BookmarkPlus size={13} aria-hidden /> Save as a reusable comment
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

const AdminMarking = () => {
  const qc = useQueryClient();
  const pending = useQuery({ queryKey: ['admin', 'pending-marking'], queryFn: () => quizAPI.getPendingMarking().then(unwrap) });
  const [quizFilter, setQuizFilter] = useState('');
  const [currentId, setCurrentId] = useState(null);
  const [forms, setForms] = useState({});       // { [quizMarksId]: { [questionId]: {marks, comment} } }
  const [saving, setSaving] = useState(false);
  const [snippets, setSnippets] = useState(loadSnippets);
  const [viewing, setViewing] = useState(null);
  const detailRef = useRef(null);

  const queue = useMemo(() => (pending.data ?? []).filter((s) => !quizFilter || String(s.quizId) === quizFilter), [pending.data, quizFilter]);
  const quizzes = useMemo(() => {
    const m = new Map();
    (pending.data ?? []).forEach((s) => m.set(s.quizId, { id: s.quizId, title: s.quizTitle, n: (m.get(s.quizId)?.n ?? 0) + 1 }));
    return [...m.values()];
  }, [pending.data]);
  const current = queue.find((s) => s.quizMarksId === currentId) ?? null;
  const currentIndex = current ? queue.indexOf(current) : -1;

  const formFor = useCallback((sub) => {
    const f = forms[sub.quizMarksId] ?? {};
    return Object.fromEntries(sub.writingAnswers.map((a) => [a.questionId, f[a.questionId] ?? {
      marks: a.adminMarks != null ? String(a.adminMarks) : '', comment: a.adminComment ?? '',
    }]));
  }, [forms]);

  const open = (sub) => { setCurrentId(sub?.quizMarksId ?? null); detailRef.current?.scrollTo?.({ top: 0 }); };
  const next = useCallback(() => {
    const after = queue.slice(currentIndex + 1).concat(queue.slice(0, Math.max(0, currentIndex)));
    const n = after.find((s) => s.quizMarksId !== currentId);
    setCurrentId(n?.quizMarksId ?? null);
  }, [queue, currentIndex, currentId]);

  const saveAll = useCallback(async (advance) => {
    if (!current) return;
    const form = formFor(current);
    const toSave = current.writingAnswers.filter((a) => {
      const v = form[a.questionId];
      return v.marks !== '' && (a.status !== 'MARKED' || String(a.adminMarks) !== v.marks || (a.adminComment ?? '') !== v.comment);
    });
    const missing = current.writingAnswers.filter((a) => a.status !== 'MARKED' && form[a.questionId].marks === '');
    if (!toSave.length && missing.length) { toast.error('Choose marks for each answer first.'); return; }
    setSaving(true);
    try {
      for (const a of toSave) {
        const v = form[a.questionId];
        await quizAPI.markQuestion({ quizMarksId: current.quizMarksId, questionId: a.questionId, marks: parseInt(v.marks, 10), comment: v.comment || '' });
      }
      const done = missing.length === 0;
      toast.success(done ? `${current.studentName}'s paper is fully marked` : 'Marks saved', done ? { description: 'The final score is now visible to the student.' } : undefined);
      setForms((f) => { const n = { ...f }; delete n[current.quizMarksId]; return n; });
      if (done && advance) next();
      await qc.invalidateQueries({ queryKey: ['admin', 'pending-marking'] });
      qc.invalidateQueries({ queryKey: ['admin', 'overview'] });
    } catch (e) {
      toast.error(errorMessage(e, 'Marks weren\'t saved.'));
    } finally {
      setSaving(false);
    }
  }, [current, formFor, next, qc]);

  // Ctrl/⌘+Enter saves and moves on; J/K step through the queue when not typing.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); saveAll(true); return; }
      const tag = e.target.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT' || document.querySelector('[role="dialog"]')) return;
      if (e.key === 'j' && queue.length) { const n = queue[Math.min(queue.length - 1, currentIndex + 1)]; setCurrentId(n.quizMarksId); }
      if (e.key === 'k' && queue.length) { const p = queue[Math.max(0, currentIndex - 1)]; setCurrentId(p.quizMarksId); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveAll, queue, currentIndex]);

  const addSnippet = (s) => { const n = [...snippets, s].slice(-12); setSnippets(n); saveSnippets(n); toast.success('Comment saved for reuse'); };
  const removeSnippet = (s) => { const n = snippets.filter((x) => x !== s); setSnippets(n); saveSnippets(n); };

  return (
    <div>
      <PageHeader title="Marking" description={pending.isSuccess ? (queue.length ? `${queue.length} paper${queue.length === 1 ? '' : 's'} with written answers to mark.` : 'Nothing waiting.') : ' '}
        actions={quizzes.length > 1 && (
          <Select aria-label="Quiz" value={quizFilter} onChange={(e) => setQuizFilter(e.target.value)} className="w-64">
            <option value="">All quizzes</option>
            {quizzes.map((q) => <option key={q.id} value={q.id}>{q.title} ({q.n})</option>)}
          </Select>
        )} />

      {pending.isPending ? <Panel><SkeletonRows rows={6} /></Panel> : pending.isError ? (
        <Panel><ErrorState description={errorMessage(pending.error)} onRetry={pending.refetch} /></Panel>
      ) : queue.length === 0 ? (
        <Panel><EmptyState icon={CheckCircle2} title="All caught up" description="Papers with written answers appear here as students submit them." /></Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)] items-start">
          {/* Queue */}
          <Panel as="nav" aria-label="Papers to mark" className={cn('overflow-hidden lg:sticky lg:top-6', current && 'hidden lg:block')}>
            <ol className="divide-y divide-line max-h-[calc(100dvh-12rem)] overflow-y-auto scroll-thin">
              {queue.map((s) => (
                <li key={s.quizMarksId}>
                  <button type="button" onClick={() => open(s)} aria-current={s.quizMarksId === currentId ? 'true' : undefined}
                    className={cn('relative w-full text-left px-4 py-3 transition-colors',
                      s.quizMarksId === currentId ? 'bg-brand-soft/60 before:absolute before:left-0 before:inset-y-2 before:w-[3px] before:rounded-full before:bg-brand' : 'hover:bg-sunken/60')}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{s.studentName}</span>
                      <span className="text-xs tabular text-ink-3 shrink-0">{s.markedCount}/{s.totalWritingQuestions}</span>
                    </span>
                    <span className="block text-sm text-ink-2 truncate">{s.quizTitle}</span>
                    <span className="block text-xs text-ink-3">{formatDateTime(s.attemptedAt)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </Panel>

          {/* Paper */}
          {current ? (
            <Panel className="min-w-0">
              <header className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-line">
                <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Back to the list" onClick={() => open(null)}><ChevronLeft size={18} /></Button>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-lg truncate">{current.studentName}</h2>
                  <p className="text-sm text-ink-2 truncate">{current.quizTitle} · submitted {formatDateTime(current.attemptedAt)}</p>
                </div>
                <p className="text-sm text-ink-3 tabular">{currentIndex + 1} of {queue.length}</p>
              </header>
              <div ref={detailRef} className="px-5">
                {current.writingAnswers.map((a, i) => (
                  <AnswerMarker key={a.questionId} index={i} answer={a} quizMarksId={current.quizMarksId} value={formFor(current)[a.questionId]}
                    snippets={snippets} onAddSnippet={addSnippet} onView={setViewing}
                    onChange={(v) => setForms((f) => ({ ...f, [current.quizMarksId]: { ...formFor(current), [a.questionId]: v } }))} />
                ))}
              </div>
              <footer className="sticky bottom-0 flex flex-wrap items-center gap-2 px-5 py-3.5 border-t border-line bg-surface rounded-b-panel">
                <p className="hidden md:flex items-center gap-1.5 text-xs text-ink-3 mr-auto"><Keyboard size={14} aria-hidden /> Ctrl+Enter saves and opens the next paper · J / K move through the list</p>
                <Button variant="secondary" loading={saving} onClick={() => saveAll(false)}>Save</Button>
                <Button iconRight={ArrowRight} loading={saving} onClick={() => saveAll(true)}>Save and next</Button>
              </footer>
            </Panel>
          ) : (
            <Panel className="hidden lg:block">
              <EmptyState icon={ClipboardCheck} title="Choose a paper" description="Pick a student from the list. Their written answers open here."
                action={<Button iconRight={ArrowRight} onClick={() => open(queue[0])}>Start with the oldest</Button>} />
            </Panel>
          )}
        </div>
      )}

      {snippets.length > 0 && current && (
        <details className="mt-4 text-sm text-ink-2">
          <summary className="cursor-pointer select-none">Manage saved comments ({snippets.length})</summary>
          <ul className="flex flex-wrap gap-1.5 mt-2">
            {snippets.map((s) => (
              <li key={s} className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full border border-line bg-surface text-xs">
                {s}
                <button type="button" aria-label={`Remove "${s}"`} onClick={() => removeSnippet(s)} className="h-5 w-5 grid place-items-center rounded-full hover:bg-sunken"><X size={12} /></button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {viewing && <FileViewer file={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
};

export default AdminMarking;
