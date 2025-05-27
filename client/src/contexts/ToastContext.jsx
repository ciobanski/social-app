// src/contexts/ToastContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback
} from 'react';

const ToastContext = createContext();

/**
 * useToast()
 * Hook to get the showToast function.
 */
export function useToast() {
  return useContext(ToastContext);
}

/**
 * ToastProvider
 * Wrap your app in this and call showToast(msg, type) anywhere.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts((ts) => [...ts, { id, message, type }]);
    setTimeout(() => {
      setToasts((ts) => ts.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="fixed bottom-4 right-4 flex flex-col space-y-2 z-50">
        {toasts.map(({ id, message, type }) => (
          <div
            key={id}
            className={[
              'px-4 py-2 rounded shadow text-white',
              type === 'success'
                ? 'bg-green-500'
                : type === 'error'
                  ? 'bg-red-500'
                  : 'bg-blue-500'
            ].join(' ')}
          >
            {message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
