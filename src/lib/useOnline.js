import { useSyncExternalStore } from 'react';

const subscribe = (cb) => {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => { window.removeEventListener('online', cb); window.removeEventListener('offline', cb); };
};

/** True while the browser reports a network connection. */
const useOnline = () => useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
export default useOnline;
