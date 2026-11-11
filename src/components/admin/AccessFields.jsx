import { Select } from '../ui/primitives';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Which month's fee unlocks the content. Empty month = free for the selected batches. */
export const PeriodPicker = ({ month, year, onChange, id }) => {
  const thisYear = new Date().getFullYear();
  const years = [thisYear - 1, thisYear, thisYear + 1, thisYear + 2];
  return (
    <div className="flex gap-2">
      <Select id={id} aria-label="Fee month" value={month} onChange={(e) => onChange({ month: e.target.value, year: year || (e.target.value ? String(thisYear) : '') })} className="flex-1">
        <option value="">Free (no fee needed)</option>
        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </Select>
      <Select aria-label="Fee year" value={year} disabled={!month} onChange={(e) => onChange({ month, year: e.target.value })} className="w-28">
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </Select>
    </div>
  );
};

/**
 * Compact fee-month picker for one batch's row: "Free", or a month from last
 * January to two years ahead. Value is "YYYY-MM" ('' = free).
 */
export const FeeSelect = ({ month, year, onChange, className, ...props }) => {
  const thisYear = new Date().getFullYear();
  const options = [];
  for (let y = thisYear - 1; y <= thisYear + 2; y++) {
    for (let m = 1; m <= 12; m++) options.push({ value: `${y}-${m}`, label: `${MONTHS[m - 1].slice(0, 3)} ${y}` });
  }
  const value = month ? `${year || thisYear}-${Number(month)}` : '';
  return (
    <Select {...props} className={className} value={value} onChange={(e) => {
      const [y, m] = e.target.value ? e.target.value.split('-') : ['', ''];
      onChange({ month: m, year: y });
    }}>
      <option value="">Free</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </Select>
  );
};
