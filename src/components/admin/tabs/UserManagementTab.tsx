import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  UserCheck, 
  UserX, 
  Edit3, 
  AlertTriangle, 
  Award, 
  Flame, 
  History,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { UserProfile, UserRole } from '../../../types';
import { MindGamesDB } from '../../../lib/database';
import { AdminService } from '../../../lib/adminService';
import { useGame } from '../../../context/GameContext';

export const UserManagementTab: React.FC = () => {
  const { adminSession, isSuperAdmin, refreshAppData } = useGame();
  const [users, setUsers] = useState<UserProfile[]>(() => MindGamesDB.getUsers());
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [editingScoreUser, setEditingScoreUser] = useState<UserProfile | null>(null);
  const [newScoreVal, setNewScoreVal] = useState<number>(0);
  const [scoreReason, setScoreReason] = useState<string>('');
  
  const [suspendingUser, setSuspendingUser] = useState<UserProfile | null>(null);
  const [suspendReason, setSuspendReason] = useState<string>('');

  const [roleChangeUser, setRoleChangeUser] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');

  const [historyUser, setHistoryUser] = useState<UserProfile | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const reloadUsers = () => {
    setUsers(MindGamesDB.getUsers());
    refreshAppData();
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          u.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'suspended' && u.isSuspended) || 
                          (statusFilter === 'active' && !u.isSuspended);
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Handle Score Correction
  const handleSaveScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScoreUser || !adminSession) return;
    try {
      AdminService.correctUserScore(adminSession.token, editingScoreUser.id, newScoreVal, scoreReason);
      showFeedback('success', `Score for ${editingScoreUser.username} updated to ${newScoreVal}.`);
      setEditingScoreUser(null);
      setScoreReason('');
      reloadUsers();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Handle Suspension Toggle
  const handleConfirmSuspension = () => {
    if (!suspendingUser || !adminSession) return;
    try {
      const willSuspend = !suspendingUser.isSuspended;
      AdminService.toggleUserSuspension(adminSession.token, suspendingUser.id, willSuspend, suspendReason);
      showFeedback('success', `User ${suspendingUser.username} ${willSuspend ? 'suspended' : 'restored'}.`);
      setSuspendingUser(null);
      setSuspendReason('');
      reloadUsers();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Handle Role Change
  const handleConfirmRoleChange = () => {
    if (!roleChangeUser || !adminSession) return;
    try {
      AdminService.setUserRole(adminSession.token, roleChangeUser.id, selectedRole);
      showFeedback('success', `User ${roleChangeUser.username} role updated to ${selectedRole}.`);
      setRoleChangeUser(null);
      reloadUsers();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-navy-900/40 p-4 rounded-xl border border-navy-700/50">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" />
            User Management & Authorization
          </h2>
          <p className="text-sm text-slate-400">
            Control registered player profiles, permissions, anti-abuse suspensions, and documented score corrections.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-navy-800/80 px-3 py-1.5 rounded-lg border border-navy-700 text-slate-300">
          <span>Total Records: <strong className="text-white font-mono">{users.length}</strong></span>
          <span className="text-navy-600">|</span>
          <span>Suspended: <strong className="text-amber-400 font-mono">{users.filter(u => u.isSuspended).length}</strong></span>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl border text-sm flex items-center gap-2 transition-all ${
          feedback.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
            : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {feedback.message}
        </div>
      )}

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by username, email, or user ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-navy-900/60 border border-navy-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full bg-navy-900/60 border border-navy-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
          >
            <option value="all">All Roles</option>
            <option value="superadmin">Super Administrators</option>
            <option value="admin">Administrators</option>
            <option value="user">Registered Users</option>
            <option value="guest">Guests</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-navy-900/60 border border-navy-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-navy-900/40 border border-navy-700/60 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-navy-700/60">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Brain Score</th>
                <th className="py-3 px-4">Streak</th>
                <th className="py-3 px-4">Solved</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No users matching the current search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const solvedCount = user.completedPuzzles ? Object.values(user.completedPuzzles).filter(p => p.solved).length : 0;
                  return (
                    <tr key={user.id} className="hover:bg-navy-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl p-1 bg-navy-800 rounded-lg border border-navy-700">{user.avatar}</span>
                          <div>
                            <div className="text-white font-semibold flex items-center gap-1.5">
                              {user.username}
                              {user.role === 'superadmin' && <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />}
                              {user.role === 'admin' && <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />}
                            </div>
                            <div className="text-xs text-slate-400 truncate max-w-[200px]">
                              {user.email || user.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          user.role === 'superadmin' ? 'bg-amber-950/50 text-amber-300 border-amber-500/40' :
                          user.role === 'admin' ? 'bg-sky-950/50 text-sky-300 border-sky-500/40' :
                          user.role === 'user' ? 'bg-indigo-950/50 text-indigo-300 border-indigo-500/40' :
                          'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-sky-300 font-mono font-bold">
                          <Award className="w-3.5 h-3.5 text-sky-400" />
                          {user.brainScore.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-slate-400">{user.title}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-amber-400 font-mono">
                          <Flame className="w-3.5 h-3.5" />
                          {user.streak}d <span className="text-xs text-slate-500">(best: {user.bestStreak}d)</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300">
                        {solvedCount}
                      </td>

                      <td className="py-3 px-4">
                        {user.isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-950/50 text-rose-300 border border-rose-500/40">
                            <UserX className="w-3 h-3" /> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/50 text-emerald-300 border border-emerald-500/40">
                            <UserCheck className="w-3 h-3" /> Active
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Score Correction Button */}
                          <button
                            title="Correct Score"
                            onClick={() => {
                              setEditingScoreUser(user);
                              setNewScoreVal(user.brainScore);
                              setScoreReason('');
                            }}
                            className="p-1.5 bg-navy-800 hover:bg-sky-600/30 text-slate-300 hover:text-sky-300 rounded-lg border border-navy-700 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Role Change (SuperAdmin only) */}
                          {isSuperAdmin && (
                            <button
                              title="Assign Role"
                              onClick={() => {
                                setRoleChangeUser(user);
                                setSelectedRole(user.role);
                              }}
                              className="p-1.5 bg-navy-800 hover:bg-amber-600/30 text-slate-300 hover:text-amber-300 rounded-lg border border-navy-700 transition-colors"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          )}

                          {/* Suspend / Restore */}
                          <button
                            title={user.isSuspended ? 'Restore User' : 'Suspend User'}
                            onClick={() => {
                              setSuspendingUser(user);
                              setSuspendReason('');
                            }}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              user.isSuspended 
                                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60' 
                                : 'bg-rose-950/50 border-rose-500/40 text-rose-300 hover:bg-rose-900/60'
                            }`}
                          >
                            {user.isSuspended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Score Correction with Audit Explanation */}
      {editingScoreUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-sky-400" />
              Documented Score Correction
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              All manual score adjustments are immutably recorded in the platform audit log with actor attribution.
            </p>

            <form onSubmit={handleSaveScore} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase">Target User</label>
                <div className="mt-1 p-2.5 bg-navy-950 rounded-lg border border-navy-800 text-white font-mono text-sm">
                  {editingScoreUser.username} ({editingScoreUser.id})
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase">New Brain Score</label>
                <input
                  type="number"
                  min="0"
                  max="1000000"
                  value={newScoreVal}
                  onChange={(e) => setNewScoreVal(parseInt(e.target.value) || 0)}
                  className="mt-1 w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-sky-500"
                  required
                />
                <span className="text-[11px] text-slate-500">Current score: {editingScoreUser.brainScore}</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase">
                  Reason for Adjustment <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Invalidation of automated script attempt #1029; manual compensation for system glitch."
                  value={scoreReason}
                  onChange={(e) => setScoreReason(e.target.value)}
                  className="mt-1 w-full bg-navy-950 border border-navy-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  required
                />
                <span className="text-[11px] text-slate-500">Minimum 5 characters required for audit trail.</span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-navy-800">
                <button
                  type="button"
                  onClick={() => setEditingScoreUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scoreReason.trim().length < 5}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-navy-950 disabled:opacity-50 transition-colors"
                >
                  Confirm & Log Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Suspension Confirmation */}
      {suspendingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${suspendingUser.isSuspended ? 'text-emerald-400' : 'text-rose-400'}`} />
              {suspendingUser.isSuspended ? 'Restore User Account' : 'Suspend User Account'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {suspendingUser.isSuspended 
                ? `Restoring ${suspendingUser.username} will re-enable access to their saved profile and leaderboards.`
                : `Suspension immediately locks ${suspendingUser.username} out of competitive daily challenges and saves.`}
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase">Reason / Moderation Note</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Multiple rapid puzzle solves under 1200ms threshold; suspicious script behavior."
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="mt-1 w-full bg-navy-950 border border-navy-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-navy-800">
                <button
                  type="button"
                  onClick={() => setSuspendingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSuspension}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                    suspendingUser.isSuspended
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-navy-950'
                      : 'bg-rose-500 hover:bg-rose-400 text-white'
                  }`}
                >
                  {suspendingUser.isSuspended ? 'Confirm Restoration' : 'Confirm Suspension'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Role Assignment (SuperAdmin Only) */}
      {roleChangeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              Assign Role for {roleChangeUser.username}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Roles grant privileged access to editorial puzzle management and platform configuration.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                {(['user', 'admin', 'superadmin'] as UserRole[]).map((r) => (
                  <label
                    key={r}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedRole === r
                        ? 'bg-sky-500/10 border-sky-500/60 text-white'
                        : 'bg-navy-950/60 border-navy-800 text-slate-400 hover:border-navy-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="userRole"
                        value={r}
                        checked={selectedRole === r}
                        onChange={() => setSelectedRole(r)}
                        className="text-sky-500 focus:ring-0"
                      />
                      <span className="capitalize font-semibold text-sm">{r}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {r === 'superadmin' ? 'Full platform control' : r === 'admin' ? 'Puzzle studio & moderation' : 'Standard player'}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-navy-800">
                <button
                  type="button"
                  onClick={() => setRoleChangeUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRoleChange}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-navy-950 transition-colors"
                >
                  Save Role Change
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
