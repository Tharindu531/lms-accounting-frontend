import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { GraduationCap, Plus, Trash2 } from 'lucide-react';
import { instructorAPI } from '../../services/api';
import { unwrap } from '../../lib/queryClient';
import { errorMessage } from '../../lib/errors';
import { Panel, PageHeader, Badge, SkeletonRows, EmptyState, ErrorState, Table, Th, Td } from '../../components/ui/primitives';
import { useConfirm } from '../../components/ui/Confirm';
import Button from '../../components/ui/Button';
import SearchInput from '../../components/admin/SearchInput';
import PersonForm from '../../components/admin/PersonForm';
import Contact from '../../components/admin/Contact';

const Instructors = () => {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [created, setCreated] = useState('');
  const list = useQuery({ queryKey: ['admin', 'instructors'], queryFn: () => instructorAPI.getAll().then(unwrap) });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (list.data ?? []).filter((i) => !q || [i.firstName, i.lastName, i.email, i.phone, i.id].some((v) => v?.toLowerCase().includes(q)));
  }, [list.data, search]);

  const create = useMutation({
    mutationFn: (payload) => instructorAPI.create(payload),
    onSuccess: (res) => { setCreated(res.data.message || 'Instructor added. Their login details are on the way.'); qc.invalidateQueries({ queryKey: ['admin', 'instructors'] }); },
    onError: (e) => toast.error(errorMessage(e, 'The instructor wasn\'t added.')),
  });

  const remove = async (i) => {
    const ok = await confirm({
      title: `Remove ${i.firstName} ${i.lastName}?`,
      description: 'They lose access straight away. Lessons and quizzes they created stay.',
      confirmLabel: 'Remove instructor', tone: 'danger',
    });
    if (!ok) return;
    try { await instructorAPI.delete(i.id); toast.success('Instructor removed'); qc.invalidateQueries({ queryKey: ['admin', 'instructors'] }); }
    catch (e) { toast.error(errorMessage(e, 'The instructor wasn\'t removed.')); }
  };

  return (
    <div>
      <PageHeader title="Instructors" description="Instructors manage units, lessons, quizzes and marking. They can't see payments or student accounts."
        actions={<Button icon={Plus} onClick={() => { setCreated(''); setFormKey((k) => k + 1); setAdding(true); }}>Add instructor</Button>} />
      <Panel>
        {(list.data?.length ?? 0) > 6 && (
          <div className="p-4 border-b border-line"><SearchInput value={search} onChange={setSearch} placeholder="Search instructors" className="max-w-md" /></div>
        )}
        {list.isPending ? <SkeletonRows rows={3} /> : list.isError ? (
          <ErrorState description={errorMessage(list.error)} onRetry={list.refetch} />
        ) : rows.length === 0 ? (
          <EmptyState icon={GraduationCap} title={search ? 'No instructors match' : 'No instructors yet'}
            description={search ? 'Try a different search.' : 'Add someone to help with lessons and marking.'} />
        ) : (
          <Table minWidth={640}>
            <thead><tr><Th>ID</Th><Th>Name</Th><Th>Contact</Th><Th>Status</Th><Th className="w-14" /></tr></thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id} className="hover:bg-sunken/50">
                  <Td className="tabular font-medium">{i.id}</Td>
                  <Td>{i.firstName} {i.lastName}</Td>
                  <Td><Contact person={i} /></Td>
                  <Td>{i.isActive ? <Badge tone="credit">Active</Badge> : <Badge tone="due">Not verified</Badge>}</Td>
                  <Td className="text-right"><Button variant="danger-ghost" size="icon-sm" aria-label={`Remove ${i.firstName} ${i.lastName}`} onClick={() => remove(i)}><Trash2 size={16} /></Button></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
      <PersonForm key={formKey} open={adding} onOpenChange={setAdding} title="Add an instructor"
        onSubmit={(p) => create.mutate(p)} submitting={create.isPending} createdMessage={created}
        onAddAnother={() => { setCreated(''); setFormKey((k) => k + 1); }} />
    </div>
  );
};

export default Instructors;
