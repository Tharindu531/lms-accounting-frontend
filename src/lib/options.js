// MCQ options are stored as A–E (database columns option_a..option_e and the
// correct/selected answer), but shown to people as 1–5, the way Sri Lankan exam
// papers number them. Only the label changes; never send these numbers to the API.
export const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E'];

export const optionLabel = (key) => {
  const i = OPTION_KEYS.indexOf(key);
  return i === -1 ? key : String(i + 1);
};

// '1'..'5' (or a legacy 'a'..'e') typed on the keyboard -> stored key
export const optionKeyFromInput = (input) => {
  const k = String(input).toUpperCase();
  if (OPTION_KEYS.includes(k)) return k;
  const n = Number(k);
  return Number.isInteger(n) && n >= 1 && n <= OPTION_KEYS.length ? OPTION_KEYS[n - 1] : null;
};
