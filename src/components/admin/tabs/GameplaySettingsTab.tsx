import React, { useState } from 'react';
import { GameSettings, Difficulty } from '../../../types';
import { MindGamesDB, DEFAULT_GAME_SETTINGS } from '../../../lib/database';
import { AdminService } from '../../../lib/adminService';
import { useGame } from '../../../context/GameContext';
import { 
  Sliders, 
  Save, 
  RotateCcw, 
  CheckCircle, 
  AlertTriangle, 
  Flame, 
  Clock, 
  ShieldCheck,
  Zap
} from 'lucide-react';

export const GameplaySettingsTab: React.FC = () => {
  const { adminSession, addToast, refreshAppState } = useGame();
  const [settings, setSettings] = useState<GameSettings>(() => MindGamesDB.getGameSettings());
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleBasePointChange = (diff: Difficulty, val: number) => {
    setSettings(prev => ({
      ...prev,
      basePoints: {
        ...prev.basePoints,
        [diff]: Math.max(10, val)
      }
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSession) return;

    try {
      const updated = AdminService.updateGameSettings(adminSession.token, settings);
      setSettings(updated);
      refreshAppState();
      setSaveSuccess(true);
      addToast(`Scoring rules saved (Version ${updated.version})! Applied to game engine.`, 'success');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleResetToDefaults = () => {
    if (!adminSession) return;
    try {
      const reset = AdminService.resetGameSettings(adminSession.token);
      setSettings(reset);
      refreshAppState();
      setConfirmResetOpen(false);
      addToast('Gameplay settings restored to system defaults.', 'info');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-extrabold text-2xl text-white">
              Gameplay & Scoring Engine
            </h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
              Config Version {settings.version}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Adjust core scoring formulas, penalties, streak multipliers, and Brain Sprint durations.
          </p>
        </div>

        <button
          onClick={() => setConfirmResetOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Defaults</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Section 1: Base Points by Difficulty */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Base Points Allocation by Difficulty</span>
            </h3>
            <span className="text-[11px] text-slate-400">Awarded for flawless initial solution</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['Easy', 'Medium', 'Hard', 'Expert'] as Difficulty[]).map(diff => (
              <div key={diff} className="p-3.5 rounded-xl bg-navy-900 border border-white/10 space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{diff}</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={10}
                    max={5000}
                    step={10}
                    value={settings.basePoints[diff] || 100}
                    onChange={(e) => handleBasePointChange(diff, parseInt(e.target.value) || 100)}
                    className="w-full bg-transparent text-lg font-mono font-bold text-white focus:outline-none"
                  />
                  <span className="text-xs text-slate-500">XP</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Penalties and Multipliers */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            <span>Penalties, Multipliers & Bonuses</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Hint Penalty */}
            <div className="p-4 rounded-xl bg-navy-900 border border-white/10 space-y-1.5">
              <label className="text-slate-400 font-bold uppercase">Hint Penalty (%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={settings.hintPenaltyPercent}
                  onChange={(e) => setSettings({ ...settings, hintPenaltyPercent: parseInt(e.target.value) || 15 })}
                  className="w-24 px-3 py-1.5 rounded-lg bg-navy-800 text-white font-mono font-bold text-sm border border-white/10"
                />
                <span className="text-slate-400">deduction per hint used</span>
              </div>
            </div>

            {/* Time Bonus Max */}
            <div className="p-4 rounded-xl bg-navy-900 border border-white/10 space-y-1.5">
              <label className="text-slate-400 font-bold uppercase">Max Speed Bonus (%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={settings.maxTimeBonusPercent}
                  onChange={(e) => setSettings({ ...settings, maxTimeBonusPercent: parseInt(e.target.value) || 25 })}
                  className="w-24 px-3 py-1.5 rounded-lg bg-navy-800 text-white font-mono font-bold text-sm border border-white/10"
                />
                <span className="text-slate-400">for solving under 60s</span>
              </div>
            </div>

            {/* Daily Streak Multiplier Cap */}
            <div className="p-4 rounded-xl bg-navy-900 border border-white/10 space-y-1.5">
              <label className="text-slate-400 font-bold uppercase">Max Streak Bonus (x)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1.0}
                  max={3.0}
                  step={0.1}
                  value={settings.maxStreakBonus}
                  onChange={(e) => setSettings({ ...settings, maxStreakBonus: parseFloat(e.target.value) || 1.5 })}
                  className="w-24 px-3 py-1.5 rounded-lg bg-navy-800 text-white font-mono font-bold text-sm border border-white/10"
                />
                <span className="text-slate-400">multiplier ceiling</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Brain Sprint Rules & Anti-Cheat */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <span>Brain Sprint & Anti-Cheat Thresholds</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-navy-900 border border-white/10 space-y-1.5">
              <label className="text-slate-400 font-bold uppercase">Brain Sprint Duration</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={30}
                  max={180}
                  step={5}
                  value={settings.sprintDurationSeconds}
                  onChange={(e) => setSettings({ ...settings, sprintDurationSeconds: parseInt(e.target.value) || 60 })}
                  className="w-24 px-3 py-1.5 rounded-lg bg-navy-800 text-white font-mono font-bold text-sm border border-white/10"
                />
                <span className="text-slate-400">seconds per speed round</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-navy-900 border border-white/10 space-y-1.5">
              <label className="text-slate-400 font-bold uppercase">Anti-Cheat Min Solve Time</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={500}
                  max={5000}
                  step={100}
                  value={settings.antiCheatMinDurationMs}
                  onChange={(e) => setSettings({ ...settings, antiCheatMinDurationMs: parseInt(e.target.value) || 1200 })}
                  className="w-24 px-3 py-1.5 rounded-lg bg-navy-800 text-white font-mono font-bold text-sm border border-white/10"
                />
                <span className="text-slate-400">ms (attempts below are flagged)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-400 font-mono">
            Last modified: {new Date(settings.updatedAt).toLocaleString()} by {settings.updatedBy}
          </div>

          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-lg shadow-sky-500/25 flex items-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Commit Gameplay Rules</span>
          </button>
        </div>

      </form>

      {/* RESET CONFIRMATION MODAL */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-pop">
          <div className="w-full max-w-sm rounded-2xl bg-[#0C1222] border border-amber-500/30 p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-display font-extrabold text-lg text-white">Reset Rules to Defaults?</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                This will reset base points (100/250/500/1000) and penalties to their canonical standards.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setConfirmResetOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleResetToDefaults}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
