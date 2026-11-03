import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertTriangle, Hourglass } from 'lucide-react';
import { paidSet, colomboNow } from '../../lib/queries';
import { cn } from '../../lib/cn';

/* ---------- Fees: twelve ruled cells, one per month ---------- */

const FeeStrip = ({ history, compact = false }) => {
  const { t } = useTranslation();
  const now = colomboNow();
  const paid = paidSet(history);
  const months = t('monthsShort', { returnObjects: true });
  const cells = months.map((label, i) => {
    const m = i + 1;
    const isPaid = paid.has(`${now.year}-${m}`);
    const state = isPaid ? 'paid' : m < now.month ? 'overdue' : m === now.month ? 'due' : 'future';
    return { m, label, state };
  });
  const tone = {
    paid: 'bg-credit-soft text-credit border-credit/25',
    overdue: 'bg-debit-soft text-debit border-debit/30',
    due: 'bg-due-soft text-due border-due/30',
    future: 'bg-surface text-ink-3 border-line',
  };
  const icon = { paid: CheckCircle2, overdue: AlertTriangle, due: Hourglass, future: null };
  return (
    <ol className={cn('grid grid-cols-6 gap-1.5', !compact && 'sm:grid-cols-12')} aria-label={t('home.feesYear', { year: now.year })}>
      {cells.map((c) => {
        const Icon = icon[c.state];
        return (
          <li key={c.m} className={cn('rounded-[8px] border px-1.5 py-2 text-center', tone[c.state], c.m === now.month && 'ring-2 ring-offset-1 ring-offset-surface ring-brand/40')}
              title={`${t('months', { returnObjects: true })[c.m - 1]}: ${t(`home.fee.${c.state}`)}`}>
            <span className="block text-xs font-medium">{c.label}</span>
            <span className="h-4 mt-1 grid place-items-center">{Icon ? <Icon size={14} aria-hidden /> : <span className="block h-px w-3 bg-line-strong" />}</span>
            <span className="sr-only">{t(`home.fee.${c.state}`)}</span>
          </li>
        );
      })}
    </ol>
  );
};

export default FeeStrip;
