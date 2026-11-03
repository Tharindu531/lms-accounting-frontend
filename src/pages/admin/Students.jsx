import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Users, Plus, Trash2 } from 'lucide-react';
import { userAPI, batchAPI } from '../../services/api';
import { unwrap } from '../../lib/queryClient';
import { errorMessage } from '../../lib/errors';
import useDebounced from '../../lib/useDebounced';
import { Panel, PageHeader, Badge, SkeletonRows, EmptyState, ErrorState, Select, Table, Th, Td } from '../../components/ui/primitives';
import { useConfirm } from '../../components/ui/Confirm';
import Button from '../../components/ui/Button';
import Pagination from '../../components/admin/Pagination';
import SearchInput from '../../components/admin/SearchInput';
import PersonForm from '../../components/admin/PersonForm';
import Contact from '../../components/admin/Contact';

const PAGE_SIZE = 20;

const Students = () => {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [batch, setBatch] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [created, setCreated] = useState('');
  const q = useDebounced(search.trim());

  const batches = useQuery({ queryKey: ['admin', 'batches'], queryFn: () => batchAPI.getAll().then(unwrap) });
  const students = useQuery({
    queryKey: ['admin', 'students', { page, q, batch }],
    queryFn: () => userAPI.getAll({ page: page - 1, size: PAGE_SIZE, search: q || undefined, batch: batch || undefined }).then(unwrap),
    placeholderData: keepPreviousData,
  });

  const create = useMutation({
    mutationFn: (payload) => userAPI.create(payload),
    onSuccess: (res) => { setCreated(res.data.message || 'Student added. Their login details are on the way.'); qc.invalidateQueries({ queryKey: ['admin', 'students'] }); },
    onError: (e) => toast.error(errorMessage(e, 'The student wasn\'t added.')),
  });

  const remove = async (s) => {
    const ok = await confirm({
      title: `Delete ${s.firstName} ${s.lastName}?`,
      description: 'Their account, payments, quiz results and lesson progress are deleted permanently.',
      confirmLabel: 'Delete student', tone: 'danger',
    });
    if (!ok) return;
    try { await userAPI.delete(s.id); toast.success('Student deleted'); qc.invalidateQueries({ queryKey: ['admin', 'students'] }); }
    catch (e) { toast.error(errorMessage(e, 'The student wasn\'t deleted.')); }
  };

  const rows = students.data?.content ?? [];
  const total = students.data?.totalElements ?? 0;
  const batchList = [...(batches.data ?? [])].sort((a, b) => b.batchNumber - a.batchNumber);

  return (
    <div>
      <PageHeader title="Students" description={students.isSuccess ? `${total} student${total === 1 ? '' : 's'}${batch ? ` in batch ${batch}` : ''}${q ? ` matching "${q}"` : ''}.` : ' '}
        actions={<Button icon={Plus} onClick={() => { setCreated(''); setFormKey((k) => k + 1); setAdding(true); }}>Add student</Button>} />

      <Panel>
        <div className="flex flex-wrap gap-3 p-4 border-b border-line">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search name, ID, email or phone" className="flex-1 min-w-60" />
          <Select aria-label="Batch" value={batch} onChange={(e) => { setBatch(e.target.value); setPage(1); }} className="w-44">
            <option value="">All batches</option>
            {batchList.map((b) => <option key={b.id} value={b.batchNumber}>Batch {b.batchNumber}</option>)}
          </Select>
        </div>

        {students.isPending ? <SkeletonRows rows={6} /> : students.isError ? (
          <ErrorState description={errorMessage(students.error)} onRetry={students.refetch} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Users} title={q || batch ? 'No students match' : 'No students yet'}
            description={q || batch ? 'Try a different search or batch.' : 'Students appear here when they register or you add them.'} />
        ) : (
          <div className={students.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
            <Table minWidth={760}>
              <thead><tr><Th>Student ID</Th><Th>Name</Th><Th>Contact</Th><Th>Batch</Th><Th>Status</Th><Th className="w-14" /></tr></thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="hover:bg-sunken/50">
                    <Td className="tabular font-medium">{s.id}</Td>
                    <Td>{s.firstName} {s.lastName}</Td>
                    <Td><Contact person={s} /></Td>
                    <Td className="tabular">{s.batch}</Td>
                    <Td>{s.isActive ? <Badge tone="credit">Active</Badge> : <Badge tone="due">Not verified</Badge>}</Td>
                    <Td className="text-right">
                      <Button variant="danger-ghost" size="icon-sm" aria-label={`Delete ${s.firstName} ${s.lastName}`} onClick={() => remove(s)}><Trash2 size={16} /></Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
      </Panel>

      <PersonForm key={formKey} open={adding} onOpenChange={setAdding} title="Add a student" batches={batchList}
        onSubmit={(p) => create.mutate(p)} submitting={create.isPending} createdMessage={created}
        onAddAnother={() => { setCreated(''); setFormKey((k) => k + 1); }} />
    </div>
  );
};

export default Students;
