import { unitTree } from '../../lib/units';
import { cn } from '../../lib/cn';

/**
 * Tick units and sub-units. A ticked unit stands for its sub-units too, so they
 * show as covered (and can't be ticked separately) while it is ticked.
 * `counts` maps unit id -> question count, shown beside each name.
 */
const UnitChecklist = ({ units, value, onChange, counts = {}, className }) => {
  const tree = unitTree(units);
  const on = new Set(value);
  const branch = (u) => (counts[u.id] ?? 0) + u.children.reduce((s, c) => s + (counts[c.id] ?? 0), 0);
  const toggle = (u) => {
    const next = new Set(on);
    if (next.has(u.id)) next.delete(u.id);
    else {
      next.add(u.id);
      u.children.forEach((c) => next.delete(c.id));
    }
    onChange([...next]);
  };
  if (!tree.length) return <p className="text-sm text-ink-3">No units yet.</p>;
  return (
    <ul className={cn('space-y-0.5', className)}>
      {tree.map((u) => {
        const covered = u.depth === 1 && on.has(u.parentId);
        return (
          <li key={u.id} className={u.depth ? 'pl-6' : ''}>
            <label className={cn('flex items-center gap-2 min-h-8 text-sm cursor-pointer select-none', covered && 'text-ink-3')}>
              <input type="checkbox" className="h-4 w-4 accent-[var(--brand)] shrink-0" checked={on.has(u.id) || covered} disabled={covered}
                onChange={() => toggle(u)} />
              <span className={cn('min-w-0 truncate', !u.depth && 'font-medium')}>{u.name}</span>
              <span className="text-xs text-ink-3 tabular">{u.depth || !u.children.length ? counts[u.id] ?? 0 : branch(u)}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
};

export default UnitChecklist;
