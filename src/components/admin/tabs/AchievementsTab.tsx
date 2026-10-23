import React, { useState } from 'react';
import { 
  Award, 
  Plus, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  Power, 
  Search, 
  Flame, 
  Brain, 
  Check, 
  Layers
} from 'lucide-react';
import { Achievement } from '../../../types';
import { MindGamesDB } from '../../../lib/database';
import { AdminService } from '../../../lib/adminService';
import { useGame } from '../../../context/GameContext';

export const AchievementsTab: React.FC = () => {
  const { adminSession, refreshAppData } = useGame();
  const [achievements, setAchievements] = useState<Achievement[]>(() => MindGamesDB.getAchievements());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingAch, setEditingAch] = useState<Partial<Achievement> | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const reloadData = () => {
    setAchievements(MindGamesDB.getAchievements());
    refreshAppData();
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleToggle = (ach: Achievement) => {
    if (!adminSession) return;
    try {
      const newState = ach.isEnabled === false ? true : false;
      AdminService.toggleAchievement(adminSession.token, ach.id, newState);
      showFeedback('success', `Achievement "${ach.title}" ${newState ? 'enabled' : 'disabled'}.`);
      reloadData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleSaveAchievement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAch || !adminSession) return;
    try {
      const fullAch: Achievement = {
        id: editingAch.id || `ach_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: editingAch.title || 'Untitled Milestone',
        description: editingAch.description || '',
        iconName: editingAch.iconName || 'Award',
        category: (editingAch.category as any) || 'general',
        requirement: Number(editingAch.requirement) || 1,
        isEnabled: editingAch.isEnabled ?? true,
        progress: 0
      };

      AdminService.saveAchievementDefinition(adminSession.token, fullAch);
      showFeedback('success', `Saved achievement "${fullAch.title}".`);
      setEditingAch(null);
      reloadData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const filtered = achievements.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'all' || a.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-navy-900/40 p-4 rounded-xl border border-navy-700/50">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            Milestone & Achievement Configuration
          </h2>
          <p className="text-sm text-slate-400">
            Define cognitive milestones, adjust unlock thresholds, and activate or deactivate player badges.
          </p>
        </div>

        <button
          onClick={() => setEditingAch({
            id: '',
            title: '',
            description: '',
            category: 'general',
            requirement: 5,
            iconName: 'Award',
            isEnabled: true
          })}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-navy-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all"
        >
          <Plus className="w-4 h-4" /> Add New Milestone
        </button>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl border text-sm flex items-center gap-2 ${
          feedback.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
            : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {feedback.message}
        </div>
      )}

      {/* Filter bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search achievements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-navy-900/60 border border-navy-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-navy-900/60 border border-navy-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
          >
            <option value="all">All Milestone Tracks</option>
            <option value="general">General</option>
            <option value="logic">Logic Lab</option>
            <option value="detective">Detective Mode</option>
            <option value="streak">Streaks & Loyalty</option>
            <option value="sprint">Brain Sprint</option>
          </select>
        </div>
      </div>

      {/* Achievements Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((ach) => {
          const isEnabled = ach.isEnabled !== false;
          return (
            <div 
              key={ach.id}
              className={`p-5 rounded-2xl border transition-all ${
                isEnabled 
                  ? 'bg-navy-900/40 border-navy-700/60 hover:border-navy-600' 
                  : 'bg-navy-950/40 border-navy-800/40 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg border ${
                    isEnabled 
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                      : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}>
                    🏆
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{ach.title}</h3>
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                      {ach.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingAch(ach)}
                    title="Edit Milestone"
                    className="p-1.5 bg-navy-800 hover:bg-sky-600/30 text-slate-400 hover:text-sky-300 rounded-lg border border-navy-700 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleToggle(ach)}
                    title={isEnabled ? 'Disable Milestone' : 'Enable Milestone'}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      isEnabled 
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/50' 
                        : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 mb-3 min-h-[36px]">
                {ach.description}
              </p>

              <div className="flex items-center justify-between text-xs pt-3 border-t border-navy-800/80 font-mono">
                <span className="text-slate-500">Requirement Goal:</span>
                <span className="text-amber-400 font-bold">{ach.requirement} solve(s)</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: Edit / Create Achievement */}
      {editingAch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              {editingAch.id ? 'Edit Milestone' : 'Create New Milestone'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Configure milestone requirements and descriptions presented on player profiles.
            </p>

            <form onSubmit={handleSaveAchievement} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase">Milestone Title</label>
                <input
                  type="text"
                  value={editingAch.title || ''}
                  onChange={(e) => setEditingAch({ ...editingAch, title: e.target.value })}
                  placeholder="e.g. Master Sleuth, Logic Virtuoso"
                  className="mt-1 w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase">Description / Instruction</label>
                <textarea
                  rows={2}
                  value={editingAch.description || ''}
                  onChange={(e) => setEditingAch({ ...editingAch, description: e.target.value })}
                  placeholder="e.g. Solve 5 Detective mysteries without using any hints."
                  className="mt-1 w-full bg-navy-950 border border-navy-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase">Category Track</label>
                  <select
                    value={editingAch.category || 'general'}
                    onChange={(e) => setEditingAch({ ...editingAch, category: e.target.value as any })}
                    className="mt-1 w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="general">General</option>
                    <option value="logic">Logic</option>
                    <option value="detective">Detective</option>
                    <option value="streak">Streak</option>
                    <option value="sprint">Sprint</option>
                    <option value="riddles">Riddles</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase">Required Count</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={editingAch.requirement || 1}
                    onChange={(e) => setEditingAch({ ...editingAch, requirement: parseInt(e.target.value) || 1 })}
                    className="mt-1 w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-navy-800 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingAch(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-navy-950 transition-colors"
                >
                  Save Milestone Definition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
