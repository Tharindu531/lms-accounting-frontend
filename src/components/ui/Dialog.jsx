import * as RD from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import Button from './Button';

/**
 * Accessible modal: focus is trapped, Escape and the close button dismiss it, and
 * the page behind can't scroll. On phones it rises from the bottom as a sheet.
 */
export const Modal = ({ open, onOpenChange, title, description, children, footer, size = 'md', className }) => (
  <RD.Root open={open} onOpenChange={onOpenChange}>
    <RD.Portal>
      <RD.Overlay className="fixed inset-0 z-50 bg-[#0b1020]/45 backdrop-blur-[1.5px] data-[state=open]:animate-[fade-in_150ms_ease-out]" />
      <RD.Content
        className={cn(
          'fixed z-50 bg-surface text-ink shadow-pop border border-line flex flex-col',
          'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[18px]',
          'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-panel sm:max-h-[86vh]',
          'data-[state=open]:animate-[dialog-in_180ms_cubic-bezier(.2,.8,.2,1)]',
          { sm: 'sm:w-[420px]', md: 'sm:w-[540px]', lg: 'sm:w-[720px]', xl: 'sm:w-[960px]' }[size],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <RD.Title className="text-lg font-semibold">{title}</RD.Title>
            {description
              ? <RD.Description className="text-sm text-ink-2 mt-1">{description}</RD.Description>
              : <RD.Description className="sr-only">{title}</RD.Description>}
          </div>
          <RD.Close asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close" className="-mr-1.5 -mt-1"><X size={18} /></Button>
          </RD.Close>
        </div>
        <div className="px-5 pb-5 overflow-y-auto scroll-thin flex-1 min-h-0">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 px-5 py-4 border-t border-line bg-sunken/40 rounded-b-panel">
            {footer}
          </div>
        )}
      </RD.Content>
    </RD.Portal>
  </RD.Root>
);

export default Modal;
