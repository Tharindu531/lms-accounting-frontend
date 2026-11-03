import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Play } from 'lucide-react';
import { lessonAPI } from '../../services/api';
import { keys, youTubeId, formatDuration } from '../../lib/queries';

let apiPromise = null;
/** Loads YouTube's player script once, on the first play, not when the page opens. */
const loadYouTubeApi = () => {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = () => { apiPromise = null; reject(new Error('YouTube failed to load')); };
      document.head.appendChild(s);
    });
  }
  return apiPromise;
};

const REPORT_EVERY_MS = 15_000;

/**
 * A thumbnail with a play button until the student taps it (YouTube's ~500 KB of
 * script loads only then). Starts from the saved position, reports progress every
 * 15 s while playing and on pause, and marks the lesson complete when it ends.
 */
const LessonVideo = ({ lesson, autoplay = false }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const vid = youTubeId(lesson.youtubeLink);
  const [active, setActive] = useState(autoplay);
  const [failed, setFailed] = useState(false);
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const lessonRef = useRef(lesson);
  const lastSent = useRef(lesson.watchedSeconds ?? 0);

  useEffect(() => { lessonRef.current = lesson; }, [lesson]);

  const patchCache = useCallback((id, patch) => {
    qc.setQueryData(keys.lessons, (list) => list?.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }, [qc]);

  const report = useCallback((completed = false) => {
    const p = playerRef.current;
    const l = lessonRef.current;
    if (!p?.getCurrentTime || !l) return;
    const seconds = Math.floor(p.getCurrentTime() || 0);
    if (!completed && (l.completed || Math.abs(seconds - lastSent.current) < 3)) return;
    lastSent.current = seconds;
    lessonAPI.updateProgress(l.id, { completed, watchedSeconds: seconds })
      .then(() => patchCache(l.id, completed ? { completed: true, watchedSeconds: seconds } : { watchedSeconds: Math.max(seconds, l.watchedSeconds ?? 0) }))
      .catch(() => { /* progress is best-effort; the next report retries */ });
  }, [patchCache]);

  useEffect(() => {
    if (!active || !vid) return undefined;
    let timer = null;
    let cancelled = false;
    const start = Math.max(0, (lesson.completed ? 0 : lesson.watchedSeconds ?? 0) - 3);

    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current) return;
      playerRef.current = new YT.Player(hostRef.current, {
        videoId: vid,
        host: 'https://www.youtube-nocookie.com',
        playerVars: { autoplay: 1, rel: 0, start, playsinline: 1, modestbranding: 1 },
        events: {
          // Recording "started" first lets the server tell a real watch from an
          // instant completion claim.
          onReady: () => { if (!lessonRef.current.completed) lessonAPI.updateProgress(lesson.id, { completed: false, watchedSeconds: start }).catch(() => {}); },
          onStateChange: (e) => {
            clearInterval(timer);
            if (e.data === YT.PlayerState.PLAYING) timer = setInterval(() => report(false), REPORT_EVERY_MS);
            if (e.data === YT.PlayerState.PAUSED) report(false);
            if (e.data === YT.PlayerState.ENDED) report(true);
          },
        },
      });
    }).catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
      clearInterval(timer);
      report(false);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
    // The player is rebuilt only when the video changes, not on every progress update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, vid, lesson.id]);

  if (!vid) return null;

  if (failed) {
    return (
      <div className="aspect-video rounded-panel bg-[#0d1f4f] grid place-items-center text-center p-6 text-white/90">
        <div>
          <p className="font-medium">{t('lessons.videoFailed')}</p>
          <a className="underline underline-offset-4 text-sm mt-2 inline-block" href={lesson.youtubeLink} target="_blank" rel="noreferrer">{t('lessons.openOnYouTube')}</a>
        </div>
      </div>
    );
  }

  return (
    <div className="youtube-container rounded-panel bg-[#0d1f4f] shadow-panel">
      {active ? <div ref={hostRef} /> : (
        <button type="button" onClick={() => setActive(true)} className="group absolute inset-0 w-full h-full" aria-label={t('lessons.playVideo', { title: lesson.lessonName })}>
          <img src={`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <span className="absolute inset-0 grid place-items-center">
            <span className="flex items-center gap-2 h-12 pl-4 pr-5 rounded-full bg-white text-[#152c6e] font-medium shadow-pop group-hover:scale-[1.03] transition-transform">
              <Play size={20} fill="currentColor" aria-hidden />
              {!lesson.completed && (lesson.watchedSeconds ?? 0) > 5 ? t('lessons.resumeFrom', { time: formatDuration(lesson.watchedSeconds) }) : t('lessons.play')}
            </span>
          </span>
        </button>
      )}
    </div>
  );
};

export default LessonVideo;
