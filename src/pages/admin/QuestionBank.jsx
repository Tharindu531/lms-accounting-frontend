import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Database, Plus, Pencil, Trash2, PenLine, CheckCircle2, Paperclip } from 'lucide-react';
import { quizAPI, unitAPI } from '../../services/api';
import { unwrap } from '../../lib/queryClient';
import { errorMessage } from '../../lib/errors';
import { Panel, PageHeader, Badge, SkeletonRows, EmptyState, ErrorState, Select } from '../../components/ui/primitives';
import { useConfirm } from '../../components/ui/Confirm';
import Button from '../../components/ui/Button';
import SearchInput from '../../components/admin/SearchInput';
import QuestionEditor from '../../components/admin/QuestionEditor';
import { cn } from '../../lib/cn';

const QuestionBank = () => {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [unitId, setUnitId] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [editorKey, setEditorKey] = useState(0);

  const bank = useQuery({ queryKey: ['admin', 'bank', unitId], queryFn: () => quizAPI.getQuestionBank(unitId || null).then(unwrap) });
  const stats = useQuery({ queryKey: ['admin', 'bank-stats'], queryFn: () => quizAPI.getQuestionBankStats().then(unwrap) });
  const units = useQuery({ queryKey: ['admin', 'units'], queryFn: () => unitAPI.getAll().then(unwrap) });
  const unitList = (units.data ?? []).filter((u) => u.isActive !== false).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

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

  return (
    <div>
      <PageHeader title="Question bank" description="Reusable questions, filed by unit. Build quizzes from them under Quizzes → From question bank."
        actions={<Button icon={Plus} onClick={() => open(null)}>New question</Button>} />

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] items-start">
        <Panel as="nav" aria-label="Units" className="overflow-hidden">
          <p className="px-4 pt-3.5 pb-2 text-sm font-semibold">{totals.mcq + totals.writing} questions <span className="font-normal text-ink-3">· {totals.mcq} MCQ, {totals.writing} written</span></p>
          <ul className="pb-2">
            {[{ unitId: '', unitName: 'All units', totalCount: totals.mcq + totals.writing }, ...(stats.data ?? [])].map((s) => (
              <li key={s.unitId || 'all'}>
                <button type="button" onClick={() => setUnitId(String(s.unitId))} aria-current={String(unitId) === String(s.unitId) ? 'true' : undefined}
                  className={cn('relative w-full flex items-center justify-between gap-2 px-4 h-10 text-sm text-left',
                    String(unitId) === String(s.unitId) ? 'bg-brand-soft/60 font-medium before:absolute before:left-0 before:inset-y-2 before:w-[3px] before:rounded-full before:bg-brand' : 'hover:bg-sunken/60 text-ink-2')}>
                  <span className="truncate">{s.unitName}</span><span className="tabular text-ink-3">{s.totalCount}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <div className="flex flex-wrap gap-3 p-4 border-b border-line">
            <SearchInput value={search} onChange={setSearch} placeholder="Search questions" className="flex-1 min-w-56" />
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
                {rows.map((q) => (
                  <li key={q.id} className="px-4 py-3.5 flex gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-wrap">{q.questionText}</p>
                      <p className="text-xs text-ink-3 mt-1 flex flex-wrap gap-x-3">
                        {q.questionType === 'WRITING' ? <span className="inline-flex items-center gap-1"><PenLine size={12} aria-hidden />Written</span>
                          : <span className="inline-flex items-center gap-1 text-credit"><CheckCircle2 size={12} aria-hidden />{q.correctAnswer}. {q[`option${q.correctAnswer}`]}</span>}
                        {q.unitName && <span>{q.unitName}</span>}
                        {q.attachments?.length > 0 && <span className="inline-flex items-center gap-1"><Paperclip size={12} aria-hidden />{q.attachments.length}</span>}
                      </p>
                    </div>
                    <Badge className="shrink-0">{q.marks} mark{q.marks === 1 ? '' : 's'}</Badge>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon-sm" aria-label="Edit question" onClick={() => open(q)}><Pencil size={15} /></Button>
                      <Button variant="danger-ghost" size="icon-sm" aria-label="Delete question" onClick={() => remove(q)}><Trash2 size={15} /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </Panel>
      </div>

      {editing && (
        <QuestionEditor key={editorKey} open units={unitList} defaultUnitId={unitId} question={editing === 'new' ? null : editing}
          onOpenChange={(o) => { if (!o) { setEditing(null); refresh(); } }}
          onSave={async (data, id) => unwrap(await (id ? quizAPI.updateBankQuestion(id, data) : quizAPI.addToQuestionBank(data)))} />
      )}
    </div>
  );
};

export default QuestionBank;
