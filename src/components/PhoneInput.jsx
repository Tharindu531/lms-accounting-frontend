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
const PhoneInput = ({ onChange, required = false, placeholder = '771234567' }) => {
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
    <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition">
      {/* Country code selector */}
      <select
        value={country.code}
        onChange={handleCountryChange}
        className="flex-shrink-0 bg-gray-50 border-r border-gray-300 pl-3 pr-1 py-3 text-sm text-gray-700 outline-none cursor-pointer hover:bg-gray-100 transition"
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
        type="tel"
        inputMode="numeric"
        value={local}
        onChange={handleLocalChange}
        placeholder={placeholder}
        required={required}
        className="flex-1 px-4 py-3 outline-none text-gray-800 placeholder-gray-400 bg-white"
      />
    </div>
  );
};

export default PhoneInput;
