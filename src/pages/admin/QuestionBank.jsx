import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Database, Plus, Eye, Pencil, Trash2, PenLine, CheckCircle2, Paperclip } from 'lucide-react';
import { quizAPI, unitAPI } from '../../services/api';
import { unwrap } from '../../lib/queryClient';
import { errorMessage } from '../../lib/errors';
import { Panel, PageHeader, Badge, SkeletonRows, EmptyState, ErrorState, Select } from '../../components/ui/primitives';
import { useConfirm } from '../../components/ui/Confirm';
import Button from '../../components/ui/Button';
import SearchInput from '../../components/admin/SearchInput';
import QuestionEditor from '../../components/admin/QuestionEditor';
import QuestionView from '../../components/admin/QuestionView';
import { cn } from '../../lib/cn';
import { optionLabel } from '../../lib/options';
import { unitTree } from '../../lib/units';

const QuestionBank = () => {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [unitId, setUnitId] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [editorKey, setEditorKey] = useState(0);
  const [viewing, setViewing] = useState(null); // index into rows

  const bank = useQuery({ queryKey: ['admin', 'bank', unitId], queryFn: () => quizAPI.getQuestionBank(unitId || null).then(unwrap) });
  const stats = useQuery({ queryKey: ['admin', 'bank-stats'], queryFn: () => quizAPI.getQuestionBankStats().then(unwrap) });
  const units = useQuery({ queryKey: ['admin', 'units'], queryFn: () => unitAPI.getAll().then(unwrap) });
  const unitList = (units.data ?? []).filter((u) => u.isActive !== false).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  const unitPathOf = new Map(unitTree(unitList).map((u) => [u.id, u.parentName ? `${u.parentName} › ${u.name}` : u.name]));

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (bank.data ?? []).filter((x) => (!type || x.questionType === type) && (!q || x.questionText?.toLowerCase().includes(q)));
  }, [bank.data, search, type]);

  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin', 'bank'] }); qc.invalidateQueries({ queryKey: ['admin', 'bank-stats'] }); qc.invalidateQueries({ queryKey: ['admin', 'units'] }); };
  const open = (q) => { setEditorKey((k) => k + 1); setEditing(q ?? 'new'); };

  const remove = async (q) => {
    if (!(await confirm({ title: 'Delete this question from the bank?', description: 'Quizzes already built from it keep their copy.', confirmLabel: 'Delete question', tone: 'danger' }))) return;
    try { await quizAPI.deleteBankQuestion(q.id); toast.success('Question deleted'); refresh(); } catch (e) { toast.error(errorMessage(e)); }
  };

  const totals = (stats.data ?? []).reduce((a, s) => ({ mcq: a.mcq + s.mcqCount, writing: a.writing + s.writingCount }), { mcq: 0, writing: 0 });
  // Units with their sub-units under them; a unit's count includes its sub-units
  // (choosing a unit shows its sub-units' questions too).
  const statTree = unitTree((stats.data ?? []).map((x) => ({ id: x.unitId, name: x.unitName, parentId: x.parentId, displayOrder: x.displayOrder, own: x.totalCount })))
    .map((u) => ({ ...u, total: u.own + (u.children ?? []).reduce((t, c) => t + c.own, 0) }));

  return (
    <div>
      <PageHeader title="Question bank" description="Every quiz question lives here, filed by unit and sub-unit. Pick them into a quiz from the quiz builder."
        actions={<Button icon={Plus} onClick={() => open(null)}>New question</Button>} />

      {/* The unit rail only appears once there's room for it beside a comfortable
          question column (xl). On laptops it folds into the toolbar as a dropdown,
          so questions get the full width instead of wrapping every 30 characters. */}
      <div className="grid gap-5 xl:grid-cols-[224px_minmax(0,1fr)] items-start">
        <Panel as="nav" aria-label="Units" className="overflow-hidden hidden xl:block">
          <p className="px-4 pt-3.5 pb-2 text-sm font-semibold">{totals.mcq + totals.writing} questions <span className="font-normal text-ink-3">· {totals.mcq} MCQ, {totals.writing} written</span></p>
          <ul className="pb-2">
            {[{ id: '', name: 'All units', total: totals.mcq + totals.writing, depth: 0 }, ...statTree].map((u) => (
              <li key={u.id || 'all'}>
                <button type="button" onClick={() => setUnitId(String(u.id))} aria-current={String(unitId) === String(u.id) ? 'true' : undefined}
                  className={cn('relative w-full flex items-center justify-between gap-2 pr-4 h-10 text-sm text-left', u.depth ? 'pl-8 h-9' : 'pl-4',
                    String(unitId) === String(u.id) ? 'bg-brand-soft/60 font-medium before:absolute before:left-0 before:inset-y-2 before:w-[3px] before:rounded-full before:bg-brand' : 'hover:bg-sunken/60 text-ink-2')}>
                  <span className="truncate">{u.name}</span><span className="tabular text-ink-3">{u.total}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <div className="flex flex-wrap gap-2.5 p-3 border-b border-line">
            <SearchInput value={search} onChange={setSearch} placeholder="Search questions" className="flex-1 min-w-56" />
            <Select aria-label="Unit" value={unitId} onChange={(e) => setUnitId(e.target.value)} className="w-52 xl:hidden">
              <option value="">All units ({totals.mcq + totals.writing})</option>
              {statTree.map((u) => <option key={u.id} value={String(u.id)}>{u.depth ? `\u00a0\u00a0\u00a0\u00a0${u.name}` : u.name} ({u.total})</option>)}
            </Select>
            <Select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)} className="w-44">
              <option value="">All types</option><option value="MCQ">Multiple choice</option><option value="WRITING">Written answer</option>
            </Select>
          </div>
          {bank.isPending ? <SkeletonRows rows={5} /> : bank.isError ? <ErrorState description={errorMessage(bank.error)} onRetry={bank.refetch} />
            : rows.length === 0 ? (
              <EmptyState icon={Database} title={search || type ? 'No questions match' : 'No questions here yet'}
                description={!search && !type ? 'Questions you add here can be drawn into quizzes at random.' : undefined}
                action={!search && <Button icon={Plus} onClick={() => open(null)}>New question</Button>} />
            ) : (
              <ul className="divide-y divide-line">
                {rows.map((q, i) => (
                  <li key={q.id} className="px-4 py-3 flex gap-3 hover:bg-sunken/40">
                    <div className="min-w-0 flex-1 max-w-[75ch]">
                      <p className="text-[15px] leading-[1.65] whitespace-pre-wrap">{q.questionText}</p>
                      {q.questionType !== 'WRITING' && q.correctAnswer && (
                        <p className="mt-1 text-[13px] leading-snug text-credit flex gap-1.5">
                          <CheckCircle2 size={14} className="mt-px shrink-0" aria-label="Correct answer" />
                          <span>{optionLabel(q.correctAnswer)}. {q[`option${q.correctAnswer}`]}</span>
                        </p>
                      )}
                      <p className="text-xs text-ink-3 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Badge className="h-5 px-1.5">{q.marks} mark{q.marks === 1 ? '' : 's'}</Badge>
                        {q.questionType === 'WRITING' ? <span className="inline-flex items-center gap-1"><PenLine size={12} aria-hidden />Written answer</span> : <span>Multiple choice</span>}
                        {q.unitName && <span>{unitPathOf.get(q.unitId) ?? q.unitName}</span>}
                        {q.attachments?.length > 0 && <span className="inline-flex items-center gap-1"><Paperclip size={12} aria-hidden />{q.attachments.length} file{q.attachments.length === 1 ? '' : 's'}</span>}
                      </p>
                    </div>
                    <div className="flex gap-0.5 shrink-0 ml-auto -mr-1.5 -mt-0.5">
                      <Button variant="ghost" size="icon-sm" aria-label="View question" title="View question" onClick={() => setViewing(i)}><Eye size={15} /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Edit question" onClick={() => open(q)}><Pencil size={15} /></Button>
                      <Button variant="danger-ghost" size="icon-sm" aria-label="Delete question" onClick={() => remove(q)}><Trash2 size={15} /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </Panel>
      </div>

      {viewing != null && rows[viewing] && (
        <QuestionView questions={rows} index={viewing} onIndexChange={setViewing}
          onClose={() => setViewing(null)}
          onEdit={(q) => { setViewing(null); open(q); }} />
      )}

      {editing && (
        <QuestionEditor key={editorKey} open units={unitList} defaultUnitId={unitId} question={editing === 'new' ? null : editing}
          onOpenChange={(o) => { if (!o) { setEditing(null); refresh(); } }}
          onSave={async (data, id) => unwrap(await (id ? quizAPI.updateBankQuestion(id, data) : quizAPI.addToQuestionBank(data)))} />
      )}
    </div>
  );
};

export default QuestionBank;
