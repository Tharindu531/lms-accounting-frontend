import { forwardRef, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, CheckCircle2, XCircle, Hourglass, Lock, Clock, Upload, Paperclip, Image as ImageIcon, FileText, MessageSquare, CircleDashed,
  Download,
} from 'lucide-react';
import { fileAPI } from '../../services/api';
import { unwrap } from '../../lib/queryClient';
import { errorMessage } from '../../lib/errors';
import { formatDateTime } from '../../lib/time';
import { Panel, PanelHeader, Badge, ProgressRing, ProgressBar } from '../ui/primitives';
import Button from '../ui/Button';
import FileViewer from '../FileViewer';
import { cn } from '../../lib/cn';
import { optionLabel } from '../../lib/options';
import useAuth from '../../context/useAuth';

const mmss = (s) => `${Math.floor((s ?? 0) / 60)}:${String((s ?? 0) % 60).padStart(2, '0')}`;

/** Score per unit: marks earned over marks available, from questions already marked. */
const unitBreakdown = (details) => {
  const map = new Map();
  for (const d of details ?? []) {
    if (!d.unitName || d.marks == null) continue;
    if (d.questionType === 'WRITING' && d.markingStatus !== 'MARKED') continue;
    const u = map.get(d.unitName) ?? { name: d.unitName, got: 0, max: 0 };
    u.got += d.questionType === 'WRITING' ? (d.adminMarks ?? 0) : d.marks;
    u.max += d.maxMarks ?? 0;
    map.set(d.unitName, u);
  }
  return [...map.values()].filter((u) => u.max > 0);
};

const AnswerFiles = ({ quizMarksId, questionId, canUpload, onView }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const key = ['answer-files', quizMarksId, questionId];
  const files = useQuery({ queryKey: key, queryFn: () => fileAPI.getAnswerAttachments(quizMarksId, questionId).then(unwrap), enabled: !!quizMarksId });
  const [uploading, setUploading] = useState(false);

  const upload = async (file) => {
    setUploading(true);
    try {
      await fileAPI.uploadForAnswer(quizMarksId, questionId, file);
      await qc.invalidateQueries({ queryKey: key });
      toast.success(t('result.fileUploaded'));
    } catch (e) {
      toast.error(errorMessage(e, t('result.uploadFailed')));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {files.data?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.data.map((f) => (
            <Button key={f.id} variant="secondary" size="sm" icon={f.fileType === 'IMAGE' ? ImageIcon : FileText} onClick={() => onView(f)}>
              <span className="max-w-[180px] truncate">{f.originalFileName}</span>
            </Button>
          ))}
        </div>
      )}
      {canUpload && (
        <label className={cn('flex items-center gap-2 px-3.5 h-11 border border-dashed border-line-strong rounded-control cursor-pointer text-sm text-ink-2 hover:border-brand hover:text-brand transition-colors',
          uploading && 'opacity-60 pointer-events-none')}>
          <Upload size={16} aria-hidden />
          {uploading ? t('result.uploading') : t('result.uploadWork')}
          <input type="file" accept="image/*,.pdf" className="sr-only" disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
        </label>
      )}
    </div>
  );
};

/**
 * Every option of an MCQ, numbered 1–5: the correct one in green, the student's
 * choice in red when it was wrong. Before the quiz closes there is no correct
 * answer yet, so only the student's own choice is marked.
 */
