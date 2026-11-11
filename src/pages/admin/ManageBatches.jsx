import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Layers, Plus, Trash2, Pencil, AlertTriangle, Download } from 'lucide-react';
import { batchAPI } from '../../services/api';
import { unwrap } from '../../lib/queryClient';
import { errorMessage } from '../../lib/errors';
import { Panel, PageHeader, Badge, SkeletonRows, Skeleton, EmptyState, ErrorState, Field, Input, Textarea, Table, Th, Td } from '../../components/ui/primitives';
import { Modal } from '../../components/ui/Dialog';
import Button from '../../components/ui/Button';

const empty = { name: '', description: '', batchNumber: '' };

const n = (count, one, many = `${one}s`) => `${count.toLocaleString()} ${count === 1 ? one : many}`;

/**
 * Delete a batch: real counts first, an optional download of its records, and the
 * batch name typed to confirm (the server checks the name too).
 */
const DeleteBatchDialog = ({ batch, onClose, onDeleted }) => {
  const [typed, setTyped] = useState('');
  const [exporting, setExporting] = useState(false);
  const preview = useQuery({ queryKey: ['admin', 'batch-delete-preview', batch.id], queryFn: () => batchAPI.deletePreview(batch.id).then(unwrap), staleTime: 0 });
  const remove = useMutation({
    mutationFn: () => batchAPI.delete(batch.id, typed.trim()),
    onSuccess: () => { toast.success(`${batch.name} deleted`); onDeleted(); },
    onError: (e) => toast.error(errorMessage(e, 'The batch wasn\'t deleted.')),
  });
  const download = async () => {
    setExporting(true);
    try {
      const res = await batchAPI.export(batch.id);
      const url = URL.createObjectURL(res.data);
      const a = Object.assign(document.createElement('a'), { href: url, download: `batch-${batch.batchNumber}-records.zip` });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast.error(errorMessage(e, 'The download didn\'t start.'));
    } finally {
      setExporting(false);
    }
  };
  const p = preview.data;
  const matches = typed.trim() === batch.name.trim();

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={`Delete batch "${batch.name}"?`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" icon={Trash2} disabled={!matches || !p} loading={remove.isPending} onClick={() => remove.mutate()}>Delete batch</Button>
      </>}>
      <div className="space-y-4 text-sm">
        <div className="rounded-control bg-debit-soft p-3.5">
          <p className="flex items-center gap-2 font-semibold text-debit"><AlertTriangle size={17} aria-hidden /> This permanently removes</p>
          {preview.isPending ? <div className="mt-2 space-y-1.5"><Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-40" /></div>
            : preview.isError ? <p className="mt-2 text-debit">{errorMessage(preview.error)}</p> : (
              <ul className="mt-2 space-y-0.5 text-ink tabular">
                <li>{n(p.students, 'student')}</li>
                <li>{n(p.quizAttempts, 'quiz attempt')} and their answers</li>
                <li>{n(p.answerFiles, 'uploaded answer file')}</li>
                <li>{n(p.payments, 'payment record')}</li>
                <li>{n(p.lessonProgress, 'lesson progress record')}</li>
              </ul>
            )}
        </div>
        {p && (p.lessons > 0 || p.quizzes > 0) && (
          <p className="text-ink-2">
            It also takes this batch off {n(p.lessons, 'lesson')} and {n(p.quizzes, 'quiz', 'quizzes')}.
            {(p.lessonsOnlyThisBatch > 0 || p.quizzesOnlyThisBatch > 0) && ` ${n(p.lessonsOnlyThisBatch, 'lesson')} and ${n(p.quizzesOnlyThisBatch, 'quiz', 'quizzes')} were shared only with this batch; they're kept, with no batches, hidden from students.`}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 rounded-control border border-line px-3.5 py-3">
          <p className="flex-1 min-w-48 text-ink-2">Keep a copy of its students, quiz marks and payments first.</p>
          <Button variant="secondary" size="sm" icon={Download} loading={exporting} onClick={download}>Download records</Button>
        </div>
        <Field label={`Type ${batch.name} to confirm`}>
          {(f) => <Input {...f} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} />}
        </Field>
      </div>
    </Modal>
  );
};

const ManageBatches = () => {
  const qc = useQueryClient();
  const batches = useQuery({ queryKey: ['admin', 'batches'], queryFn: () => batchAPI.getAll().then(unwrap) });
  const [editing, setEditing] = useState(null);       // null | {} (new) | batch
  const [form, setForm] = useState(empty);
  const [deleting, setDeleting] = useState(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'batches'] });
    qc.invalidateQueries({ queryKey: ['batches'] });
    // Deleting or renumbering a batch changes students and who can see lessons and quizzes.
    ['students', 'lessons', 'quizzes', 'payments', 'dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: ['admin', k] }));
  };

  const save = useMutation({
    mutationFn: (data) => (editing?.id ? batchAPI.update(editing.id, data) : batchAPI.create(data)),
    onSuccess: () => { toast.success(editing?.id ? 'Batch updated' : 'Batch created'); setEditing(null); refresh(); },
    onError: (e) => toast.error(errorMessage(e, 'The batch wasn\'t saved.')),
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
                      <Button variant="danger-ghost" size="icon-sm" aria-label={`Delete ${b.name}`} onClick={() => setDeleting(b)}><Trash2 size={16} /></Button>
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
          <Field label="Exam year" required hint={editing?.id ? `Changing it moves this batch's ${editing.studentCount ?? 0} students to the new year; their lessons and quizzes stay.` : "Students' IDs start with this number, e.g. 2027_014."}>
            {(p) => <Input {...p} type="number" min="2000" max="2100" value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} placeholder="2027" />}
          </Field>
          <Field label="Name" required>{(p) => <Input {...p} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="2027 A/L" />}</Field>
          <Field label="Description">{(p) => <Textarea {...p} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />}</Field>
        </form>
      </Modal>

      {deleting && <DeleteBatchDialog batch={deleting} onClose={() => setDeleting(null)} onDeleted={() => { setDeleting(null); refresh(); }} />}
    </div>
  );
};

export default ManageBatches;
