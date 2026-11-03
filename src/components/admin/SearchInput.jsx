import { Search, X } from 'lucide-react';
import { Input } from '../ui/primitives';
import { cn } from '../../lib/cn';

const SearchInput = ({ value, onChange, placeholder = 'Search', className, label }) => (
  <div className={cn('relative', className)}>
    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" aria-hidden />
    <Input type="search" aria-label={label ?? placeholder} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden" />
    {value && (
      <button type="button" aria-label="Clear search" onClick={() => onChange('')}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-[6px] text-ink-3 hover:text-ink hover:bg-sunken">
        <X size={15} />
      </button>
    )}
  </div>
);
export default SearchInput;
