import React from 'react';
import { useGame } from '../../context/GameContext';
import { Brain, Flame, Target, Award, ChevronRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { ALL_PUZZLES } from '../../data/puzzles';

export const ProgressSummary: React.FC = () => {
  const { profile, setProfileModalOpen, setAuthModalOpen } = useGame();

  const totalPuzzles = ALL_PUZZLES.length;
  const solvedCount = Object.values(profile.completedPuzzles).filter(p => p.solved).length;
  const solvePercent = Math.round((solvedCount / Math.max(1, totalPuzzles)) * 100);

  return (
    <div className="my-10 rounded-2xl bg-gradient-to-br from-slate-900 to-navy-950 text-white p-6 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute right-0 top-0 -mt-10 -mr-10 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-3xl shadow-inner">
            {profile.avatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-extrabold text-xl text-white">
                {profile.username}
              </h3>
              {!profile.isRegistered && (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
                >
                  Guest (Claim Profile)
                </button>
              )}
            </div>
            <div className="text-xs text-sky-400 font-semibold mt-0.5">
              Rank: {profile.title} • {profile.brainScore.toLocaleString()} Brain Points
            </div>
          </div>
        </div>

        <button
          onClick={() => setProfileModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold border border-white/10 hover:border-white/20 transition-all flex items-center gap-1.5"
        >
          <span>View Cognitive Skill Radar & Stats</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4 Key Performance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/10">
        
        {/* Metric 1: Solved */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="font-display font-extrabold text-2xl text-white">
            {solvedCount} <span className="text-xs font-normal text-slate-400">/ {totalPuzzles}</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-medium mt-1">
            {solvePercent}% of library solved
          </div>
        </div>

        {/* Metric 2: Streak */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Active Streak</span>
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          </div>
          <div className="font-display font-extrabold text-2xl text-amber-400">
            {profile.streak} <span className="text-xs font-normal text-slate-400">days</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">
            Best streak: {profile.bestStreak} days
          </div>
        </div>

        {/* Metric 3: Achievements */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Milestones</span>
            <Award className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="font-display font-extrabold text-2xl text-purple-400">
            {profile.unlockedAchievements.length} <span className="text-xs font-normal text-slate-400">/ 10</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">
            Badges earned
          </div>
        </div>

        {/* Metric 4: Brain Sprint High Score */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Sprint Record</span>
            <Target className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="font-display font-extrabold text-2xl text-sky-400">
            {profile.sprintStats.bestScore || '—'} <span className="text-xs font-normal text-slate-400">pts</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">
            Streak record: {profile.sprintStats.highestStreak}x
          </div>
        </div>

      </div>

    </div>
  );
};
