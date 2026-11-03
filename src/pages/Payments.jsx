import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CheckCircle2, Copy, Printer, Receipt, CreditCard, Hourglass } from 'lucide-react';
import useAuth from '../context/useAuth';
import { usePaymentHistory, paidSet, colomboNow, monthNumber } from '../lib/queries';
import { formatDate } from '../lib/time';
import { errorMessage } from '../lib/errors';
import { Panel, PanelHeader, PageHeader, Skeleton, SkeletonRows, EmptyState, ErrorState } from '../components/ui/primitives';
import { Modal } from '../components/ui/Dialog';
import Button from '../components/ui/Button';
import FeeStrip from '../components/student/FeeStrip';

const rupees = (n) => `Rs. ${Number(n ?? 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ReceiptView = ({ payment, user, monthLabel }) => {
  const { t } = useTranslation();
  return (
    <div className="print-area bg-surface text-ink">
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-line">
        <div>
          <p className="font-semibold">Accounting with Indika Amarakoon</p>
          <p className="text-sm text-ink-2">{t('payments.receiptFor', { month: monthLabel })}</p>
        </div>
        <p className="text-sm text-ink-2 tabular text-right">#{String(payment.id).padStart(6, '0')}</p>
      </div>
      <dl className="grid grid-cols-[8rem_1fr] gap-y-2 py-4 text-sm">
        <dt className="text-ink-2">{t('payments.student')}</dt><dd>{user?.firstName} {user?.lastName}</dd>
        <dt className="text-ink-2">{t('account.studentId')}</dt><dd className="tabular">{user?.id}</dd>
        <dt className="text-ink-2">{t('payments.period')}</dt><dd>{monthLabel}</dd>
        <dt className="text-ink-2">{t('payments.paidOn')}</dt><dd>{formatDate(payment.paidAt)}</dd>
        {payment.notes && (<><dt className="text-ink-2">{t('payments.note')}</dt><dd>{payment.notes}</dd></>)}
      </dl>
      <div className="flex items-baseline justify-between pt-4 border-t border-line">
        <span className="font-medium">{t('payments.amountPaid')}</span>
        <span className="ledger-total text-xl font-semibold">{rupees(payment.amount)}</span>
      </div>
    </div>
  );
};

const Payments = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const history = usePaymentHistory();
  const [receipt, setReceipt] = useState(null);
  const now = colomboNow();
  const months = t('months', { returnObjects: true });
  const label = (p) => `${months[(monthNumber(p.month) ?? 1) - 1]} ${p.year}`;
  const paid = paidSet(history.data);
  const paidThisMonth = paid.has(`${now.year}-${now.month}`);
  const overdue = Array.from({ length: now.month - 1 }, (_, i) => i + 1).filter((m) => !paid.has(`${now.year}-${m}`));
  const sorted = [...(history.data ?? [])].sort((a, b) => (b.year - a.year) || (monthNumber(b.month) - monthNumber(a.month)));
  const yearTotal = (history.data ?? []).filter((p) => Number(p.year) === now.year).reduce((s, p) => s + Number(p.amount ?? 0), 0);

  const copyId = async () => {
    try { await navigator.clipboard.writeText(user?.id ?? ''); toast.success(t('payments.idCopied')); } catch { /* clipboard blocked */ }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.payments')} description={t('payments.lead')} />

      {history.isPending ? <Skeleton className="h-36" /> : history.isError ? (
        <Panel><ErrorState title={t('common.loadFailed')} description={errorMessage(history.error)} onRetry={history.refetch} retryLabel={t('common.retry')} /></Panel>
      ) : (
        <Panel className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div className="flex items-start gap-3">
              {paidThisMonth
                ? <CheckCircle2 size={22} className="text-credit mt-0.5 shrink-0" aria-hidden />
                : <Hourglass size={22} className="text-due mt-0.5 shrink-0" aria-hidden />}
              <div>
                <p className="font-semibold text-lg">{paidThisMonth ? t('payments.upToDate', { month: months[now.month - 1] }) : t('home.feeDueTitle', { month: months[now.month - 1] })}</p>
                <p className="text-sm text-ink-2">
                  {overdue.length ? t('payments.overdueMonths', { months: overdue.map((m) => months[m - 1]).join(', ') }) : paidThisMonth ? t('payments.upToDateHint') : t('home.feeDueHint')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-ink-2">{t('payments.paidThisYear', { year: now.year })}</p>
              <p className="ledger-total text-xl font-semibold">{rupees(yearTotal)}</p>
            </div>
          </div>
          <FeeStrip history={history.data} />
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel>
          <PanelHeader title={t('payments.history')} />
          {history.isPending ? <SkeletonRows rows={4} /> : sorted.length === 0 ? (
            <EmptyState icon={CreditCard} title={t('payments.noPayments')} description={t('payments.noPaymentsHint')} />
          ) : (
            <ul className="divide-y divide-line">
              {sorted.map((p) => (
                <li key={p.id} className="flex items-center gap-4 px-5 py-3.5">
                  <CheckCircle2 size={18} className="text-credit shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{label(p)}</p>
                    <p className="text-sm text-ink-2">{t('payments.paidOnDate', { date: formatDate(p.paidAt) })}</p>
                  </div>
                  <span className="tabular font-medium hidden xs:block">{rupees(p.amount)}</span>
                  <Button variant="ghost" size="sm" icon={Receipt} onClick={() => setReceipt(p)}>{t('payments.receipt')}</Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="p-5 h-fit">
          <h2 className="font-semibold">{t('home.howToPay')}</h2>
          <p className="text-sm text-ink-2 mt-1.5">{t('payments.howTo')}</p>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-control bg-sunken px-3.5 py-2.5">
            <div>
              <p className="text-xs text-ink-2">{t('account.studentId')}</p>
              <p className="text-lg font-semibold tabular">{user?.id}</p>
            </div>
            <Button variant="secondary" size="sm" icon={Copy} onClick={copyId}>{t('payments.copy')}</Button>
          </div>
          <p className="text-xs text-ink-3 mt-3">{t('payments.unlockNote')}</p>
        </Panel>
      </div>

      <Modal open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)} title={t('payments.receipt')} size="sm"
        footer={<Button icon={Printer} onClick={() => window.print()}>{t('payments.print')}</Button>}>
        {receipt && <ReceiptView payment={receipt} user={user} monthLabel={label(receipt)} />}
      </Modal>
    </div>
  );
};

export default Payments;
