import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Clock, Lock, Play, CalendarClock, CheckCircle2, Hourglass, FileQuestion, Timer as TimerIcon, ArrowRight } from 'lucide-react';
import useAuth from '../context/useAuth';
import { quizAPI } from '../services/api';
import { useQuizzes, keys } from '../lib/queries';
import { loadDraft } from '../lib/quizDraft';
import { formatDateTime, formatCountdown, useCountdown } from '../lib/time';
import { errorMessage } from '../lib/errors';
import { Panel, PageHeader, Badge, Skeleton, EmptyState, ErrorState } from '../components/ui/primitives';
import { Modal } from '../components/ui/Dialog';
import Button from '../components/ui/Button';
import QuizPlayer from '../components/quiz/QuizPlayer';
import QuizResult from '../components/quiz/QuizResult';
import ScoreCell from '../components/student/ScoreCell';

const Section = ({ title, count, children }) => (
  <section className="space-y-3">
    <h2 className="text-[15px] font-semibold text-ink-2">{title} <span className="text-ink-3 tabular font-normal">{count}</span></h2>
    {children}
  </section>
);

const Meta = ({ quiz }) => {
  const { t } = useTranslation();
  return (
    <p className="text-sm text-ink-2 tabular flex flex-wrap gap-x-3 gap-y-1">
      <span>{t('common.questions', { count: quiz.questionCount })}</span>
      <span>{t('common.marks', { count: quiz.totalMarks })}</span>
      {quiz.timeLimit > 0 && <span className="inline-flex items-center gap-1"><Clock size={14} aria-hidden />{t('common.min', { count: quiz.timeLimit })}</span>}
    </p>
  );
};

const OpenQuiz = ({ quiz, fetchedAt, onStart, starting, hasDraft }) => {
  const { t } = useTranslation();
  const left = useCountdown(quiz.closesAt, quiz.serverTime, fetchedAt);
  const months = t('months', { returnObjects: true });
  const inProgress = quiz.status === 'IN_PROGRESS' || hasDraft;
  return (
    <Panel className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          {quiz.locked ? <Badge tone="due" icon={Lock}>{t('quizzes.lockedBadge', { month: months[(quiz.month ?? 1) - 1] })}</Badge>
            : inProgress ? <Badge tone="brand" icon={Hourglass}>{t('quizzes.inProgress')}</Badge>
              : <Badge tone="credit">{t('quizzes.openNow')}</Badge>}
          {quiz.closesAt && !quiz.locked && <span className="text-sm text-ink-2">{t('home.closesIn', { time: formatCountdown(left) })}</span>}
        </div>
        <h3 className="text-lg font-semibold">{quiz.title}</h3>
        {quiz.description && <p className="text-sm text-ink-2 mt-0.5">{quiz.description}</p>}
        <div className="mt-2"><Meta quiz={quiz} /></div>
      </div>
      {quiz.locked ? (
        <Link to="/payments" className="inline-flex items-center justify-center h-11 px-4 rounded-control border border-line bg-surface text-sm font-medium hover:bg-sunken">{t('home.howToPay')}</Link>
      ) : (
        <Button size="lg" icon={Play} loading={starting} onClick={() => onStart(quiz)} className="justify-center">
          {inProgress ? t('home.resumeQuiz') : t('home.startQuiz')}
        </Button>
      )}
    </Panel>
  );
};

const UpcomingQuiz = ({ quiz, fetchedAt }) => {
  const { t } = useTranslation();
  const left = useCountdown(quiz.opensAt, quiz.serverTime, fetchedAt);
  return (
    <li className="flex flex-wrap items-center gap-4 px-5 py-4">
      <span className="h-10 w-10 rounded-full bg-sunken text-ink-2 grid place-items-center shrink-0"><CalendarClock size={18} aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{quiz.title}</p>
        <p className="text-sm text-ink-2">{t('home.opensOn', { when: formatDateTime(quiz.opensAt) })}</p>
      </div>
      <Badge tone="neutral" icon={TimerIcon} className="tabular">{t('home.opensIn', { time: formatCountdown(left) })}</Badge>
    </li>
  );
};

