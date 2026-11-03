import { useCallback, useState } from 'react';

/**
 * State that falls back to `initial` whenever `key` changes, e.g. the page number
 * or selection of a filtered list resetting when the filter changes, without an
 * effect that sets state after render.
 */
const useKeyedState = (key, initial) => {
  const [state, setState] = useState(() => ({ key, value: typeof initial === 'function' ? initial() : initial }));
  const value = state.key === key ? state.value : (typeof initial === 'function' ? initial() : initial);
  const set = useCallback((next) => setState((s) => {
    const prev = s.key === key ? s.value : (typeof initial === 'function' ? initial() : initial);
    return { key, value: typeof next === 'function' ? next(prev) : next };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [key]);
  return [value, set];
};
export default useKeyedState;
