import React, { useState } from 'react';
import { Trophy, Medal, Clock, Flame, ShieldAlert, Sparkles, Filter } from 'lucide-react';
import { MindGamesStorage } from '../../lib/storage';
import { useGame } from '../../context/GameContext';

export const DailyLeaderboard: React.FC = () => {
  const { profile } = useGame();
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'all-time'>('daily');
  const leaderboard = MindGamesStorage.getDailyLeaderboard();

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center font-bold text-xs shadow-sm shadow-amber-400/50">
            🥇
          </div>
        );
      case 2:
        return (
          <div className="w-6 h-6 rounded-full bg-slate-300 text-slate-900 flex items-center justify-center font-bold text-xs shadow-sm shadow-slate-300/50">
            🥈
          </div>
        );
      case 3:
        return (
          <div className="w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-amber-700/50">
            🥉
          </div>
        );
      default:
        return (
          <span className="w-6 text-center text-xs font-mono font-bold text-slate-500">
            #{rank}
          </span>
        );
    }
  };

  return (
    <div className="my-14 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/90 dark:bg-navy-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">
                Daily Challenge Leaderboard
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Today's sharpest deductions. Anti-cheat verified & rate-limited.
              </p>
            </div>
          </div>
        </div>

        {/* Timeframe Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-navy-800 text-xs font-semibold">
          <button
            onClick={() => setTimeframe('daily')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              timeframe === 'daily'
                ? 'bg-white dark:bg-navy-700 text-sky-500 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Today's Teaser
          </button>
          <button
            onClick={() => setTimeframe('weekly')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              timeframe === 'weekly'
                ? 'bg-white dark:bg-navy-700 text-sky-500 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Weekly Cup
          </button>
          <button
            onClick={() => setTimeframe('all-time')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              timeframe === 'all-time'
                ? 'bg-white dark:bg-navy-700 text-sky-500 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All-Time High
          </button>
        </div>
      </div>

      {/* Leaderboard Table / Rows */}
      <div className="divide-y divide-slate-100 dark:divide-white/5 overflow-x-auto">
        {leaderboard.map((entry) => {
          const isMe = entry.isCurrentUser;
          return (
            <div
              key={entry.rank + entry.username}
              className={`flex items-center justify-between py-3.5 px-3 rounded-xl transition-colors ${
                isMe
                  ? 'bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/30'
                  : 'hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              {/* Rank + User */}
              <div className="flex items-center gap-3 min-w-[200px]">
                {getRankBadge(entry.rank)}
                <span className="text-xl">{entry.avatar}</span>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${isMe ? 'text-sky-500 font-extrabold' : 'text-slate-900 dark:text-white'}`}>
                      {entry.username}
                    </span>
                    {isMe && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500 text-white leading-none">
                        YOU
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {entry.badge || 'Thinker'}
                  </span>
                </div>
              </div>

              {/* Stats: Time & Hints */}
              <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span className="flex items-center gap-1 hidden sm:flex">
                  <Clock className="w-3.5 h-3.5 text-sky-500" />
                  {entry.durationFormatted}
                </span>
                <span className="hidden md:inline text-[11px]">
                  {entry.hintsUsed === 0 ? '✨ 0 hints' : `${entry.hintsUsed} hint${entry.hintsUsed > 1 ? 's' : ''}`}
                </span>
              </div>

              {/* Score */}
              <div className="text-right">
                <div className="font-display font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                  {entry.score.toLocaleString()} <span className="text-xs font-normal text-slate-400">pts</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer anti-cheat notice */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-emerald-500" />
          Rankings are calculated dynamically with speed & accuracy verification
        </span>
        <span className="font-mono">Resets daily at 00:00 UTC</span>
      </div>
    </div>
  );
};
