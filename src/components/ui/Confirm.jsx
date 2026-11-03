import { createContext, lazy, Suspense, useCallback, useContext, useRef, useState } from 'react';
import Button from './Button';

// The dialog code loads the first time a confirmation is needed, not on every page.
const Modal = lazy(() => import('./Dialog'));

const ConfirmContext = createContext(null);

/**
 * Replaces window.confirm(): `if (!(await confirm({ title, description,
 * confirmLabel: 'Delete quiz', tone: 'danger' }))) return;`
 */
export const ConfirmProvider = ({ children }) => {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((opts) => new Promise((resolve) => {
    resolver.current = resolve;
    setState({ cancelLabel: 'Cancel', confirmLabel: 'Confirm', tone: 'primary', ...opts });
  }), []);

  const close = (result) => {
    resolver.current?.(result);
    resolver.current = null;
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
      <Suspense fallback={null}>
      <Modal
        open
        onOpenChange={(o) => { if (!o) close(false); }}
        size="sm"
        title={state?.title ?? ''}
        description={state?.description}
        footer={state && (
          <>
            <Button variant="secondary" onClick={() => close(false)}>{state.cancelLabel}</Button>
            <Button variant={state.tone === 'danger' ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
              {state.confirmLabel}
            </Button>
          </>
        )}
      >
        {state?.body}
      </Modal>
      </Suspense>
      )}
    </ConfirmContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
  return ctx;
};
