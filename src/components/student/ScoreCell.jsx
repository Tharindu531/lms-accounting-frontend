import { useTranslation } from 'react-i18next';
import { Hourglass } from 'lucide-react';
import { Badge } from '../ui/primitives';
import { cn } from '../../lib/cn';

/** A result's score, double-underlined like a final total, or "Awaiting marking". */
const ScoreCell = ({ result }) => {
  const { t } = useTranslation();
  if (!result.markingComplete) {
    return <Badge tone="due" icon={Hourglass}>{t('results.awaitingMarking')}</Badge>;
  }
  const pct = Math.round(result.percentage ?? 0);
  return (
    <span className="text-right">
      <span className={cn('ledger-total text-lg font-semibold', pct >= 75 ? 'text-credit' : pct >= 50 ? 'text-ink' : 'text-debit')}>{pct}%</span>
      {result.obtainedMarks != null && <span className="block text-xs text-ink-3 tabular mt-0.5">{result.obtainedMarks}/{result.totalMarks}</span>}
    </span>
  );
};

export default ScoreCell;
