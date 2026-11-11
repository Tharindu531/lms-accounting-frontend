import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clock, Flag, ChevronLeft, ChevronRight, LayoutGrid, X, CheckCircle2, CloudOff, Cloud, AlertTriangle,
  PenLine, Paperclip, ListChecks, Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { quizAPI } from '../../services/api';
import { loadDraft, saveDraft, clearDraft, loadFlags, saveFlags } from '../../lib/quizDraft';
import { useConfirm } from '../ui/Confirm';
import { Modal } from '../ui/Dialog';
import Button from '../ui/Button';
import { Badge } from '../ui/primitives';
import useOnline from '../../lib/useOnline';
import { errorMessage } from '../../lib/errors';
import { relativeTime } from '../../lib/time';
import { cn } from '../../lib/cn';
import FileViewer from '../FileViewer';
import { OPTION_KEYS, optionLabel, optionKeyFromInput } from '../../lib/options';

// How often in-progress answers are sent to the server while a quiz is open.
const SERVER_SYNC_MS = 15000;

const formatClock = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
};

/* ---------- Timer: the server fixes the deadline; the client only counts down to it ---------- */

const useDeadline = (quiz) => {
  // Server clock minus device clock, measured once when the attempt loaded.
  const [offset] = useState(() => (quiz.serverTime ? quiz.serverTime - Date.now() : 0));
  const deadline = quiz.attemptDeadline ?? null;
  const calc = useCallback(() => (deadline == null ? null
    : Math.max(0, Math.ceil((deadline - (Date.now() + offset)) / 1000))), [deadline, offset]);
  const [left, setLeft] = useState(calc);

  useEffect(() => {
    if (deadline == null) return undefined;
    // Recomputed from the clock on every tick and when the tab becomes visible:
    // phones throttle timers in background tabs, so a decrement-per-tick count
    // used to fall minutes behind the server.
    const tick = () => setLeft(calc());
    tick();
    const id = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, [deadline, calc]);

  return left;
};

const Timer = ({ left }) => {
  const { t } = useTranslation();
  if (left == null) return null;
  const tone = left <= 60 ? 'debit' : left <= 300 ? 'due' : 'neutral';
  return (
    <div role="timer" aria-live={left <= 60 ? 'assertive' : 'off'} aria-label={t('quiz.timeLeft', { time: formatClock(left) })}
      className={cn('inline-flex items-center gap-2 h-10 px-3.5 rounded-control font-semibold tabular text-[17px] border transition-colors',
        tone === 'debit' ? 'bg-debit text-white border-debit dark:text-paper' : tone === 'due' ? 'bg-due-soft text-due border-due/30' : 'bg-surface text-ink border-line')}>
      <Clock size={17} aria-hidden /> {formatClock(left)}
    </div>
  );
};

const SaveStatus = ({ online, serverSavedAt, localSavedAt }) => {
  const { t } = useTranslation();
  const [, rerender] = useState(0);
  useEffect(() => { const id = setInterval(() => rerender((n) => n + 1), 10_000); return () => clearInterval(id); }, []);
  if (!online) return <span className="inline-flex items-center gap-1.5 text-sm text-due"><CloudOff size={15} aria-hidden />{t('quiz.savedOnDevice')}</span>;
  if (serverSavedAt) return <span className="inline-flex items-center gap-1.5 text-sm text-ink-2"><Cloud size={15} aria-hidden />{t('quiz.savedAgo', { when: relativeTime(serverSavedAt) })}</span>;
  if (localSavedAt) return <span className="inline-flex items-center gap-1.5 text-sm text-ink-2"><CheckCircle2 size={15} aria-hidden />{t('quiz.savedOnDevice')}</span>;
  return null;
};

/* ---------- Palette: one cell per question ---------- */

const Palette = ({ questions, answers, flags, current, onJump }) => {
  const { t } = useTranslation();
  return (
    <div>
      <ol className="grid grid-cols-6 gap-1.5" aria-label={t('quiz.questionsMap')}>
        {questions.map((q, i) => {
          const answered = !!(answers[q.id] && String(answers[q.id]).trim());
          const flagged = flags.has(q.id);
          return (
            <li key={q.id}>
              <button type="button" onClick={() => onJump(i)} aria-current={i === current ? 'step' : undefined}
                aria-label={`${t('quiz.question', { n: i + 1 })}: ${answered ? t('quiz.answered') : t('quiz.notAnswered')}${flagged ? `, ${t('quiz.flagged')}` : ''}`}
                className={cn('relative h-10 w-full rounded-[8px] text-sm font-medium tabular border transition-colors',
                  answered ? 'bg-brand text-on-brand border-brand' : 'bg-surface text-ink-2 border-line hover:border-line-strong',
                  i === current && 'ring-2 ring-offset-2 ring-offset-surface ring-brand')}>
                {i + 1}
                {flagged && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-due ring-2 ring-surface" aria-hidden />}
              </button>
            </li>
          );
        })}
      </ol>
      <ul className="mt-4 space-y-1.5 text-xs text-ink-2">
        <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-[3px] bg-brand" aria-hidden />{t('quiz.answered')}</li>
        <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-[3px] border border-line-strong" aria-hidden />{t('quiz.notAnswered')}</li>
        <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-due" aria-hidden />{t('quiz.flagged')}</li>
      </ul>
    </div>
  );
};

/* ---------- The player ---------- */

const QuizPlayer = ({ quiz, user, onSubmitted, onExit, preview = false }) => {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const online = useOnline();
  const questions = useMemo(() => quiz.questions ?? [], [quiz.questions]);

  // Resume with the newer of the answers saved on this device and on the server
  // (e.g. the attempt was started on a phone and continued on a PC).
  const [answers, setAnswers] = useState(() => {
    const local = user?.id ? loadDraft(user.id, quiz.id) : null;
    const server = quiz.draftAnswers ? { answers: quiz.draftAnswers, savedAt: quiz.draftSavedAt || 0 } : null;
    const restored = local && (!server || local.savedAt >= server.savedAt) ? local : server;
    return restored?.answers || {};
  });
  const [flags, setFlags] = useState(() => (user?.id ? loadFlags(user.id, quiz.id) : new Set()));
  const [current, setCurrent] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [autoSubmitError, setAutoSubmitError] = useState('');
  const [localSavedAt, setLocalSavedAt] = useState(null);
  const [serverSavedAt, setServerSavedAt] = useState(quiz.draftSavedAt || null);

  const answersRef = useRef(answers);
  const lastSyncedRef = useRef(JSON.stringify(quiz.draftAnswers || {}));
  const submittingRef = useRef(false);
  // The timeout triggers at most ONE automatic submit. A failed one shows a retry
  // button instead of re-firing forever.
  const autoSubmitAttemptedRef = useRef(false);
  const mainRef = useRef(null);

  const left = useDeadline(quiz);
  const timedOut = left === 0;
  const question = questions[current];
  const answeredCount = questions.filter((q) => answers[q.id] && String(answers[q.id]).trim()).length;

  // Save on this device as the student works.
  useEffect(() => {
    answersRef.current = answers;
    if (user?.id && saveDraft(user.id, quiz.id, answers)) setLocalSavedAt(Date.now());
  }, [answers, quiz.id, user?.id]);

  useEffect(() => { if (user?.id) saveFlags(user.id, quiz.id, flags); }, [flags, quiz.id, user?.id]);

  // ...and to the server every 15 s when something changed, and right away when
  // the tab is hidden (switching apps, locking the phone).
  useEffect(() => {
    if (timedOut || preview) return undefined;
    const sync = async () => {
      const json = JSON.stringify(answersRef.current);
      if (json === lastSyncedRef.current || submittingRef.current) return;
      try {
        await quizAPI.saveDraft(quiz.id, answersRef.current);
        lastSyncedRef.current = json;
        setServerSavedAt(Date.now());
      } catch { /* offline or the attempt has closed: answers are still on this device */ }
    };
    const id = setInterval(sync, SERVER_SYNC_MS);
    const onHide = () => { if (document.visibilityState === 'hidden') sync(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('online', sync);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onHide); window.removeEventListener('online', sync); };
  }, [quiz.id, timedOut, preview]);

  const submit = useCallback(async (isAuto = false) => {
    if (submittingRef.current) return;
    if (preview) { onSubmitted(null); return; }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await quizAPI.submit({ quizId: quiz.id, answers: answersRef.current });
      if (user?.id) clearDraft(user.id, quiz.id);
      onSubmitted(res.data.data);
    } catch (err) {
      const message = errorMessage(err, t('quiz.submitFailed'));
      if (isAuto) setAutoSubmitError(message);
      else toast.error(message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [quiz.id, user?.id, onSubmitted, t, preview]);

  useEffect(() => {
    if (timedOut && !autoSubmitAttemptedRef.current) {
      autoSubmitAttemptedRef.current = true;
      submit(true);
    }
  }, [timedOut, submit]);

  const go = useCallback((i) => {
    setReviewing(false);
    setPaletteOpen(false);
    setCurrent(Math.max(0, Math.min(questions.length - 1, i)));
    mainRef.current?.scrollTo({ top: 0 });
  }, [questions.length]);

  const answer = (qid, value) => setAnswers((prev) => ({ ...prev, [qid]: value }));
  const toggleFlag = (qid) => setFlags((prev) => {
    const next = new Set(prev);
    if (next.has(qid)) next.delete(qid); else next.add(qid);
    return next;
  });

  // Keyboard: A–E answer, ←/→ move, F flags. Ignored while typing.
  useEffect(() => {
    const onKey = (e) => {
      if (reviewing || timedOut || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || e.target.isContentEditable || document.querySelector('[role="dialog"]')) return;
      const k = e.key.length === 1 ? optionKeyFromInput(e.key) : null;
      if (question?.questionType !== 'WRITING' && k && question[`option${k}`]) { answer(question.id, k); e.preventDefault(); }
      else if (e.key === 'ArrowRight') go(current + 1);
      else if (e.key === 'ArrowLeft') go(current - 1);
      else if (k === 'F' && question) toggleFlag(question.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [question, current, go, reviewing, timedOut]);

  const leave = async () => {
    if (preview) { onExit(); return; }
    const ok = await confirm({
      title: t('quiz.leaveTitle'),
      description: left != null ? t('quiz.leaveTimed') : t('quiz.leaveUntimed'),
      confirmLabel: t('quiz.leave'), cancelLabel: t('quiz.keepGoing'),
    });
    if (ok) {
      if (!preview) quizAPI.saveDraft(quiz.id, answersRef.current).catch(() => {});
      onExit();
    }
  };

  const confirmSubmit = async () => {
    const unanswered = questions.length - answeredCount;
    const ok = await confirm({
      title: t('quiz.submitTitle'),
      description: unanswered ? t('quiz.submitUnanswered', { count: unanswered }) : t('quiz.submitAll'),
      confirmLabel: t('quiz.submit'), cancelLabel: t('quiz.keepGoing'),
    });
    if (ok) submit(false);
  };

  if (!question) return null;
  const isWriting = question.questionType === 'WRITING';
  const flagged = flags.has(question.id);

  return (
    <div className="fixed inset-0 z-40 bg-paper flex flex-col" role="region" aria-label={quiz.title}>
      {/* Top bar */}
      <header className="shrink-0 border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3 px-3 sm:px-5 h-16">
          <Button variant="ghost" size="icon" aria-label={t('quiz.leave')} onClick={leave}><X size={20} /></Button>
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{preview && <Badge tone="due" className="mr-2 align-middle">Preview</Badge>}{quiz.title}</p>
            <div className="hidden xs:block"><SaveStatus online={online} serverSavedAt={serverSavedAt} localSavedAt={localSavedAt} /></div>
          </div>
          <Timer left={left} />
        </div>
        <div className="h-1 bg-sunken" aria-hidden>
          <div className="h-full bg-brand transition-[width] duration-300" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
        </div>
      </header>

      {!online && (
        <div role="status" className="shrink-0 flex items-center gap-2 px-4 py-2 bg-due-soft text-due text-sm">
          <CloudOff size={16} aria-hidden /> {t('quiz.offline')}
        </div>
      )}
      {timedOut && (
        <div role="alert" className="shrink-0 flex flex-wrap items-center gap-3 px-4 py-2.5 bg-debit text-white dark:text-paper">
          <AlertTriangle size={18} aria-hidden />
          <span className="font-medium flex-1">{autoSubmitError ? t('quiz.autoSubmitFailed', { message: autoSubmitError }) : submitting ? t('quiz.timeUpSubmitting') : t('quiz.timeUp')}</span>
          {autoSubmitError && <Button size="sm" variant="secondary" loading={submitting} onClick={() => submit(true)}>{t('quiz.trySubmitAgain')}</Button>}
        </div>
      )}

      <div className="flex-1 min-h-0 flex">
        <div ref={mainRef} className="flex-1 min-w-0 overflow-y-auto scroll-thin">
          <div className="mx-auto max-w-[760px] px-4 sm:px-6 py-6 sm:py-10">
            {reviewing ? (
              <section aria-labelledby="review-title">
                <h2 id="review-title" className="text-2xl font-semibold">{t('quiz.reviewTitle')}</h2>
                <p className="text-ink-2 mt-1">{t('quiz.reviewLead', { answered: answeredCount, total: questions.length })}</p>
                <ol className="mt-6 divide-y divide-line border-y border-line">
                  {questions.map((q, i) => {
                    const a = answers[q.id];
                    const has = a && String(a).trim();
                    return (
                      <li key={q.id}>
                        <button type="button" onClick={() => go(i)} className="w-full flex items-start gap-3 py-3.5 text-left hover:bg-sunken/60 px-2 -mx-2 rounded-[8px]">
                          <span className="w-7 text-ink-3 tabular shrink-0 pt-0.5">{i + 1}.</span>
                          <span className="flex-1 min-w-0">
                            <span className="block truncate">{q.questionText}</span>
                            <span className={cn('block text-sm mt-0.5 truncate', has ? 'text-ink-2' : 'text-debit')}>
                              {has ? (q.questionType === 'WRITING' ? String(a).slice(0, 90) : t('quiz.yourAnswer', { answer: `${a}. ${q[`option${a}`] ?? ''}` })) : t('quiz.notAnswered')}
                            </span>
                          </span>
                          {flags.has(q.id) && <Badge tone="due" icon={Flag}>{t('quiz.flagged')}</Badge>}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ) : (
              <article aria-labelledby="q-text">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <p className="text-sm text-ink-2 tabular">
                    <span className="font-semibold text-ink">{t('quiz.questionOf', { n: current + 1, total: questions.length })}</span>
                    {' · '}{isWriting ? <><PenLine size={13} className="inline -mt-0.5" aria-hidden /> {t('quiz.writing')}</> : t('quiz.mcq')}
                    {' · '}{t('common.marks', { count: question.marks })}
                  </p>
                  <Button variant={flagged ? 'secondary' : 'ghost'} icon={Flag} aria-pressed={flagged}
                    className={cn(flagged && 'text-due border-due/40 bg-due-soft hover:bg-due-soft')} onClick={() => toggleFlag(question.id)}>
                    {flagged ? t('quiz.flagged') : t('quiz.flag')}
                  </Button>
                </div>

                <h2 id="q-text" className="text-[17px] sm:text-lg leading-[1.7] font-medium tracking-normal whitespace-pre-wrap max-w-[68ch]">{question.questionText}</h2>

                {question.attachments?.length > 0 && (
                  <div className="mt-5 space-y-3">
                    {question.attachments.filter((f) => f.fileType === 'IMAGE').map((f) => (
                      <button key={f.id} type="button" onClick={() => setViewingFile(f)} className="block w-full rounded-panel overflow-hidden border border-line bg-surface"
                        aria-label={t('quiz.zoomImage')}>
                        <img src={f.url || f.presignedUrl} alt={f.originalFileName} className="w-full max-h-[420px] object-contain" />
                      </button>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      {question.attachments.filter((f) => f.fileType !== 'IMAGE').map((f) => (
                        <Button key={f.id} variant="secondary" size="sm" icon={Paperclip} onClick={() => setViewingFile(f)}>{f.originalFileName}</Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  {isWriting ? (
                    <>
                      <label htmlFor={`a-${question.id}`} className="sr-only">{t('quiz.yourAnswerLabel')}</label>
                      <textarea id={`a-${question.id}`} value={answers[question.id] || ''} disabled={timedOut}
                        onChange={(e) => answer(question.id, e.target.value)} rows={9}
                        placeholder={t('quiz.writePlaceholder')}
                        className="w-full p-4 bg-surface text-ink border border-line rounded-panel leading-relaxed placeholder:text-ink-3 focus:outline-none focus:border-brand focus:ring-3 focus:ring-brand/15 resize-y" />
                      <p className="text-xs text-ink-3 mt-2">{t('quiz.uploadLater')}</p>
                    </>
                  ) : (
                    <div role="radiogroup" aria-labelledby="q-text" className="space-y-2.5">
                      {OPTION_KEYS.filter((o) => question[`option${o}`]).map((o) => {
                        const selected = answers[question.id] === o;
                        return (
                          <button key={o} type="button" role="radio" aria-checked={selected} disabled={timedOut}
                            onClick={() => answer(question.id, o)}
                            className={cn('w-full flex items-start gap-3 text-left min-h-12 px-3.5 py-3 rounded-panel border transition-colors',
                              selected ? 'border-brand bg-brand-soft ring-1 ring-brand' : 'border-line bg-surface hover:border-line-strong')}>
                            <span className={cn('h-7 w-7 shrink-0 rounded-[7px] grid place-items-center text-[13px] font-semibold',
                              selected ? 'bg-brand text-on-brand' : 'bg-sunken text-ink-2')}>{optionLabel(o)}</span>
                            <span className="pt-0.5 text-[15px] whitespace-pre-wrap leading-relaxed">{question[`option${o}`]}</span>
                          </button>
                        );
                      })}
                      <p className="hidden md:block text-xs text-ink-3 pt-1">{t('quiz.keysHint')}</p>
                    </div>
                  )}
                </div>
              </article>
            )}
          </div>
        </div>

        {/* Palette beside the question on wide screens */}
        <aside className="hidden lg:flex w-[280px] shrink-0 flex-col border-l border-line bg-surface p-5">
          <p className="text-sm font-semibold mb-3">{t('quiz.answeredOf', { n: answeredCount, total: questions.length })}</p>
          <Palette questions={questions} answers={answers} flags={flags} current={reviewing ? -1 : current} onJump={go} />
          <div className="mt-auto pt-6 space-y-2">
            <Button variant="secondary" icon={ListChecks} className="w-full justify-center" onClick={() => setReviewing(true)}>{t('quiz.reviewAnswers')}</Button>
            <Button icon={Send} className="w-full justify-center" loading={submitting} onClick={confirmSubmit}>{t('quiz.submit')}</Button>
          </div>
        </aside>
      </div>

      {/* Bottom bar */}
      <footer className="shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-[760px] lg:max-w-none flex items-center gap-2 px-3 sm:px-5 h-[68px]">
          {reviewing ? (
            <>
              <Button variant="secondary" icon={ChevronLeft} onClick={() => go(current)}>{t('quiz.backToQuestions')}</Button>
              <Button icon={Send} className="ml-auto" loading={submitting} onClick={confirmSubmit}>{t('quiz.submit')}</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="lg" icon={ChevronLeft} disabled={current === 0} onClick={() => go(current - 1)} className="px-4" aria-label={t('quiz.previous')}>
                <span className="hidden sm:inline">{t('quiz.previous')}</span>
              </Button>
              <Button variant="ghost" size="lg" icon={LayoutGrid} className="lg:hidden mx-auto" onClick={() => setPaletteOpen(true)} aria-label={t('quiz.answeredOf', { n: answeredCount, total: questions.length })}>
                <span className="tabular">{answeredCount}/{questions.length}</span>
              </Button>
              <div className="hidden lg:block flex-1" />
              {current === questions.length - 1 ? (
                <Button size="lg" iconRight={ListChecks} onClick={() => setReviewing(true)}>{t('quiz.reviewAnswers')}</Button>
              ) : (
                <Button size="lg" iconRight={ChevronRight} onClick={() => go(current + 1)}>{t('quiz.next')}</Button>
              )}
            </>
          )}
        </div>
      </footer>

      <Modal open={paletteOpen} onOpenChange={setPaletteOpen} size="sm" title={t('quiz.answeredOf', { n: answeredCount, total: questions.length })}
        footer={<Button icon={ListChecks} onClick={() => { setPaletteOpen(false); setReviewing(true); }}>{t('quiz.reviewAnswers')}</Button>}>
        <Palette questions={questions} answers={answers} flags={flags} current={current} onJump={go} />
      </Modal>

      {viewingFile && <FileViewer file={viewingFile} onClose={() => setViewingFile(null)} />}
    </div>
  );
};

export default QuizPlayer;
