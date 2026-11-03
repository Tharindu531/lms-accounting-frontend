import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../ui/Button';

/** "21–40 of 412" with previous/next. `page` is 1-based. */
const Pagination = ({ page, pageSize, total, onPage }) => {
  if (total <= pageSize) return null;
  const pages = Math.ceil(total / pageSize);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 px-4 py-3 border-t border-line text-sm">
      <p className="text-ink-2 tabular">{from}–{to} of {total}</p>
      <div className="flex gap-1.5">
        <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <Button variant="secondary" size="sm" iconRight={ChevronRight} disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </nav>
  );
};
export default Pagination;
