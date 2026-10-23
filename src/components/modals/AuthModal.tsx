import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { X, User, Lock, Mail, Sparkles, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { registerAccount, loginAsGuest, profile } = useGame();
  const [mode, setMode] = useState<'register' | 'login' | 'guest'>('register');
  const [username, setUsername] = useState(profile.username || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'guest') {
      loginAsGuest(username || undefined);
    } else {
      registerAccount(username.trim() || 'MindThinker', email.trim());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-pop">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/15 text-sky-500 mx-auto flex items-center justify-center text-xl">
            {profile.avatar}
          </div>
          <h2 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">
            {mode === 'register' ? 'Save Your Deductive Legacy' : mode === 'login' ? 'Welcome Back' : 'Play as Guest'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {mode === 'register' 
              ? 'Create a free profile to preserve your brain score, streak, and rank across devices.'
              : 'Resume your training session and access all saved progress.'}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-navy-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              mode === 'register' ? 'bg-white dark:bg-navy-700 text-sky-500 shadow-sm' : 'text-slate-500'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              mode === 'login' ? 'bg-white dark:bg-navy-700 text-sky-500 shadow-sm' : 'text-slate-500'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('guest')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              mode === 'guest' ? 'bg-white dark:bg-navy-700 text-sky-500 shadow-sm' : 'text-slate-500'
            }`}
          >
            Instant Guest
          </button>
        </div>

        {/* Registration Welcome Incentive */}
        {mode === 'register' && (
          <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-600 dark:text-sky-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-500 shrink-0" />
            <span>Registration Bonus: +50 Bonus Brain Points & Permanent Streak Cloud Backup!</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Thinker Alias (Username)
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Sherlock_221B"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {mode !== 'guest' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="thinker@mindgames.app"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-lg shadow-sky-500/25 transition-all mt-2"
          >
            {mode === 'register' ? 'Register & Claim +50 XP' : mode === 'login' ? 'Sign In' : 'Continue as Guest'}
          </button>
        </form>

        <div className="pt-2 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Zero trackers, no spam, persistent local storage encryption</span>
        </div>

      </div>
    </div>
  );
};
