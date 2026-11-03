import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Layers, Plus, Trash2, Pencil, AlertTriangle } from 'lucide-react';
import { batchAPI } from '../../services/api';
import { unwrap } from '../../lib/queryClient';
import { errorMessage } from '../../lib/errors';
import { Panel, PageHeader, Badge, SkeletonRows, EmptyState, ErrorState, Field, Input, Textarea, Table, Th, Td } from '../../components/ui/primitives';
import { Modal } from '../../components/ui/Dialog';
import Button from '../../components/ui/Button';

const empty = { name: '', description: '', batchNumber: '' };

const ManageBatches = () => {
  const qc = useQueryClient();
  const batches = useQuery({ queryKey: ['admin', 'batches'], queryFn: () => batchAPI.getAll().then(unwrap) });
  const [editing, setEditing] = useState(null);       // null | {} (new) | batch
  const [form, setForm] = useState(empty);
  const [deleting, setDeleting] = useState(null);
  const [typed, setTyped] = useState('');

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'batches'] });
    qc.invalidateQueries({ queryKey: ['batches'] });
  };

  const save = useMutation({
    mutationFn: (data) => (editing?.id ? batchAPI.update(editing.id, data) : batchAPI.create(data)),
    onSuccess: () => { toast.success(editing?.id ? 'Batch updated' : 'Batch created'); setEditing(null); refresh(); },
    onError: (e) => toast.error(errorMessage(e, 'The batch wasn\'t saved.')),
  });

  const remove = useMutation({
    mutationFn: (b) => batchAPI.delete(b.id),
    onSuccess: () => { toast.success('Batch deleted'); setDeleting(null); refresh(); },
    onError: (e) => toast.error(errorMessage(e, 'The batch wasn\'t deleted.')),
  });

  const open = (b) => {
    setEditing(b ?? {});
    setForm(b ? { name: b.name ?? '', description: b.description ?? '', batchNumber: String(b.batchNumber ?? '') } : empty);
  };

  const submit = (e) => {
    e.preventDefault();
    save.mutate({ ...form, batchNumber: parseInt(form.batchNumber, 10) });
  };

  const list = [...(batches.data ?? [])].sort((a, b) => b.batchNumber - a.batchNumber);

  return (
    <div>
      <PageHeader title="Batches" description="Each batch is an exam year. Students choose theirs when they register."
        actions={<Button icon={Plus} onClick={() => open(null)}>New batch</Button>} />

      <Panel>
        {batches.isPending ? <SkeletonRows rows={3} /> : batches.isError ? (
          <ErrorState description={errorMessage(batches.error)} onRetry={batches.refetch} />
        ) : list.length === 0 ? (
          <EmptyState icon={Layers} title="No batches yet" description="Create one so students can register into it."
            action={<Button icon={Plus} onClick={() => open(null)}>New batch</Button>} />
        ) : (
          <Table minWidth={640}>
            <thead><tr><Th>Batch</Th><Th>Name</Th><Th>Description</Th><Th className="text-right">Students</Th><Th>Status</Th><Th className="w-24" /></tr></thead>
            <tbody>
              {list.map((b) => (
                <tr key={b.id} className="hover:bg-sunken/50">
                  <Td className="font-semibold tabular">{b.batchNumber}</Td>
                  <Td className="font-medium">{b.name}</Td>
                  <Td className="text-ink-2 max-w-72 truncate">{b.description || '—'}</Td>
                  <Td className="text-right tabular">{b.studentCount}</Td>
                  <Td>{b.isActive ? <Badge tone="credit">Open for registration</Badge> : <Badge>Closed</Badge>}</Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${b.name}`} onClick={() => open(b)}><Pencil size={16} /></Button>
                      <Button variant="danger-ghost" size="icon-sm" aria-label={`Delete ${b.name}`} onClick={() => { setDeleting(b); setTyped(''); }}><Trash2 size={16} /></Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <Modal open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title={editing?.id ? 'Edit batch' : 'New batch'}
        footer={<>
          <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
          <Button type="submit" form="batch-form" loading={save.isPending}>{editing?.id ? 'Save batch' : 'Create batch'}</Button>
        </>}>
        <form id="batch-form" onSubmit={submit} className="space-y-4">
          <Field label="Exam year" required hint="Students' IDs start with this number, e.g. 2027_014.">
            {(p) => <Input {...p} type="number" min="2000" max="2100" value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} placeholder="2027" />}
          </Field>
          <Field label="Name" required>{(p) => <Input {...p} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="2027 A/L" />}</Field>
          <Field label="Description">{(p) => <Textarea {...p} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />}</Field>
        </form>
      </Modal>

      <Modal open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} size="sm" title={`Delete batch ${deleting?.batchNumber ?? ''}?`}
        footer={<>
          <Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button variant="danger" icon={Trash2} disabled={typed !== String(deleting?.batchNumber)} loading={remove.isPending} onClick={() => remove.mutate(deleting)}>Delete batch</Button>
        </>}>
        {deleting && (
          <div className="space-y-4 text-sm">
            <div className="flex gap-3 rounded-control bg-debit-soft text-debit p-3">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" aria-hidden />
              <p>This permanently deletes <strong>{deleting.studentCount} student{deleting.studentCount === 1 ? '' : 's'}</strong> in this batch, with their payments and quiz results. It can't be undone.</p>
            </div>
            <Field label={`Type ${deleting.batchNumber} to confirm`}>
              {(p) => <Input {...p} inputMode="numeric" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />}
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ManageBatches;
