import React, { useState } from 'react';
import { MindGamesDB } from '../../../lib/database';
import { AdminService } from '../../../lib/adminService';
import { useGame } from '../../../context/GameContext';
import { getDailyPuzzle } from '../../../data/puzzles';
import { 
  Calendar, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  Save, 
  Flame, 
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

export const DailyManagerTab: React.FC = () => {
  const { adminSession, addToast } = useGame();
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [scheduleMap, setScheduleMap] = useState(() => MindGamesDB.getDailySchedule());
  const allPuzzles = MindGamesDB.getPuzzles(false);

  const [selectedPuzzleId, setSelectedPuzzleId] = useState<string>('');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;

  // Active puzzle on selected date
  const scheduledEntry = scheduleMap[selectedDate];
  const activePuzzleForDate = scheduledEntry 
    ? MindGamesDB.getPuzzleById(scheduledEntry.puzzleId) 
    : getDailyPuzzle(selectedDate);

  const handleScheduleSubmit = () => {
    if (!adminSession || !selectedPuzzleId) return;

    if (isToday) {
      setConfirmModalOpen(true);
      return;
    }

    commitScheduleChange();
  };

  const commitScheduleChange = () => {
    if (!adminSession || !selectedPuzzleId) return;
    try {
      AdminService.scheduleDailyChallenge(adminSession.token, selectedDate, selectedPuzzleId);
      setScheduleMap(MindGamesDB.getDailySchedule());
      setConfirmModalOpen(false);
      addToast(`Daily challenge for ${selectedDate} updated successfully!`, 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  // Next 7 calendar days preview
  const upcomingDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-white">
            Daily Challenge Scheduler
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure calendar-scheduled teasers, inspect upcoming challenges, and override dates.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300">
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span>Server Reset Policy: 00:00 UTC</span>
        </div>
      </div>

      {/* Date Carousel / Quick Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {upcomingDates.map((dStr, idx) => {
          const isSelected = selectedDate === dStr;
          const isDayToday = dStr === todayStr;
          const entry = scheduleMap[dStr];
          const puzzle = entry ? MindGamesDB.getPuzzleById(entry.puzzleId) : getDailyPuzzle(dStr);

          return (
            <div
              key={dStr}
              onClick={() => setSelectedDate(dStr)}
              className={`p-3 rounded-xl border cursor-pointer transition-all select-none text-left ${
                isSelected
                  ? 'bg-sky-500/20 border-sky-500 shadow-md ring-1 ring-sky-500'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                <span className={isDayToday ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                  {idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : `Day +${idx}`}
                </span>
                {entry && <span className="text-emerald-400 font-bold">Custom</span>}
              </div>
              <div className="text-xs font-bold text-white line-clamp-1">
                {dStr.substring(5)}
              </div>
              <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                {puzzle?.title || 'Automatic'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Date Inspector Card */}
      <div className="rounded-2xl p-6 sm:p-8 bg-white/5 border border-white/10 space-y-6">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-sky-400 uppercase tracking-wider font-mono">
                Date: {selectedDate} {isToday ? '(ACTIVE TODAY)' : ''}
              </span>
              {scheduledEntry ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Explicitly Scheduled
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-slate-300">
                  Default Deterministic Algorithmic
                </span>
              )}
            </div>
            <h3 className="font-display font-extrabold text-2xl text-white mt-1">
              {activePuzzleForDate?.title || 'Unknown Puzzle'}
            </h3>
            <div className="text-xs text-slate-400 mt-0.5 flex gap-3">
              <span>Category: <strong className="text-white">{activePuzzleForDate?.category}</strong></span>
              <span>Difficulty: <strong className="text-white">{activePuzzleForDate?.difficulty}</strong></span>
              <span>Mode: <strong className="text-white">{activePuzzleForDate?.mode}</strong></span>
            </div>
          </div>

          <div className="text-right text-xs text-slate-400 font-mono">
            {scheduledEntry ? (
              <div>Scheduled by: <span className="text-sky-300">{scheduledEntry.scheduledBy}</span></div>
            ) : (
              <div>Standard Rotational Seed</div>
            )}
          </div>
        </div>

        {/* Puzzle Prompt Preview */}
        <div className="p-5 rounded-xl bg-navy-900 border border-white/10 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Player Teaser Preview:
          </div>
          <p className="font-serif italic text-sm text-slate-200 leading-relaxed">
            "{(activePuzzleForDate as any)?.prompt || (activePuzzleForDate as any)?.scenario || activePuzzleForDate?.description}"
          </p>
        </div>

        {/* Override Form */}
        <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Assign Different Puzzle to this Date:</span>
          </h4>

          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedPuzzleId}
              onChange={(e) => setSelectedPuzzleId(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="">Select a puzzle from published library...</option>
              {allPuzzles.map(p => (
                <option key={p.id} value={p.id}>
                  [{p.category} - {p.difficulty}] {p.title}
                </option>
              ))}
            </select>

            <button
              onClick={handleScheduleSubmit}
              disabled={!selectedPuzzleId}
              className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-sky-500/20 flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Apply Schedule</span>
            </button>
          </div>
        </div>

      </div>

      {/* OVERRIDE ACTIVE CHALLENGE WARNING MODAL */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-pop">
          <div className="w-full max-w-md rounded-2xl bg-[#0C1222] border border-amber-500/30 p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-display font-extrabold text-xl text-white">
                Override Active Today's Challenge?
              </h4>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                You are modifying <strong>today's live daily challenge</strong>. Players who already completed today's teaser will retain their score, but new visitors will receive this new puzzle.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={commitScheduleChange}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-md shadow-amber-500/20"
              >
                Confirm Live Override
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
