import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const NotifyContext = createContext(null);
export const useNotify = () => useContext(NotifyContext);

const ICONS = {
  success: <path d="M7 12.5l3.5 3.5L17 9" />,
  error: <><path d="M12 7.5v5" /><circle cx="12" cy="16.2" r=".5" /></>,
  info: <><path d="M12 11v5" /><circle cx="12" cy="7.8" r=".5" /></>,
};

function DialogBox({ dialog, onClose }) {
  const isPrompt = dialog.kind === 'prompt';
  const [text, setText] = useState(dialog.initial ?? '');
  const cancel = () => onClose(isPrompt ? null : false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose(isPrompt ? null : false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, isPrompt]);

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && cancel()}>
      <form className="modal" role="dialog" aria-modal="true" aria-label={dialog.title}
        onSubmit={(e) => { e.preventDefault(); onClose(isPrompt ? text.trim() : true); }}>
        <h3>{dialog.title}</h3>
        {dialog.message && <p>{dialog.message}</p>}
        {isPrompt && (
          <label>{dialog.label}
            <input autoFocus type={dialog.type || 'text'} value={text} onChange={(e) => setText(e.target.value)} required />
          </label>
        )}
        <div className="modal-actions">
          <button type="button" onClick={cancel}>Cancel</button>
          <button className={dialog.danger ? 'danger' : 'primary'} autoFocus={!isPrompt}>{dialog.confirmLabel || 'OK'}</button>
        </div>
      </form>
    </div>
  );
}

export function NotifyProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const nextId = useRef(1);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((type, message) => {
    const id = nextId.current++;
    setToasts((t) => [...t.slice(-3), { id, type, message }]);
    setTimeout(() => remove(id), type === 'error' ? 7000 : 4000);
  }, [remove]);

  const value = useMemo(() => {
    const ask = (options) => new Promise((resolve) => setDialog({ ...options, resolve }));
    return {
      toast: { success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) },
      confirm: (o) => ask({ ...o, kind: 'confirm' }),
      prompt: (o) => ask({ ...o, kind: 'prompt' }),
    };
  }, [push]);

  const closeDialog = (result) => { dialog.resolve(result); setDialog(null); };

  return (
    <NotifyContext.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
            <svg className="t-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />{ICONS[t.type]}
            </svg>
            <p>{t.message}</p>
            <button className="x" onClick={() => remove(t.id)} aria-label="Dismiss">&times;</button>
          </div>
        ))}
      </div>
      {dialog && <DialogBox dialog={dialog} onClose={closeDialog} />}
    </NotifyContext.Provider>
  );
}
