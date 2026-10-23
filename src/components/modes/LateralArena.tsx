import React, { useState, useEffect } from 'react';
import { LateralPuzzle } from '../../types';
import { useGame } from '../../context/GameContext';
import { 
  Lightbulb, 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight,
  HelpCircle,
  AlertTriangle,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { LATERAL_PUZZLES } from '../../data/puzzles/lateralPuzzles';

interface LateralArenaProps {
  initialPuzzle?: LateralPuzzle;
  onBackToHome: () => void;
}

export const LateralArena: React.FC<LateralArenaProps> = ({
  initialPuzzle,
  onBackToHome
}) => {
  const { completePuzzle, isPracticeMode } = useGame();

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (initialPuzzle) {
      const idx = LATERAL_PUZZLES.findIndex(p => p.id === initialPuzzle.id);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  const puzzle = LATERAL_PUZZLES[currentIndex];

  const [revealedInquiries, setRevealedInquiries] = useState<Record<number, boolean>>({});
  const [unlockedHints, setUnlockedHints] = useState<number>(0);
  const [solutionRevealed, setSolutionRevealed] = useState<boolean>(false);
  const [pointsWon, setPointsWon] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    setRevealedInquiries({});
    setUnlockedHints(0);
    setSolutionRevealed(false);
    setPointsWon(0);
    setStartTime(Date.now());
    setElapsedSeconds(0);

    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  const toggleInquiry = (idx: number) => {
    setRevealedInquiries(prev => ({ ...prev, [idx]: true }));
  };

  const handleRevealSolution = () => {
    setSolutionRevealed(true);
    const durationMs = Date.now() - startTime;
    const { points } = completePuzzle(puzzle.id, true, unlockedHints, durationMs);
    setPointsWon(points);
  };

  const handleUnlockHint = () => {
    if (unlockedHints < puzzle.hints.length) {
      setUnlockedHints(prev => prev + 1);
    }
  };

  const handleNextPuzzle = () => {
    setCurrentIndex(prev => (prev + 1) % LATERAL_PUZZLES.length);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/60 dark:border-white/10">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-slate-400">
            Lateral Puzzle {currentIndex + 1} of {LATERAL_PUZZLES.length}
          </span>
          {!isPracticeMode && (
            <div className="flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-navy-800 text-sky-500">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Card */}
      <div className="rounded-2xl p-6 sm:p-8 bg-white dark:bg-navy-900 border border-slate-200/90 dark:border-white/10 shadow-2xl backdrop-blur-xl space-y-6">
        
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5" />
              Lateral Thinking
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300">
              {puzzle.difficulty}
            </span>
          </div>

          <h2 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">
            {puzzle.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {puzzle.description}
          </p>
        </div>

        {/* The Paradoxical Scenario */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/5 to-purple-500/5 border border-amber-500/20">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
            The Situation:
          </h4>
          <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed font-serif whitespace-pre-line">
            {puzzle.scenario}
          </p>
        </div>

        {/* Oracle Inquiries Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-sky-500" />
              <span>Ask the Oracle (Click to test lines of questioning):</span>
            </h4>
          </div>

          <div className="space-y-2">
            {puzzle.inquiries.map((inq, idx) => {
              const isRevealed = Boolean(revealedInquiries[idx]);
              return (
                <div
                  key={idx}
                  onClick={() => toggleInquiry(idx)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    isRevealed
                      ? 'bg-sky-500/10 border-sky-500/30 text-slate-900 dark:text-white'
                      : 'bg-slate-50 dark:bg-navy-850 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:border-sky-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>Q: "{inq.question}"</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      !isRevealed 
                        ? 'bg-slate-200 dark:bg-navy-800 text-slate-500' 
                        : inq.oracleAnswer === 'Crucial' 
                          ? 'bg-amber-500 text-white' 
                          : inq.oracleAnswer === 'Yes' 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-slate-700 text-slate-200'
                    }`}>
                      {isRevealed ? inq.oracleAnswer : 'Ask'}
                    </span>
                  </div>

                  {isRevealed && (
                    <div className="mt-2 text-sky-600 dark:text-sky-300 italic pt-2 border-t border-sky-500/20">
                      💡 {inq.insight}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Progressive Hints & Misconceptions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={handleUnlockHint}
            disabled={unlockedHints >= puzzle.hints.length}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 disabled:opacity-40"
          >
            <Lightbulb className="w-4 h-4" />
            <span>
              {unlockedHints === 0
                ? 'Unlock Progressive Clue'
                : unlockedHints < puzzle.hints.length
                  ? `Reveal Clue ${unlockedHints + 1} of ${puzzle.hints.length}`
                  : 'All Clues Revealed'}
            </span>
          </button>

          {!solutionRevealed && (
            <button
              onClick={handleRevealSolution}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-sky-500 hover:from-amber-400 hover:to-sky-400 text-slate-950 text-xs font-extrabold shadow-md shadow-amber-500/20"
            >
              Reveal Elegant Solution
            </button>
          )}
        </div>

        {/* Revealed Hints */}
        {unlockedHints > 0 && (
          <div className="space-y-2 pt-2 animate-pop">
            {puzzle.hints.slice(0, unlockedHints).map((hint, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200"
              >
                <strong>Clue #{idx + 1}:</strong> {hint}
              </div>
            ))}
          </div>
        )}

        {/* Common Misconceptions Accordion */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-white/5 space-y-2">
          <h5 className="text-[11px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Common Guesses That Fail (And Why):
          </h5>
          <div className="space-y-1.5">
            {puzzle.commonMisconceptions.map((mis, idx) => (
              <div key={idx} className="text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-800 dark:text-slate-100">"{mis.claim}":</span> {mis.whyFalse}
              </div>
            ))}
          </div>
        </div>

        {/* Solution Card */}
        {solutionRevealed && (
          <div className="space-y-4 animate-pop pt-2">
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-100 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-display font-extrabold text-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>The Solution</span>
                </h4>
                {!isPracticeMode && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white">
                    +{pointsWon} XP
                  </span>
                )}
              </div>

              <p className="text-sm leading-relaxed font-serif">
                {puzzle.solution}
              </p>
            </div>

            {/* Insight explanation */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-white/10 space-y-1.5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                The Broken Assumption:
              </h5>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {puzzle.insightExplanation}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleNextPuzzle}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-md shadow-amber-500/20"
              >
                <span>Next Lateral Conundrum</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