const McqOptions = ({ detail, staff }) => {
  const { t } = useTranslation();
  const chosen = detail.selectedAnswer;
  const correct = detail.correctAnswer;
  const chosenLabel = t(staff ? 'result.studentAnswer' : 'result.yourAnswer');
  const box = { right: 'border-credit/40 bg-credit-soft', wrong: 'border-debit/40 bg-debit-soft', chosen: 'border-brand/40 bg-brand-soft', plain: 'border-line' };
  const dot = { right: 'bg-credit text-on-brand', wrong: 'bg-debit text-on-brand', chosen: 'bg-brand text-on-brand', plain: 'bg-sunken text-ink-2' };
  const ink = { right: 'text-credit', wrong: 'text-debit', chosen: 'text-brand' };

  return (
    <div className="mt-3">
      <ol className="space-y-1.5 text-sm">
        {Object.entries(detail.options).map(([letter, text]) => {
          const isChosen = letter === chosen;
          const isCorrect = correct != null && letter === correct;
          const tone = isCorrect ? 'right' : isChosen ? (correct != null ? 'wrong' : 'chosen') : 'plain';
          const tag = isChosen && isCorrect ? `${chosenLabel} · ${t('result.correctAnswer')}`
            : isCorrect ? t('result.correctAnswer') : isChosen ? chosenLabel : null;
          const TagIcon = tone === 'right' ? CheckCircle2 : tone === 'wrong' ? XCircle : null;
          return (
            <li key={letter} className={cn('flex items-start gap-2.5 rounded-control border px-3 py-2', box[tone])}>
              <span className={cn('grid place-items-center h-6 w-6 shrink-0 rounded-full text-xs font-semibold tabular', dot[tone])}>{optionLabel(letter)}</span>
              {/* The tag sits under the option on phones and to its right on wider screens. */}
              <span className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-x-3 gap-y-0.5 pt-0.5">
                <span className="leading-relaxed whitespace-pre-wrap">{text}</span>
                {tag && (
                  <span className={cn('inline-flex items-center gap-1 text-xs font-medium sm:shrink-0 sm:pt-0.5', ink[tone])}>
                    {TagIcon && <TagIcon size={14} aria-hidden />}{tag}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      {!chosen && <p className="mt-2 text-sm italic text-ink-3">{t('quiz.notAnswered')}</p>}
    </div>
  );
};

const AnswerRow = ({ detail, index, quizMarksId, canUpload, onView, staff }) => {
  const { t } = useTranslation();
  const writing = detail.questionType === 'WRITING';
  const withheld = !writing && detail.isCorrect == null;
  const pending = writing && detail.markingStatus !== 'MARKED';
  const state = writing ? (pending ? 'pending' : 'marked') : withheld ? 'withheld' : detail.isCorrect ? 'right' : 'wrong';
  const Icon = { right: CheckCircle2, wrong: XCircle, pending: Hourglass, marked: MessageSquare, withheld: CircleDashed }[state];
  const iconTone = { right: 'text-credit', wrong: 'text-debit', pending: 'text-due', marked: 'text-brand', withheld: 'text-ink-3' }[state];
  const opt = (letter) => (letter ? `${optionLabel(letter)}${detail.options?.[letter] ? `. ${detail.options[letter]}` : ''}` : t('quiz.notAnswered'));
  const earned = writing ? detail.adminMarks : detail.marks;

  return (
    <li className="px-5 py-4">
      <div className="flex items-start gap-3">
        <Icon size={20} className={cn('shrink-0 mt-0.5', iconTone)} aria-label={t(`result.state.${state}`)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[15px] leading-[1.65] whitespace-pre-wrap max-w-[75ch]"><span className="font-semibold text-ink-3 tabular mr-1.5">{index + 1}.</span>{detail.questionText}</p>
            <span className="text-sm tabular text-ink-2 whitespace-nowrap">
              {earned != null && !pending ? `${earned}/${detail.maxMarks}` : t('common.marks', { count: detail.maxMarks })}
            </span>
          </div>
          {detail.unitName && <p className="text-xs text-ink-3 mt-0.5">{detail.unitName}</p>}

          {writing ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-control bg-sunken/70 px-3.5 py-3 text-sm whitespace-pre-wrap leading-relaxed">
                {detail.selectedAnswer || <span className="italic text-ink-3">{t('result.noAnswer')}</span>}
              </div>
              {/* The reference answer: absent until the quiz closes, like MCQ answers. */}
              {detail.correctAnswer && (
                <div className="border-l-2 border-credit pl-3">
                  <p className="text-sm font-medium">{t('result.modelAnswer')}</p>
                  <p className="text-sm text-ink-2 mt-0.5 whitespace-pre-wrap">{detail.correctAnswer}</p>
                </div>
              )}
              {detail.markingStatus === 'MARKED' && (
                <div className="border-l-2 border-brand pl-3">
                  <p className="text-sm font-medium">{t('result.teacherFeedback')}</p>
                  <p className="text-sm text-ink-2 mt-0.5">{detail.adminComment || t('result.noComment')}</p>
                </div>
              )}
              {quizMarksId && <AnswerFiles quizMarksId={quizMarksId} questionId={detail.questionId} canUpload={canUpload} onView={onView} />}
            </div>
          ) : detail.options && Object.keys(detail.options).length > 0 ? (
            <McqOptions detail={detail} staff={staff} />
          ) : (
            // The question was deleted, so only the letters are left.
            <dl className="mt-2 text-sm space-y-1">
              <div className="flex gap-2">
                <dt className="text-ink-3 shrink-0">{t(staff ? 'result.studentAnswer' : 'result.yourAnswer')}</dt>
                <dd className={cn(state === 'wrong' ? 'text-debit' : state === 'right' ? 'text-credit' : 'text-ink')}>{opt(detail.selectedAnswer)}</dd>
              </div>
              {state === 'wrong' && detail.correctAnswer && (
                <div className="flex gap-2"><dt className="text-ink-3 shrink-0">{t('result.correctAnswer')}</dt><dd className="text-credit">{opt(detail.correctAnswer)}</dd></div>
              )}
            </dl>
          )}
        </div>
      </div>
    </li>
  );
};

/**
 * The report as it goes into the PDF: always in light colours, without the upload
 * and file buttons, and with the student's name on it. Each [data-pdf-block] is
 * kept whole on a page. Rendered off-screen, only while a PDF is being made.
 */
const ReportForPdf = forwardRef(function ReportForPdf({ result, student, staff, units }, ref) {
  const { t } = useTranslation();
  const pct = Math.round(result.percentage ?? 0);
  return (
    <div ref={ref} aria-hidden className="pdf-light bg-surface text-ink"
      style={{ position: 'fixed', left: -20000, top: 0, width: 760, pointerEvents: 'none' }}>
      <div data-pdf-block className="bg-surface px-5 pt-4 pb-3">
        <p className="text-xs text-ink-3">Accounting with Indika Amarakoon</p>
        <h1 className="text-xl font-semibold mt-1">{result.quizTitle}</h1>
        <p className="text-[15px] mt-1">{student.name}{student.id ? <span className="text-ink-3"> · {student.id}</span> : null}</p>
        <dl className="grid grid-cols-4 gap-3 mt-4 pt-3 border-t border-line text-sm">
          <div>
            <dt className="text-ink-3">{t('result.marks')}</dt>
            <dd className="font-semibold tabular mt-0.5">
              {result.markingComplete ? `${result.obtainedMarks}/${result.totalMarks} (${pct}%)` : t('result.awaitingTitle')}
            </dd>
          </div>
          <div><dt className="text-ink-3">{t('result.correct')}</dt><dd className="font-semibold tabular mt-0.5">{result.correctAnswers}/{result.totalQuestions}</dd></div>
          <div><dt className="text-ink-3">{t('result.timeTaken')}</dt><dd className="font-semibold tabular mt-0.5">{mmss(result.timeTaken)}</dd></div>
          <div><dt className="text-ink-3">{t('result.submitted')}</dt><dd className="font-semibold mt-0.5">{formatDateTime(result.attemptedAt)}</dd></div>
        </dl>
        {units.length > 1 && (
          <div className="mt-4 pt-3 border-t border-line">
            <p className="text-sm font-medium mb-2">{t('result.byUnit')}</p>
            <ul className="space-y-1 text-sm">
              {units.map((u) => (
                <li key={u.name} className="flex justify-between gap-4"><span>{u.name}</span><span className="tabular text-ink-2">{u.got}/{u.max}</span></li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-sm font-semibold mt-4 pt-3 border-t border-line">{t('result.answers')}</p>
      </div>
      {(result.answerDetails ?? []).map((d, i) => (
        <ul key={d.questionId} data-pdf-block className="bg-surface border-t border-line">
          <AnswerRow detail={d} index={i} staff={staff} />
        </ul>
      ))}
    </div>
  );
});

const safeFileName = (s) => s.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 120);

/**
 * The outcome of one attempt. `fresh` is right after submitting (written work can
 * be uploaded then); otherwise it's a review from Results. `staff` is a teacher
 * looking at a student's attempt (result.studentName is set).
 */
const QuizResult = ({ result, fresh = false, onBack, backLabel, staff = false }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [viewing, setViewing] = useState(null);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef(null);
  const pct = Math.round(result.percentage ?? 0);
  const units = useMemo(() => unitBreakdown(result.answerDetails), [result.answerDetails]);
  const hasWriting = result.answerDetails?.some((d) => d.questionType === 'WRITING');
  const tone = !result.markingComplete ? 'due' : pct >= 75 ? 'credit' : pct >= 50 ? 'brand' : 'debit';
  // Students get the PDF once the answers are out (after the quiz closes); staff
  // only ever see released sheets.
  const canDownload = staff || result.answersReleased !== false;
  const student = staff
    ? { name: result.studentName, id: result.studentId }
    : { name: [user?.firstName, user?.lastName].filter(Boolean).join(' '), id: user?.id };

  const downloadPdf = async () => {
    flushSync(() => setExporting(true));
    try {
      const { downloadReportPdf } = await import('../../lib/quizPdf');
      await downloadReportPdf(reportRef.current, `${safeFileName(`${result.quizTitle} - ${student.name || 'result'}`)}.pdf`,
        'Accounting with Indika Amarakoon');
    } catch {
      toast.error(t('result.pdfFailed'));
    } finally {
      setExporting(false);
    }
  };

  const verdict = !result.markingComplete ? t('result.awaitingTitle')
    : pct >= 75 ? t('result.excellent') : pct >= 50 ? t('result.good') : t('result.keepPractising');

  return (
    <div className="space-y-5 max-w-[880px]">
      {(onBack || canDownload) && (
        <div className="flex items-center justify-between gap-3">
          {onBack ? (
            <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
              <ArrowLeft size={16} aria-hidden /> {backLabel}
            </button>
          ) : <span />}
          {canDownload && (
            <Button variant="secondary" size="sm" icon={Download} loading={exporting} onClick={downloadPdf}>
              {exporting ? t('result.preparingPdf') : t('result.downloadPdf')}
            </Button>
          )}
        </div>
      )}

      <Panel className="p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <ProgressRing value={result.markingComplete ? pct : 0} size={112} stroke={9} tone={tone}
            label={result.markingComplete ? `${pct}%` : t('results.awaitingMarking')}>
            {result.markingComplete
              ? <span className="text-2xl font-semibold">{pct}%</span>
              : <Hourglass size={28} className="text-due" aria-hidden />}
          </ProgressRing>
          <div className="min-w-0">
            <p className="text-sm text-ink-2">{result.quizTitle}</p>
            <h1 className="text-2xl font-semibold mt-0.5">{staff ? result.studentName : verdict}</h1>
            {staff && result.studentId && <p className="text-sm text-ink-3">{result.studentId}</p>}
            <p className="mt-2 text-ink-2">
              {result.markingComplete
                ? <>{t('result.marks')} <span className="ledger-total text-ink font-semibold">{result.obtainedMarks} / {result.totalMarks}</span></>
                : t('result.awaitingHint', { count: result.pendingMarkingCount, got: result.obtainedMarks })}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-line text-sm">
          <div><dt className="text-ink-3">{t('result.correct')}</dt><dd className="font-semibold tabular mt-0.5">{result.correctAnswers}/{result.totalQuestions}</dd></div>
          <div><dt className="text-ink-3">{t('result.timeTaken')}</dt><dd className="font-semibold tabular mt-0.5">{mmss(result.timeTaken)}</dd></div>
          <div><dt className="text-ink-3">{t('result.submitted')}</dt><dd className="font-semibold mt-0.5">{formatDateTime(result.attemptedAt)}</dd></div>
        </dl>
      </Panel>

      {result.gradedFromSavedDraft && (
        <div className="flex items-start gap-3 rounded-panel border border-due/30 bg-due-soft px-4 py-3 text-sm">
          <Clock size={18} className="text-due shrink-0 mt-0.5" aria-hidden /><p>{t('result.lateDraft')}</p>
        </div>
      )}
      {result.answersReleased === false && (
        <div className="flex items-start gap-3 rounded-panel border border-line bg-surface px-4 py-3 text-sm">
          <Lock size={18} className="text-ink-3 shrink-0 mt-0.5" aria-hidden />
          <p>{result.answersReleaseAt ? t('result.withheldUntil', { when: formatDateTime(`${result.answersReleaseAt}+05:30`) }) : t('result.withheld')}</p>
        </div>
      )}
      {fresh && hasWriting && !staff && (
        <div className="flex items-start gap-3 rounded-panel border border-brand/25 bg-brand-soft px-4 py-3 text-sm">
          <Paperclip size={18} className="text-brand shrink-0 mt-0.5" aria-hidden /><p>{t('result.uploadHint')}</p>
        </div>
      )}

      {units.length > 1 && (
        <Panel>
          <PanelHeader title={t('result.byUnit')} description={t('result.byUnitHint')} />
          <ul className="px-5 py-3 space-y-3">
            {units.map((u) => {
              const p = (u.got / u.max) * 100;
              return (
                <li key={u.name} className="grid grid-cols-[minmax(0,1fr)_7rem_3.5rem] items-center gap-3 text-sm">
                  <span className="truncate">{u.name}</span>
                  <ProgressBar value={p} tone={p >= 75 ? 'credit' : p >= 50 ? 'brand' : 'debit'} label={u.name} />
                  <span className="text-right tabular text-ink-2">{u.got}/{u.max}</span>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      <Panel>
        <PanelHeader title={t('result.answers')} actions={!result.markingComplete && <Badge tone="due" icon={Hourglass}>{t('result.pendingCount', { count: result.pendingMarkingCount })}</Badge>} />
        <ol className="divide-y divide-line">
          {(result.answerDetails ?? []).map((d, i) => (
            <AnswerRow key={d.questionId} detail={d} index={i} quizMarksId={result.quizMarksId} canUpload={fresh && !staff} onView={setViewing} staff={staff} />
          ))}
        </ol>
      </Panel>

      {viewing && <FileViewer file={viewing} onClose={() => setViewing(null)} />}
      {exporting && <ReportForPdf ref={reportRef} result={result} student={student} staff={staff} units={units} />}
    </div>
  );
};

export default QuizResult;
