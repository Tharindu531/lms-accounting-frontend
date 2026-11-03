import * as RT from '@radix-ui/react-tabs';
import { cn } from '../../lib/cn';

export const Tabs = RT.Root;
export const TabsContent = RT.Content;

/** Underlined tabs: the active tab carries the brand rule, like a ledger column head. */
export const TabsList = ({ className, children }) => (
  <RT.List className={cn('flex gap-1 border-b border-line overflow-x-auto scroll-thin', className)}>{children}</RT.List>
);

export const TabsTrigger = ({ className, icon: Icon, count, children, ...p }) => (
  <RT.Trigger className={cn('relative inline-flex items-center gap-2 h-10 px-3 text-sm font-medium text-ink-2 whitespace-nowrap',
    'hover:text-ink data-[state=active]:text-ink',
    'after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full data-[state=active]:after:bg-brand', className)} {...p}>
    {Icon && <Icon size={16} aria-hidden />}
    {children}
    {count != null && <span className="text-xs tabular text-ink-3">{count}</span>}
  </RT.Trigger>
);
