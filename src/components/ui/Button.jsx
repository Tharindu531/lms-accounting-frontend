import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

const variants = {
  primary: 'bg-brand text-on-brand hover:bg-brand-strong shadow-panel',
  secondary: 'bg-surface text-ink border border-line hover:bg-sunken hover:border-line-strong',
  ghost: 'text-ink-2 hover:bg-sunken hover:text-ink',
  danger: 'bg-debit text-white hover:brightness-95 dark:text-paper',
  'danger-ghost': 'text-debit hover:bg-debit-soft',
  success: 'bg-credit text-white hover:brightness-95 dark:text-paper',
};

const sizes = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-[8px]',
  md: 'h-10 px-4 text-sm gap-2 rounded-control',
  lg: 'h-12 px-5 text-base gap-2 rounded-control',
  icon: 'h-10 w-10 rounded-control justify-center',
  'icon-sm': 'h-8 w-8 rounded-[8px] justify-center',
};

/**
 * Buttons say what happens ("Save lesson", not "Submit"). `loading` disables the
 * button and shows a spinner in place of the icon, so double-submits can't happen.
 */
const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, icon: Icon, iconRight: IconRight,
    className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center font-medium whitespace-nowrap select-none transition-colors',
        'disabled:opacity-55 disabled:pointer-events-none',
        variants[variant], sizes[size], className,
      )}
      {...props}
    >
      {loading
        ? <Loader2 className="animate-spin shrink-0" size={size === 'lg' ? 18 : 16} aria-hidden />
        : Icon && <Icon className="shrink-0" size={size === 'lg' ? 18 : 16} aria-hidden />}
      {children}
      {IconRight && !loading && <IconRight className="shrink-0" size={16} aria-hidden />}
    </button>
  );
});

export default Button;
