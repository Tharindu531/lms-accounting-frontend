import * as DM from '@radix-ui/react-dropdown-menu';
import { cn } from '../../lib/cn';

export const Menu = DM.Root;
export const MenuTrigger = DM.Trigger;

export const MenuContent = ({ className, align = 'end', children, ...p }) => (
  <DM.Portal>
    <DM.Content align={align} sideOffset={6}
      className={cn('z-50 min-w-48 bg-surface border border-line rounded-control shadow-pop p-1 text-sm',
        'data-[state=open]:animate-[pop-in_120ms_ease-out]', className)} {...p}>
      {children}
    </DM.Content>
  </DM.Portal>
);

export const MenuItem = ({ className, icon: Icon, tone, children, ...p }) => (
  <DM.Item className={cn('flex items-center gap-2.5 px-2.5 h-9 rounded-[7px] cursor-pointer outline-none select-none',
    'data-[highlighted]:bg-sunken', tone === 'danger' ? 'text-debit' : 'text-ink', className)} {...p}>
    {Icon && <Icon size={16} className={tone === 'danger' ? '' : 'text-ink-3'} aria-hidden />}
    {children}
  </DM.Item>
);

export const MenuLabel = ({ children }) => <DM.Label className="px-2.5 py-1.5 text-xs text-ink-3">{children}</DM.Label>;
export const MenuSeparator = () => <DM.Separator className="h-px bg-line my-1" />;
export const MenuRadioGroup = DM.RadioGroup;
export const MenuRadioItem = ({ children, ...p }) => (
  <DM.RadioItem className="flex items-center justify-between gap-2.5 px-2.5 h-9 rounded-[7px] cursor-pointer outline-none data-[highlighted]:bg-sunken text-ink" {...p}>
    {children}
    <DM.ItemIndicator><span className="h-1.5 w-1.5 rounded-full bg-brand block" /></DM.ItemIndicator>
  </DM.RadioItem>
);

/** A ticked/unticked item that keeps the menu open, for multi-select filters. */
export const MenuCheckboxItem = ({ className, children, ...p }) => (
  <DM.CheckboxItem onSelect={(e) => e.preventDefault()}
    className={cn('group flex items-center gap-2.5 px-2.5 min-h-9 rounded-[7px] cursor-pointer outline-none select-none text-ink data-[highlighted]:bg-sunken', className)} {...p}>
    <span className="h-4 w-4 shrink-0 rounded-[4px] border border-line-strong grid place-items-center group-data-[state=checked]:bg-brand group-data-[state=checked]:border-brand" aria-hidden>
      <DM.ItemIndicator><svg viewBox="0 0 12 12" className="h-3 w-3 text-on-brand"><path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></DM.ItemIndicator>
    </span>
    {children}
  </DM.CheckboxItem>
);
