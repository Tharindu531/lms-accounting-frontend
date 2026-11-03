import { useEffect, useState } from 'react';

/** `value`, updated only after it has stopped changing for `ms`. */
const useDebounced = (value, ms = 300) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
};
export default useDebounced;
