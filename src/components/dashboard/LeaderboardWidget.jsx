import { Trophy } from 'lucide-react';
import { EmptyState, Table, Th, Td } from '../ui/primitives';
import { cn } from '../../lib/cn';

const mmss = (s) => `${Math.floor((s ?? 0) / 60)}:${String((s ?? 0) % 60).padStart(2, '0')}`;

/** Fully marked attempts for one quiz, best first. */
const LeaderboardWidget = ({ data, quizChosen }) => {
  if (!quizChosen) return <EmptyState icon={Trophy} title="Choose a quiz" description="Pick a quiz above to see its ranking." />;
  if (!data?.length) return <EmptyState icon={Trophy} title="Nothing to rank yet" description="Attempts are ranked once their written answers are marked." />;
  return (
    <Table minWidth={620}>
      <thead><tr><Th className="w-16">Rank</Th><Th>Student</Th><Th>Batch</Th><Th className="text-right">Marks</Th><Th className="text-right">Score</Th><Th className="text-right">Time</Th></tr></thead>
      <tbody>
        {data.map((e) => (
          <tr key={e.studentId} className="hover:bg-sunken/50">
            <Td className={cn('tabular font-semibold', e.rank <= 3 ? 'text-brand' : 'text-ink-3')}>{e.rank}</Td>
            <Td><p className="font-medium">{e.studentName}</p><p className="text-xs text-ink-3 tabular">{e.studentId}</p></Td>
            <Td className="tabular">{e.batch}</Td>
            <Td className="text-right tabular">{e.score}/{e.totalMarks}</Td>
            <Td className="text-right tabular font-medium">{Math.round(e.percentage)}%</Td>
            <Td className="text-right tabular text-ink-2">{mmss(e.timeTaken)}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default LeaderboardWidget;
