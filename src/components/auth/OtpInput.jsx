import { useRef } from 'react';

/** Six single-digit boxes. Typing advances, Backspace goes back, pasting a code fills all six. */
const OtpInput = ({ value, onChange, disabled, autoFocus = true }) => {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');

  const set = (i, d) => {
    const next = [...digits];
    next[i] = d;
    onChange(next.join('').slice(0, 6));
  };

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="6-digit code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={d}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '');
            if (v.length > 1) {                       // autofill or paste into one box
              onChange(v.slice(0, 6));
              refs.current[Math.min(v.length, 6) - 1]?.focus();
              return;
            }
            set(i, v);
            if (v && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            const v = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            if (v) { e.preventDefault(); onChange(v); refs.current[Math.min(v.length, 6) - 1]?.focus(); }
          }}
          className="h-14 w-full min-w-0 text-center text-xl font-semibold tabular bg-surface text-ink border border-line rounded-control focus:outline-none focus:border-brand focus:ring-3 focus:ring-brand/15"
        />
      ))}
    </div>
  );
};

export default OtpInput;
