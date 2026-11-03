import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PlayCircle, CalendarClock, ArrowRight, Lock, Clock, Hourglass, CheckCircle2 } from 'lucide-react';
import useAuth from '../context/useAuth';
import {
  useLessons, useUnits, useQuizzes, useMyResults, usePaymentHistory,
  orderLessons, nextLesson, paidSet, colomboNow, youTubeId, formatDuration,
} from '../lib/queries';
import { formatDateTime, formatCountdown, useCountdown } from '../lib/time';
import { Panel, PanelHeader, Badge, ProgressRing, ProgressBar, Skeleton, EmptyState, ErrorState } from '../components/ui/primitives';
import FeeStrip from '../components/student/FeeStrip';
import ScoreCell from '../components/student/ScoreCell';

const greetingKey = (hour) => (hour < 12 ? 'home.morning' : hour < 17 ? 'home.afternoon' : 'home.evening');

/* ---------- Continue learning ---------- */

const ContinueLearning = ({ lesson, total, done }) => {
  const { t } = useTranslation();
  if (!lesson) {
    return (
      <Panel className="lg:col-span-2">
        <EmptyState icon={CheckCircle2} title={done && done === total ? t('home.allDone') : t('home.noLessons')}
          description={done && done === total ? t('home.allDoneHint') : t('home.noLessonsHint')}
          action={<Link to="/lessons" className="inline-flex items-center h-10 px-4 rounded-control border border-line bg-surface text-sm font-medium hover:bg-sunken">{t('home.browseLessons')}</Link>} />
      </Panel>
    );
  }
  const vid = youTubeId(lesson.youtubeLink);
  const started = (lesson.watchedSeconds ?? 0) > 0;
  return (
    <Panel className="lg:col-span-2 overflow-hidden">
      <Link to={`/lessons/${lesson.id}`} className="group grid sm:grid-cols-[minmax(0,15rem)_1fr] gap-0 h-full">
        <div className="relative aspect-video sm:aspect-auto sm:h-full bg-[#0d1f4f] overflow-hidden">
          {vid && (
            <img src={`https://i.ytimg.com/vi/${vid}/mqdefault.jpg`} alt="" loading="lazy" width="320" height="180"
              className="absolute inset-0 h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
              onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          )}
          <span className="absolute inset-0 grid place-items-center">
            <span className="h-12 w-12 rounded-full bg-white/95 text-brand grid place-items-center shadow-pop group-hover:scale-105 transition-transform">
              <PlayCircle size={26} aria-hidden />
            </span>
          </span>
        </div>
        <div className="p-5 flex flex-col">
          <p className="text-sm text-ink-2">{started ? t('home.continueLearning') : t('home.upNext')}</p>
          <h2 className="text-xl font-semibold mt-1 group-hover:text-brand transition-colors">{lesson.lessonName}</h2>
          <p className="text-sm text-ink-2 mt-0.5">{lesson.unitName}</p>
          <div className="mt-auto pt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm text-ink-2 min-w-40 flex-1">
              <ProgressBar value={total ? (done / total) * 100 : 0} tone="credit" className="flex-1 max-w-40" label={t('home.courseProgress')} />
              <span className="tabular whitespace-nowrap">{t('home.lessonsDone', { done, total })}</span>
            </div>
            <span className="inline-flex items-center gap-2 h-10 px-4 rounded-control bg-brand text-on-brand text-sm font-medium">
              {started ? t('home.resumeAt', { time: formatDuration(lesson.watchedSeconds) }) : t('home.startLesson')}
              <ArrowRight size={16} aria-hidden />
            </span>
          </div>
        </div>
      </Link>
    </Panel>
  );
};

/* ---------- Next quiz ---------- */

