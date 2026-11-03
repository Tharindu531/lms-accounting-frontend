import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, CreditCard, CheckCircle2, Trash2, Plus, X } from 'lucide-react';
import { paymentAPI, batchAPI } from '../../services/api';
import { unwrap } from '../../lib/queryClient';
import { errorMessage } from '../../lib/errors';
import { colomboNow } from '../../lib/queries';
import { formatDate } from '../../lib/time';
import useDebounced from '../../lib/useDebounced';
import useKeyedState from '../../lib/useKeyedState';
import { Panel, PageHeader, Badge, ProgressBar, SkeletonRows, EmptyState, ErrorState, Field, Input, Select, Table, Th, Td, FilterTabs } from '../../components/ui/primitives';
import { Modal } from '../../components/ui/Dialog';
import { useConfirm } from '../../components/ui/Confirm';
import Button from '../../components/ui/Button';
import Pagination from '../../components/admin/Pagination';
import SearchInput from '../../components/admin/SearchInput';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const PAGE_SIZE = 25;
const rupees = (n) => `Rs. ${Number(n ?? 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const lastAmount = () => { try { return localStorage.getItem('fee:lastAmount') || ''; } catch { return ''; } };
const rememberAmount = (a) => { try { localStorage.setItem('fee:lastAmount', String(a)); } catch { /* ignore */ } };

const ManagePayments = () => {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const now = colomboNow();
  const [period, setPeriod] = useState({ year: now.year, month: now.month });
  const [batch, setBatch] = useState('');
  const [status, setStatus] = useState('UNPAID');
  const [search, setSearch] = useState('');
  const [recording, setRecording] = useState(null);   // array of students
  const [amount, setAmount] = useState(lastAmount);
  const [notes, setNotes] = useState('');
  const q = useDebounced(search.trim());
  // A new filter or month starts from page 1 with nothing selected.
  const filterKey = JSON.stringify([period, batch, status, q]);
  const [page, setPage] = useKeyedState(filterKey, 1);
  const [selected, setSelected] = useKeyedState(`${filterKey}|${page}`, () => new Set());

  const batches = useQuery({ queryKey: ['admin', 'batches'], queryFn: () => batchAPI.getAll().then(unwrap) });
  const sheetKey = ['admin', 'payment-sheet', period, { batch, status, q, page }];
  const sheet = useQuery({
    queryKey: sheetKey,
    queryFn: () => paymentAPI.getSheet(period.year, period.month, {
      batch: batch || undefined, search: q || undefined, status: status === 'ALL' ? undefined : status, page: page - 1, size: PAGE_SIZE,
    }).then(unwrap),
    placeholderData: keepPreviousData,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'payment-sheet'] });
  const monthStr = String(period.month).padStart(2, '0');

  const record = useMutation({
    mutationFn: async (students) => {
      const a = parseFloat(amount);
      if (students.length === 1) {
        await paymentAPI.create({ userId: students[0].studentId, year: String(period.year), month: monthStr, amount: a, notes: notes || undefined });
        return { created: 1, skipped: 0 };
      }
      return unwrap(await paymentAPI.createBulk({ userIds: students.map((s) => s.studentId), year: String(period.year), month: monthStr, amount: a, notes: notes || undefined }));
    },
    onSuccess: (r) => {
      rememberAmount(amount);
      toast.success(r.created === 1 ? 'Payment recorded' : `${r.created} payments recorded`, r.skipped ? { description: `${r.skipped} already paid, skipped.` } : undefined);
      setRecording(null); setSelected(new Set()); setNotes(''); refresh();
    },
    onError: (e) => toast.error(errorMessage(e, 'The payment wasn\'t recorded.')),
  });

  const remove = async (row) => {
    const ok = await confirm({
      title: `Delete ${row.firstName}'s ${MONTHS[period.month - 1]} payment?`,
      description: `${rupees(row.payment.amount)} recorded on ${formatDate(row.payment.paidAt)}. Their ${MONTHS[period.month - 1]} lessons and quizzes lock again.`,
      confirmLabel: 'Delete payment', tone: 'danger',
    });
    if (!ok) return;
    try { await paymentAPI.delete(row.payment.id); toast.success('Payment deleted'); refresh(); }
    catch (e) { toast.error(errorMessage(e, 'The payment wasn\'t deleted.')); }
  };

  const shift = (d) => setPeriod(({ year, month }) => {
    const m = month + d;
    return m < 1 ? { year: year - 1, month: 12 } : m > 12 ? { year: year + 1, month: 1 } : { year, month: m };
  });

  const data = sheet.data;
  const rows = data?.rows ?? [];
  const unpaidOnPage = rows.filter((r) => !r.payment);
  const allSelected = unpaidOnPage.length > 0 && unpaidOnPage.every((r) => selected.has(r.studentId));
  const toggle = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectedRows = rows.filter((r) => selected.has(r.studentId));
  const batchList = [...(batches.data ?? [])].sort((a, b) => b.batchNumber - a.batchNumber);

  return (
    <div>
      <PageHeader title="Payments" description="Record monthly fees. A month's lessons and quizzes unlock for a student once it's recorded." />

      <Panel className="p-5 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="icon" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft size={18} /></Button>
            <p className="text-lg font-semibold w-44 text-center tabular" aria-live="polite">{MONTHS[period.month - 1]} {period.year}</p>
            <Button variant="secondary" size="icon" aria-label="Next month" onClick={() => shift(1)}><ChevronRight size={18} /></Button>
          </div>
          <Select aria-label="Batch" value={batch} onChange={(e) => setBatch(e.target.value)} className="w-44">
            <option value="">All batches</option>
            {batchList.map((b) => <option key={b.id} value={b.batchNumber}>Batch {b.batchNumber}</option>)}
          </Select>
        </div>
        {data && (
          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] items-end">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span><span className="font-semibold tabular">{data.paid}</span> <span className="text-ink-2">of {data.totalStudents} paid</span></span>
                <span className="text-debit"><span className="font-semibold tabular">{data.unpaid}</span> not paid</span>
              </div>
              <ProgressBar value={data.totalStudents ? (data.paid / data.totalStudents) * 100 : 0} tone="credit" label="Share of students paid" className="h-2" />
            </div>
            <div className="sm:text-right">
              <p className="text-sm text-ink-2">Collected</p>
              <p className="ledger-total text-xl font-semibold">{rupees(data.collected)}</p>
            </div>
          </div>
        )}
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-2 border-b border-line">
          <FilterTabs label="Show" value={status} onChange={setStatus} options={[
            { value: 'UNPAID', label: 'Not paid', count: data?.unpaid },
            { value: 'PAID', label: 'Paid', count: data?.paid },
            { value: 'ALL', label: 'Everyone', count: data?.totalStudents },
          ]} />
          <SearchInput value={search} onChange={setSearch} placeholder="Search students" className="w-full sm:w-72 mb-2" />
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-brand-soft border-b border-line text-sm" role="region" aria-label="Selected students">
            <span className="font-medium">{selected.size} selected</span>
            <Button size="sm" icon={Plus} onClick={() => setRecording(selectedRows)}>Record {MONTHS[period.month - 1]} fee</Button>
            <Button size="sm" variant="ghost" icon={X} onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}

        {sheet.isPending ? <SkeletonRows rows={6} /> : sheet.isError ? (
          <ErrorState description={errorMessage(sheet.error)} onRetry={sheet.refetch} />
        ) : rows.length === 0 ? (
          <EmptyState icon={status === 'UNPAID' ? CheckCircle2 : CreditCard}
            title={q ? 'No students match' : status === 'UNPAID' ? 'Everyone has paid' : status === 'PAID' ? 'No payments yet' : 'No students'}
            description={q ? 'Try a different search.' : status === 'UNPAID' ? `All fees for ${MONTHS[period.month - 1]} are recorded.` : undefined} />
        ) : (
          <div className={sheet.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
            <Table minWidth={720}>
              <thead>
                <tr>
                  <Th className="w-10">
                    {unpaidOnPage.length > 0 && (
                      <input type="checkbox" aria-label="Select all unpaid on this page" checked={allSelected} className="h-4 w-4 accent-[var(--brand)]"
                        onChange={() => setSelected((s) => { const n = new Set(s); unpaidOnPage.forEach((r) => (allSelected ? n.delete(r.studentId) : n.add(r.studentId))); return n; })} />
                    )}
                  </Th>
                  <Th>Student</Th><Th>Batch</Th><Th>{MONTHS[period.month - 1]}</Th><Th className="text-right">Amount</Th><Th className="w-32" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.studentId} className={selected.has(r.studentId) ? 'bg-brand-soft/50' : 'hover:bg-sunken/50'}>
                    <Td>
                      {!r.payment && <input type="checkbox" aria-label={`Select ${r.firstName} ${r.lastName}`} checked={selected.has(r.studentId)}
                        onChange={() => toggle(r.studentId)} className="h-4 w-4 accent-[var(--brand)]" />}
                    </Td>
                    <Td><p className="font-medium">{r.firstName} {r.lastName}</p><p className="text-sm text-ink-3 tabular">{r.studentId}</p></Td>
                    <Td className="tabular">{r.batch}</Td>
                    <Td>{r.payment ? <span className="text-sm"><Badge tone="credit" icon={CheckCircle2}>Paid</Badge> <span className="text-ink-2 ml-1">{formatDate(r.payment.paidAt)}</span></span>
                      : <Badge tone="debit">Not paid</Badge>}</Td>
                    <Td className="text-right tabular">{r.payment ? rupees(r.payment.amount) : '—'}</Td>
                    <Td className="text-right">
                      {r.payment
                        ? <Button variant="danger-ghost" size="icon-sm" aria-label={`Delete ${r.firstName}'s payment`} onClick={() => remove(r)}><Trash2 size={16} /></Button>
                        : <Button variant="secondary" size="sm" onClick={() => setRecording([r])}>Record</Button>}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={data?.totalElements ?? 0} onPage={setPage} />
      </Panel>

      <Modal open={!!recording} onOpenChange={(o) => !o && setRecording(null)} size="sm"
        title={recording?.length === 1 ? `Record ${MONTHS[period.month - 1]} fee` : `Record ${MONTHS[period.month - 1]} fee for ${recording?.length} students`}
        description={recording?.length === 1 ? `${recording[0].firstName} ${recording[0].lastName} · ${recording[0].studentId}` : 'Students who have already paid this month are skipped.'}
        footer={<>
          <Button variant="secondary" onClick={() => setRecording(null)}>Cancel</Button>
          <Button type="submit" form="pay-form" loading={record.isPending}>{recording?.length > 1 ? `Record ${recording.length} payments` : 'Record payment'}</Button>
        </>}>
        <form id="pay-form" className="space-y-4" onSubmit={(e) => { e.preventDefault(); record.mutate(recording); }}>
          <Field label="Amount (Rs.)" required>
            {(p) => <Input {...p} type="number" inputMode="decimal" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />}
          </Field>
          <Field label="Note" hint="Optional, e.g. receipt number or paid in cash.">
            {(p) => <Input {...p} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />}
          </Field>
        </form>
      </Modal>
    </div>
  );
};

export default ManagePayments;
