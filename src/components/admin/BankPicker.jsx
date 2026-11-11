import { useMemo, useRef, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, ChevronDown, Eye, Paperclip, PenLine, Plus, SearchX, X } from 'lucide-react';
import { quizAPI } from '../../services/api';
import { unwrap } from '../../lib/queryClient';
import { errorMessage } from '../../lib/errors';
import { unitTree } from '../../lib/units';
import useDebounced from '../../lib/useDebounced';
import { formatDate } from '../../lib/time';
import { Modal } from '../ui/Dialog';
import { Badge, Select, Skeleton } from '../ui/primitives';
import { Menu, MenuTrigger, MenuContent, MenuCheckboxItem, MenuLabel, MenuSeparator } from '../ui/Menu';
import Button from '../ui/Button';
import SearchInput from './SearchInput';
import QuestionView from './QuestionView';
import QuestionEditor from './QuestionEditor';
import { cn } from '../../lib/cn';

const SORTS = [
  ['NEWEST', 'Newest first'], ['OLDEST', 'Oldest first'], ['UNIT', 'Unit order'], ['LEAST_USED', 'Least used'],
  ['MOST_USED', 'Most used'], ['MARKS', 'Most marks'], ['LONGEST_UNUSED', 'Longest since used'],
];
const PAGE = 25;

const usageText = (q) => (q.usageCount
  ? `Used in ${q.usageCount} quiz${q.usageCount === 1 ? '' : 'zes'}${q.lastUsedQuiz ? `, last: ${q.lastUsedQuiz}` : ''}`
  : 'Not used yet');

/** A filter button with a menu of checkbox items. */
const FilterMenu = ({ label, count, children }) => (
  <Menu modal={false}>
    <MenuTrigger asChild>
      <button type="button" className={cn('h-10 px-3 inline-flex items-center gap-1.5 rounded-control border text-sm font-medium whitespace-nowrap',
        count ? 'border-brand text-brand bg-brand-soft/50' : 'border-line bg-surface text-ink-2 hover:text-ink')}>
        {label}{count ? <span className="tabular">({count})</span> : null}<ChevronDown size={15} aria-hidden />
      </button>
    </MenuTrigger>
    <MenuContent align="start" className="max-h-80 overflow-y-auto scroll-thin w-64">{children}</MenuContent>
  </Menu>
);

/**
 * Pick questions from the bank for one quiz: search, filter, sort, tick, order,
 * add. A question that isn't in the bank yet can be written here; it goes into
 * the bank and is ticked straight away.
 */
