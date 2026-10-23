import React, { useState, useEffect } from 'react';
import { useGame } from './context/GameContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Hero } from './components/home/Hero';
import { DailyTeaserCard } from './components/home/DailyTeaserCard';
import { CategoryExplorer } from './components/home/CategoryExplorer';
import { DifficultyFilter } from './components/home/DifficultyFilter';
import { PuzzleGrid } from './components/home/PuzzleGrid';
import { DailyLeaderboard } from './components/home/DailyLeaderboard';
import { ProgressSummary } from './components/home/ProgressSummary';

// Game Arenas
import { QuickRiddlesArena } from './components/modes/QuickRiddlesArena';
import { LogicLabArena } from './components/modes/LogicLabArena';
import { DetectiveArena } from './components/modes/DetectiveArena';
import { PatternMasterArena } from './components/modes/PatternMasterArena';
import { BrainSprintArena } from './components/modes/BrainSprintArena';
import { LateralArena } from './components/modes/LateralArena';
import { ExtendedPuzzleArena } from './components/modes/ExtendedPuzzleArena';

// Admin Components
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminLogin } from './components/admin/AdminLogin';

// Modals
import { ProfileModal } from './components/modals/ProfileModal';
import { ShareModal } from './components/modals/ShareModal';
import { ProModal } from './components/modals/ProModal';
import { AuthModal } from './components/modals/AuthModal';
import { ToastContainer } from './components/common/ToastContainer';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

import { ALL_PUZZLES, getPuzzleById } from './data/puzzles';
import { ExtendedPuzzle } from './data/puzzles/mathWordPuzzles';
import { Category, Difficulty, RiddlePuzzle, LogicPuzzle, DetectiveCase, PatternPuzzle, LateralPuzzle } from './types';

