import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FolderOpen, Plus, Pencil, Trash2, ArrowUp, ArrowDown, ChevronDown, ChevronRight, CornerDownRight } from 'lucide-react';
import { unitAPI } from '../../services/api';
import { unwrap } from '../../lib/queryClient';
import { errorMessage } from '../../lib/errors';
import { unitTree } from '../../lib/units';
import { Panel, PageHeader, SkeletonRows, EmptyState, ErrorState, Field, Input, Textarea, Select } from '../../components/ui/primitives';
import { Modal } from '../../components/ui/Dialog';
import { useConfirm } from '../../components/ui/Confirm';
import Button from '../../components/ui/Button';
import { cn } from '../../lib/cn';

const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Units in course order, each with optional sub-units (one level). Students see
 * lessons grouped the same way. Counts on a unit include its sub-units.
 */
const ManageUnits = () => {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const units = useQuery({ queryKey: ['admin', 'units'], queryFn: () => unitAPI.getAll().then(unwrap) });
  const [editing, setEditing] = useState(null);     // null | { parentId? } new | unit
  const [form, setForm] = useState({ name: '', description: '', parentId: '' });
  const [collapsed, setCollapsed] = useState(() => new Set());
  const tree = useMemo(() => unitTree(units.data ?? []), [units.data]);
  const top = tree.filter((u) => u.depth === 0);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'units'] });
    qc.invalidateQueries({ queryKey: ['units'] });
    qc.invalidateQueries({ queryKey: ['admin', 'bank-stats'] });
  };

  const save = useMutation({
    mutationFn: (data) => (editing?.id ? unitAPI.update(editing.id, data) : unitAPI.create(data)),
    onSuccess: () => {
      toast.success(editing?.id ? 'Unit saved' : form.parentId ? 'Sub-unit added' : 'Unit added');
      if (form.parentId) setCollapsed((c) => { const n = new Set(c); n.delete(Number(form.parentId)); return n; });
      setEditing(null);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e, 'The unit wasn\'t saved.')),
  });

  // Reorders one list: the top-level units, or one unit's sub-units.
  const move = useMutation({
    mutationFn: ({ siblings, index, dir }) => {
      const ids = siblings.map((u) => u.id);
      [ids[index], ids[index + dir]] = [ids[index + dir], ids[index]];
      return unitAPI.reorder(siblings[0].parentId ?? null, ids);
    },
    onSuccess: refresh,
    onError: (e) => { toast.error(errorMessage(e, 'The order wasn\'t saved.')); refresh(); },
  });

  const remove = async (u) => {
    if (u.children?.length) {
      toast.error(`Delete or move the sub-units of "${u.name}" first.`);
      return;
    }
    const items = (u.lessonCount ?? 0) + (u.questionCount ?? 0);
    const ok = await confirm({
      title: `Delete "${u.name}"?`,
      description: u.parentId
        ? (items ? `Its ${count(u.lessonCount ?? 0, 'lesson')} and ${count(u.questionCount ?? 0, 'bank question')} move up to "${u.parentName}".` : 'It has no lessons or questions.')
        : (items ? `Its ${count(u.lessonCount ?? 0, 'lesson')} and ${count(u.questionCount ?? 0, 'bank question')} are kept, with no unit.` : 'It has no lessons or questions.'),
      confirmLabel: u.parentId ? 'Delete sub-unit' : 'Delete unit', tone: 'danger',
    });
    if (!ok) return;
    try {
      const res = await unitAPI.delete(u.id);
      toast.success(res.data?.message ?? 'Unit deleted');
      refresh();
      qc.invalidateQueries({ queryKey: ['admin', 'lessons'] });
      qc.invalidateQueries({ queryKey: ['admin', 'bank'] });
    } catch (e) { toast.error(errorMessage(e, 'The unit wasn\'t deleted.')); }
  };

  const open = (u, parentId) => {
    setEditing(u ?? {});
    setForm({ name: u?.name ?? '', description: u?.description ?? '', parentId: String(u ? u.parentId ?? '' : parentId ?? '') });
  };
  const toggle = (id) => setCollapsed((c) => { const n = new Set(c); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // A unit's totals include its sub-units.
  const total = (u, k) => (u[k] ?? 0) + (u.children ?? []).reduce((s, c) => s + (c[k] ?? 0), 0);

  const renderRow = (u, siblings, index) => {
    const sub = u.depth === 1;
    const kids = u.children ?? [];
    const isOpen = !collapsed.has(u.id);
    return (
      <li key={u.id} className={cn('flex items-center gap-2 px-3 sm:px-4 py-2.5', sub && 'pl-10 sm:pl-14 bg-sunken/30')}>
        <div className="flex shrink-0 items-center">
          <Button variant="ghost" size="icon-sm" aria-label={`Move ${u.name} up`} disabled={index === 0 || move.isPending} onClick={() => move.mutate({ siblings, index, dir: -1 })}><ArrowUp size={15} /></Button>
          <Button variant="ghost" size="icon-sm" aria-label={`Move ${u.name} down`} disabled={index === siblings.length - 1 || move.isPending} onClick={() => move.mutate({ siblings, index, dir: 1 })}><ArrowDown size={15} /></Button>
        </div>
        {sub ? <CornerDownRight size={15} className="shrink-0 text-ink-3" aria-hidden />
          : kids.length ? (
            <button type="button" onClick={() => toggle(u.id)} aria-expanded={isOpen} aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${u.name}`}
              className="h-7 w-7 shrink-0 grid place-items-center rounded-[6px] text-ink-3 hover:text-ink hover:bg-sunken">
              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : <span className="w-7 shrink-0" />}
        <div className="min-w-0 flex-1">
          <p className={cn('truncate', sub ? 'text-[14.5px]' : 'font-medium')}>
            <span className="tabular text-ink-3 mr-2">{sub ? `${siblings.parentIndex + 1}.${index + 1}` : index + 1}</span>{u.name}
          </p>
          <p className="text-xs text-ink-3 tabular">
            {count(sub ? u.lessonCount ?? 0 : total(u, 'lessonCount'), 'lesson')} · {count(sub ? u.questionCount ?? 0 : total(u, 'questionCount'), 'question')}
            {!sub && kids.length > 0 && ` · ${count(kids.length, 'sub-unit')}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!sub && <Button variant="ghost" size="sm" icon={Plus} onClick={() => open(null, u.id)} className="hidden sm:inline-flex">Sub-unit</Button>}
          {!sub && <Button variant="ghost" size="icon-sm" aria-label={`Add a sub-unit to ${u.name}`} onClick={() => open(null, u.id)} className="sm:hidden"><Plus size={16} /></Button>}
          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${u.name}`} onClick={() => open(u)}><Pencil size={16} /></Button>
          <Button variant="danger-ghost" size="icon-sm" aria-label={`Delete ${u.name}`} onClick={() => remove(u)}><Trash2 size={16} /></Button>
        </div>
      </li>
    );
  };

  const editingHasKids = editing?.id && tree.find((u) => u.id === editing.id)?.children?.length > 0;

  return (
    <div>
      <PageHeader title="Units" description="Units, and optional sub-units inside them, group lessons and bank questions. Students see them in this order."
        actions={<Button icon={Plus} onClick={() => open(null)}>New unit</Button>} />
      <Panel>
        {units.isPending ? <SkeletonRows rows={4} /> : units.isError ? (
          <ErrorState description={errorMessage(units.error)} onRetry={units.refetch} />
        ) : top.length === 0 ? (
          <EmptyState icon={FolderOpen} title="No units yet" description="Add your first unit to start organising lessons."
            action={<Button icon={Plus} onClick={() => open(null)}>New unit</Button>} />
        ) : (
          <ul className="divide-y divide-line">
            {top.map((u, i) => {
              const kids = Object.assign([...u.children], { parentIndex: i });
              return [
                renderRow(u, top, i),
                ...(collapsed.has(u.id) ? [] : kids.map((c, j) => renderRow({ ...c, depth: 1, parentName: u.name }, kids, j))),
              ];
            })}
          </ul>
        )}
      </Panel>

      <Modal open={!!editing} onOpenChange={(o) => !o && setEditing(null)}
        title={editing?.id ? (form.parentId ? 'Edit sub-unit' : 'Edit unit') : form.parentId ? 'New sub-unit' : 'New unit'}
        footer={<>
          <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
          <Button type="submit" form="unit-form" loading={save.isPending}>{editing?.id ? 'Save' : form.parentId ? 'Add sub-unit' : 'Add unit'}</Button>
        </>}>
        <form id="unit-form" className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          save.mutate({ name: form.name, description: form.description, parentId: form.parentId ? Number(form.parentId) : null });
        }}>
          <Field label="Name" required hint="Sinhala, English or both, e.g. ගිණුම්කරණ සංකල්ප">{(p) => <Input {...p} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
          <Field label="Inside" hint={editingHasKids ? 'This unit has sub-units, so it stays a top-level unit.' : 'Optional. A sub-unit sits inside one unit; sub-units can\'t have their own.'}>
            {(p) => (
              <Select {...p} value={form.parentId} disabled={!!editingHasKids} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
                <option value="">Nothing: a top-level unit</option>
                {top.filter((u) => u.id !== editing?.id).map((u) => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Description">{(p) => <Textarea {...p} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />}</Field>
        </form>
      </Modal>
    </div>
  );
};

export default ManageUnits;
