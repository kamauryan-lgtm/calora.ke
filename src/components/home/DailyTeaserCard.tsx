import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { getDailyPuzzle } from '../../data/puzzles';
import { Clock, Flame, Sparkles, ArrowRight, CheckCircle2, Trophy } from 'lucide-react';

export const DailyTeaserCard: React.FC = () => {
  const { launchPuzzle, profile } = useGame();
  const dailyPuzzle = getDailyPuzzle();

  // Calculate countdown to midnight UTC
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextMidnightUTC = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 0
      ));
      const diffMs = nextMidnightUTC.getTime() - now.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  const isCompletedToday = Boolean(profile.completedPuzzles[dailyPuzzle.id]?.solved);

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'Easy': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Hard': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'Expert': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
    }
  };

  // 7-day streak dots
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayDayIndex = (new Date().getDay() + 6) % 7; // 0 for Mon, 6 for Sun

  return (
    <div className="relative group max-w-4xl mx-auto my-8">
      {/* Outer border glow */}
      <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-amber-500/30 via-sky-500/30 to-purple-500/30 blur-sm opacity-60 group-hover:opacity-100 transition duration-500" />

      <div className="relative rounded-2xl p-6 sm:p-8 bg-white/90 dark:bg-navy-900/90 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          
          {/* Left Info Column */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                Daily Brain Teaser
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getDifficultyBadge(dailyPuzzle.difficulty)}`}>
                {dailyPuzzle.difficulty}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
                {dailyPuzzle.category}
              </span>
            </div>

            <div>
              <h3 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors">
                {dailyPuzzle.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                {dailyPuzzle.description}
              </p>
            </div>

            {/* 7-Day Streak Tracker */}
            <div className="pt-2 flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {profile.streak} Day Streak
                </span>
                <span className="text-[10px] text-amber-500 font-mono ml-1">
                  ({(1.0 + (profile.streak - 1) * 0.05).toFixed(2)}x XP)
                </span>
              </div>

              {/* Day dots */}
              <div className="flex items-center gap-1.5">
                {weekDays.map((day, idx) => {
                  const isCurrentDay = idx === todayDayIndex;
                  const isPast = idx < todayDayIndex || (isCurrentDay && isCompletedToday);
                  return (
                    <div 
                      key={day}
                      className="flex flex-col items-center gap-0.5"
                      title={`${day}: ${isPast ? 'Completed' : 'Pending'}`}
                    >
                      <div 
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold transition-all ${
                          isPast 
                            ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/50' 
                            : isCurrentDay 
                              ? 'border-2 border-amber-500 animate-pulse' 
                              : 'bg-slate-200 dark:bg-navy-800 text-slate-400'
                        }`}
                      >
                        {isPast ? '✓' : ''}
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono">{day[0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Action Column */}
          <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-slate-200 dark:border-white/10">
            {/* Countdown timer */}
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5 text-sky-500" />
              <span>Next puzzle in: </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {String(timeLeft.hours).padStart(2, '0')}:
                {String(timeLeft.minutes).padStart(2, '0')}:
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
            </div>

            <button
              onClick={() => launchPuzzle(dailyPuzzle)}
              className={`w-full md:w-auto px-6 py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
                isCompletedToday
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-amber-500 to-sky-500 hover:from-amber-400 hover:to-sky-400 text-white shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-0.5'
              }`}
            >
              {isCompletedToday ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Solved! Review Teaser</span>
                </>
              ) : (
                <>
                  <span>Solve Today's Teaser</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
