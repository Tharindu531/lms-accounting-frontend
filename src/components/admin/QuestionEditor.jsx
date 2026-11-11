import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ListChecks, PenLine, ClipboardPaste } from 'lucide-react';
import { fileAPI } from '../../services/api';
import { unwrap } from '../../lib/queryClient';
import { errorMessage } from '../../lib/errors';
import { Field, Input, Textarea, Select } from '../ui/primitives';
import { Modal } from '../ui/Dialog';
import { useConfirm } from '../ui/Confirm';
import Button from '../ui/Button';
import FileUpload from '../FileUpload';
import FileList from '../FileList';
import FileViewer from '../FileViewer';
import { cn } from '../../lib/cn';
import { OPTION_KEYS, optionLabel } from '../../lib/options';

const LETTERS = OPTION_KEYS;
const blank = { questionText: '', questionType: 'MCQ', optionA: '', optionB: '', optionC: '', optionD: '', optionE: '', correctAnswer: 'A', marks: 1, unitId: '' };
const fromQuestion = (q, unitId) => (q ? {
  questionText: q.questionText ?? '', questionType: q.questionType ?? 'MCQ',
  optionA: q.optionA ?? '', optionB: q.optionB ?? '', optionC: q.optionC ?? '', optionD: q.optionD ?? '', optionE: q.optionE ?? '',
  correctAnswer: q.correctAnswer ?? 'A', marks: q.marks ?? 1, unitId: q.unitId ? String(q.unitId) : '',
} : { ...blank, unitId: unitId ?? '' });

