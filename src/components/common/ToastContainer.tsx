import React from 'react';
import { useGame } from '../../context/GameContext';
import { CheckCircle2, Award, Info, AlertCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useGame();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-xl flex items-center justify-between gap-3 animate-pop ${
              toast.type === 'achievement'
                ? 'bg-amber-500/90 text-white border-amber-400 backdrop-blur-md shadow-amber-500/20'
                : toast.type === 'success'
                  ? 'bg-emerald-600/90 text-white border-emerald-500 backdrop-blur-md shadow-emerald-500/20'
                  : toast.type === 'error'
                    ? 'bg-rose-600/90 text-white border-rose-500 backdrop-blur-md'
                    : 'bg-slate-900/90 dark:bg-navy-800/95 text-white border-white/10 backdrop-blur-md'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs font-semibold">
              {toast.type === 'achievement' && <Award className="w-5 h-5 shrink-0 text-white" />}
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 text-white" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0 text-white" />}
              {toast.type === 'info' && <Info className="w-5 h-5 shrink-0 text-sky-400" />}
              <span className="leading-snug">{toast.message}</span>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