const NextQuiz = ({ quizzes, fetchedAt }) => {
  const { t } = useTranslation();
  const quiz = useMemo(() => {
    const list = (quizzes ?? []).filter((q) => !q.attempted && !q.locked);
    return list.find((q) => q.status === 'IN_PROGRESS') ?? list.find((q) => q.status === 'OPEN') ??
      [...list].filter((q) => q.status === 'UPCOMING').sort((a, b) => a.opensAt - b.opensAt)[0];
  }, [quizzes]);
  const upcoming = quiz?.status === 'UPCOMING';
  const left = useCountdown(upcoming ? quiz?.opensAt : quiz?.closesAt, quiz?.serverTime, fetchedAt);

  if (!quiz) {
    return (
      <Panel>
        <EmptyState icon={CalendarClock} title={t('home.noQuizTitle')} description={t('home.noQuizHint')} />
      </Panel>
    );
  }
  return (
    <Panel className="p-5 flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ink-2">{upcoming ? t('home.nextQuiz') : quiz.status === 'IN_PROGRESS' ? t('home.quizInProgress') : t('home.quizOpen')}</p>
        <Badge tone={upcoming ? 'neutral' : 'due'} icon={upcoming ? CalendarClock : Hourglass}>
          {upcoming ? t('home.opensIn', { time: formatCountdown(left) }) : quiz.closesAt ? t('home.closesIn', { time: formatCountdown(left) }) : t('home.openNow')}
        </Badge>
      </div>
      <h2 className="text-lg font-semibold mt-2">{quiz.title}</h2>
      <p className="text-sm text-ink-2 mt-1 tabular">
        {t('common.questions', { count: quiz.questionCount })} · {t('common.marks', { count: quiz.totalMarks })}
        {quiz.timeLimit ? <> · <Clock size={13} className="inline -mt-0.5" aria-hidden /> {t('common.min', { count: quiz.timeLimit })}</> : null}
      </p>
      {upcoming && quiz.opensAt && <p className="text-sm text-ink-2 mt-1">{t('home.opensOn', { when: formatDateTime(quiz.opensAt) })}</p>}
      <div className="mt-auto pt-5">
        {upcoming
          ? <p className="text-sm text-ink-3">{t('home.quizReminder')}</p>
          : (
            <Link to={`/quizzes?start=${quiz.id}`} className="inline-flex w-full justify-center items-center gap-2 h-10 px-4 rounded-control bg-brand text-on-brand text-sm font-medium hover:bg-brand-strong">
              {quiz.status === 'IN_PROGRESS' ? t('home.resumeQuiz') : t('home.startQuiz')} <ArrowRight size={16} aria-hidden />
            </Link>
          )}
      </div>
    </Panel>
  );
};

/* ---------- Results ---------- */

const Sparkline = ({ values }) => {
  if (values.length < 2) return null;
  const w = 120, h = 36, pad = 3;
  const pts = values.map((v, i) => [pad + (i * (w - 2 * pad)) / (values.length - 1), h - pad - (v / 100) * (h - 2 * pad)]);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="text-brand">
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts.at(-1)[0]} cy={pts.at(-1)[1]} r="3" fill="currentColor" />
    </svg>
  );
};

