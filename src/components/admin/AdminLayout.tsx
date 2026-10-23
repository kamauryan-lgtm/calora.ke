import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  Sliders, 
  Palette, 
  Users, 
  Trophy, 
  Award, 
  CreditCard, 
  Flag, 
  FileText, 
  LogOut, 
  ExternalLink, 
  Menu, 
  X, 
  Brain, 
  ShieldCheck, 
  Database,
  ChevronRight
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { OverviewTab } from './tabs/OverviewTab';
import { PuzzleStudioTab } from './tabs/PuzzleStudioTab';
import { DailyManagerTab } from './tabs/DailyManagerTab';
import { GameplaySettingsTab } from './tabs/GameplaySettingsTab';
import { BrandingTab } from './tabs/BrandingTab';
import { UserManagementTab } from './tabs/UserManagementTab';
import { LeaderboardsTab } from './tabs/LeaderboardsTab';
import { AchievementsTab } from './tabs/AchievementsTab';
import { MonetizationTab } from './tabs/MonetizationTab';
import { FeatureFlagsTab } from './tabs/FeatureFlagsTab';
import { AuditLogTab } from './tabs/AuditLogTab';

type AdminTab = 
  | 'overview' 
  | 'puzzles' 
  | 'daily' 
  | 'gameplay' 
  | 'branding' 
  | 'users' 
  | 'leaderboards' 
  | 'achievements' 
  | 'monetization' 
  | 'flags' 
  | 'audit';

interface AdminLayoutProps {
  onExitToSite: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onExitToSite }) => {
  const { adminSession, adminLogout, branding } = useGame();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'puzzles', label: 'Puzzle Studio', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'daily', label: 'Daily Challenge', icon: <Calendar className="w-4 h-4" /> },
    { id: 'gameplay', label: 'Gameplay & Scoring', icon: <Sliders className="w-4 h-4" /> },
    { id: 'branding', label: 'Branding & Copy', icon: <Palette className="w-4 h-4" /> },
    { id: 'users', label: 'User Management', icon: <Users className="w-4 h-4" /> },
    { id: 'leaderboards', label: 'Leaderboard & Anti-Cheat', icon: <Trophy className="w-4 h-4" /> },
    { id: 'achievements', label: 'Milestones', icon: <Award className="w-4 h-4" /> },
    { id: 'monetization', label: 'Monetization', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'flags', label: 'Feature Flags', icon: <Flag className="w-4 h-4" /> },
    { id: 'audit', label: 'Audit Trail', icon: <FileText className="w-4 h-4" /> }
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab onNavigateTab={(t) => setActiveTab(t as any)} />;
      case 'puzzles': return <PuzzleStudioTab onRefresh={() => {}} />;
      case 'daily': return <DailyManagerTab />;
      case 'gameplay': return <GameplaySettingsTab />;
      case 'branding': return <BrandingTab />;
      case 'users': return <UserManagementTab />;
      case 'leaderboards': return <LeaderboardsTab />;
      case 'achievements': return <AchievementsTab />;
      case 'monetization': return <MonetizationTab />;
      case 'flags': return <FeatureFlagsTab />;
      case 'audit': return <AuditLogTab />;
      default: return <OverviewTab onNavigateTab={(t) => setActiveTab(t as any)} />;
    }
  };

  const handleLogout = () => {
    adminLogout();
    onExitToSite();
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col md:flex-row antialiased selection:bg-sky-500 selection:text-navy-950">
      {/* MOBILE HEADER */}
      <div className="md:hidden flex items-center justify-between p-4 bg-navy-900 border-b border-navy-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white text-sm">Mind Games</span>
            <span className="block text-[10px] text-sky-400 font-mono">ADMIN STUDIO</span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white bg-navy-800 rounded-lg"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* SIDEBAR (Desktop + Mobile Drawer) */}
      <aside 
        className={`fixed md:sticky top-0 h-screen z-40 bg-navy-900/95 md:bg-navy-900/80 backdrop-blur-xl border-r border-navy-800 flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        } ${mobileMenuOpen ? 'left-0 right-0 bottom-0 !w-full' : '-left-full md:left-0'}`}
      >
        {/* Brand / Title Header */}
        <div className="p-4 border-b border-navy-800 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-sky-500/20">
              <Brain className="w-5 h-5" />
            </div>
            {sidebarOpen && (
              <div className="truncate">
                <span className="font-bold text-white tracking-tight text-sm block">
                  {branding.siteName}
                </span>
                <span className="text-[10px] font-mono text-sky-400 uppercase tracking-widest block">
                  Control Centre
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-sky-500 text-navy-950 font-bold shadow-md shadow-sky-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-navy-800/60'
                } ${!sidebarOpen && 'justify-center px-0'}`}
                title={item.label}
              >
                <span className={`shrink-0 ${isActive ? 'text-navy-950' : 'text-slate-400'}`}>
                  {item.icon}
                </span>
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Administrator Profile Card & Actions */}
        <div className="p-3 border-t border-navy-800/80 bg-navy-950/40 space-y-2">
          {sidebarOpen ? (
            <div className="p-2.5 rounded-xl bg-navy-900 border border-navy-800/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-300 flex items-center justify-center font-bold text-xs uppercase">
                {adminSession?.username.substring(0, 2) || 'AD'}
              </div>
              <div className="truncate flex-1">
                <div className="text-xs font-bold text-white flex items-center gap-1">
                  {adminSession?.username}
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-mono">
                  {adminSession?.role}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-1">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <button
              onClick={onExitToSite}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-navy-800 transition-colors ${
                !sidebarOpen && 'justify-center px-0'
              }`}
              title="Return to Public Game"
            >
              <ExternalLink className="w-4 h-4 text-sky-400" />
              {sidebarOpen && <span>View Player Arena</span>}
            </button>

            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors ${
                !sidebarOpen && 'justify-center px-0'
              }`}
              title="End Administrator Session"
            >
              <LogOut className="w-4 h-4" />
              {sidebarOpen && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-navy-800/80 bg-navy-900/40 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Admin</span>
            <span className="text-slate-600">/</span>
            <span className="text-white font-bold capitalize">
              {navItems.find(n => n.id === activeTab)?.label}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-[11px] bg-navy-800/80 px-3 py-1.5 rounded-lg border border-navy-700 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Storage DB: <strong className="text-white font-mono">Synchronized</strong></span>
            </div>

            <button
              onClick={onExitToSite}
              className="px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Player Arena</span>
            </button>
          </div>
        </header>

        {/* Tab Content Render */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {renderActiveTab()}
        </main>
      </div>
    </div>
  );
};
