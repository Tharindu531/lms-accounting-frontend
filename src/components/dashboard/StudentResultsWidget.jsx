import { Fragment, useState } from 'react';
import { ChevronRight, Users } from 'lucide-react';
import { EmptyState, ProgressBar, Table, Th, Td } from '../ui/primitives';
import { cn } from '../../lib/cn';

/** Each student's average, quizzes taken and lessons done; expand for every attempt. */
const StudentResultsWidget = ({ data }) => {
  const [open, setOpen] = useState(null);
  if (!data?.length) return <EmptyState icon={Users} title="No students match" description="Try another batch." />;
  return (
    <Table minWidth={720}>
      <thead><tr><Th className="w-10" srLabel="Details" /><Th>Student</Th><Th>Batch</Th><Th className="text-right">Quizzes</Th><Th className="text-right">Average</Th><Th className="w-48">Lessons done</Th></tr></thead>
      <tbody>
        {data.map((s) => {
          const expanded = open === s.studentId;
          const lessonPct = s.totalLessons ? (s.lessonsCompleted / s.totalLessons) * 100 : 0;
          return (
            <Fragment key={s.studentId}>
              <tr className="hover:bg-sunken/50 cursor-pointer" onClick={() => setOpen(expanded ? null : s.studentId)}>
                <Td>
                  <button type="button" aria-expanded={expanded} aria-label={`${expanded ? 'Hide' : 'Show'} ${s.studentName}'s attempts`}
                    className="h-7 w-7 grid place-items-center rounded-[6px] text-ink-3 hover:bg-sunken" onClick={(e) => { e.stopPropagation(); setOpen(expanded ? null : s.studentId); }}>
                    <ChevronRight size={16} className={cn('transition-transform', expanded && 'rotate-90')} />
                  </button>
                </Td>
                <Td><p className="font-medium">{s.studentName}</p><p className="text-xs text-ink-3 tabular">{s.studentId}</p></Td>
                <Td className="tabular">{s.batch}</Td>
                <Td className="text-right tabular">{s.quizzesAttempted}</Td>
                <Td className="text-right tabular font-medium">{s.markedAttempts ? `${Math.round(s.averageScore)}%` : s.quizzesAttempted ? <span className="text-due text-xs font-normal">Awaiting marking</span> : '—'}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <ProgressBar value={lessonPct} tone="credit" className="flex-1" label={`${s.studentName} lessons`} />
                    <span className="text-xs tabular text-ink-2 w-12 text-right">{s.lessonsCompleted}/{s.totalLessons}</span>
                  </div>
                </Td>
              </tr>
              {expanded && (
                <tr>
                  <td colSpan={6} className="bg-sunken/40 border-b border-line px-14 py-3">
                    {s.quizAttempts?.length ? (
                      <ul className="divide-y divide-line text-sm">
                        {s.quizAttempts.map((a) => (
                          <li key={a.quizId} className="flex justify-between gap-4 py-2">
                            <span className="truncate">{a.quizTitle}</span>
                            <span className="tabular text-ink-2">{a.score}/{a.totalMarks} · <span className="text-ink font-medium">{Math.round(a.percentage)}%</span></span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-sm text-ink-2">No quiz attempts yet.</p>}
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </Table>
  );
};

export default StudentResultsWidget;
