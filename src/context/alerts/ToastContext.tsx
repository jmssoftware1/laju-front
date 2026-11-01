import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import "./Toast.css";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem { id: number; type: ToastType; message: string; }
interface ConfirmState { message: string; resolve: (v: boolean) => void; }

interface ToastContextType {
  toast: {
    success: (msg: string) => void;
    error:   (msg: string) => void;
    warning: (msg: string) => void;
    info:    (msg: string) => void;
  };
  confirm: (msg: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ICONS: Record<ToastType, string> = {
  success: "check_circle",
  error:   "error",
  warning: "warning",
  info:    "info",
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts]           = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const counter = useRef(0);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev.slice(-2), { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const toast = {
    success: (msg: string) => addToast("success", msg),
    error:   (msg: string) => addToast("error",   msg),
    warning: (msg: string) => addToast("warning", msg),
    info:    (msg: string) => addToast("info",    msg),
  };

  const confirm = (message: string): Promise<boolean> =>
    new Promise((resolve) => setConfirmState({ message, resolve }));

  const handleConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* ── Toasts ── */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`}>
            <span className="material-symbols-outlined toast__icon">{ICONS[t.type]}</span>
            <span className="toast__msg">{t.message}</span>
            <button className="toast__close" onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        ))}
      </div>

      {/* ── Confirm dialog ── */}
      {confirmState && (
        <div className="confirm-overlay">
          <div className="confirm-card">
            <span className="material-symbols-outlined confirm-icon">help</span>
            <p className="confirm-msg">{confirmState.message}</p>
            <div className="confirm-actions">
              <button className="confirm-btn confirm-btn--cancel" onClick={() => handleConfirm(false)}>Cancelar</button>
              <button className="confirm-btn confirm-btn--ok"     onClick={() => handleConfirm(true)}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};