const BankPicker = ({ quiz, units, onClose, onAdded }) => {
  const qc = useQueryClient();
  const tree = useMemo(() => unitTree(units), [units]);
  const [text, setText] = useState('');
  const [unitIds, setUnitIds] = useState([]);
  const [type, setType] = useState('');
  const [marks, setMarks] = useState([]);
  const [usage, setUsage] = useState('ANY');
  const [hasFiles, setHasFiles] = useState(false);
  const [hideInQuiz, setHideInQuiz] = useState(true);
  const [sort, setSort] = useState('NEWEST');
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState([]);      // ordered bank questions
  const [viewing, setViewing] = useState(null);  // index into this page
  const [editing, setEditing] = useState(null);  // 'new' | bank question
  const [adding, setAdding] = useState(false);
  const lastClicked = useRef(null);
  const q = useDebounced(text, 300);

  const filtersKey = JSON.stringify([q, unitIds, type, marks, usage, hasFiles, hideInQuiz, sort]);
  const [seenKey, setSeenKey] = useState(filtersKey);
  if (seenKey !== filtersKey) { setSeenKey(filtersKey); setPage(0); }   // new filters start at page 1

  const params = {
    q: q || undefined, unitIds: unitIds.length ? unitIds : undefined, type: type || undefined,
    marks: marks.length ? marks : undefined, usage, hasFiles: hasFiles || undefined,
    quizId: quiz.id, hideInQuiz, sort, page, size: PAGE,
  };
  const results = useQuery({
    queryKey: ['admin', 'bank-search', params],
    queryFn: () => quizAPI.searchBank(params).then(unwrap),
    placeholderData: keepPreviousData,
  });
  const rows = results.data?.content ?? [];
  const total = results.data?.totalElements ?? 0;
  const pages = results.data?.totalPages ?? 1;
  const pickedIds = new Set(picked.map((x) => x.id));
  const pickedMarks = picked.reduce((s, x) => s + (x.marks ?? 0), 0);

  const markOptions = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];
  const toggle = (row, index, shift) => {
    if (row.inQuiz) return;
    const on = !pickedIds.has(row.id);
    let batch = [row];
    if (shift && lastClicked.current != null) {
      const [a, b] = [lastClicked.current, index].sort((x, y) => x - y);
      batch = rows.slice(a, b + 1).filter((r) => !r.inQuiz);
    }
    lastClicked.current = index;
    setPicked((list) => (on
      ? [...list, ...batch.filter((r) => !list.some((x) => x.id === r.id))]
      : list.filter((x) => !batch.some((r) => r.id === x.id))));
  };
  const pageSelectable = rows.filter((r) => !r.inQuiz);
  const pageAllOn = pageSelectable.length > 0 && pageSelectable.every((r) => pickedIds.has(r.id));
  const togglePage = () => setPicked((list) => (pageAllOn
    ? list.filter((x) => !pageSelectable.some((r) => r.id === x.id))
    : [...list, ...pageSelectable.filter((r) => !list.some((x) => x.id === r.id))]));
  const move = (i, d) => setPicked((list) => {
    const next = [...list];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    return next;
  });

  const add = async () => {
    setAdding(true);
    try {
      const saved = unwrap(await quizAPI.addFromBank(quiz.id, picked.map((x) => x.id)));
      toast.success(`${picked.length} question${picked.length === 1 ? '' : 's'} added`);
      qc.invalidateQueries({ queryKey: ['admin', 'bank-search'] });
      onAdded(saved);
    } catch (e) {
      toast.error(errorMessage(e, 'The questions weren\'t added.'));
    } finally {
      setAdding(false);
    }
  };

  const filtersOn = unitIds.length + marks.length + (type ? 1 : 0) + (usage !== 'ANY' ? 1 : 0) + (hasFiles ? 1 : 0);

  return (
    <>
      <Modal open onOpenChange={(o) => !o && onClose()} size="xl" className="sm:h-[88vh]"
        title="Add questions from the bank"
        description={`${quiz.title} · questions are added after the ${quiz.questionCount ?? 0} already in the quiz`}
        footer={(
          <div className="flex w-full flex-wrap items-center gap-2">
            <Button variant="secondary" icon={Plus} onClick={() => setEditing('new')}>New question</Button>
            <span className="flex-1" />
            <span className="text-sm text-ink-2 tabular lg:hidden">{picked.length} selected · {pickedMarks} marks</span>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button disabled={!picked.length} loading={adding} onClick={add}>
              {picked.length ? `Add ${picked.length} question${picked.length === 1 ? '' : 's'}` : 'Add questions'}
            </Button>
          </div>
        )}>
        <div className="flex h-full min-h-0 flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={text} onChange={setText} placeholder="Search question text or answers" className="flex-1 min-w-60" />
            <FilterMenu label="Unit" count={unitIds.length}>
              {tree.map((u) => (
                <MenuCheckboxItem key={u.id} checked={unitIds.includes(u.id)} className={u.depth ? 'pl-7' : 'font-medium'}
                  onCheckedChange={(on) => setUnitIds((ids) => (on ? [...ids, u.id] : ids.filter((x) => x !== u.id)))}>
                  <span className="truncate">{u.name}</span>
                </MenuCheckboxItem>
              ))}
              {!tree.length && <MenuLabel>No units yet</MenuLabel>}
            </FilterMenu>
            <Select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)} className="w-40">
              <option value="">Any type</option>
              <option value="MCQ">Multiple choice</option>
              <option value="WRITING">Written</option>
            </Select>
            <FilterMenu label="Marks" count={marks.length}>
              {markOptions.map((m) => (
                <MenuCheckboxItem key={m} checked={marks.includes(m)}
                  onCheckedChange={(on) => setMarks((xs) => (on ? [...xs, m] : xs.filter((x) => x !== m)))}>
                  {m} mark{m === 1 ? '' : 's'}
                </MenuCheckboxItem>
              ))}
            </FilterMenu>
            <FilterMenu label="More" count={(usage !== 'ANY' ? 1 : 0) + (hasFiles ? 1 : 0)}>
              <MenuLabel>Usage</MenuLabel>
              {[['ANY', 'Any'], ['NEVER', 'Never used'], ['NOT_RECENT', 'Not used in the last 90 days']].map(([v, l]) => (
                <MenuCheckboxItem key={v} checked={usage === v} onCheckedChange={() => setUsage(v)}>{l}</MenuCheckboxItem>
              ))}
              <MenuSeparator />
              <MenuCheckboxItem checked={hasFiles} onCheckedChange={setHasFiles}>Only questions with files</MenuCheckboxItem>
            </FilterMenu>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="text-ink-2 tabular" aria-live="polite">{results.isPending ? 'Searching…' : `${total} question${total === 1 ? '' : 's'}`}</span>
            {filtersOn > 0 && (
              <button type="button" className="text-brand font-medium hover:underline"
                onClick={() => { setUnitIds([]); setType(''); setMarks([]); setUsage('ANY'); setHasFiles(false); }}>Clear filters</button>
            )}
            <span className="flex-1" />
            <label className="inline-flex items-center gap-2 text-ink-2 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={hideInQuiz} onChange={(e) => setHideInQuiz(e.target.checked)} />
              Hide ones already in this quiz
            </label>
            <label className="inline-flex items-center gap-2 text-ink-2">
              Sort
              <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 w-44">
                {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </label>
          </div>

          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
            <section aria-label="Bank questions" className="flex min-h-0 flex-col rounded-panel border border-line">
              <div className="flex items-center gap-3 border-b border-line px-3 py-2 text-xs text-ink-3">
                <input type="checkbox" aria-label="Select this page" className="h-4 w-4 accent-[var(--brand)]"
                  checked={pageAllOn} disabled={!pageSelectable.length} onChange={togglePage} />
                <span>Select this page · Shift-click to select a range</span>
              </div>
              <ul className={cn('min-h-0 flex-1 overflow-y-auto scroll-thin divide-y divide-line', results.isFetching && 'opacity-70')}>
                {results.isPending ? (
                  <li className="p-3 space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</li>
                ) : results.isError ? (
                  <li className="p-6 text-sm text-debit">{errorMessage(results.error)}</li>
                ) : !rows.length ? (
                  <li className="flex flex-col items-center gap-2 p-10 text-center text-sm text-ink-2">
                    <SearchX size={22} className="text-ink-3" aria-hidden />
                    No questions match. Try fewer filters, or write a new question.
                  </li>
                ) : rows.map((r, i) => {
                  const on = pickedIds.has(r.id);
                  return (
                    <li key={r.id} className={cn('flex gap-3 px-3 py-2.5', on && 'bg-brand-soft/40', r.inQuiz && 'opacity-60')}>
                      <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[var(--brand)]" checked={on || r.inQuiz} disabled={r.inQuiz}
                        aria-label={`Select: ${r.questionText.slice(0, 80)}`}
                        onClick={(e) => { e.preventDefault(); toggle(r, i, e.shiftKey); }} onChange={() => {}} />
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={(e) => toggle(r, i, e.shiftKey)} disabled={r.inQuiz}>
                        <p className="text-[14.5px] leading-[1.6] line-clamp-3 whitespace-pre-wrap">{r.questionText}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-3">
                          {r.inQuiz && <Badge tone="brand" className="h-5 px-1.5">In quiz</Badge>}
                          <span>{r.parentUnitName ? `${r.parentUnitName} › ${r.unitName}` : r.unitName ?? 'No unit'}</span>
                          <span className="inline-flex items-center gap-1">{r.questionType === 'WRITING' ? <><PenLine size={12} aria-hidden />Written</> : 'Multiple choice'}</span>
                          <span className="tabular">{r.marks} mark{r.marks === 1 ? '' : 's'}</span>
                          {r.fileCount > 0 && <span className="inline-flex items-center gap-1"><Paperclip size={12} aria-hidden />{r.fileCount}</span>}
                          <span title={r.lastUsedAt ? `Last added ${formatDate(r.lastUsedAt)}` : undefined}>{usageText(r)}</span>
                        </p>
                      </button>
                      <Button variant="ghost" size="icon-sm" aria-label="View full question" title="View full question" onClick={() => setViewing(i)}><Eye size={15} /></Button>
                    </li>
                  );
                })}
              </ul>
              {pages > 1 && (
                <nav aria-label="Pages" className="flex items-center justify-between gap-2 border-t border-line px-3 py-2 text-sm">
                  <span className="text-ink-2 tabular">Page {page + 1} of {pages}</span>
                  <div className="flex gap-1.5">
                    <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <Button variant="secondary" size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </nav>
              )}
            </section>

            <aside aria-label="Selected questions" className="hidden min-h-0 flex-col rounded-panel border border-line lg:flex">
              <div className="border-b border-line px-3 py-2.5">
                <p className="text-sm font-semibold">Selected: <span className="tabular">{picked.length}</span></p>
                <p className="text-xs text-ink-3 tabular">{pickedMarks} marks · added in this order</p>
              </div>
              {picked.length ? (
                <ol className="min-h-0 flex-1 overflow-y-auto scroll-thin divide-y divide-line">
                  {picked.map((x, i) => (
                    <li key={x.id} className="group flex items-start gap-1.5 px-2 py-2 text-[13px]">
                      <span className="w-5 shrink-0 pt-0.5 text-right text-ink-3 tabular">{(quiz.questionCount ?? 0) + i + 1}</span>
                      <span className="min-w-0 flex-1 line-clamp-2 pt-0.5">{x.questionText}</span>
                      <div className="flex shrink-0 flex-col">
                        <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="h-5 w-6 grid place-items-center rounded text-ink-3 hover:text-ink disabled:opacity-30"><ArrowUp size={13} /></button>
                        <button type="button" aria-label="Move down" disabled={i === picked.length - 1} onClick={() => move(i, 1)} className="h-5 w-6 grid place-items-center rounded text-ink-3 hover:text-ink disabled:opacity-30"><ArrowDown size={13} /></button>
                      </div>
                      <button type="button" aria-label={`Remove: ${x.questionText.slice(0, 60)}`} onClick={() => setPicked((l) => l.filter((y) => y.id !== x.id))}
                        className="h-7 w-7 shrink-0 grid place-items-center rounded-[6px] text-ink-3 hover:text-debit hover:bg-sunken"><X size={14} /></button>
                    </li>
                  ))}
                </ol>
              ) : <p className="p-4 text-sm text-ink-3">Tick questions on the left. They'll be added to the quiz in the order you pick them.</p>}
              {picked.length > 0 && (
                <div className="border-t border-line p-2"><Button variant="ghost" size="sm" onClick={() => setPicked([])}>Clear selection</Button></div>
              )}
            </aside>
          </div>
        </div>
      </Modal>

      {viewing != null && rows[viewing] && (
        <QuestionView questions={rows} index={viewing} onIndexChange={setViewing} onClose={() => setViewing(null)}
          onEdit={(x) => { setViewing(null); setEditing(x); }} />
      )}
      {editing && (
        <QuestionEditor open units={units} question={editing === 'new' ? null : editing}
          note={editing === 'new' ? 'Saved to the question bank and ticked for this quiz.' : 'Saved to the question bank, and to every quiz using it that nobody has attempted yet.'}
          onOpenChange={(o) => { if (!o) { setEditing(null); qc.invalidateQueries({ queryKey: ['admin', 'bank-search'] }); } }}
          onSave={async (data, id) => {
            const saved = unwrap(await (id ? quizAPI.updateBankQuestion(id, data) : quizAPI.addToQuestionBank(data)));
            if (!id && saved?.id) {
              setPicked((l) => [...l, { ...saved, usageCount: 0 }]);
              qc.invalidateQueries({ queryKey: ['admin', 'bank'] });
            }
            return saved;
          }} />
      )}
    </>
  );
};

export default BankPicker;

