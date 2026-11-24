import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Hourglass, Lock, Users } from 'lucide-react';
import { quizAPI } from '../../services/api';
import { unwrap } from '../../lib/queryClient';
import { errorMessage } from '../../lib/errors';
import { formatDateTime } from '../../lib/time';
import { Panel, Badge, Skeleton, SkeletonRows, EmptyState, ErrorState, Table, Th, Td } from '../ui/primitives';
import Button from '../ui/Button';
import SearchInput from './SearchInput';
import QuizResult from '../quiz/QuizResult';
import { cn } from '../../lib/cn';

const mmss = (s) => `${Math.floor((s ?? 0) / 60)}:${String((s ?? 0) % 60).padStart(2, '0')}`;
// Close times are Sri Lanka wall-clock without an offset, like everywhere else in the app.
const opensAt = (s) => (s.answersReleaseAt ? formatDateTime(`${s.answersReleaseAt}+05:30`) : 'when the quiz closes');

/** One student's answer sheet. The server only returns it once the quiz has closed for their batch. */
const AnswerSheet = ({ quizMarksId, onBack }) => {
  const q = useQuery({
    queryKey: ['admin', 'submission', quizMarksId],
    queryFn: () => quizAPI.getSubmissionAnswers(quizMarksId).then(unwrap),
  });
  if (q.isPending) return <div className="space-y-4"><Skeleton className="h-6 w-32" /><Skeleton className="h-48" /><Skeleton className="h-72" /></div>;
  if (q.isError) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink"><ChevronLeft size={16} aria-hidden /> All submissions</button>
        <Panel><ErrorState title="These answers can't be shown" description={errorMessage(q.error)} onRetry={q.refetch} /></Panel>
      </div>
    );
  }
  return <QuizResult result={q.data} staff onBack={onBack} backLabel="All submissions" />;
};

/**
 * Every student who attempted a quiz, with their score. A student's full answer
 * sheet opens once the quiz has closed for their batch, the same moment students
 * get their own answers back.
 */
const QuizSubmissions = ({ quiz, onBack }) => {
  const [openId, setOpenId] = useState(null);
  const [search, setSearch] = useState('');
  const list = useQuery({
    queryKey: ['admin', 'quiz-submissions', quiz.id],
    queryFn: () => quizAPI.getSubmissions(quiz.id).then(unwrap),
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = list.data ?? [];
    return term ? all.filter((s) => `${s.studentName} ${s.userId}`.toLowerCase().includes(term)) : all;
  }, [list.data, search]);
  const locked = (list.data ?? []).filter((s) => !s.answersReleased);

  if (openId) return <AnswerSheet quizMarksId={openId} onBack={() => setOpenId(null)} />;

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink"><ChevronLeft size={16} aria-hidden /> Back to {quiz.title}</button>
      <header>
        <h1 className="text-2xl font-semibold">Submissions</h1>
        <p className="text-sm text-ink-2 mt-1">{quiz.title} · {list.data ? `${list.data.length} student${list.data.length === 1 ? '' : 's'}` : '…'}</p>
      </header>

      {locked.length > 0 && (
        <div className="flex items-start gap-3 rounded-panel border border-line bg-surface px-4 py-3 text-sm">
          <Lock size={18} className="text-ink-3 shrink-0 mt-0.5" aria-hidden />
          <p>A student&apos;s answers open here once the quiz closes for their batch, the same time they get their own answers back, so no one can pass answers on while others are still taking it. Written answers can be marked before then from Marking.</p>
        </div>
      )}

      <Panel>
        {list.isPending ? <SkeletonRows rows={6} /> : list.isError ? <ErrorState description={errorMessage(list.error)} onRetry={list.refetch} />
          : list.data.length === 0 ? <EmptyState icon={Users} title="No submissions yet" description="Students who attempt this quiz will appear here." />
          : (
            <>
              <div className="px-4 py-3 border-b border-line">
                <SearchInput value={search} onChange={setSearch} placeholder="Search by name or student ID" className="max-w-sm" />
              </div>
              {rows.length === 0 ? <EmptyState icon={Users} title="No students match" description="Try another name or ID." /> : (
                <Table minWidth={760}>
                  <thead><tr><Th>Student</Th><Th className="text-right">Score</Th><Th className="text-right">Correct</Th><Th className="text-right">Time</Th><Th>Submitted</Th><Th className="w-40" /></tr></thead>
                  <tbody>
                    {rows.map((s) => (
                      <tr key={s.quizMarksId} className={cn(s.answersReleased && 'hover:bg-sunken/50 cursor-pointer')}
                        onClick={s.answersReleased ? () => setOpenId(s.quizMarksId) : undefined}>
                        <Td>
                          <p className="font-medium">{s.studentName}</p>
                          <p className="text-xs text-ink-3 mt-0.5">{s.userId}{s.batch != null ? ` · Batch ${s.batch}` : ''}</p>
                        </Td>
                        <Td className="text-right tabular whitespace-nowrap">
                          {s.markingComplete
                            ? <>{s.obtainedMarks}/{s.totalMarks} <span className="text-ink-3">· {Math.round(s.percentage)}%</span></>
                            : <Badge tone="due" icon={Hourglass}>{s.pendingMarkingCount} to mark</Badge>}
                        </Td>
                        <Td className="text-right tabular">{s.correctAnswers}/{s.totalQuestions}</Td>
                        <Td className="text-right tabular">{mmss(s.timeTaken)}</Td>
                        <Td className="whitespace-nowrap">{formatDateTime(s.attemptedAt)}</Td>
                        <Td className="text-right" onClick={(e) => e.stopPropagation()}>
                          {s.answersReleased
                            ? <Button variant="secondary" size="sm" iconRight={ChevronRight} onClick={() => setOpenId(s.quizMarksId)}>View answers</Button>
                            : <span className="inline-flex items-center gap-1.5 text-xs text-ink-3"><Lock size={13} aria-hidden />Opens {opensAt(s)}</span>}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </>
          )}
      </Panel>
    </div>
  );
};

export default QuizSubmissions;