const QuestionFiles = ({ questionId }) => {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [viewing, setViewing] = useState(null);
  const key = ['question-attachments', questionId];
  const files = useQuery({ queryKey: key, queryFn: () => fileAPI.getQuestionAttachments(questionId).then(unwrap) });
  const upload = async (f) => { await fileAPI.uploadForQuestion(questionId, f); await qc.invalidateQueries({ queryKey: key }); toast.success(`${f.name || 'Image'} added`); };
  return (
    <div
      onPaste={async (e) => {
        const img = Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/'));
        if (!img) return;
        e.preventDefault();
        try { await upload(new File([img], `pasted-${Date.now()}.png`, { type: img.type })); } catch (err) { toast.error(errorMessage(err)); }
      }}>
      <FileUpload multiple onUpload={upload} accept=".jpg,.jpeg,.png,.gif,.webp,.pdf" hint="Images or PDF, up to 20 MB. You can also paste a screenshot here." />
      <FileList files={files.data} onView={setViewing} onDelete={async (id) => {
        if (!(await confirm({ title: 'Remove this file?', confirmLabel: 'Remove file', tone: 'danger' }))) return;
        try { await fileAPI.delete(id); qc.invalidateQueries({ queryKey: key }); } catch (e) { toast.error(errorMessage(e)); }
      }} />
      <p className="text-xs text-ink-3 mt-2 flex items-center gap-1.5"><ClipboardPaste size={13} aria-hidden /> Tip: copy a screenshot, click above, then press Ctrl+V.</p>
      {viewing && <FileViewer file={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
};

/**
 * Create or edit one question (MCQ with up to five options, or a written answer).
 * After a new question is saved the editor stays open so images can be added.
 */
const QuestionEditor = ({ open, onOpenChange, question, units, defaultUnitId, onSave, title }) => {
  const [form, setForm] = useState(() => fromQuestion(question, defaultUnitId));
  const [savedId, setSavedId] = useState(question?.id ?? null);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const mcq = form.questionType === 'MCQ';

  const submit = async (e) => {
    e.preventDefault();
    if (mcq) {
      const empty = LETTERS.filter((l) => !form[`option${l}`].trim());
      if (empty.length) { toast.error(`Fill in option${empty.length > 1 ? 's' : ''} ${empty.join(', ')}. Multiple-choice questions have five options.`); return; }
    }
    const data = {
      ...form,
      marks: Number(form.marks) || 1,
      unitId: form.unitId ? Number(form.unitId) : null,
      ...(mcq ? {} : { optionA: null, optionB: null, optionC: null, optionD: null, optionE: null, correctAnswer: form.correctAnswer && form.correctAnswer.length > 1 ? form.correctAnswer : null }),
    };
    setSaving(true);
    try {
      const saved = await onSave(data, savedId);
      if (!savedId && saved?.id) { setSavedId(saved.id); toast.success('Question added', { description: 'Add an image below, or close.' }); }
      else { toast.success('Question saved'); onOpenChange(false); }
    } catch (err) {
      toast.error(errorMessage(err, 'The question wasn\'t saved.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} size="lg" title={title ?? (savedId ? 'Edit question' : 'New question')}
      footer={<>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>{savedId && !question ? 'Done' : 'Cancel'}</Button>
        <Button type="submit" form="question-form" loading={saving}>{savedId ? 'Save question' : 'Add question'}</Button>
      </>}>
      <form id="question-form" onSubmit={submit} className="space-y-5">
        <div role="radiogroup" aria-label="Question type" className="grid grid-cols-2 p-1 rounded-control bg-sunken max-w-sm">
          {[['MCQ', ListChecks, 'Multiple choice'], ['WRITING', PenLine, 'Written answer']].map(([v, Icon, label]) => (
            <button key={v} type="button" role="radio" aria-checked={form.questionType === v} onClick={() => setForm((f) => ({ ...f, questionType: v }))}
              className={cn('h-9 rounded-[8px] inline-flex items-center justify-center gap-2 text-sm font-medium',
                form.questionType === v ? 'bg-surface text-ink shadow-panel' : 'text-ink-2 hover:text-ink')}>
              <Icon size={16} aria-hidden /> {label}
            </button>
          ))}
        </div>

        <Field label="Question" required>{(p) => <Textarea {...p} rows={3} value={form.questionText} onChange={set('questionText')} />}</Field>

        {mcq ? (
          <fieldset>
            <legend className="text-sm font-medium mb-1.5">Five options <span className="font-normal text-ink-3">· select the correct one</span></legend>
            <div className="space-y-2">
              {LETTERS.map((l) => (
                <div key={l} className={cn('flex items-center gap-2 rounded-control border p-1.5 pl-2', form.correctAnswer === l ? 'border-credit bg-credit-soft' : 'border-line')}>
                  <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                    <input type="radio" name="correct" value={l} checked={form.correctAnswer === l} onChange={() => setForm((f) => ({ ...f, correctAnswer: l }))}
                      className="h-4 w-4 accent-[var(--credit)]" aria-label={`Option ${optionLabel(l)} is correct`} />
                    <span className="w-5 text-sm font-semibold text-ink-2 tabular">{optionLabel(l)}</span>
                  </label>
                  <Input value={form[`option${l}`]} onChange={set(`option${l}`)} required aria-label={`Option ${optionLabel(l)}`} className="border-0 bg-transparent focus:ring-0 h-9" />
                </div>
              ))}
            </div>
          </fieldset>
        ) : (
          <Field label="Marking guide" hint="Optional. Shown only to whoever marks it, never to students.">
            {(p) => <Textarea {...p} rows={3} value={form.correctAnswer === 'A' ? '' : form.correctAnswer ?? ''} onChange={set('correctAnswer')} />}
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <Field label="Marks" required>{(p) => <Input {...p} type="number" min="1" max="100" value={form.marks} onChange={set('marks')} />}</Field>
          <Field label="Unit" hint="Used for the per-unit score breakdown.">
            {(p) => (
              <Select {...p} value={form.unitId} onChange={set('unitId')}>
                <option value="">No unit</option>
                {(units ?? []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
            )}
          </Field>
        </div>

        <fieldset className="pt-4 border-t border-line">
          <legend className="text-sm font-medium mb-2">Images and files</legend>
          {savedId ? <QuestionFiles questionId={savedId} /> : <p className="text-sm text-ink-2">Add the question first, then attach diagrams or tables here.</p>}
        </fieldset>
      </form>
    </Modal>
  );
};

export default QuestionEditor;
