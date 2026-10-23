import React, { useState } from 'react';
import { 
  ToggleLeft, 
  ToggleRight, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Sliders, 
  Volume2, 
  Trophy, 
  Sparkles, 
  Users, 
  Calendar, 
  Flame, 
  Flag
} from 'lucide-react';
import { FeatureFlags } from '../../../types';
import { MindGamesDB } from '../../../lib/database';
import { AdminService } from '../../../lib/adminService';
import { useGame } from '../../../context/GameContext';

export const FeatureFlagsTab: React.FC = () => {
  const { adminSession, refreshAppData, featureFlags: currentFlags } = useGame();
  const [flags, setFlags] = useState<FeatureFlags>(() => currentFlags || MindGamesDB.getFeatureFlags());
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleToggle = (key: keyof FeatureFlags) => {
    if (!adminSession) return;
    try {
      const updated = {
        ...flags,
        [key]: !flags[key]
      };
      const result = AdminService.updateFeatureFlags(adminSession.token, updated);
      setFlags(result);
      refreshAppData();
      showFeedback('success', `Feature flag "${key}" set to ${result[key] ? 'ENABLED' : 'DISABLED'}.`);
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const flagConfigs: { key: keyof FeatureFlags; title: string; desc: string; icon: React.ReactNode; critical?: boolean }[] = [
    {
      key: 'maintenanceMode',
      title: 'Platform Maintenance Mode',
      desc: 'Temporarily locks the public player site with an informative maintenance banner. Only authenticated administrators can enter.',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      critical: true
    },
    {
      key: 'guestPlayEnabled',
      title: 'Anonymous Guest Play',
      desc: 'Allow visitors to play puzzles, practice without timers, and generate local brain scores without creating an account.',
      icon: <Users className="w-5 h-5 text-sky-400" />
    },
    {
      key: 'registrationEnabled',
      title: 'User Registration & Account Creation',
      desc: 'Allow new players to sign up for persistent accounts, cross-device sync, and custom monikers.',
      icon: <Users className="w-5 h-5 text-indigo-400" />
    },
    {
      key: 'dailyChallengeEnabled',
      title: 'Daily Teaser & Scheduled Challenges',
      desc: 'Enable the universal 24-hour puzzle challenge with streak multipliers and daily reset scheduling.',
      icon: <Calendar className="w-5 h-5 text-purple-400" />
    },
    {
      key: 'brainSprintEnabled',
      title: 'Brain Sprint Speed Arena',
      desc: '60-second rapid-fire cognitive reflex test with continuous difficulty scaling and streak multipliers.',
      icon: <Flame className="w-5 h-5 text-rose-400" />
    },
    {
      key: 'publicLeaderboardsEnabled',
      title: 'Public Competition & Leaderboards',
      desc: 'Surface top daily rankings and player scoreboards to the public homepage.',
      icon: <Trophy className="w-5 h-5 text-amber-400" />
    },
    {
      key: 'puzzleReportingEnabled',
      title: 'Player Feedback & Puzzle Reporting',
      desc: 'Allow players to flag ambiguous clues, suggest alternative answers, or report typos.',
      icon: <Flag className="w-5 h-5 text-cyan-400" />
    },
    {
      key: 'premiumTiersEnabled',
      title: 'Mind Games Pro & Monetization',
      desc: 'Display premium case paywalls, subscriber perks, and upgrade modal teasers.',
      icon: <Sparkles className="w-5 h-5 text-amber-300" />
    },
    {
      key: 'soundSynthesizerEnabled',
      title: 'Web Audio Sound Synthesizer',
      desc: 'Play procedural synthesised tones on correct answers, hint reveal, timer tick, and round complete.',
      icon: <Volume2 className="w-5 h-5 text-emerald-400" />
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-navy-900/40 p-4 rounded-xl border border-navy-700/50">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-sky-400" />
            System Feature Flags & Maintenance
          </h2>
          <p className="text-sm text-slate-400">
            Instantly enable or disable platform capabilities in real time without code deployment.
          </p>
        </div>
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

      {/* Flags List */}
      <div className="space-y-3">
        {flagConfigs.map((flag) => {
          const isEnabled = flags[flag.key];
          return (
            <div
              key={flag.key}
              className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                flag.critical && isEnabled 
                  ? 'bg-amber-950/30 border-amber-500/50 shadow-lg shadow-amber-500/10' 
                  : isEnabled
                    ? 'bg-navy-900/40 border-navy-700/60'
                    : 'bg-navy-950/30 border-navy-800/40 opacity-70'
              }`}
            >
              <div className="flex items-start gap-3.5 max-w-2xl">
                <div className="p-2.5 bg-navy-800/80 rounded-xl border border-navy-700 shrink-0 mt-0.5">
                  {flag.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{flag.title}</h3>
                    {flag.critical && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40">
                        Critical Switch
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {flag.desc}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleToggle(flag.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isEnabled 
                    ? flag.critical 
                      ? 'bg-amber-500 hover:bg-amber-400 text-navy-950 shadow-md shadow-amber-500/20'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-navy-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                {isEnabled ? (
                  <>
                    <ToggleRight className="w-4 h-4" />
                    <span>Enabled</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4" />
                    <span>Disabled</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
