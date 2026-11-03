import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, BookOpen, CheckCircle2, Circle } from 'lucide-react';
import { adminDashboardAPI } from '../../services/api';
import { unwrap } from '../../lib/queryClient';
import { formatDuration } from '../../lib/queries';
import { EmptyState, ProgressBar, SkeletonRows, ErrorState, Table, Th, Td } from '../ui/primitives';
import { cn } from '../../lib/cn';

// Per-student rows for a lesson are fetched only when it's expanded.
const LessonDetail = ({ lessonId, filters }) => {
  const q = useQuery({
    queryKey: ['admin', 'lesson-progress', lessonId, filters],
    queryFn: () => adminDashboardAPI.getLessonProgress({ ...filters, lessonId }).then(unwrap),
  });
  if (q.isPending) return <SkeletonRows rows={3} />;
  if (q.isError) return <ErrorState onRetry={q.refetch} />;
  const rows = q.data?.find((l) => l.lessonId === lessonId)?.studentProgress ?? [];
  if (!rows.length) return <p className="text-sm text-ink-2 py-2">No students in this filter.</p>;
  const sorted = [...rows].sort((a, b) => Number(b.completed) - Number(a.completed) || b.watchedSeconds - a.watchedSeconds);
  return (
    <ul className="grid sm:grid-cols-2 gap-x-8 text-sm">
      {sorted.map((s) => (
        <li key={s.studentId} className="flex items-center gap-2 py-1.5 border-b border-line">
          {s.completed ? <CheckCircle2 size={15} className="text-credit shrink-0" aria-label="completed" /> : <Circle size={15} className="text-line-strong shrink-0" aria-label="not completed" />}
          <span className="flex-1 truncate">{s.studentName}</span>
          <span className="tabular text-ink-3 text-xs">{s.watchedSeconds ? formatDuration(s.watchedSeconds) : '—'}</span>
        </li>
      ))}
    </ul>
  );
};

const LessonProgressWidget = ({ data, filters = {} }) => {
  const [open, setOpen] = useState(null);
  if (!data?.length) return <EmptyState icon={BookOpen} title="No lessons yet" />;
  return (
    <Table minWidth={620}>
      <thead><tr><Th className="w-10" srLabel="Details" /><Th>Lesson</Th><Th className="w-64">Completed</Th><Th className="text-right">Students</Th></tr></thead>
      <tbody>
        {data.map((l) => {
          const expanded = open === l.lessonId;
          return (
            <Fragment key={l.lessonId}>
              <tr className="hover:bg-sunken/50 cursor-pointer" onClick={() => setOpen(expanded ? null : l.lessonId)}>
                <Td>
                  <button type="button" aria-expanded={expanded} aria-label={`${expanded ? 'Hide' : 'Show'} students for ${l.lessonName}`}
                    className="h-7 w-7 grid place-items-center rounded-[6px] text-ink-3 hover:bg-sunken" onClick={(e) => { e.stopPropagation(); setOpen(expanded ? null : l.lessonId); }}>
                    <ChevronRight size={16} className={cn('transition-transform', expanded && 'rotate-90')} />
                  </button>
                </Td>
                <Td className="font-medium">{l.lessonName}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <ProgressBar value={l.completionRate} tone="credit" className="flex-1" label={`${l.lessonName} completion`} />
                    <span className="text-xs tabular text-ink-2 w-10 text-right">{Math.round(l.completionRate)}%</span>
                  </div>
                </Td>
                <Td className="text-right tabular">{l.completedCount}/{l.totalStudents}</Td>
              </tr>
              {expanded && (
                <tr><td colSpan={4} className="bg-sunken/40 border-b border-line px-14 py-3"><LessonDetail lessonId={l.lessonId} filters={filters} /></td></tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </Table>
  );
};

export default LessonProgressWidget;
