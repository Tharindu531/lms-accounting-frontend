import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ChevronLeft, ChevronRight, Pencil, PenLine, ListChecks } from 'lucide-react';
import { fileAPI } from '../../services/api';
import { unwrap } from '../../lib/queryClient';
import { cn } from '../../lib/cn';
import { OPTION_KEYS, optionLabel } from '../../lib/options';
import { Modal } from '../ui/Dialog';
import { Badge } from '../ui/primitives';
import Button from '../ui/Button';
import FileList from '../FileList';
import FileViewer from '../FileViewer';

const Attachments = ({ questionId }) => {
  const [viewing, setViewing] = useState(null);
  const files = useQuery({ queryKey: ['question-attachments', questionId], queryFn: () => fileAPI.getQuestionAttachments(questionId).then(unwrap) });
  if (!files.data?.length) return null;
  return (
    <>
      <FileList files={files.data} onView={setViewing} showDelete={false} />
      {viewing && <FileViewer file={viewing} onClose={() => setViewing(null)} />}
    </>
  );
};

/**
 * Read-only view of one bank question: the full text, every option with the correct
 * one marked, or the marking guide for a written question. Previous/next (and the
 * arrow keys) step through the questions currently listed, so a unit can be reviewed
 * without closing the dialog.
 */
const QuestionView = ({ questions, index, onIndexChange, onClose, onEdit }) => {
  const q = questions[index];
  const hasPrev = index > 0;
  const hasNext = index < questions.length - 1;

  useEffect(() => {
    const onKey = (e) => {
      // Leave the keys alone while typing or while a file preview is open on top.
      if (e.defaultPrevented || e.target.closest?.('input, textarea, select') || document.querySelectorAll('[role="dialog"]').length > 1) return;
      if (e.key === 'ArrowLeft' && hasPrev) { onIndexChange(index - 1); e.preventDefault(); }
      if (e.key === 'ArrowRight' && hasNext) { onIndexChange(index + 1); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, hasPrev, hasNext, onIndexChange]);

  if (!q) return null;
  const writing = q.questionType === 'WRITING';
  const guide = writing && q.correctAnswer && q.correctAnswer !== 'A' ? q.correctAnswer : null;
  return (
    <Modal open onOpenChange={(o) => { if (!o) onClose(); }} size="lg"
      title={`Question ${index + 1} of ${questions.length}`}
      footer={(
        <div className="flex w-full items-center gap-2">
          <Button variant="secondary" size="icon" aria-label="Previous question" disabled={!hasPrev} onClick={() => onIndexChange(index - 1)}><ChevronLeft size={18} /></Button>
          <Button variant="secondary" size="icon" aria-label="Next question" disabled={!hasNext} onClick={() => onIndexChange(index + 1)}><ChevronRight size={18} /></Button>
          <span className="flex-1" />
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button icon={Pencil} onClick={() => onEdit(q)}>Edit question</Button>
        </div>
      )}>
      <div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
          <Badge className="h-5 px-1.5">{q.marks} mark{q.marks === 1 ? '' : 's'}</Badge>
          <span className="inline-flex items-center gap-1">
            {writing ? <PenLine size={13} aria-hidden /> : <ListChecks size={13} aria-hidden />}
            {writing ? 'Written answer' : 'Multiple choice'}
          </span>
          {q.unitName && <span>{q.unitName}</span>}
        </p>

        <p className="mt-3 text-base leading-[1.7] whitespace-pre-wrap">{q.questionText}</p>

        {(q.attachments?.length > 0 || q.fileCount > 0) && <Attachments questionId={q.id} />}

        {writing ? (
          <section className="mt-5" aria-labelledby="qv-guide">
            <h3 id="qv-guide" className="text-sm font-semibold text-ink-2">Marking guide</h3>
            {guide
              ? <p className="mt-1.5 rounded-control bg-sunken/70 px-3.5 py-3 text-[15px] leading-relaxed whitespace-pre-wrap">{guide}</p>
              : <p className="mt-1.5 text-sm text-ink-3">No marking guide added.</p>}
          </section>
        ) : (
          <ol className="mt-5 space-y-2" aria-label="Answers">
            {OPTION_KEYS.filter((k) => q[`option${k}`]).map((k) => {
              const correct = q.correctAnswer === k;
              return (
                <li key={k} className={cn('flex items-start gap-3 rounded-panel border px-3.5 py-2.5',
                  correct ? 'border-credit bg-credit-soft' : 'border-line')}>
                  <span className={cn('h-7 w-7 shrink-0 rounded-[7px] grid place-items-center text-[13px] font-semibold tabular',
                    correct ? 'bg-credit text-on-brand' : 'bg-sunken text-ink-2')}>{optionLabel(k)}</span>
                  <span className="pt-0.5 flex-1 text-[15px] leading-relaxed whitespace-pre-wrap">{q[`option${k}`]}</span>
                  {correct && (
                    <span className="pt-0.5 shrink-0 inline-flex items-center gap-1 text-[13px] font-medium text-credit">
                      <CheckCircle2 size={15} aria-hidden />Correct
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Modal>
  );
};

export default QuestionView;
