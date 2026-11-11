import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, CheckCircle2, XCircle, Hourglass, Lock, Clock, Upload, Paperclip, Image as ImageIcon, FileText, MessageSquare, CircleDashed,
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

const AnswerRow = ({ detail, index, quizMarksId, canUpload, onView }) => {
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
              {detail.markingStatus === 'MARKED' && (
                <div className="border-l-2 border-brand pl-3">
                  <p className="text-sm font-medium">{t('result.teacherFeedback')}</p>
                  <p className="text-sm text-ink-2 mt-0.5">{detail.adminComment || t('result.noComment')}</p>
                </div>
              )}
              {quizMarksId && <AnswerFiles quizMarksId={quizMarksId} questionId={detail.questionId} canUpload={canUpload} onView={onView} />}
            </div>
          ) : (
            <dl className="mt-2 text-sm space-y-1">
              <div className="flex gap-2">
                <dt className="text-ink-3 shrink-0">{t('result.yourAnswer')}</dt>
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
 * The outcome of one attempt. `fresh` is right after submitting (written work can
 * be uploaded then); otherwise it's a review from Results.
 */
const QuizResult = ({ result, fresh = false, onBack, backLabel }) => {
  const { t } = useTranslation();
  const [viewing, setViewing] = useState(null);
  const pct = Math.round(result.percentage ?? 0);
  const units = useMemo(() => unitBreakdown(result.answerDetails), [result.answerDetails]);
  const hasWriting = result.answerDetails?.some((d) => d.questionType === 'WRITING');
  const tone = !result.markingComplete ? 'due' : pct >= 75 ? 'credit' : pct >= 50 ? 'brand' : 'debit';
  const verdict = !result.markingComplete ? t('result.awaitingTitle')
    : pct >= 75 ? t('result.excellent') : pct >= 50 ? t('result.good') : t('result.keepPractising');

  return (
    <div className="space-y-5 max-w-[880px]">
      {onBack && (
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
          <ArrowLeft size={16} aria-hidden /> {backLabel}
        </button>
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
            <h1 className="text-2xl font-semibold mt-0.5">{verdict}</h1>
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
      {fresh && hasWriting && (
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
            <AnswerRow key={d.questionId} detail={d} index={i} quizMarksId={result.quizMarksId} canUpload={fresh} onView={setViewing} />
          ))}
        </ol>
      </Panel>

      {viewing && <FileViewer file={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
};

export default QuizResult;
