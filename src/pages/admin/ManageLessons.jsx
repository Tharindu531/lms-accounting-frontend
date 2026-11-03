import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookOpen, Plus, Pencil, Trash2, Video, FileText, Paperclip, ExternalLink } from 'lucide-react';
import { lessonAPI, unitAPI, fileAPI } from '../../services/api';
import { unwrap } from '../../lib/queryClient';
import { errorMessage } from '../../lib/errors';
import { youTubeId } from '../../lib/queries';
import { periodLabel } from '../../lib/period';
import { Panel, PageHeader, Badge, SkeletonRows, EmptyState, ErrorState, Field, Input, Textarea, Select, Table, Th, Td } from '../../components/ui/primitives';
import { Modal } from '../../components/ui/Dialog';
import { useConfirm } from '../../components/ui/Confirm';
import Button from '../../components/ui/Button';
import SearchInput from '../../components/admin/SearchInput';
import { BatchPicker, PeriodPicker } from '../../components/admin/AccessFields';
import FileUpload from '../../components/FileUpload';
import FileList from '../../components/FileList';
import FileViewer from '../../components/FileViewer';

const blank = { lessonName: '', lessonDescription: '', youtubeLink: '', content: '', unitId: '', accessibleBatches: [], displayOrder: '', month: '', year: '' };

const typeIcon = { VIDEO: Video, TEXT: FileText, MIXED: Paperclip };

