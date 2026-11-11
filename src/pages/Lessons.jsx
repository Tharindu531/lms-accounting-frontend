import { useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CheckCircle2, Circle, Lock, ChevronDown, ChevronLeft, ChevronRight, Paperclip, FileText, Image as ImageIcon,
  File as FileIcon, BookOpen, PlayCircle, Eye, CalendarClock,
} from 'lucide-react';
import { lessonAPI, fileAPI } from '../services/api';
import { useLessons, useUnits, orderLessons, keys, formatDuration } from '../lib/queries';
import { unwrap } from '../lib/queryClient';
import { errorMessage } from '../lib/errors';
import { Panel, PageHeader, Badge, ProgressRing, Skeleton, SkeletonRows, EmptyState, ErrorState } from '../components/ui/primitives';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import Button from '../components/ui/Button';
import LessonVideo from '../components/student/LessonVideo';
import FileViewer from '../components/FileViewer';
import { cn } from '../lib/cn';
import { unitTree } from '../lib/units';
import { colomboWallClockToMs, formatDateTime } from '../lib/time';

/**
 * One group per top-level unit. Inside it, lessons filed directly under the unit
 * come first, then one section per sub-unit. A unit without sub-units has a single
 * untitled section, so it looks as it always did.
 */
const groupByUnit = (ordered, units, t) => {
  const tree = unitTree(units ?? []);
  const info = new Map(tree.map((u) => [u.id, u]));
  const groups = [];
  const byKey = new Map();
  for (const l of ordered) {
    const u = info.get(l.unitId);
    const top = u?.depth ? info.get(u.parentId) : u;
    const key = top?.id ?? l.unitId ?? 'general';
    if (!byKey.has(key)) {
      const g = { key, name: top?.name ?? l.unitName ?? t('lessons.general'), lessons: [], sections: [] };
      byKey.set(key, g);
      groups.push(g);
    }
    const g = byKey.get(key);
    g.lessons.push(l);
    const sectionKey = u?.depth ? u.id : 'direct';
    let sec = g.sections.find((x) => x.key === sectionKey);
    if (!sec) {
      sec = { key: sectionKey, name: u?.depth ? u.name : null, lessons: [] };
      // Lessons filed directly under the unit stay ahead of its sub-units.
      if (sectionKey === 'direct') g.sections.unshift(sec); else g.sections.push(sec);
    }
    sec.lessons.push(l);
  }
  for (const g of groups) g.subName = (l) => g.sections.find((x) => x.lessons.includes(l))?.name ?? null;
  return groups;
};

const opensText = (l) => formatDateTime(colomboWallClockToMs(l.availableFrom));
const closed = (l) => l.locked || l.notYetOpen;

const useMonthLabel = () => {
  const { t } = useTranslation();
  const months = t('months', { returnObjects: true });
  return (l) => (l.month ? `${months[l.month - 1]}${l.year ? ` ${l.year}` : ''}` : null);
};

const LessonStatusIcon = ({ lesson }) => {
  if (lesson.notYetOpen) return <CalendarClock size={18} className="text-ink-3" aria-hidden />;
  if (lesson.locked) return <Lock size={18} className="text-ink-3" aria-hidden />;
  if (lesson.completed) return <CheckCircle2 size={18} className="text-credit" aria-hidden />;
  if ((lesson.watchedSeconds ?? 0) > 0) return <PlayCircle size={18} className="text-brand" aria-hidden />;
  return <Circle size={18} className="text-line-strong" aria-hidden />;
};

const LessonRow = ({ lesson, index, active, compact }) => {
  const { t } = useTranslation();
  const monthLabel = useMonthLabel();
  return (
    <Link to={`/lessons/${lesson.id}`} aria-current={active ? 'page' : undefined}
      className={cn('relative flex items-center gap-3 px-4 transition-colors', compact ? 'py-2.5' : 'py-3',
        active ? 'bg-brand-soft/60 before:absolute before:left-0 before:inset-y-1.5 before:w-[3px] before:rounded-full before:bg-brand' : 'hover:bg-sunken/70')}>
      <LessonStatusIcon lesson={lesson} />
      <span className="w-6 text-sm text-ink-3 tabular shrink-0">{index}.</span>
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate', closed(lesson) ? 'text-ink-2' : 'text-ink', active && 'font-medium')}>{lesson.lessonName}</span>
        {!compact && (
          <span className="block text-sm text-ink-3 truncate">
            {lesson.notYetOpen ? t('lessons.opensOn', { time: opensText(lesson) })
              : lesson.locked ? t('lessons.lockedUntilPaid', { month: monthLabel(lesson) })
              : lesson.completed ? t('lessons.done')
                : (lesson.watchedSeconds ?? 0) > 0 ? t('lessons.stoppedAt', { time: formatDuration(lesson.watchedSeconds) })
                  : lesson.lessonDescription}
          </span>
        )}
      </span>
      {!compact && lesson.month && !closed(lesson) && <span className="hidden sm:block text-xs text-ink-3">{monthLabel(lesson)}</span>}
    </Link>
  );
};

/* ---------- Curriculum ---------- */

