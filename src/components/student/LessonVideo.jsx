import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Maximize, Minimize, Loader2 } from 'lucide-react';
import { lessonAPI } from '../../services/api';
import { keys, youTubeId, formatDuration } from '../../lib/queries';
import { cn } from '../../lib/cn';

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
const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];
const SEEK_STEP = 10;
const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;

/**
 * The lesson video, kept inside the app. YouTube plays it, but with its own
 * controls turned off and a layer over the frame that takes every click, so its
 * title, logo, "Watch on YouTube" button, suggestions and right-click menu can't
 * be reached; our own controls drive the player instead. While paused or finished
 * our own cover hides YouTube's suggestion panels.
 *
 * Shows a thumbnail until the student taps play (YouTube's ~500 KB of script loads
 * only then), starts from the saved position, reports progress every 15 s while
 * playing and on pause, and marks the lesson complete when it ends.
 */
const LessonVideo = ({ lesson, autoplay = false }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const vid = youTubeId(lesson.youtubeLink);
  const [active, setActive] = useState(autoplay);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState('loading'); // loading | playing | paused | buffering | ended
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [chrome, setChrome] = useState(true);       // controls visible
  const [full, setFull] = useState(false);          // real fullscreen
  const [pseudoFull, setPseudoFull] = useState(false); // iPhone: no element fullscreen, so fill the window
  const boxRef = useRef(null);
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const lessonRef = useRef(lesson);
  const lastSent = useRef(lesson.watchedSeconds ?? 0);
  const hideTimer = useRef(null);

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
    let reportTimer = null;
    let tickTimer = null;
    let cancelled = false;
    const start = Math.max(0, (lesson.completed ? 0 : lesson.watchedSeconds ?? 0) - 3);

    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current) return;
      playerRef.current = new YT.Player(hostRef.current, {
        videoId: vid,
        host: 'https://www.youtube-nocookie.com',
        // controls/disablekb/fs off: our own controls replace YouTube's, whose bar
        // carries the YouTube logo and "Watch on YouTube" link.
        playerVars: { autoplay: 1, rel: 0, start, playsinline: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1 },
        events: {
          onReady: (e) => {
            setReady(true);
            setDuration(e.target.getDuration() || 0);
            // Recording "started" first lets the server tell a real watch from an
            // instant completion claim.
            if (!lessonRef.current.completed) lessonAPI.updateProgress(lesson.id, { completed: false, watchedSeconds: start }).catch(() => {});
          },
          onStateChange: (e) => {
            clearInterval(reportTimer);
            clearInterval(tickTimer);
            const p = e.target;
            setTime(p.getCurrentTime() || 0);
            setDuration((d) => d || p.getDuration() || 0);
            if (e.data === YT.PlayerState.PLAYING) {
              setState('playing');
              reportTimer = setInterval(() => report(false), REPORT_EVERY_MS);
              tickTimer = setInterval(() => setTime(p.getCurrentTime() || 0), 250);
            } else if (e.data === YT.PlayerState.PAUSED) { setState('paused'); report(false); }
            else if (e.data === YT.PlayerState.BUFFERING) setState('buffering');
            else if (e.data === YT.PlayerState.ENDED) { setState('ended'); report(true); }
            else if (e.data === YT.PlayerState.CUED || e.data === YT.PlayerState.UNSTARTED) setState('paused');
          },
          // 101/150: the owner turned off embedding; 100: removed or private; 2/5: bad id or player error.
          onError: () => !cancelled && setFailed(true),
        },
      });
    }).catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
      clearInterval(reportTimer);
      clearInterval(tickTimer);
      report(false);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
    // The player is rebuilt only when the video changes, not on every progress update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, vid, lesson.id]);

  // Track real fullscreen (also when the student leaves it with Esc).
  useEffect(() => {
    const on = () => setFull(fullscreenElement() === boxRef.current);
    document.addEventListener('fullscreenchange', on);
    document.addEventListener('webkitfullscreenchange', on);
    return () => { document.removeEventListener('fullscreenchange', on); document.removeEventListener('webkitfullscreenchange', on); };
  }, []);

  // Window-filling mode: Esc leaves it, and the page underneath doesn't scroll.
  useEffect(() => {
    if (!pseudoFull) return undefined;
    const esc = (e) => e.key === 'Escape' && setPseudoFull(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', esc); };
  }, [pseudoFull]);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const playing = state === 'playing' || state === 'buffering';

  const poke = useCallback(() => {
    setChrome(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setChrome(false), 2500);
  }, []);

  const toggle = () => {
    const p = playerRef.current;
    if (!p?.playVideo) return;
    if (state === 'ended') { p.seekTo(0, true); p.playVideo(); }
    else if (playing) p.pauseVideo();
    else p.playVideo();
    poke();
  };

  const seekTo = (s) => {
    const p = playerRef.current;
    if (!p?.seekTo) return;
    const to = Math.max(0, Math.min(duration || s, s));
    p.seekTo(to, true);
    setTime(to);
    poke();
  };

  const toggleMute = () => {
    const p = playerRef.current;
    if (!p?.isMuted) return;
    if (p.isMuted()) { p.unMute(); setMuted(false); } else { p.mute(); setMuted(true); }
    poke();
  };

  const changeSpeed = (s) => { playerRef.current?.setPlaybackRate?.(s); setSpeed(s); poke(); };

  const toggleFull = async () => {
    const el = boxRef.current;
    if (fullscreenElement()) {
      await (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.());
      return;
    }
    if (pseudoFull) { setPseudoFull(false); return; }
    const request = el?.requestFullscreen ?? el?.webkitRequestFullscreen;
    if (request) {
      try { await request.call(el); return; } catch { /* fall through to filling the window */ }
    }
    setPseudoFull(true);
  };

  const onKey = (e) => {
    if (!ready || e.target.closest('select, input')) return;
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'k') { e.preventDefault(); toggle(); }
    else if (k === 'arrowleft') { e.preventDefault(); seekTo(time - SEEK_STEP); }
    else if (k === 'arrowright') { e.preventDefault(); seekTo(time + SEEK_STEP); }
    else if (k === 'f') { e.preventDefault(); toggleFull(); }
    else if (k === 'm') { e.preventDefault(); toggleMute(); }
  };

  if (!vid) return null;

  if (failed) {
    return (
      <div className="aspect-video rounded-panel bg-[#0d1f4f] grid place-items-center text-center p-6 text-white/90">
        <div>
          <p className="font-medium">{t('lessons.videoFailed')}</p>
          <p className="text-sm text-white/70 mt-1">{t('lessons.videoFailedHint')}</p>
        </div>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="youtube-container rounded-panel bg-[#0d1f4f] shadow-panel">
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
      </div>
    );
  }

  const showChrome = chrome || !playing;
  const iconBtn = 'h-9 w-9 grid place-items-center rounded-full text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white';
  const isFull = full || pseudoFull;

  return (
    <div ref={boxRef} tabIndex={0} onKeyDown={onKey} onPointerMove={poke} onPointerDown={poke}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={t('lessons.videoPlayer', { title: lesson.lessonName })}
      className={cn('youtube-container lesson-player bg-black shadow-panel select-none outline-none focus-visible:ring-2 focus-visible:ring-focus',
        pseudoFull ? 'fixed inset-0 z-[70] !rounded-none' : 'rounded-panel', isFull && !showChrome && 'cursor-none')}
      style={pseudoFull ? { aspectRatio: 'auto' } : undefined}>
      {/* YouTube swaps the inner div for its frame, so React only ever owns the wrapper. */}
      <div><div ref={hostRef} /></div>

      {/* Takes every click and tap, so nothing inside YouTube's frame can be reached. */}
      <div className="absolute inset-0 z-10" onClick={toggle} onDoubleClick={toggleFull} aria-hidden />

      {/* Our own cover while not playing: hides YouTube's pause and end-screen suggestions. */}
      {(state === 'paused' || state === 'ended' || state === 'loading') && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/80 pointer-events-none">
          {state === 'loading' ? <Loader2 size={36} className="animate-spin text-white/80" aria-hidden /> : (
            <span className="pointer-events-auto">
              <button type="button" onClick={toggle} className="flex items-center gap-2 h-12 pl-4 pr-5 rounded-full bg-white text-[#152c6e] font-medium shadow-pop hover:scale-[1.03] transition-transform">
                {state === 'ended' ? <RotateCcw size={20} aria-hidden /> : <Play size={20} fill="currentColor" aria-hidden />}
                {state === 'ended' ? t('lessons.replay') : t('lessons.continue')}
              </button>
            </span>
          )}
        </div>
      )}
      {state === 'buffering' && (
        <div className="absolute inset-0 z-20 grid place-items-center pointer-events-none"><Loader2 size={36} className="animate-spin text-white/80" aria-hidden /></div>
      )}

      {/* Controls */}
      <div className={cn('absolute inset-x-0 bottom-0 z-30 px-3 pb-2 pt-8 bg-gradient-to-t from-black/80 to-transparent transition-opacity',
        showChrome && ready ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
        <input type="range" min={0} max={Math.max(1, Math.floor(duration))} step={1} value={Math.min(Math.floor(time), Math.floor(duration) || 0)}
          onChange={(e) => seekTo(Number(e.target.value))} aria-label={t('lessons.seek')}
          aria-valuetext={`${formatDuration(time)} / ${formatDuration(duration)}`}
          className="w-full h-1.5 accent-white cursor-pointer" />
        <div className="flex items-center gap-1 mt-1 text-white">
          <button type="button" className={iconBtn} onClick={toggle} aria-label={playing ? t('lessons.pause') : state === 'ended' ? t('lessons.replay') : t('lessons.continue')}>
            {playing ? <Pause size={18} fill="currentColor" aria-hidden /> : state === 'ended' ? <RotateCcw size={18} aria-hidden /> : <Play size={18} fill="currentColor" aria-hidden />}
          </button>
          <button type="button" className={iconBtn} onClick={toggleMute} aria-label={muted ? t('lessons.unmute') : t('lessons.mute')}>
            {muted ? <VolumeX size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />}
          </button>
          <span className="text-xs tabular text-white/90 ml-1">{formatDuration(time)} / {formatDuration(duration)}</span>
          <span className="flex-1" />
          <label className="sr-only" htmlFor={`speed-${lesson.id}`}>{t('lessons.speed')}</label>
          <select id={`speed-${lesson.id}`} value={speed} onChange={(e) => changeSpeed(Number(e.target.value))}
            className="h-8 rounded-[8px] bg-white/10 hover:bg-white/20 text-white text-xs px-2 border-0 cursor-pointer [&>option]:text-black">
            {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
          </select>
          <button type="button" className={iconBtn} onClick={toggleFull} aria-label={isFull ? t('lessons.exitFullscreen') : t('lessons.fullscreen')}>
            {isFull ? <Minimize size={18} aria-hidden /> : <Maximize size={18} aria-hidden />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LessonVideo;
