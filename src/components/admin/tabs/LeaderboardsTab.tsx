import React, { useState } from 'react';
import { 
  Trophy, 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Search, 
  Filter, 
  CheckCircle2, 
  User, 
  RefreshCw,
  Eye,
  Sliders
} from 'lucide-react';
import { MindGamesStorage } from '../../../lib/storage';
import { MindGamesDB } from '../../../lib/database';
import { AdminService } from '../../../lib/adminService';
import { useGame } from '../../../context/GameContext';
import { LeaderboardEntry, PuzzleAttempt } from '../../../types';

export const LeaderboardsTab: React.FC = () => {
  const { adminSession, refreshAppData } = useGame();
  const [activeView, setActiveView] = useState<'leaderboard' | 'flagged'>('flagged');
  const [attempts, setAttempts] = useState<PuzzleAttempt[]>(() => MindGamesStorage.getAttempts());
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => MindGamesStorage.getDailyLeaderboard());
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Review modal
  const [selectedAttempt, setSelectedAttempt] = useState<PuzzleAttempt | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const reloadData = () => {
    setAttempts(MindGamesStorage.getAttempts());
    setLeaderboard(MindGamesStorage.getDailyLeaderboard());
    refreshAppData();
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Flagged/suspicious attempts list
  const flaggedAttempts = attempts.filter(a => a.isFlagged || a.reviewStatus === 'pending' || a.durationMs < 1500);

  const handleReview = (status: 'verified' | 'invalidated') => {
    if (!selectedAttempt || !adminSession) return;
    try {
      AdminService.reviewAttempt(adminSession.token, selectedAttempt.id, status, reviewNote);
      showFeedback('success', `Attempt ${selectedAttempt.id} marked as ${status.toUpperCase()}.`);
      setSelectedAttempt(null);
      setReviewNote('');
      reloadData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-navy-900/40 p-4 rounded-xl border border-navy-700/50">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Competitive Leaderboards & Anti-Cheat Moderation
          </h2>
          <p className="text-sm text-slate-400">
            Review suspicious solve times, invalidate exploited runs, and preserve fair competition.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('flagged')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeView === 'flagged' 
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50' 
                : 'bg-navy-800 text-slate-400 hover:text-white border border-navy-700'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Flagged Solves ({flaggedAttempts.filter(a => a.reviewStatus !== 'verified').length})
          </button>
          <button
            onClick={() => setActiveView('leaderboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeView === 'leaderboard' 
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50' 
                : 'bg-navy-800 text-slate-400 hover:text-white border border-navy-700'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Daily Standings
          </button>
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

      {/* VIEW 1: FLAGGED ATTEMPTS */}
      {activeView === 'flagged' && (
        <div className="space-y-4">
          <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-300/90 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              Solves completed under the threshold or marked by the automated speed heuristic require admin clearance.
              Invalidating an attempt deducts any ill-gotten score and expels the run from the daily leaderboard.
            </span>
          </div>

          <div className="bg-navy-900/40 border border-navy-700/60 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-navy-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-navy-700/60">
                  <tr>
                    <th className="py-3 px-4">Attempt ID / Date</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Puzzle / Mode</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Score Awarded</th>
                    <th className="py-3 px-4">Flag Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800/60 font-medium">
                  {flaggedAttempts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500/40" />
                        No suspicious solves detected. All player attempts look clean!
                      </td>
                    </tr>
                  ) : (
                    flaggedAttempts.map((att) => {
                      return (
                        <tr key={att.id} className="hover:bg-navy-800/30 transition-colors">
                          <td className="py-3 px-4 font-mono text-xs text-slate-400">
                            <div>{att.id}</div>
                            <div className="text-[11px] text-slate-500">{new Date(att.timestamp).toLocaleTimeString()}</div>
                          </td>

                          <td className="py-3 px-4 text-white font-medium">
                            <span className="font-mono text-xs">{att.userId}</span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="text-sky-300 font-semibold">{att.puzzleId}</span>
                            <span className="block text-[11px] text-slate-500 capitalize">{att.mode}</span>
                          </td>

                          <td className="py-3 px-4 font-mono text-rose-300 font-bold">
                            {(att.durationMs / 1000).toFixed(2)}s
                          </td>

                          <td className="py-3 px-4 font-mono text-amber-300">
                            +{att.scoreAwarded}
                          </td>

                          <td className="py-3 px-4 text-xs text-slate-300 max-w-xs truncate">
                            {att.flagReason || 'Rapid solve below anti-cheat threshold'}
                          </td>

                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                              att.reviewStatus === 'verified' ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40' :
                              att.reviewStatus === 'invalidated' ? 'bg-rose-950/50 text-rose-300 border-rose-500/40' :
                              'bg-amber-950/50 text-amber-300 border-amber-500/40'
                            }`}>
                              {att.reviewStatus || 'pending'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedAttempt(att);
                                setReviewNote('');
                              }}
                              className="px-3 py-1 bg-navy-800 hover:bg-sky-600/30 text-sky-400 border border-navy-700 rounded-lg text-xs font-semibold transition-colors"
                            >
                              Inspect & Adjudicate
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DAILY LEADERBOARD STANDINGS */}
      {activeView === 'leaderboard' && (
        <div className="bg-navy-900/40 border border-navy-700/60 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-navy-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Active Daily Challenge Standings
            </h3>
            <button
              onClick={reloadData}
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-navy-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-navy-700/60">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Hints</th>
                  <th className="py-3 px-4">Badge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/60 font-medium">
                {leaderboard.map((entry) => (
                  <tr key={entry.rank} className={`hover:bg-navy-800/30 transition-colors ${entry.isCurrentUser ? 'bg-sky-500/10' : ''}`}>
                    <td className="py-3 px-4 font-bold font-mono text-slate-300">
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{entry.avatar}</span>
                        <span className="text-white font-semibold">{entry.username}</span>
                        {entry.isCurrentUser && (
                          <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded">You</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">
                      {entry.score}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {entry.durationFormatted}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {entry.hintsUsed}
                    </td>
                    <td className="py-3 px-4 text-xs text-sky-400">
                      {entry.badge || 'Adept'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Review & Adjudicate Flagged Attempt */}
      {selectedAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              Adjudicate Suspicious Solve
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Investigate the solve duration and choose whether to confirm authenticity or invalidate the run.
            </p>

            <div className="space-y-3 bg-navy-950/70 p-4 rounded-xl border border-navy-800 text-xs mb-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Attempt ID:</span>
                <span className="font-mono text-white">{selectedAttempt.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Puzzle:</span>
                <span className="text-sky-300 font-bold">{selectedAttempt.puzzleId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recorded Solve Duration:</span>
                <span className="font-mono text-rose-400 font-bold">
                  {(selectedAttempt.durationMs / 1000).toFixed(3)} seconds ({selectedAttempt.durationMs}ms)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Points Awarded:</span>
                <span className="font-mono text-amber-400 font-bold">+{selectedAttempt.scoreAwarded}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hints Used:</span>
                <span className="text-slate-300">{selectedAttempt.hintsUsed}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase">
                  Adjudication Note / Audit Reason
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Inhuman reaction time under 800ms confirms bot replay; invalidating."
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="mt-1 w-full bg-navy-950 border border-navy-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex justify-between gap-3 pt-3 border-t border-navy-800">
                <button
                  type="button"
                  onClick={() => setSelectedAttempt(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
                >
                  Cancel
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleReview('verified')}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-navy-950 transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Verify Legitimate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReview('invalidated')}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-400 text-white transition-colors flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Invalidate & Deduct
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
