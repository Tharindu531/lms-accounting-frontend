import { useState } from 'react';

const COUNTRIES = [
  { code: '+94', flag: '🇱🇰', name: 'Sri Lanka' },
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+1',  flag: '🇺🇸', name: 'USA / Canada' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+971',flag: '🇦🇪', name: 'UAE' },
  { code: '+966',flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+974',flag: '🇶🇦', name: 'Qatar' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+60', flag: '🇲🇾', name: 'Malaysia' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: '+82', flag: '🇰🇷', name: 'South Korea' },
  { code: '+86', flag: '🇨🇳', name: 'China' },
];

/**
 * PhoneInput — country code dropdown + local number field.
 *
 * Props:
 *   onChange(fullNumber: string)  — called every time the value changes;
 *                                   fullNumber is e.g. "+94771234567"
 *   required (bool)
 *   placeholder (string)
 */
const PhoneInput = ({ onChange, required = false, placeholder = '771234567', id }) => {
  const [country, setCountry] = useState(COUNTRIES[0]); // default: Sri Lanka
  const [local, setLocal] = useState('');

  const buildFull = (dialCode, rawLocal) => {
    // Strip leading 0 — standard international format (e.g. 0771234567 → +94771234567)
    const digits = rawLocal.replace(/^0+/, '');
    return dialCode + digits;
  };

  const handleCountryChange = (e) => {
    const selected = COUNTRIES.find(c => c.code === e.target.value);
    if (!selected) return;
    setCountry(selected);
    onChange(buildFull(selected.code, local));
  };

  const handleLocalChange = (e) => {
    const raw = e.target.value.replace(/[^\d]/g, ''); // digits only
    setLocal(raw);
    onChange(buildFull(country.code, raw));
  };

  return (
    <div className="flex h-10 bg-surface rounded-control border border-line overflow-hidden transition-colors hover:border-line-strong focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15">
      {/* Country code selector */}
      <select
        value={country.code}
        onChange={handleCountryChange}
        className="flex-shrink-0 bg-sunken border-r border-line pl-3 pr-1 text-sm text-ink outline-none cursor-pointer"
        aria-label="Country code"
      >
        {COUNTRIES.map(c => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.code}
          </option>
        ))}
      </select>

      {/* Local number input */}
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={local}
        onChange={handleLocalChange}
        placeholder={placeholder}
        required={required}
        className="flex-1 min-w-0 px-3 outline-none text-ink placeholder:text-ink-3 bg-transparent tabular"
      />
    </div>
  );
};

export default PhoneInput;
