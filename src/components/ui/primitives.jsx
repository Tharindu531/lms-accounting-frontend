import { forwardRef, useId } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/cn';
import Button from './Button';

/* ---------- Panels and page structure ---------- */

export const Panel = ({ as: Tag = 'section', className, children, ...props }) => (
  <Tag className={cn('bg-surface border border-line rounded-panel shadow-panel', className)} {...props}>
    {children}
  </Tag>
);

export const PanelHeader = ({ title, description, actions, className }) => (
  <div className={cn('flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-line', className)}>
    <div className="min-w-0">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      {description && <p className="text-sm text-ink-2 mt-0.5">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

export const PageHeader = ({ title, description, actions, className }) => (
  <header className={cn('flex flex-wrap items-end justify-between gap-4 mb-6', className)}>
    <div className="min-w-0">
      <h1 className="text-[26px] font-semibold text-ink">{title}</h1>
      {description && <p className="text-ink-2 mt-1 max-w-2xl">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
);

/* ---------- Status ---------- */

const badgeTones = {
  neutral: 'bg-sunken text-ink-2',
  brand: 'bg-brand-soft text-brand',
  credit: 'bg-credit-soft text-credit',
  debit: 'bg-debit-soft text-debit',
  due: 'bg-due-soft text-due',
};

export const Badge = ({ tone = 'neutral', icon: Icon, className, children }) => (
  <span className={cn('inline-flex items-center gap-1 h-6 px-2 rounded-md text-xs font-medium whitespace-nowrap', badgeTones[tone], className)}>
    {Icon && <Icon size={13} aria-hidden />}
    {children}
  </span>
);

/** Circular progress. `value` 0–100. Text inside is the caller's. */
export const ProgressRing = ({ value = 0, size = 44, stroke = 4, tone = 'brand', label, children, className }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value || 0));
  const color = { brand: 'var(--brand)', credit: 'var(--credit)', due: 'var(--due)', debit: 'var(--debit)' }[tone];
  return (
    <div className={cn('relative inline-grid place-items-center shrink-0', className)} style={{ width: size, height: size }}
         role="img" aria-label={label ?? `${Math.round(v)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--sunken)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={c - (v / 100) * c} style={{ transition: 'stroke-dashoffset 600ms ease' }} />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center text-xs font-semibold tabular">{children}</div>}
    </div>
  );
};

export const ProgressBar = ({ value = 0, tone = 'brand', className, label }) => (
  <div className={cn('h-1.5 rounded-full bg-sunken overflow-hidden', className)} role="progressbar"
       aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} aria-label={label}>
    <div className={cn('h-full rounded-full transition-[width] duration-500',
      { brand: 'bg-brand', credit: 'bg-credit', due: 'bg-due', debit: 'bg-debit' }[tone])}
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
);

/* ---------- Loading, empty, error ---------- */

export const Skeleton = ({ className }) => (
  <div aria-hidden className={cn('rounded-md bg-sunken [animation:skeleton-pulse_1.6s_ease-in-out_infinite]', className)} />
);

/** Placeholder rows for a list or table while it loads. */
export const SkeletonRows = ({ rows = 5, className }) => (
  <div className={cn('divide-y divide-line', className)} role="status" aria-label="Loading">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="flex items-center gap-4 px-5 py-4">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-2/5" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <Skeleton className="h-7 w-20" />
      </div>
    ))}
  </div>
);

/** An empty screen is an invitation to act: say what's missing and offer the next step. */
export const EmptyState = ({ icon: Icon, title, description, action, className }) => (
  <div className={cn('flex flex-col items-center text-center px-6 py-12', className)}>
    {Icon && (
      <div className="h-12 w-12 rounded-full bg-sunken text-ink-3 grid place-items-center mb-4">
        <Icon size={22} aria-hidden />
      </div>
    )}
    <p className="font-semibold text-ink">{title}</p>
    {description && <p className="text-sm text-ink-2 mt-1 max-w-sm">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const ErrorState = ({ title = "This didn't load", description, onRetry, retryLabel = 'Try again', className }) => (
  <div role="alert" className={cn('flex flex-col items-center text-center px-6 py-12', className)}>
    <div className="h-12 w-12 rounded-full bg-debit-soft text-debit grid place-items-center mb-4">
      <AlertTriangle size={22} aria-hidden />
    </div>
    <p className="font-semibold text-ink">{title}</p>
    {description && <p className="text-sm text-ink-2 mt-1 max-w-sm">{description}</p>}
    {onRetry && <Button variant="secondary" icon={RotateCcw} className="mt-5" onClick={onRetry}>{retryLabel}</Button>}
  </div>
);

/* ---------- Form fields ---------- */

const control = 'w-full bg-surface text-ink border border-line rounded-control px-3 placeholder:text-ink-3 ' +
  'transition-colors hover:border-line-strong focus:outline-none focus:border-brand focus:ring-3 focus:ring-brand/15 ' +
  'disabled:bg-sunken disabled:text-ink-3 aria-[invalid=true]:border-debit';

/** Label + control + hint/error, wired together with ids for screen readers. */
export const Field = ({ label, hint, error, required, children, className, id: idProp }) => {
  const autoId = useId();
  const id = idProp ?? autoId;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-ink">
          {label}{required && <span className="text-debit ml-0.5" aria-hidden>*</span>}
        </label>
      )}
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined, required })}
      {error ? <p id={`${id}-error`} className="text-sm text-debit">{error}</p>
        : hint ? <p id={`${id}-hint`} className="text-xs text-ink-3">{hint}</p> : null}
    </div>
  );
};

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(control, 'h-10', className)} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(control, 'py-2 min-h-24 leading-relaxed', className)} {...props} />;
});

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(control, 'h-10 pr-8 appearance-none bg-no-repeat bg-[right_0.6rem_center] bg-[length:16px]', className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237c869c' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...props}>
      {children}
    </select>
  );
});

export const Checkbox = forwardRef(function Checkbox({ className, label, ...props }, ref) {
  return (
    <label className={cn('inline-flex items-center gap-2 text-sm text-ink cursor-pointer select-none min-h-8', className)}>
      <input ref={ref} type="checkbox" className="h-4 w-4 rounded border-line-strong accent-[var(--brand)]" {...props} />
      {label}
    </label>
  );
});

/* ---------- Tables ---------- */

export const Table = ({ className, children, minWidth = 640 }) => (
  <div className="overflow-x-auto scroll-thin">
    <table className={cn('w-full text-sm', className)} style={{ minWidth }}>{children}</table>
  </div>
);
/** A header with no visible text (an actions column) still gets a name for screen readers. */
export const Th = ({ className, children, srLabel = 'Actions', ...p }) => (
  <th className={cn('text-left font-medium text-ink-2 px-4 py-2.5 border-b border-line bg-sunken/50 whitespace-nowrap', className)} {...p}>
    {children ?? <span className="sr-only">{srLabel}</span>}
  </th>
);
export const Td = ({ className, children, ...p }) => (
  <td className={cn('px-4 py-3 border-b border-line text-ink align-middle', className)} {...p}>{children}</td>
);

/** Filter buttons styled like tabs (they filter one list rather than switch panels). */
export const FilterTabs = ({ value, onChange, options, label, className }) => (
  <div role="group" aria-label={label} className={cn('flex gap-1 overflow-x-auto scroll-thin', className)}>
    {options.map((o) => (
      <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}
        className={cn('relative inline-flex items-center gap-2 h-10 px-3 text-sm font-medium whitespace-nowrap',
          value === o.value ? 'text-ink after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-brand' : 'text-ink-2 hover:text-ink')}>
        {o.label}{o.count != null && <span className="text-xs tabular text-ink-3">{o.count}</span>}
      </button>
    ))}
  </div>
);