export const AppContent: React.FC = () => {
  const { 
    activeMode, 
    setActiveMode, 
    activePuzzle, 
    setActivePuzzle,
    launchPuzzle,
    authModalOpen,
    setAuthModalOpen,
    profileModalOpen,
    setProfileModalOpen,
    shareModalData,
    setShareModalData,
    proModalOpen,
    setProModalOpen,
    isAdmin,
    adminSession,
    featureFlags,
    branding
  } = useGame();

  // Filters state on home
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Handle URL deep-linking on mount (e.g. ?puzzle=riddle-1 or /admin or ?mode=admin)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const puzzleId = params.get('puzzle') || params.get('challenge');
      const modeParam = params.get('mode');

      if (path === '/admin' || modeParam === 'admin') {
        setActiveMode('admin');
      } else if (puzzleId) {
        const target = getPuzzleById(puzzleId);
        if (target) {
          launchPuzzle(target);
        }
      }
    }
  }, []);

  const handleBackToHome = () => {
    setActiveMode('home');
    setActivePuzzle(null);
    if (typeof window !== 'undefined' && window.location.pathname === '/admin') {
      window.history.pushState({}, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filtered puzzle list
  const filteredPuzzles = ALL_PUZZLES.filter(puzzle => {
    if (selectedCategory !== 'All' && puzzle.category !== selectedCategory) {
      return false;
    }
    if (selectedDifficulty !== 'All' && puzzle.difficulty !== selectedDifficulty) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = puzzle.title.toLowerCase().includes(q);
      const matchDesc = puzzle.description.toLowerCase().includes(q);
      const matchCat = puzzle.category.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCat) return false;
    }
    return true;
  });

  const activeFilterCount = (selectedCategory !== 'All' ? 1 : 0) + (selectedDifficulty !== 'All' ? 1 : 0) + (searchQuery ? 1 : 0);

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setSelectedDifficulty('All');
    setSearchQuery('');
  };

  // If in admin mode, render the Admin Control Centre or Login gate
  if (activeMode === 'admin') {
    if (isAdmin && adminSession) {
      return <AdminLayout onExitToSite={handleBackToHome} />;
    }
    return <AdminLogin onSuccess={() => {}} onCancel={handleBackToHome} />;
  }

  // If Maintenance mode is enabled and user is not an administrator
  if (featureFlags.maintenanceMode && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#070A14] flex flex-col items-center justify-center p-6 text-center text-white antialiased">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-6 shadow-xl shadow-amber-500/10">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold mb-3 font-display">System Maintenance</h1>
        <p className="text-slate-400 max-w-md mb-8 text-sm leading-relaxed">
          {branding.maintenanceNotice || "Mind Games is undergoing scheduled cognitive optimization. Check back shortly!"}
        </p>
        <button
          onClick={() => setActiveMode('admin')}
          className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-slate-300 rounded-xl text-xs font-semibold border border-navy-700 transition-colors flex items-center gap-2"
        >
          <ShieldCheck className="w-4 h-4 text-sky-400" />
          <span>Administrator Access</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#070A14] light:bg-slate-50 transition-colors">
      <Navbar />

      <main className="flex-1">
        {/* VIEW 1: HOME PAGE */}
        {activeMode === 'home' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* Hero */}
            <Hero />

            {/* Daily Brain Teaser Card */}
            <DailyTeaserCard />

            {/* Category Explorer (8 categories) */}
            <CategoryExplorer
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />

            {/* Difficulty Filter Bar & Search */}
            <div className="mt-12">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">
                    Puzzle Vault ({filteredPuzzles.length} Available)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Filter by difficulty or search by topic.
                  </p>
                </div>
              </div>

              <DifficultyFilter
                selectedDifficulty={selectedDifficulty}
                onSelectDifficulty={setSelectedDifficulty}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activeFilterCount={activeFilterCount}
                onResetFilters={handleResetFilters}
              />

              {/* Puzzle Cards Grid */}
              <PuzzleGrid puzzles={filteredPuzzles} />
            </div>

            {/* Daily Challenge Leaderboard */}
            <DailyLeaderboard />

            {/* Progress Summary for Registered / Guest Users */}
            <ProgressSummary />
          </div>
        )}

        {/* VIEW 2: QUICK RIDDLES */}
        {activeMode === 'riddles' && (
          <QuickRiddlesArena
            initialPuzzle={activePuzzle as RiddlePuzzle | undefined}
            onBackToHome={handleBackToHome}
          />
        )}

        {/* VIEW 3: LOGIC LAB */}
        {activeMode === 'logic' && (
          <LogicLabArena
            initialPuzzle={activePuzzle as LogicPuzzle | undefined}
            onBackToHome={handleBackToHome}
          />
        )}

        {/* VIEW 4: DETECTIVE MODE */}
        {activeMode === 'detective' && (
          <DetectiveArena
            initialCase={activePuzzle as DetectiveCase | undefined}
            onBackToHome={handleBackToHome}
          />
        )}

        {/* VIEW 5: PATTERN MASTER */}
        {activeMode === 'patterns' && (
          <PatternMasterArena
            initialPuzzle={activePuzzle as PatternPuzzle | undefined}
            onBackToHome={handleBackToHome}
          />
        )}

        {/* VIEW 6: BRAIN SPRINT */}
        {activeMode === 'sprint' && (
          <BrainSprintArena onBackToHome={handleBackToHome} />
        )}

        {/* VIEW 7: LATERAL THINKING */}
        {activeMode === 'lateral' && (
          <LateralArena
            initialPuzzle={activePuzzle as LateralPuzzle | undefined}
            onBackToHome={handleBackToHome}
          />
        )}

        {/* VIEW 8: EXTENDED PUZZLES (Math, Memory, Word) */}
        {(activeMode === 'math' || activeMode === 'memory' || activeMode === 'word') && activePuzzle && (
          <ExtendedPuzzleArena
            puzzle={activePuzzle as ExtendedPuzzle}
            onBackToHome={handleBackToHome}
          />
        )}
      </main>

      <Footer />

      {/* Global Modals */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      <ShareModal
        data={shareModalData}
        onClose={() => setShareModalData(null)}
      />

      <ProModal
        isOpen={proModalOpen}
        onClose={() => setProModalOpen(false)}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Notifications Toast */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
