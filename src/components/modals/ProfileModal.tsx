import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { ACHIEVEMENTS } from '../../data/achievements';
import { ALL_PUZZLES } from '../../data/puzzles';
import { 
  X, 
  Brain, 
  Award, 
  Flame, 
  Target, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Edit3, 
  Share2 
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { profile, updateUserAvatar, setShareModalData } = useGame();
  const [activeTab, setActiveTab] = useState<'overview' | 'radar' | 'achievements'>('overview');

  if (!isOpen) return null;

  const totalPuzzles = ALL_PUZZLES.length;
  const solvedCount = Object.values(profile.completedPuzzles).filter(p => p.solved).length;
  const accuracy = Math.round((solvedCount / Math.max(1, solvedCount + 2)) * 100);

  const avatars = ['🧠', '🕵️‍♂️', '🦉', '⚡', '💻', '🔮', '🧩', '🚀', '🦊', '👑'];

  // Radar chart points (Logic, Deduction, Pattern, Speed, Lateral, Math)
  // Scaled 0 to 100
  const radarMetrics = [
    { label: 'Logic', value: Math.min(100, (profile.completedPuzzles['logic-1'] ? 40 : 10) + (profile.completedPuzzles['logic-2'] ? 40 : 0) + 20) },
    { label: 'Deduction', value: Math.min(100, (profile.completedPuzzles['case-cyanide-sonata'] ? 60 : 15) + (profile.completedPuzzles['case-blackwood-heist'] ? 30 : 0) + 10) },
    { label: 'Pattern', value: Math.min(100, (profile.completedPuzzles['pattern-1'] ? 45 : 10) + (profile.completedPuzzles['pattern-2'] ? 45 : 0) + 10) },
    { label: 'Speed', value: Math.min(100, profile.sprintStats.bestScore ? Math.min(100, Math.round(profile.sprintStats.bestScore / 4)) : 25) },
    { label: 'Lateral', value: Math.min(100, (profile.completedPuzzles['lateral-1'] ? 50 : 20) + (profile.completedPuzzles['lateral-2'] ? 40 : 0)) },
    { label: 'Mathematics', value: Math.min(100, (profile.completedPuzzles['math-1'] ? 50 : 20) + 30) }
  ];

  // Calculate SVG polygon points for radar
  const centerX = 120;
  const centerY = 120;
  const radius = 80;
  const numPoints = radarMetrics.length;

  const polygonPoints = radarMetrics.map((m, i) => {
    const angle = (Math.PI * 2 / numPoints) * i - Math.PI / 2;
    const r = (m.value / 100) * radius;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-pop">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-500 flex items-center justify-center text-2xl border border-sky-500/30">
              {profile.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-extrabold text-xl text-slate-900 dark:text-white">
                  {profile.username}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-500 border border-sky-500/20">
                  {profile.title}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                {profile.brainScore.toLocaleString()} Brain Points • Streak: {profile.streak}d
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-950/40 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 font-bold border-b-2 transition-all ${
              activeTab === 'overview'
                ? 'border-sky-500 text-sky-500'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Overview & Stats
          </button>
          <button
            onClick={() => setActiveTab('radar')}
            className={`pb-3 font-bold border-b-2 transition-all ${
              activeTab === 'radar'
                ? 'border-sky-500 text-sky-500'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Cognitive Skill Radar
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`pb-3 font-bold border-b-2 transition-all ${
              activeTab === 'achievements'
                ? 'border-sky-500 text-sky-500'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Milestones ({profile.unlockedAchievements.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Choose Avatar Persona:
                </label>
                <div className="flex flex-wrap gap-2">
                  {avatars.map(av => (
                    <button
                      key={av}
                      onClick={() => updateUserAvatar(av)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border transition-all ${
                        profile.avatar === av
                          ? 'bg-sky-500/20 border-sky-500 ring-2 ring-sky-500/40 scale-105'
                          : 'bg-slate-100 dark:bg-navy-800 border-slate-200 dark:border-white/10 hover:border-slate-300'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4 Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-white/5 text-center">
                  <div className="text-[11px] text-slate-400">Total Solved</div>
                  <div className="font-extrabold text-xl text-slate-900 dark:text-white mt-0.5">
                    {solvedCount}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-white/5 text-center">
                  <div className="text-[11px] text-slate-400">Accuracy</div>
                  <div className="font-extrabold text-xl text-emerald-500 mt-0.5">
                    {accuracy}%
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-white/5 text-center">
                  <div className="text-[11px] text-slate-400">Best Streak</div>
                  <div className="font-extrabold text-xl text-amber-500 mt-0.5">
                    {profile.bestStreak}d
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-white/5 text-center">
                  <div className="text-[11px] text-slate-400">Sprint Record</div>
                  <div className="font-extrabold text-xl text-purple-400 mt-0.5">
                    {profile.sprintStats.bestScore || 0}
                  </div>
                </div>
              </div>

              {/* Share stats button */}
              <button
                onClick={() => setShareModalData({ isOpen: true, score: profile.brainScore })}
                className="w-full py-3 rounded-xl bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 dark:hover:bg-navy-750 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 border border-slate-200 dark:border-white/10"
              >
                <Share2 className="w-4 h-4 text-sky-500" />
                <span>Share Your Mind Games Profile Card</span>
              </button>

            </div>
          )}

          {/* Tab 2: Cognitive Skill Radar */}
          {activeTab === 'radar' && (
            <div className="space-y-4 text-center">
              <div>
                <h4 className="font-display font-extrabold text-lg text-slate-900 dark:text-white">
                  Cognitive Faculty Breakdown
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Visual map of your deductive strengths based on completed categories.
                </p>
              </div>

              {/* SVG Radar Visualization */}
              <div className="flex justify-center py-2">
                <svg width="240" height="240" className="overflow-visible">
                  {/* Grid Web Circles */}
                  {gridLevels.map((lvl, idx) => (
                    <polygon
                      key={idx}
                      points={radarMetrics.map((_, i) => {
                        const angle = (Math.PI * 2 / numPoints) * i - Math.PI / 2;
                        const r = lvl * radius;
                        return `${centerX + r * Math.cos(angle)},${centerY + r * Math.sin(angle)}`;
                      }).join(' ')}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      className="text-slate-200 dark:text-white/10"
                    />
                  ))}

                  {/* Axis lines */}
                  {radarMetrics.map((m, i) => {
                    const angle = (Math.PI * 2 / numPoints) * i - Math.PI / 2;
                    const x = centerX + radius * Math.cos(angle);
                    const y = centerY + radius * Math.sin(angle);
                    return (
                      <line
                        key={i}
                        x1={centerX}
                        y1={centerY}
                        x2={x}
                        y2={y}
                        stroke="currentColor"
                        strokeWidth="1"
                        className="text-slate-200 dark:text-white/10"
                      />
                    );
                  })}

                  {/* Filled Value Polygon */}
                  <polygon
                    points={polygonPoints}
                    fill="rgba(56, 189, 248, 0.25)"
                    stroke="#38BDF8"
                    strokeWidth="2"
                    className="drop-shadow-sm"
                  />

                  {/* Labels around perimeter */}
                  {radarMetrics.map((m, i) => {
                    const angle = (Math.PI * 2 / numPoints) * i - Math.PI / 2;
                    const x = centerX + (radius + 20) * Math.cos(angle);
                    const y = centerY + (radius + 18) * Math.sin(angle);
                    return (
                      <text
                        key={i}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="text-[10px] font-bold fill-slate-700 dark:fill-slate-300 font-mono"
                      >
                        {m.label} ({m.value}%)
                      </text>
                    );
                  })}
                </svg>
              </div>

              <p className="text-[11px] text-slate-400 italic">
                *Values update dynamically as you solve more puzzles in each category.
              </p>
            </div>
          )}

          {/* Tab 3: Milestones & Achievements */}
          {activeTab === 'achievements' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 mb-2">
                Unlocked {profile.unlockedAchievements.length} of {ACHIEVEMENTS.length} milestones:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ACHIEVEMENTS.map(ach => {
                  const isUnlocked = profile.unlockedAchievements.includes(ach.id);
                  return (
                    <div
                      key={ach.id}
                      className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                        isUnlocked
                          ? 'bg-amber-500/10 border-amber-500/30 text-slate-900 dark:text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-navy-850/50 border-slate-200 dark:border-white/5 opacity-60'
                      }`}
                    >
                      <div className={`p-2 rounded-lg text-lg shrink-0 ${isUnlocked ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-navy-800 text-slate-400'}`}>
                        {isUnlocked ? '🏆' : '🔒'}
                      </div>
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <span>{ach.title}</span>
                          {isUnlocked && <span className="text-[10px] text-amber-500 font-extrabold">Unlocked</span>}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          {ach.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