const LessonFiles = ({ lessonId }) => {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [viewing, setViewing] = useState(null);
  const key = ['lesson-attachments', lessonId];
  const files = useQuery({ queryKey: key, queryFn: () => fileAPI.getLessonAttachments(lessonId).then(unwrap) });
  return (
    <div>
      <FileUpload multiple onUpload={async (f) => { await fileAPI.uploadForLesson(lessonId, f); await qc.invalidateQueries({ queryKey: key }); toast.success(`${f.name} uploaded`); }} />
      <FileList files={files.data} onView={setViewing} onDelete={async (id) => {
        if (!(await confirm({ title: 'Delete this file?', description: 'Students lose access to it straight away.', confirmLabel: 'Delete file', tone: 'danger' }))) return;
        try { await fileAPI.delete(id); qc.invalidateQueries({ queryKey: key }); toast.success('File deleted'); } catch (e) { toast.error(errorMessage(e)); }
      }} />
      {viewing && <FileViewer file={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
};

const ManageLessons = () => {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const lessons = useQuery({ queryKey: ['admin', 'lessons'], queryFn: () => lessonAPI.getAllAdmin().then(unwrap) });
  const units = useQuery({ queryKey: ['admin', 'units'], queryFn: () => unitAPI.getAll().then(unwrap) });
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [editing, setEditing] = useState(null);   // null | {} new | lesson
  const [form, setForm] = useState(blank);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const unitList = useMemo(() => [...(units.data ?? [])].filter((u) => u.isActive !== false).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)), [units.data]);
  const unitOrder = useMemo(() => new Map(unitList.map((u, i) => [u.id, i])), [unitList]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...(lessons.data ?? [])]
      .filter((l) => (!unitFilter || String(l.unitId) === unitFilter) && (!q || l.lessonName?.toLowerCase().includes(q) || l.lessonDescription?.toLowerCase().includes(q)))
      .sort((a, b) => (unitOrder.get(a.unitId) ?? 999) - (unitOrder.get(b.unitId) ?? 999) || (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [lessons.data, search, unitFilter, unitOrder]);

  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin', 'lessons'] }); qc.invalidateQueries({ queryKey: ['lessons'] }); };

  const open = (l) => {
    setEditing(l ?? {});
    setForm(l ? {
      lessonName: l.lessonName ?? '', lessonDescription: l.lessonDescription ?? '', youtubeLink: l.youtubeLink ?? '', content: l.content ?? '',
      unitId: l.unitId ? String(l.unitId) : '', accessibleBatches: Array.from(l.accessibleBatches ?? []), displayOrder: String(l.displayOrder ?? ''),
      month: l.month ? String(l.month) : '', year: l.year ? String(l.year) : '',
    } : { ...blank, unitId: unitFilter, displayOrder: String((lessons.data?.filter((x) => !unitFilter || String(x.unitId) === unitFilter).length ?? 0) + 1) });
  };

  const save = useMutation({
    mutationFn: (data) => (editing?.id ? lessonAPI.update(editing.id, data) : lessonAPI.create(data)).then(unwrap),
    onSuccess: (saved) => {
      refresh();
      if (editing?.id) { toast.success('Lesson saved'); setEditing(null); }
      else { toast.success('Lesson created', { description: 'You can add files now.' }); setEditing(saved); }
    },
    onError: (e) => toast.error(errorMessage(e, 'The lesson wasn\'t saved.')),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.accessibleBatches.length) { toast.error('Choose at least one batch.'); return; }
    if (form.youtubeLink && !youTubeId(form.youtubeLink)) { toast.error('That doesn\'t look like a YouTube link.'); return; }
    save.mutate({
      ...form,
      unitId: form.unitId ? Number(form.unitId) : null,
      displayOrder: form.displayOrder ? Number(form.displayOrder) : 0,
      month: form.month ? Number(form.month) : null,
      year: form.month ? Number(form.year || new Date().getFullYear()) : null,
    });
  };

  const remove = async (l) => {
    if (!(await confirm({ title: `Delete "${l.lessonName}"?`, description: 'Students stop seeing it. Their progress records are kept.', confirmLabel: 'Delete lesson', tone: 'danger' }))) return;
    try { await lessonAPI.delete(l.id); toast.success('Lesson deleted'); refresh(); } catch (e) { toast.error(errorMessage(e, 'The lesson wasn\'t deleted.')); }
  };

  const vid = youTubeId(form.youtubeLink);

  return (
    <div>
      <PageHeader title="Lessons" description="Videos, notes and files, grouped by unit. Tag a lesson with a fee month to lock it until that month is paid."
        actions={<Button icon={Plus} onClick={() => open(null)}>New lesson</Button>} />

      <Panel>
        <div className="flex flex-wrap gap-3 p-4 border-b border-line">
          <SearchInput value={search} onChange={setSearch} placeholder="Search lessons" className="flex-1 min-w-56" />
          <Select aria-label="Unit" value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} className="w-60">
            <option value="">All units</option>
            {unitList.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </div>
        {lessons.isPending ? <SkeletonRows rows={6} /> : lessons.isError ? <ErrorState description={errorMessage(lessons.error)} onRetry={lessons.refetch} />
          : rows.length === 0 ? (
            <EmptyState icon={BookOpen} title={search || unitFilter ? 'No lessons match' : 'No lessons yet'}
              action={!search && <Button icon={Plus} onClick={() => open(null)}>New lesson</Button>} />
          ) : (
            <Table minWidth={760}>
              <thead><tr><Th className="w-14">#</Th><Th>Lesson</Th><Th>Fee month</Th><Th>Batches</Th><Th>Status</Th><Th className="w-24" /></tr></thead>
              <tbody>
                {rows.map((l) => {
                  const Icon = typeIcon[l.lessonType] ?? BookOpen;
                  return (
                    <tr key={l.id} className="hover:bg-sunken/50">
                      <Td className="tabular text-ink-3">{l.displayOrder}</Td>
                      <Td>
                        <div className="flex items-start gap-2.5">
                          <Icon size={16} className="text-ink-3 mt-1 shrink-0" aria-label={l.lessonType?.toLowerCase()} />
                          <div className="min-w-0"><p className="font-medium">{l.lessonName}</p><p className="text-sm text-ink-2 truncate max-w-md">{l.unitName ?? 'No unit'}</p></div>
                        </div>
                      </Td>
                      <Td>{l.month ? <Badge tone="brand">{periodLabel(l.month, l.year)}</Badge> : <span className="text-sm text-ink-3">Free</span>}</Td>
                      <Td className="tabular text-sm">{Array.from(l.accessibleBatches ?? []).sort().join(', ')}</Td>
                      <Td>{l.isActive !== false ? <Badge tone="credit">Published</Badge> : <Badge>Hidden</Badge>}</Td>
                      <Td>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${l.lessonName}`} onClick={() => open(l)}><Pencil size={16} /></Button>
                          <Button variant="danger-ghost" size="icon-sm" aria-label={`Delete ${l.lessonName}`} onClick={() => remove(l)}><Trash2 size={16} /></Button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
      </Panel>

      <Modal open={!!editing} onOpenChange={(o) => !o && setEditing(null)} size="lg" title={editing?.id ? 'Edit lesson' : 'New lesson'}
        footer={<>
          <Button variant="secondary" onClick={() => setEditing(null)}>{editing?.id ? 'Close' : 'Cancel'}</Button>
          <Button type="submit" form="lesson-form" loading={save.isPending}>{editing?.id ? 'Save lesson' : 'Create lesson'}</Button>
        </>}>
        <form id="lesson-form" onSubmit={submit} className="space-y-6">
          <fieldset className="space-y-4">
            <Field label="Title" required>{(p) => <Input {...p} value={form.lessonName} onChange={set('lessonName')} />}</Field>
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              <Field label="Unit">
                {(p) => (
                  <Select {...p} value={form.unitId} onChange={set('unitId')}>
                    <option value="">No unit</option>
                    {unitList.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </Select>
                )}
              </Field>
              <Field label="Order in unit">{(p) => <Input {...p} type="number" min="0" value={form.displayOrder} onChange={set('displayOrder')} />}</Field>
            </div>
            <Field label="Short description" hint="Shown under the title in the lesson list.">{(p) => <Input {...p} value={form.lessonDescription} onChange={set('lessonDescription')} />}</Field>
          </fieldset>

          <fieldset className="space-y-3 pt-5 border-t border-line">
            <Field label="YouTube video" hint="Paste the link from YouTube's Share button. Unlisted videos work.">
              {(p) => <Input {...p} type="url" value={form.youtubeLink} onChange={set('youtubeLink')} placeholder="https://youtu.be/…" />}
            </Field>
            {form.youtubeLink && (vid ? (
              <div className="flex items-center gap-3 text-sm">
                <img src={`https://i.ytimg.com/vi/${vid}/mqdefault.jpg`} alt="" className="h-16 w-28 rounded-[8px] object-cover bg-sunken" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                <a href={form.youtubeLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">Open on YouTube <ExternalLink size={13} /></a>
              </div>
            ) : <p className="text-sm text-debit">That doesn't look like a YouTube link.</p>)}
            <Field label="Notes for students" hint="Plain text. Line breaks are kept.">{(p) => <Textarea {...p} rows={6} value={form.content} onChange={set('content')} />}</Field>
          </fieldset>

          <fieldset className="space-y-4 pt-5 border-t border-line">
            <Field label="Batches who can see it" required>{(p) => <BatchPicker id={p.id} value={form.accessibleBatches} onChange={(v) => setForm((f) => ({ ...f, accessibleBatches: v }))} />}</Field>
            <Field label="Unlocks with the fee for" hint="Students who haven't paid this month see the lesson locked.">
              {(p) => <PeriodPicker id={p.id} month={form.month} year={form.year} onChange={({ month, year }) => setForm((f) => ({ ...f, month, year }))} />}
            </Field>
          </fieldset>

          <fieldset className="pt-5 border-t border-line">
            <legend className="text-sm font-medium mb-2">Files</legend>
            {editing?.id ? <LessonFiles lessonId={editing.id} /> : <p className="text-sm text-ink-2">Create the lesson first, then add PDFs, slides or images here.</p>}
          </fieldset>
        </form>
      </Modal>
    </div>
  );
};

export default ManageLessons;
