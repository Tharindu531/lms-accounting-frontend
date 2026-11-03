import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FolderOpen, Plus, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { unitAPI } from '../../services/api';
import { unwrap } from '../../lib/queryClient';
import { errorMessage } from '../../lib/errors';
import { Panel, PageHeader, Badge, SkeletonRows, EmptyState, ErrorState, Field, Input, Textarea, Table, Th, Td } from '../../components/ui/primitives';
import { Modal } from '../../components/ui/Dialog';
import { useConfirm } from '../../components/ui/Confirm';
import Button from '../../components/ui/Button';

const ManageUnits = () => {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const units = useQuery({ queryKey: ['admin', 'units'], queryFn: () => unitAPI.getAll().then(unwrap) });
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const list = [...(units.data ?? [])].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id - b.id);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'units'] });
    qc.invalidateQueries({ queryKey: ['units'] });
  };

  const save = useMutation({
    mutationFn: (data) => (editing?.id ? unitAPI.update(editing.id, data) : unitAPI.create(data)),
    onSuccess: () => { toast.success(editing?.id ? 'Unit updated' : 'Unit added'); setEditing(null); refresh(); },
    onError: (e) => toast.error(errorMessage(e, 'The unit wasn\'t saved.')),
  });

  // Swap with the neighbour, then renumber everything 1..n so gaps and ties disappear.
  const move = useMutation({
    mutationFn: async ({ index, dir }) => {
      const order = [...list];
      const j = index + dir;
      [order[index], order[j]] = [order[j], order[index]];
      await Promise.all(order.map((u, i) => (u.displayOrder === i + 1 ? null
        : unitAPI.update(u.id, { name: u.name, description: u.description ?? '', displayOrder: i + 1 }))).filter(Boolean));
    },
    onSuccess: refresh,
    onError: (e) => { toast.error(errorMessage(e, 'The order wasn\'t saved.')); refresh(); },
  });

  const remove = async (u) => {
    const ok = await confirm({
      title: `Delete "${u.name}"?`,
      description: u.lessonCount || u.questionCount
        ? `It's removed from the unit lists. Its ${u.lessonCount} lesson(s) and ${u.questionCount} bank question(s) are kept.`
        : 'It\'s removed from the unit lists.',
      confirmLabel: 'Delete unit', tone: 'danger',
    });
    if (!ok) return;
    try { await unitAPI.delete(u.id); toast.success('Unit deleted'); refresh(); }
    catch (e) { toast.error(errorMessage(e, 'The unit wasn\'t deleted.')); }
  };

  const open = (u) => { setEditing(u ?? {}); setForm({ name: u?.name ?? '', description: u?.description ?? '' }); };

  return (
    <div>
      <PageHeader title="Units" description="Units group lessons and bank questions. Students see them in this order."
        actions={<Button icon={Plus} onClick={() => open(null)}>New unit</Button>} />
      <Panel>
        {units.isPending ? <SkeletonRows rows={4} /> : units.isError ? (
          <ErrorState description={errorMessage(units.error)} onRetry={units.refetch} />
        ) : list.length === 0 ? (
          <EmptyState icon={FolderOpen} title="No units yet" description="Add your first unit to start organising lessons."
            action={<Button icon={Plus} onClick={() => open(null)}>New unit</Button>} />
        ) : (
          <Table minWidth={640}>
            <thead><tr><Th className="w-24">Order</Th><Th>Unit</Th><Th className="text-right">Lessons</Th><Th className="text-right">Questions</Th><Th>Status</Th><Th className="w-24" /></tr></thead>
            <tbody>
              {list.map((u, i) => (
                <tr key={u.id} className="hover:bg-sunken/50">
                  <Td>
                    <div className="flex items-center gap-0.5">
                      <span className="w-6 tabular text-ink-3">{i + 1}</span>
                      <Button variant="ghost" size="icon-sm" aria-label={`Move ${u.name} up`} disabled={i === 0 || move.isPending} onClick={() => move.mutate({ index: i, dir: -1 })}><ArrowUp size={15} /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Move ${u.name} down`} disabled={i === list.length - 1 || move.isPending} onClick={() => move.mutate({ index: i, dir: 1 })}><ArrowDown size={15} /></Button>
                    </div>
                  </Td>
                  <Td>
                    <p className="font-medium">{u.name}</p>
                    {u.description && <p className="text-sm text-ink-2 truncate max-w-md">{u.description}</p>}
                  </Td>
                  <Td className="text-right tabular">{u.lessonCount ?? 0}</Td>
                  <Td className="text-right tabular">{u.questionCount ?? 0}</Td>
                  <Td>{u.isActive !== false ? <Badge tone="credit">Active</Badge> : <Badge>Hidden</Badge>}</Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${u.name}`} onClick={() => open(u)}><Pencil size={16} /></Button>
                      <Button variant="danger-ghost" size="icon-sm" aria-label={`Delete ${u.name}`} onClick={() => remove(u)}><Trash2 size={16} /></Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <Modal open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title={editing?.id ? 'Edit unit' : 'New unit'}
        footer={<>
          <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
          <Button type="submit" form="unit-form" loading={save.isPending}>{editing?.id ? 'Save unit' : 'Add unit'}</Button>
        </>}>
        <form id="unit-form" className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          save.mutate({ ...form, displayOrder: editing?.id ? editing.displayOrder : list.length + 1 });
        }}>
          <Field label="Name" required hint="Sinhala, English or both, e.g. ගිණුම්කරණ සංකල්ප">{(p) => <Input {...p} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
          <Field label="Description">{(p) => <Textarea {...p} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />}</Field>
        </form>
      </Modal>
    </div>
  );
};

export default ManageUnits;
