import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(t);
  }, [message]);

  const showToast = useCallback((msg) => setMessage(msg), []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {message && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 20px',
            borderRadius: 10,
            background: 'rgba(15, 23, 42, 0.95)',
            color: '#e2e8f0',
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            zIndex: 9999,
          }}
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return () => {};
  return ctx;
}
