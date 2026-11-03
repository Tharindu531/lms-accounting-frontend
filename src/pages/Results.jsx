import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Trophy, ArrowRight, Hourglass } from 'lucide-react';
import { quizAPI, leaderboardAPI } from '../services/api';
import { useMyResults, keys } from '../lib/queries';
import { unwrap } from '../lib/queryClient';
import { formatDate } from '../lib/time';
import { errorMessage } from '../lib/errors';
import { Panel, PanelHeader, PageHeader, Skeleton, SkeletonRows, EmptyState, ErrorState } from '../components/ui/primitives';
import QuizResult from '../components/quiz/QuizResult';
import ScoreCell from '../components/student/ScoreCell';
import { cn } from '../lib/cn';

const Leaderboard = ({ quizId }) => {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['leaderboard', quizId], queryFn: () => leaderboardAPI.getByQuiz(quizId).then(unwrap) });
  if (q.isPending) return <Panel><SkeletonRows rows={4} /></Panel>;
  if (q.isError || !q.data) return null;
  const { entries = [], classAverage, awaitingMarking } = q.data;
  const me = entries.find((e) => e.currentUser);
  const shown = entries.slice(0, 10);
  if (me && !shown.includes(me)) shown.push(me);

  return (
    <Panel>
      <PanelHeader title={t('result.classTitle')}
        description={entries.length ? t('result.classLead', { avg: Math.round(classAverage), count: entries.length }) : t('result.classEmpty')} />
      {entries.length > 0 && (
        <ol className="divide-y divide-line">
          {shown.map((e) => (
            <li key={`${e.rank}-${e.name}`} className={cn('flex items-center gap-3 px-5 py-2.5 text-sm', e.currentUser && 'bg-brand-soft/60')}>
              <span className={cn('w-7 tabular font-semibold', e.rank <= 3 ? 'text-brand' : 'text-ink-3')}>{e.rank}</span>
              <span className="flex-1 truncate">{e.currentUser ? t('result.you') : e.name}</span>
              <span className="tabular text-ink-2">{e.obtainedMarks}/{e.totalMarks}</span>
              <span className="w-12 text-right tabular font-medium">{Math.round(e.percentage)}%</span>
            </li>
          ))}
        </ol>
      )}
      {awaitingMarking > 0 && (
        <p className="flex items-center gap-2 px-5 py-3 border-t border-line text-sm text-ink-2">
          <Hourglass size={15} className="text-due" aria-hidden /> {t('result.notRankedYet', { count: awaitingMarking })}
        </p>
      )}
    </Panel>
  );
};

const ResultDetail = ({ quizId, onBack }) => {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: keys.myResult(quizId), queryFn: () => quizAPI.getMyQuizResult(quizId).then(unwrap) });
  if (q.isPending) return <div className="space-y-4"><Skeleton className="h-6 w-32" /><Skeleton className="h-48" /><Skeleton className="h-72" /></div>;
  if (q.isError) return <Panel><ErrorState title={t('common.loadFailed')} description={errorMessage(q.error)} onRetry={q.refetch} retryLabel={t('common.retry')} /></Panel>;
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] items-start">
      <QuizResult result={q.data} onBack={onBack} backLabel={t('result.allResults')} />
      <div className="xl:pt-9"><Leaderboard quizId={quizId} /></div>
    </div>
  );
};

const Results = () => {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const quizId = params.get('quiz');
  const results = useMyResults();
  const sorted = useMemo(() => [...(results.data ?? [])].sort((a, b) => new Date(b.attemptedAt) - new Date(a.attemptedAt)), [results.data]);
  const marked = sorted.filter((r) => r.markingComplete);
  const average = marked.length ? Math.round(marked.reduce((s, r) => s + (r.percentage ?? 0), 0) / marked.length) : null;

  if (quizId) return <ResultDetail quizId={quizId} onBack={() => setParams({})} />;

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.results')} description={average != null ? t('result.averageLead', { avg: average, count: marked.length }) : t('result.lead')} />
      <Panel>
        {results.isPending ? <SkeletonRows rows={5} /> : results.isError ? (
          <ErrorState title={t('common.loadFailed')} description={errorMessage(results.error)} onRetry={results.refetch} retryLabel={t('common.retry')} />
        ) : sorted.length === 0 ? (
          <EmptyState icon={Trophy} title={t('home.noResults')} description={t('home.noResultsHint')}
            action={<Link to="/quizzes" className="inline-flex items-center h-10 px-4 rounded-control bg-brand text-on-brand text-sm font-medium">{t('result.goToQuizzes')}</Link>} />
        ) : (
          <ul className="divide-y divide-line">
            {sorted.map((r) => (
              <li key={r.quizId}>
                <Link to={`/results?quiz=${r.quizId}`} className="flex items-center gap-4 px-5 py-4 hover:bg-sunken/60 transition-colors">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium truncate">{r.quizTitle}</span>
                    <span className="block text-sm text-ink-2">
                      {formatDate(r.attemptedAt)} · {t('result.correctOf', { n: r.correctAnswers, total: r.totalQuestions })}
                    </span>
                  </span>
                  <ScoreCell result={r} />
                  <ArrowRight size={16} className="text-ink-3 shrink-0" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
};

export default Results;
