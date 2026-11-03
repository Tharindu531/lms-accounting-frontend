import { useCallback, useRef, useState } from 'react';
import { formatDate } from '../../lib/time';

/**
 * Average score of each recent quiz, oldest to newest. One series, so no legend:
 * the panel title names it. Hover or focus a bar for its details; the same
 * numbers are in a table for screen readers.
 */
const ScoreTrendChart = ({ points }) => {
  const [active, setActive] = useState(null);
  // Drawn at the container's real width so text stays at its true pixel size.
  const [width, setWidth] = useState(640);
  const observer = useRef(null);
  const wrapRef = useCallback((el) => {
    observer.current?.disconnect();
    if (!el) return;
    observer.current = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))));
    observer.current.observe(el);
  }, []);
  const data = points.filter((p) => p.averageScore != null);
  if (data.length === 0) {
    return <p ref={wrapRef} className="text-sm text-ink-2 py-10 text-center">No fully marked quizzes yet. Averages appear once marking is finished.</p>;
  }
  const W = width, H = 240, padL = 34, padR = 8, padT = 12, padB = 30;
  const band = (W - padL - padR) / data.length;
  const barW = Math.min(24, band * 0.5);
  const y = (v) => padT + (1 - v / 100) * (H - padT - padB);
  const ticks = [0, 25, 50, 75, 100];
  const maxChars = Math.max(6, Math.floor(band / 7));
  const label = (p) => (p.title.length > maxChars ? `${p.title.slice(0, maxChars - 1)}…` : p.title);

  return (
    <div className="relative" ref={wrapRef}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full" role="img" aria-label="Average score by quiz">
        {ticks.map((tk) => (
          <g key={tk}>
            <line x1={padL} x2={W - padR} y1={y(tk)} y2={y(tk)} stroke="var(--line)" strokeWidth="1" />
            <text x={padL - 6} y={y(tk)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--ink-3)">{tk}%</text>
          </g>
        ))}
        {data.map((p, i) => {
          const cx = padL + band * i + band / 2;
          const top = y(p.averageScore);
          const h = Math.max(2, y(0) - top);
          const r = Math.min(4, h / 2);
          return (
            <g key={p.quizId} tabIndex={0} aria-label={`${p.title}: ${Math.round(p.averageScore)}%`}
              onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}
              className="outline-none cursor-default">
              {/* Hit area wider than the bar */}
              <rect x={cx - band / 2} y={padT} width={band} height={H - padT - padB} fill={active === i ? 'var(--sunken)' : 'transparent'} />
              <path d={`M${cx - barW / 2},${y(0)} V${top + r} q0,-${r} ${r},-${r} H${cx + barW / 2 - r} q${r},0 ${r},${r} V${y(0)} Z`} fill="var(--chart)" />
              {(i === data.length - 1 || active === i) && (
                <text x={cx} y={top - 6} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--ink)">{Math.round(p.averageScore)}%</text>
              )}
              <text x={cx} y={H - 10} textAnchor="middle" fontSize="11" fill="var(--ink-2)">{label(p)}</text>
            </g>
          );
        })}
        <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="var(--line-strong)" strokeWidth="1" />
      </svg>

      {active != null && data[active] && (
        <div role="status" className="pointer-events-none absolute top-0 z-10 rounded-control border border-line bg-surface shadow-pop px-3 py-2 text-sm"
          style={{ left: `clamp(0px, calc(${((padL + band * active + band / 2) / W) * 100}% - 90px), calc(100% - 180px))`, width: 180 }}>
          <p className="font-medium truncate">{data[active].title}</p>
          {data[active].date && <p className="text-xs text-ink-3">{formatDate(`${data[active].date}+05:30`)}</p>}
          <p className="mt-1 tabular"><span className="font-semibold">{Math.round(data[active].averageScore)}%</span> average</p>
          <p className="text-xs text-ink-2 tabular">{data[active].marked} of {data[active].attempts} papers marked</p>
        </div>
      )}

      <table className="sr-only">
        <caption>Average score by quiz</caption>
        <thead><tr><th>Quiz</th><th>Average</th><th>Marked papers</th></tr></thead>
        <tbody>{data.map((p) => <tr key={p.quizId}><td>{p.title}</td><td>{Math.round(p.averageScore)}%</td><td>{p.marked} of {p.attempts}</td></tr>)}</tbody>
      </table>
    </div>
  );
};

export default ScoreTrendChart;