const Quizzes = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const quizzes = useQuizzes();
  const [params, setParams] = useSearchParams();
  const [confirming, setConfirming] = useState(null);   // quiz awaiting "Start"
  const [starting, setStarting] = useState(null);       // quiz id being loaded
  const [attempt, setAttempt] = useState(null);         // attempt data from the server
  const [result, setResult] = useState(null);

  const list = useMemo(() => quizzes.data ?? [], [quizzes.data]);
  const open = list.filter((q) => q.status !== 'UPCOMING' && !q.attempted);
  const upcoming = list.filter((q) => q.status === 'UPCOMING').sort((a, b) => a.opensAt - b.opensAt);
  const done = list.filter((q) => q.attempted);

  const begin = async (quiz) => {
    setConfirming(null);
    setStarting(quiz.id);
    try {
      const res = await quizAPI.getForAttempt(quiz.id);
      setAttempt(res.data.data);
    } catch (err) {
      toast.error(errorMessage(err, t('quizzes.startFailed')));
      qc.invalidateQueries({ queryKey: keys.quizzes });
    } finally {
      setStarting(null);
    }
  };

  // Started attempts resume straight away; a new one asks first, because its timer
  // can't be paused once it starts.
  const onStart = (quiz) => {
    const resuming = quiz.status === 'IN_PROGRESS' || (user?.id && loadDraft(user.id, quiz.id));
    if (resuming || !quiz.timeLimit) begin(quiz);
    else setConfirming(quiz);
  };

  // Deep link from Home: /quizzes?start=ID
  const startId = params.get('start');
  useEffect(() => {
    if (!startId || !quizzes.data) return;
    const q = quizzes.data.find((x) => String(x.id) === startId);
    setParams({}, { replace: true });
    if (q && !q.attempted && !q.locked && q.status !== 'UPCOMING') onStart(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startId, quizzes.data]);

  const finish = (res) => {
    setAttempt(null);
    setResult(res);
    window.scrollTo({ top: 0 });
    qc.invalidateQueries({ queryKey: keys.quizzes });
    qc.invalidateQueries({ queryKey: keys.myResults });
    toast.success(t('quizzes.submitted'));
  };

  if (attempt) {
    return <QuizPlayer quiz={attempt} user={user} onSubmitted={finish}
      onExit={() => { setAttempt(null); qc.invalidateQueries({ queryKey: keys.quizzes }); }} />;
  }

  if (result) {
    return <QuizResult result={result} fresh onBack={() => setResult(null)} backLabel={t('quizzes.backToQuizzes')} />;
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t('nav.quizzes')} description={t('quizzes.lead')} />

      {quizzes.isPending ? (
        <div className="space-y-3"><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
      ) : quizzes.isError ? (
        <Panel><ErrorState title={t('common.loadFailed')} description={errorMessage(quizzes.error)} onRetry={quizzes.refetch} retryLabel={t('common.retry')} /></Panel>
      ) : list.length === 0 ? (
        <Panel><EmptyState icon={FileQuestion} title={t('home.noQuizTitle')} description={t('home.noQuizHint')} /></Panel>
      ) : (
        <>
          {open.length > 0 && (
            <Section title={t('quizzes.available')} count={open.length}>
              <div className="space-y-3">
                {open.map((q) => <OpenQuiz key={q.id} quiz={q} fetchedAt={quizzes.dataUpdatedAt} onStart={onStart} starting={starting === q.id}
                  hasDraft={!!(user?.id && loadDraft(user.id, q.id))} />)}
              </div>
            </Section>
          )}
          {upcoming.length > 0 && (
            <Section title={t('quizzes.upcoming')} count={upcoming.length}>
              <Panel as="ul" className="divide-y divide-line">
                {upcoming.map((q) => <UpcomingQuiz key={q.id} quiz={q} fetchedAt={quizzes.dataUpdatedAt} />)}
              </Panel>
            </Section>
          )}
          {done.length > 0 && (
            <Section title={t('quizzes.done')} count={done.length}>
              <Panel as="ul" className="divide-y divide-line">
                {done.map((q) => (
                  <li key={q.id}>
                    <Link to={`/results?quiz=${q.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-sunken/60">
                      <CheckCircle2 size={20} className="text-credit shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1 font-medium truncate">{q.title}</span>
                      <ScoreCell result={{ markingComplete: q.score != null, percentage: q.score, obtainedMarks: null, totalMarks: q.totalMarks }} />
                      <ArrowRight size={16} className="text-ink-3" aria-hidden />
                    </Link>
                  </li>
                ))}
              </Panel>
            </Section>
          )}
        </>
      )}

      <Modal open={!!confirming} onOpenChange={(o) => !o && setConfirming(null)} size="sm" title={confirming?.title ?? ''}
        description={t('quizzes.beforeYouStart')}
        footer={<>
          <Button variant="secondary" onClick={() => setConfirming(null)}>{t('common.cancel')}</Button>
          <Button icon={Play} onClick={() => begin(confirming)}>{t('quizzes.startNow')}</Button>
        </>}>
        {confirming && (
          <ul className="space-y-2.5 text-sm">
            <li className="flex gap-2.5"><Clock size={18} className="text-brand shrink-0" aria-hidden />{t('quizzes.ruleTimer', { count: confirming.timeLimit })}</li>
            <li className="flex gap-2.5"><CheckCircle2 size={18} className="text-brand shrink-0" aria-hidden />{t('quizzes.ruleSaved')}</li>
            <li className="flex gap-2.5"><Hourglass size={18} className="text-brand shrink-0" aria-hidden />{t('quizzes.ruleAutoSubmit')}</li>
          </ul>
        )}
      </Modal>
    </div>
  );
};

export default Quizzes;
