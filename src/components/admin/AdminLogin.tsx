import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Brain, Lock, User, ShieldCheck, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';

interface AdminLoginProps {
  onBackToSite?: () => void;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onBackToSite, onCancel, onSuccess }) => {
  const { loginAdmin } = useGame();
  const [username, setUsername] = useState('superadmin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleBack = onBackToSite || onCancel || (() => {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const res = loginAdmin(username, password);
      setLoading(false);
      if (res.success) {
        if (onSuccess) onSuccess();
      } else {
        setError(res.error || 'Invalid administrator credentials.');
      }
    }, 200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#060913] text-slate-100">
      <div className="w-full max-w-md p-8 rounded-2xl bg-[#0C1222] border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-display font-extrabold text-lg text-white">
                Mind<span className="text-sky-400">Games</span>
              </div>
              <div className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-widest">
                Admin Control Centre
              </div>
            </div>
          </div>

          <button
            onClick={handleBack}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Public Site</span>
          </button>
        </div>

        <div className="space-y-1 mb-6">
          <h2 className="font-display font-bold text-xl text-white">
            Restricted Administrator Sign-in
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Authorized personnel only. Sessions and actions are cryptographically authenticated and audit-logged.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Admin Moniker
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="superadmin or admin"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Secure Key / Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all mt-2"
          >
            <span>{loading ? 'Authenticating...' : 'Enter Admin Control Centre'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Setup / Bootstrap Helper Notice */}
        <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-slate-400 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Platform Owner Bootstrap Credentials:</span>
          </div>
          <div className="font-mono text-[10px] bg-black/40 p-2 rounded-lg border border-white/5 space-y-0.5">
            <div>SuperAdmin: <span className="text-sky-300">superadmin</span> / <span className="text-emerald-300">AdminSecret#2026!</span></div>
            <div>Editor: <span className="text-sky-300">admin</span> / <span className="text-emerald-300">MindGames#2026!</span></div>
          </div>
        </div>

      </div>
    </div>
  );
};
