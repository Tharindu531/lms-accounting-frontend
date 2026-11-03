import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Users, CreditCard, ClipboardCheck, TrendingUp, Trophy, BookOpen, ArrowRight } from 'lucide-react';
import { adminDashboardAPI, paymentAPI, batchAPI, quizAPI } from '../../services/api';
import { unwrap } from '../../lib/queryClient';
import { colomboNow } from '../../lib/queries';
import { errorMessage } from '../../lib/errors';
import { Panel, PanelHeader, PageHeader, Skeleton, SkeletonRows, ErrorState, Select } from '../../components/ui/primitives';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import ScoreTrendChart from '../../components/admin/ScoreTrendChart';
import Pagination from '../../components/admin/Pagination';
import LeaderboardWidget from '../../components/dashboard/LeaderboardWidget';
import StudentResultsWidget from '../../components/dashboard/StudentResultsWidget';
import LessonProgressWidget from '../../components/dashboard/LessonProgressWidget';
import { cn } from '../../lib/cn';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const RESULTS_PAGE = 50;

/** One cell of the figures row: a big number, what it counts, and where to act on it. */
const Figure = ({ icon: Icon, label, value, detail, to, tone }) => {
  const body = (
    <>
      <p className="flex items-center gap-2 text-sm text-ink-2"><Icon size={16} aria-hidden /> {label}</p>
      <p className={cn('text-[28px] font-semibold tabular mt-1 leading-tight', tone === 'due' && 'text-due')}>{value}</p>
      <p className="text-sm text-ink-3 mt-0.5 flex items-center gap-1">{detail}{to && <ArrowRight size={14} aria-hidden />}</p>
    </>
  );
  return to
    ? <Link to={to} className="block p-5 hover:bg-sunken/50 transition-colors">{body}</Link>
    : <div className="p-5">{body}</div>;
};

