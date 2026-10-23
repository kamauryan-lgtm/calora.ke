import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Download, 
  Filter, 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  User, 
  Shield, 
  RefreshCw,
  Code
} from 'lucide-react';
import { AuditLogEntry } from '../../../types';
import { MindGamesDB } from '../../../lib/database';
import { AdminService } from '../../../lib/adminService';
import { useGame } from '../../../context/GameContext';

export const AuditLogTab: React.FC = () => {
  const { adminSession } = useGame();
  const [logs, setLogs] = useState<AuditLogEntry[]>(() => MindGamesDB.getAuditLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const reloadLogs = () => {
    setLogs(MindGamesDB.getAuditLogs());
  };

  const handleExportJSON = () => {
    if (!adminSession) return;
    const jsonStr = AdminService.exportAuditLogsJSON(adminSession.token);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindgames_audit_logs_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!adminSession) return;
    const csvStr = AdminService.exportAuditLogsCSV(adminSession.token);
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindgames_audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.targetId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = targetTypeFilter === 'all' || log.targetType === targetTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-navy-900/40 p-4 rounded-xl border border-navy-700/50">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-400" />
            Security Audit Trail & Operation Log
          </h2>
          <p className="text-sm text-slate-400">
            Immutable chronological record of administrative actions, score corrections, and configuration updates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={reloadLogs}
            className="p-2 bg-navy-800 hover:bg-navy-700 text-slate-300 rounded-xl border border-navy-700 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            Export CSV
          </button>
          <button
            onClick={handleExportJSON}
            className="px-3 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by action, administrator, target ID, or detail keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-navy-900/60 border border-navy-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <select
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
            className="w-full bg-navy-900/60 border border-navy-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
          >
            <option value="all">All Target Types</option>
            <option value="puzzle">Puzzles</option>
            <option value="user">Users</option>
            <option value="daily_challenge">Daily Challenge</option>
            <option value="settings">Gameplay Settings</option>
            <option value="branding">Branding</option>
            <option value="feature_flags">Feature Flags</option>
            <option value="achievement">Achievements</option>
            <option value="leaderboard">Leaderboard / Anti-Cheat</option>
            <option value="system">System / Auth</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-navy-900/40 border border-navy-700/60 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-navy-700/60">
              <tr>
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Type</th>
                <th className="py-3 px-4">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No audit records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  const date = new Date(log.timestamp);
                  const hasDiff = log.before !== undefined || log.after !== undefined;

                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        onClick={() => hasDiff && setExpandedId(isExpanded ? null : log.id)}
                        className={`transition-colors ${hasDiff ? 'cursor-pointer hover:bg-navy-800/30' : ''}`}
                      >
                        <td className="py-3 px-4 text-center">
                          {hasDiff ? (
                            isExpanded ? <ChevronDown className="w-4 h-4 text-sky-400" /> : <ChevronRight className="w-4 h-4 text-slate-500" />
                          ) : (
                            <span className="w-4 h-4 inline-block" />
                          )}
                        </td>

                        <td className="py-3 px-4 text-xs font-mono text-slate-400 whitespace-nowrap">
                          {date.toLocaleDateString()} {date.toLocaleTimeString()}
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-semibold text-white flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-sky-400" />
                            {log.actorName}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-bold text-sky-300 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-500/30">
                            {log.action}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
                            {log.targetType}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-xs text-slate-300 max-w-md truncate">
                          {log.details}
                        </td>
                      </tr>

                      {/* Expandable diff view */}
                      {isExpanded && hasDiff && (
                        <tr className="bg-navy-950/70 border-b border-navy-800">
                          <td colSpan={6} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                              {log.before && (
                                <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-xl">
                                  <span className="text-rose-400 font-bold block mb-2 uppercase text-[10px]">
                                    Previous State (Before)
                                  </span>
                                  <pre className="overflow-x-auto text-slate-300 text-[11px]">
                                    {JSON.stringify(log.before, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.after && (
                                <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl">
                                  <span className="text-emerald-400 font-bold block mb-2 uppercase text-[10px]">
                                    New State (After)
                                  </span>
                                  <pre className="overflow-x-auto text-slate-300 text-[11px]">
                                    {JSON.stringify(log.after, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