const RecentResults = ({ results }) => {
  const { t } = useTranslation();
  const sorted = [...(results ?? [])].sort((a, b) => new Date(b.attemptedAt) - new Date(a.attemptedAt));
  const trend = sorted.filter((r) => r.markingComplete).map((r) => r.percentage ?? 0).reverse().slice(-8);
  return (
    <Panel className="lg:col-span-2">
      <PanelHeader title={t('home.recentResults')} actions={trend.length > 1 && <Sparkline values={trend} />} />
      {sorted.length === 0 ? (
        <EmptyState icon={CheckCircle2} title={t('home.noResults')} description={t('home.noResultsHint')} />
      ) : (
        <ul className="divide-y divide-line">
          {sorted.slice(0, 4).map((r) => (
            <li key={r.quizId}>
              <Link to={`/results?quiz=${r.quizId}`} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-sunken/60 transition-colors">
                <span className="min-w-0">
                  <span className="block font-medium truncate">{r.quizTitle}</span>
                  <span className="block text-sm text-ink-2">{formatDateTime(r.attemptedAt, { weekday: undefined, hour: undefined, minute: undefined })}</span>
                </span>
                <ScoreCell result={r} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {sorted.length > 4 && (
        <div className="px-5 py-3 border-t border-line">
          <Link to="/results" className="text-sm font-medium text-brand hover:underline underline-offset-4">{t('common.viewAll')}</Link>
        </div>
      )}
    </Panel>
  );
};

/* ---------- Page ---------- */

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const lessons = useLessons();
  const units = useUnits();
  const quizzes = useQuizzes();
  const results = useMyResults();
  const history = usePaymentHistory();
  const now = colomboNow();

  const ordered = useMemo(() => orderLessons(lessons.data, units.data), [lessons.data, units.data]);
  const available = ordered.filter((l) => !l.locked);
  const done = available.filter((l) => l.completed).length;
  const lockedCount = ordered.length - available.length;
  const paidThisMonth = paidSet(history.data).has(`${now.year}-${now.month}`);
  const monthName = t('months', { returnObjects: true })[now.month - 1];

  const loading = lessons.isPending || quizzes.isPending;
  const failed = lessons.isError && quizzes.isError;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold">{t(greetingKey(now.hour), { name: user?.firstName })}</h1>
          <p className="text-ink-2 mt-1">{t('home.lead')}</p>
        </div>
        <p className="text-sm text-ink-2 tabular">{t('account.batch', { batch: user?.batch })} · {user?.id}</p>
      </header>

      {history.isSuccess && !paidThisMonth && (
        <div role="status" className="flex flex-wrap items-start gap-3 rounded-panel border border-due/30 bg-due-soft px-4 py-3">
          <Lock size={18} className="text-due mt-0.5 shrink-0" aria-hidden />
          <div className="flex-1 min-w-52">
            <p className="font-medium text-ink">{t('home.feeDueTitle', { month: monthName })}</p>
            <p className="text-sm text-ink-2">{lockedCount ? t('home.feeDueLocked', { count: lockedCount }) : t('home.feeDueHint')}</p>
          </div>
          <Link to="/payments" className="text-sm font-medium text-brand hover:underline underline-offset-4 self-center">{t('home.howToPay')}</Link>
        </div>
      )}

      {failed ? (
        <Panel><ErrorState title={t('common.loadFailed')} description={t('common.loadFailedHint')} retryLabel={t('common.retry')}
          onRetry={() => { lessons.refetch(); quizzes.refetch(); results.refetch(); }} /></Panel>
      ) : loading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-52 lg:col-span-2" /><Skeleton className="h-52" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <ContinueLearning lesson={nextLesson(ordered)} total={available.length} done={done} />
          <NextQuiz quizzes={quizzes.data} fetchedAt={quizzes.dataUpdatedAt} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {results.isPending ? <Skeleton className="h-64 lg:col-span-2" /> : <RecentResults results={results.data} />}

        <Panel className="p-5">
          <div className="flex items-center gap-4">
            <ProgressRing value={available.length ? (done / available.length) * 100 : 0} size={64} stroke={6} tone="credit"
              label={t('home.lessonsDone', { done, total: available.length })}>
              {available.length ? `${Math.round((done / available.length) * 100)}%` : '–'}
            </ProgressRing>
            <div>
              <p className="font-semibold">{t('home.courseProgress')}</p>
              <p className="text-sm text-ink-2 tabular">{t('home.lessonsDone', { done, total: available.length })}</p>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-line">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold">{t('home.feesYear', { year: now.year })}</p>
              <Link to="/payments" className="text-sm text-brand hover:underline underline-offset-4">{t('common.viewAll')}</Link>
            </div>
            {history.isPending ? <Skeleton className="h-24" /> : <FeeStrip history={history.data} compact />}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default Dashboard;