const AdminDashboard = () => {
  const now = colomboNow();
  const [batch, setBatch] = useState('');
  const [quizId, setQuizId] = useState('');
  const [resultsPage, setResultsPage] = useState(1);
  const filters = batch ? { batches: [Number(batch)] } : {};

  const batches = useQuery({ queryKey: ['admin', 'batches'], queryFn: () => batchAPI.getAll().then(unwrap) });
  const overview = useQuery({ queryKey: ['admin', 'overview', batch], queryFn: () => adminDashboardAPI.getOverview(filters).then(unwrap), placeholderData: keepPreviousData });
  const fees = useQuery({
    queryKey: ['admin', 'payment-sheet', { year: now.year, month: now.month }, { batch, summary: true }],
    queryFn: () => paymentAPI.getSheet(now.year, now.month, { batch: batch || undefined, size: 1 }).then(unwrap),
  });
  const quizzes = useQuery({ queryKey: ['admin', 'quizzes'], queryFn: () => quizAPI.getAllAdmin().then(unwrap) });
  const leaderboard = useQuery({
    queryKey: ['admin', 'leaderboard', quizId, batch], enabled: !!quizId,
    queryFn: () => adminDashboardAPI.getLeaderboard(quizId, filters).then(unwrap),
  });
  const results = useQuery({
    queryKey: ['admin', 'student-results', batch, resultsPage],
    queryFn: () => adminDashboardAPI.getStudentResults({ ...filters, page: resultsPage - 1, size: RESULTS_PAGE }).then(unwrap),
    placeholderData: keepPreviousData,
  });
  const lessons = useQuery({ queryKey: ['admin', 'lesson-progress', batch], queryFn: () => adminDashboardAPI.getLessonProgress(filters).then(unwrap) });

  const o = overview.data;
  const f = fees.data;
  const paidPct = f?.totalStudents ? Math.round((f.paid / f.totalStudents) * 100) : 0;
  const batchList = [...(batches.data ?? [])].sort((a, b) => b.batchNumber - a.batchNumber);
  const quizList = [...(quizzes.data ?? [])].filter((q) => q.isActive !== false).sort((a, b) => b.id - a.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description={`How the class is doing in ${MONTHS[now.month - 1]}.`}
        actions={
          <Select aria-label="Batch" value={batch} onChange={(e) => { setBatch(e.target.value); setResultsPage(1); }} className="w-44">
            <option value="">All batches</option>
            {batchList.map((b) => <option key={b.id} value={b.batchNumber}>Batch {b.batchNumber}</option>)}
          </Select>
        } />

      {overview.isError ? (
        <Panel><ErrorState description={errorMessage(overview.error)} onRetry={overview.refetch} /></Panel>
      ) : (
        <Panel className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-line overflow-hidden">
          {!o ? Array.from({ length: 4 }, (_, i) => <div key={i} className="p-5 space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-16" /><Skeleton className="h-3 w-28" /></div>) : (
            <>
              <Figure icon={Users} label="Students" value={o.totalStudents}
                detail={batch ? `in batch ${batch}` : Object.entries(o.studentsByBatch ?? {}).sort(([a], [b]) => b - a).map(([b, n]) => `${n} in ${b}`).join(' · ')} to="/admin/students" />
              <Figure icon={CreditCard} label={`Paid for ${MONTHS[now.month - 1]}`} value={f ? `${paidPct}%` : '—'}
                detail={f ? `${f.paid} of ${f.totalStudents} students` : ' '} to="/admin/payments" />
              <Figure icon={ClipboardCheck} label="Waiting for marking" value={o.pendingMarking} tone={o.pendingMarking ? 'due' : undefined}
                detail={o.pendingMarking ? 'papers with written answers' : 'All marked'} to="/admin/marking" />
              <Figure icon={TrendingUp} label="Average score" value={o.averageQuizScore ? `${Math.round(o.averageQuizScore)}%` : '—'}
                detail={`${o.quizAttempts} attempts · marked papers only`} />
            </>
          )}
        </Panel>
      )}

      <Panel>
        <PanelHeader title="Average score by quiz" description={batch ? `Batch ${batch}, last ${o?.quizTrend?.length ?? 0} quizzes` : 'Last quizzes with attempts, oldest to newest'} />
        <div className="px-5 py-4">
          {!o ? <Skeleton className="h-52" /> : <ScoreTrendChart points={o.quizTrend ?? []} />}
        </div>
      </Panel>

      <Panel>
        <Tabs defaultValue="students">
          <div className="px-4 pt-2 border-b border-line">
            <TabsList className="border-b-0">
              <TabsTrigger value="students" icon={Users}>Students</TabsTrigger>
              <TabsTrigger value="leaderboard" icon={Trophy}>Quiz ranking</TabsTrigger>
              <TabsTrigger value="lessons" icon={BookOpen}>Lesson progress</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="students">
            {results.isPending ? <SkeletonRows rows={6} /> : results.isError ? <ErrorState description={errorMessage(results.error)} onRetry={results.refetch} /> : (
              <>
                <div className={results.isPlaceholderData ? 'opacity-60' : undefined}><StudentResultsWidget data={results.data?.content} /></div>
                <Pagination page={resultsPage} pageSize={RESULTS_PAGE} total={results.data?.totalElements ?? 0} onPage={setResultsPage} />
              </>
            )}
          </TabsContent>
          <TabsContent value="leaderboard">
            <div className="p-4 border-b border-line">
              <Select aria-label="Quiz" value={quizId} onChange={(e) => setQuizId(e.target.value)} className="max-w-md">
                <option value="">Choose a quiz</option>
                {quizList.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
              </Select>
            </div>
            {leaderboard.isFetching && !leaderboard.data ? <SkeletonRows rows={5} /> : <LeaderboardWidget data={leaderboard.data} quizChosen={!!quizId} />}
          </TabsContent>
          <TabsContent value="lessons">
            {lessons.isPending ? <SkeletonRows rows={6} /> : lessons.isError ? <ErrorState description={errorMessage(lessons.error)} onRetry={lessons.refetch} />
              : <LessonProgressWidget key={batch} data={lessons.data} filters={filters} />}
          </TabsContent>
        </Tabs>
      </Panel>
    </div>
  );
};

export default AdminDashboard;
