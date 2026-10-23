import React from 'react';
import { Brain, Sparkles, Play, Flame, Award, ChevronRight, Compass } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { getDailyPuzzle } from '../../data/puzzles';

export const Hero: React.FC = () => {
  const { launchPuzzle, setActiveMode, profile, branding } = useGame();

  const handleStartChallenge = () => {
    const daily = getDailyPuzzle();
    launchPuzzle(daily);
  };

  return (
    <div className="relative pt-8 pb-12 overflow-hidden">
      {/* Decorative background neural glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-sky-500/10 via-purple-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />

      <div className="relative max-w-4xl mx-auto text-center px-4">
        
        {/* Top announcement pill */}
        {branding.announcementBanner?.enabled && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 dark:bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-semibold mb-6 animate-pop">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{branding.announcementBanner.text}</span>
          </div>
        )}

        {/* Primary Prompt Headline */}
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-slate-900 dark:text-white tracking-tight leading-[1.15] mb-5">
          {branding.headline || "Your brain called. It wants a challenge."}
        </h1>

        {/* Tagline & Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
          {branding.headlineSub || "Step into an interactive sanctuary of logic, crime scene deduction, poetic riddles, and abstract sequences."} 
          <span className="font-semibold text-slate-900 dark:text-white block mt-1">
            "{branding.tagline || 'Think sharper. See differently.'}"
          </span>
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <button
            onClick={handleStartChallenge}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-base shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group"
          >
            <Play className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" />
            <span>Start a Challenge</span>
            <ChevronRight className="w-4 h-4 ml-1 opacity-70 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => setActiveMode('sprint')}
            className="w-full sm:w-auto px-6 py-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-navy-800/80 dark:hover:bg-navy-750 text-slate-800 dark:text-slate-200 font-semibold text-base border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-purple-500/40 transition-all flex items-center justify-center gap-2"
          >
            <Flame className="w-5 h-5 text-purple-500" />
            <span>60s Brain Sprint</span>
          </button>
        </div>

        {/* Social Proof Stats Bar */}
        <div className="pt-6 border-t border-slate-200/60 dark:border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
          <div className="p-2 text-center">
            <div className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-white">
              8 Modes
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Curated Categories</div>
          </div>
          <div className="p-2 text-center">
            <div className="font-display font-extrabold text-xl sm:text-2xl text-sky-500">
              100% Free
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Daily Access</div>
          </div>
          <div className="p-2 text-center">
            <div className="font-display font-extrabold text-xl sm:text-2xl text-amber-500">
              {profile.streak} Days
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Active Daily Streak</div>
          </div>
          <div className="p-2 text-center">
            <div className="font-display font-extrabold text-xl sm:text-2xl text-emerald-500">
              Verified
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Fair Logic Proofs</div>
          </div>
        </div>

      </div>
    </div>
  );
};