const UnitSection = ({ group, defaultOpen }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const open_ = group.lessons.filter((l) => !l.notYetOpen);
  const done = open_.filter((l) => l.completed).length;
  const total = Math.max(1, open_.length);
  return (
    <Panel className="overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-sunken/50 transition-colors">
        <ProgressRing value={(done / total) * 100} size={38} stroke={3.5} tone={done === total ? 'credit' : 'brand'} label={`${done}/${total}`} />
        <span className="flex-1 min-w-0">
          <span className="block font-semibold truncate">{group.name}</span>
          <span className="block text-sm text-ink-2 tabular">{t('lessons.unitProgress', { done, total })}</span>
        </span>
        <ChevronDown size={18} className={cn('text-ink-3 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div className="border-t border-line">
          {group.sections.map((sec) => (
            <div key={sec.key}>
              {sec.name && <p className="px-4 py-2 text-[13px] font-semibold text-ink-2 bg-sunken/50 border-b border-line">{sec.name}</p>}
              <div className="divide-y divide-line">
                {sec.lessons.map((l) => <LessonRow key={l.id} lesson={l} index={group.lessons.indexOf(l) + 1} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
};

const Curriculum = ({ groups, done, total }) => {
  const { t } = useTranslation();
  const firstOpen = groups.findIndex((g) => g.lessons.some((l) => !l.completed && !closed(l)));
  return (
    <>
      <PageHeader title={t('nav.lessons')} description={t('lessons.lead', { done, total })} />
      {groups.length === 0 ? (
        <Panel><EmptyState icon={BookOpen} title={t('home.noLessons')} description={t('home.noLessonsHint')} /></Panel>
      ) : (
        <div className="space-y-3">
          {groups.map((g, i) => <UnitSection key={g.key} group={g} defaultOpen={i === (firstOpen < 0 ? 0 : firstOpen)} />)}
        </div>
      )}
    </>
  );
};

/* ---------- One lesson ---------- */

const fileIcon = (type) => (type === 'IMAGE' ? ImageIcon : type === 'PDF' ? FileText : FileIcon);
const fileSize = (b) => (b == null ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

const Attachments = ({ lessonId, onOpen }) => {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['lesson-attachments', lessonId], queryFn: () => fileAPI.getLessonAttachments(lessonId).then(unwrap) });
  if (q.isPending) return <SkeletonRows rows={2} />;
  if (q.isError) return <ErrorState title={t('common.loadFailed')} onRetry={q.refetch} retryLabel={t('common.retry')} />;
  if (!q.data?.length) return <EmptyState icon={Paperclip} title={t('lessons.noAttachments')} />;
  return (
    <ul className="divide-y divide-line">
      {q.data.map((f) => {
        const Icon = fileIcon(f.fileType);
        return (
          <li key={f.id} className="flex items-center gap-3 py-3">
            <span className="h-10 w-10 rounded-control bg-sunken text-ink-2 grid place-items-center shrink-0"><Icon size={18} aria-hidden /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{f.originalFileName || f.fileName}</span>
              <span className="block text-sm text-ink-3">{f.fileType} · {fileSize(f.fileSize)}</span>
            </span>
            <Button variant="secondary" size="sm" icon={Eye} onClick={() => onOpen(f)}>{t('lessons.open')}</Button>
          </li>
        );
      })}
    </ul>
  );
};

const LessonView = ({ lesson, groups, ordered }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const monthLabel = useMonthLabel();
  const [viewing, setViewing] = useState(null);
  const group = groups.find((g) => g.lessons.some((l) => l.id === lesson.id));
  const pos = ordered.findIndex((l) => l.id === lesson.id);
  const prev = ordered[pos - 1];
  const next = ordered[pos + 1];
  const hasVideo = !!lesson.youtubeLink;

  const complete = useMutation({
    mutationFn: () => lessonAPI.updateProgress(lesson.id, { completed: true, watchedSeconds: lesson.watchedSeconds ?? 0 }),
    onSuccess: () => {
      qc.setQueryData(keys.lessons, (list) => list?.map((l) => (l.id === lesson.id ? { ...l, completed: true } : l)));
      toast.success(t('lessons.markedComplete'));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-5">
        <Link to="/lessons" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
          <ChevronLeft size={16} aria-hidden /> {t('lessons.allLessons')}
        </Link>
        <header>
          <p className="text-sm text-ink-2">{group?.name}{group?.subName(lesson) ? ` › ${group.subName(lesson)}` : ''}{lesson.month ? ` · ${monthLabel(lesson)}` : ''}</p>
          <h1 className="text-[26px] font-semibold mt-0.5">{lesson.lessonName}</h1>
        </header>

        {lesson.notYetOpen ? (
          <Panel className="p-6 flex flex-wrap items-center gap-4">
            <span className="h-12 w-12 rounded-full bg-brand-soft text-brand grid place-items-center"><CalendarClock size={22} aria-hidden /></span>
            <div className="flex-1 min-w-52">
              <p className="font-semibold">{t('lessons.notYetOpenTitle', { time: opensText(lesson) })}</p>
              <p className="text-sm text-ink-2">{t('lessons.notYetOpenHint')}</p>
            </div>
          </Panel>
        ) : lesson.locked ? (
          <Panel className="p-6 flex flex-wrap items-center gap-4">
            <span className="h-12 w-12 rounded-full bg-due-soft text-due grid place-items-center"><Lock size={22} aria-hidden /></span>
            <div className="flex-1 min-w-52">
              <p className="font-semibold">{t('lessons.lockedTitle', { month: monthLabel(lesson) })}</p>
              <p className="text-sm text-ink-2">{t('lessons.lockedHint')}</p>
            </div>
            <Link to="/payments" className="inline-flex items-center h-10 px-4 rounded-control bg-brand text-on-brand text-sm font-medium">{t('home.howToPay')}</Link>
          </Panel>
        ) : (
          <>
            {hasVideo && <LessonVideo key={lesson.id} lesson={lesson} />}

            <div className="flex flex-wrap items-center justify-between gap-3">
              {lesson.completed ? (
                <Badge tone="credit" icon={CheckCircle2} className="h-8 px-3 text-sm">{t('lessons.completed')}</Badge>
              ) : hasVideo ? (
                <p className="text-sm text-ink-2">{t('lessons.autoComplete')}</p>
              ) : (
                <Button variant="secondary" icon={CheckCircle2} loading={complete.isPending} onClick={() => complete.mutate()}>{t('lessons.markComplete')}</Button>
              )}
              <div className="flex gap-2 ml-auto">
                {prev && <Button variant="ghost" icon={ChevronLeft} onClick={() => navigate(`/lessons/${prev.id}`)}>{t('lessons.previous')}</Button>}
                {next && <Button variant="secondary" iconRight={ChevronRight} onClick={() => navigate(`/lessons/${next.id}`)}>{t('lessons.next')}</Button>}
              </div>
            </div>

            <Tabs defaultValue="notes">
              <TabsList>
                <TabsTrigger value="notes" icon={FileText}>{t('lessons.notes')}</TabsTrigger>
                <TabsTrigger value="files" icon={Paperclip}>{t('lessons.attachments')}</TabsTrigger>
              </TabsList>
              <TabsContent value="notes" className="pt-4">
                {lesson.content || lesson.lessonDescription ? (
                  <div className="max-w-[68ch] leading-[1.75] whitespace-pre-line text-ink">
                    {lesson.lessonDescription && <p className="text-ink-2 mb-3">{lesson.lessonDescription}</p>}
                    {lesson.content}
                  </div>
                ) : <p className="text-ink-2">{t('lessons.noNotes')}</p>}
              </TabsContent>
              <TabsContent value="files" className="pt-1">
                <Attachments lessonId={lesson.id} onOpen={async (f) => {
                  try {
                    const url = f.presignedUrl || unwrap(await fileAPI.getPresignedUrl(f.id));
                    setViewing({ ...f, presignedUrl: typeof url === 'string' ? url : url?.url });
                  } catch (e) { toast.error(errorMessage(e)); }
                }} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      <aside className="hidden lg:block">
        <Panel className="sticky top-6 overflow-hidden">
          <p className="px-4 pt-3.5 pb-2.5 text-sm font-semibold border-b border-line">{group?.name}</p>
          <div className="max-h-[70vh] overflow-y-auto scroll-thin">
            {group?.lessons.map((l, i) => <LessonRow key={l.id} lesson={l} index={i + 1} active={l.id === lesson.id} compact />)}
          </div>
        </Panel>
      </aside>

      {viewing && <FileViewer file={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
};

/* ---------- Page ---------- */

const Lessons = () => {
  const { t } = useTranslation();
  const { lessonId } = useParams();
  const lessons = useLessons();
  const units = useUnits();
  const ordered = useMemo(() => orderLessons(lessons.data, units.data), [lessons.data, units.data]);
  const groups = useMemo(() => groupByUnit(ordered, units.data, t), [ordered, units.data, t]);

  if (lessons.isPending) {
    return (
      <div className="space-y-4" role="status" aria-label={t('common.loading')}>
        <Skeleton className="h-8 w-40" /><Skeleton className="h-4 w-64" />
        <Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" />
      </div>
    );
  }
  if (lessons.isError) {
    return <Panel><ErrorState title={t('common.loadFailed')} description={errorMessage(lessons.error)} onRetry={lessons.refetch} retryLabel={t('common.retry')} /></Panel>;
  }

  const available = ordered.filter((l) => !closed(l));
  if (lessonId) {
    const lesson = ordered.find((l) => String(l.id) === lessonId);
    if (!lesson) {
      return <Panel><EmptyState icon={BookOpen} title={t('lessons.notFound')} description={t('lessons.notFoundHint')}
        action={<Link to="/lessons" className="text-brand font-medium">{t('lessons.allLessons')}</Link>} /></Panel>;
    }
    return <LessonView lesson={lesson} groups={groups} ordered={ordered} />;
  }
  return <Curriculum groups={groups} done={available.filter((l) => l.completed).length} total={available.length} />;
};

export default Lessons;
