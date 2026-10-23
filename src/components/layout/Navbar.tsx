import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { 
  Brain, 
  Flame, 
  Volume2, 
  VolumeX, 
  Sun, 
  Moon, 
  Trophy, 
  Compass, 
  Sparkles, 
  Menu, 
  X,
  Clock,
  ShieldCheck,
  User
} from 'lucide-react';
import { getDailyPuzzle } from '../../data/puzzles';

export const Navbar: React.FC = () => {
  const { 
    profile, 
    theme, 
    toggleTheme, 
    isSoundMuted, 
    toggleSound, 
    activeMode, 
    setActiveMode, 
    setActivePuzzle,
    isPracticeMode,
    setIsPracticeMode,
    setProfileModalOpen,
    setAuthModalOpen,
    setProModalOpen,
    launchPuzzle,
    isAdmin
  } = useGame();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogoClick = () => {
    setActiveMode('home');
    setActivePuzzle(null);
  };

  const handleDailyClick = () => {
    const daily = getDailyPuzzle();
    launchPuzzle(daily);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/10 dark:border-white/10 bg-white/80 dark:bg-[#070A14]/85 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={handleLogoClick}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:shadow-sky-500/40 group-hover:scale-105 transition-all duration-300">
            <Brain className="w-5 h-5 text-white" />
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-tr from-sky-400 to-purple-500 opacity-0 group-hover:opacity-40 blur transition duration-300"></div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                Mind<span className="text-sky-500 dark:text-sky-400">Games</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-semibold uppercase tracking-wider hidden sm:inline-block">
                v2.0
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tracking-wide hidden sm:block">
              Think sharper. See differently.
            </span>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1.5">
          <button
            onClick={() => { setActiveMode('home'); setActivePuzzle(null); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeMode === 'home'
                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            Explore
          </button>

          <button
            onClick={handleDailyClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
          >
            <Clock className="w-4 h-4" />
            <span>Daily Teaser</span>
            <span className="flex items-center text-xs font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-500">
              <Flame className="w-3 h-3 mr-0.5 fill-amber-500" />
              {profile.streak}d
            </span>
          </button>

          {/* Modes Dropdown / Direct shortcuts */}
          <button
            onClick={() => { setActiveMode('sprint'); setActivePuzzle(null); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeMode === 'sprint'
                ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <Flame className="w-4 h-4 text-purple-500" />
            <span>Brain Sprint</span>
          </button>

          <button
            onClick={() => { setActiveMode('detective'); setActivePuzzle(null); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeMode === 'detective'
                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            Detective
          </button>

          {/* Practice Mode Toggle */}
          <button
            onClick={() => setIsPracticeMode(!isPracticeMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
              isPracticeMode 
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
            }`}
            title="Practice Mode disables timers and score penalties"
          >
            <span className={`w-2 h-2 rounded-full ${isPracticeMode ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            Practice {isPracticeMode ? 'ON' : 'OFF'}
          </button>
        </nav>

        {/* User Stats & Controls */}
        <div className="flex items-center gap-2">
          
          {/* Brain Score pill */}
          <div 
            onClick={() => setProfileModalOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-navy-800/80 border border-slate-200/80 dark:border-white/10 hover:border-sky-500/40 cursor-pointer transition-all"
            title="Click to view full personal dashboard"
          >
            <span className="text-base">{profile.avatar}</span>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-none">
                {profile.brainScore.toLocaleString()} XP
              </span>
              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium leading-none mt-0.5">
                {profile.title}
              </span>
            </div>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            aria-label="Toggle Sound"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            {isSoundMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-sky-500" />}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Pro Modal Button */}
          <button
            onClick={() => setProModalOpen(true)}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500/20 to-purple-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 hover:border-amber-500/60 transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Pro Case Files</span>
          </button>

          {/* Admin Studio Quick Access (if user has admin role) */}
          {isAdmin && (
            <button
              onClick={() => { setActiveMode('admin'); setActivePuzzle(null); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all shadow-sm"
              title="Open Platform Admin Control Centre"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          {/* User Profile / Auth Button */}
          <button
            onClick={() => {
              if (profile.isRegistered) {
                setProfileModalOpen(true);
              } else {
                setAuthModalOpen(true);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20 transition-all"
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{profile.isRegistered ? profile.username : 'Sign In / Save'}</span>
            <span className="sm:hidden">{profile.avatar}</span>
          </button>

          {/* Mobile menu hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 md:hidden hover:bg-slate-100 dark:hover:bg-white/5"
            aria-label="Open Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200/10 dark:border-white/10 bg-white dark:bg-navy-950 px-4 pt-3 pb-5 space-y-2 animate-pop">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/10 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xl">{profile.avatar}</span>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{profile.username}</div>
                <div className="text-xs text-sky-500">{profile.brainScore} XP • {profile.title}</div>
              </div>
            </div>
            <button
              onClick={() => { setIsPracticeMode(!isPracticeMode); }}
              className={`text-xs px-2.5 py-1 rounded-full border ${isPracticeMode ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
            >
              Practice {isPracticeMode ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => { setActiveMode('home'); setActivePuzzle(null); setMobileMenuOpen(false); }}
              className="p-2.5 rounded-lg text-left text-sm font-medium bg-slate-100 dark:bg-navy-900 text-slate-900 dark:text-white"
            >
              🏠 Home & Puzzles
            </button>
            <button
              onClick={handleDailyClick}
              className="p-2.5 rounded-lg text-left text-sm font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20"
            >
              ⚡ Daily Challenge ({profile.streak}d)
            </button>
            <button
              onClick={() => { setActiveMode('sprint'); setActivePuzzle(null); setMobileMenuOpen(false); }}
              className="p-2.5 rounded-lg text-left text-sm font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20"
            >
              🔥 Brain Sprint
            </button>
            <button
              onClick={() => { setActiveMode('detective'); setActivePuzzle(null); setMobileMenuOpen(false); }}
              className="p-2.5 rounded-lg text-left text-sm font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20"
            >
              🕵️ Detective Mode
            </button>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => { setProfileModalOpen(true); setMobileMenuOpen(false); }}
              className="flex-1 py-2 text-center text-xs font-semibold rounded-lg bg-slate-100 dark:bg-navy-800 text-slate-800 dark:text-slate-200"
            >
              My Dashboard & Radar
            </button>
            <button
              onClick={() => { setProModalOpen(true); setMobileMenuOpen(false); }}
              className="py-2 px-3 text-xs font-semibold rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30"
            >
              ✨ Pro Cases
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
