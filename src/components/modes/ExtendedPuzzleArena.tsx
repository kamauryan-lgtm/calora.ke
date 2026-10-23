import React, { useState, useEffect } from 'react';
import { BasePuzzle } from '../../types';
import { ExtendedPuzzle } from '../../data/puzzles/mathWordPuzzles';
import { useGame } from '../../context/GameContext';
import { 
  ArrowLeft, 
  Clock, 
  Lightbulb, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  RotateCcw, 
  ArrowRight,
  BookOpen
} from 'lucide-react';

interface ExtendedPuzzleArenaProps {
  puzzle: ExtendedPuzzle;
  onBackToHome: () => void;
}

export const ExtendedPuzzleArena: React.FC<ExtendedPuzzleArenaProps> = ({
  puzzle,
  onBackToHome
}) => {
  const { completePuzzle, isPracticeMode } = useGame();

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [unlockedHints, setUnlockedHints] = useState<number>(0);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [pointsWon, setPointsWon] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    setSelectedOptionId(null);
    setUnlockedHints(0);
    setHasSubmitted(false);
    setIsCorrect(false);
    setPointsWon(0);
    setStartTime(Date.now());
    setElapsedSeconds(0);

    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [puzzle.id]);

  const handleSubmit = (optionId: string) => {
    if (hasSubmitted) return;
    setSelectedOptionId(optionId);

    const chosen = puzzle.options.find(o => o.id === optionId);
    const correct = Boolean(chosen?.isCorrect);
    const durationMs = Date.now() - startTime;

    setIsCorrect(correct);
    setHasSubmitted(true);

    if (correct) {
      const { points } = completePuzzle(puzzle.id, true, unlockedHints, durationMs);
      setPointsWon(points);
    } else {
      completePuzzle(puzzle.id, false, unlockedHints, durationMs);
    }
  };

  const handleUnlockHint = () => {
    if (unlockedHints < puzzle.hints.length) {
      setUnlockedHints(prev => prev + 1);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/60 dark:border-white/10">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </button>

        {!isPracticeMode && (
          <div className="flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-navy-800 text-sky-500">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>
        )}
      </div>

      <div className="rounded-2xl p-6 sm:p-8 bg-white dark:bg-navy-900 border border-slate-200/90 dark:border-white/10 shadow-2xl backdrop-blur-xl space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-500 border border-sky-500/20">
              {puzzle.category}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300">
              {puzzle.difficulty}
            </span>
          </div>
          <h2 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">
            {puzzle.title}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {puzzle.description}
          </p>
        </div>

        {/* Question Prompt */}
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-navy-850 border border-slate-200/80 dark:border-white/5 font-serif text-base sm:text-lg text-slate-800 dark:text-slate-100 leading-relaxed text-center">
          "{puzzle.question}"
        </div>

        {/* Choices */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Select the correct deduction:
          </label>
          <div className="space-y-2.5">
            {puzzle.options.map(opt => {
              const isSelected = selectedOptionId === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSubmit(opt.id)}
                  disabled={hasSubmitted}
                  className={`w-full p-4 rounded-xl border text-left text-sm font-semibold transition-all flex items-center justify-between group ${
                    isSelected
                      ? 'bg-sky-500/15 border-sky-500 text-sky-900 dark:text-sky-200 shadow-sm'
                      : 'bg-slate-50 dark:bg-navy-800/80 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:border-sky-500/30'
                  }`}
                >
                  <span>{opt.text}</span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'bg-sky-500 border-sky-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Progressive Hints */}
        {!hasSubmitted && (
          <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
            <button
              onClick={handleUnlockHint}
              disabled={unlockedHints >= puzzle.hints.length}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 disabled:opacity-40"
            >
              <Lightbulb className="w-4 h-4" />
              <span>
                {unlockedHints === 0
                  ? 'Get a Hint (-15% pts)'
                  : unlockedHints < puzzle.hints.length
                    ? `Unlock Hint ${unlockedHints + 1} of ${puzzle.hints.length}`
                    : 'All Hints Revealed'}
              </span>
            </button>
          </div>
        )}

        {unlockedHints > 0 && !hasSubmitted && (
          <div className="space-y-2 pt-2 animate-pop">
            {puzzle.hints.slice(0, unlockedHints).map((hint, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
                <strong>Hint #{idx + 1}:</strong> {hint}
              </div>
            ))}
          </div>
        )}

        {/* Result & Explanation */}
        {hasSubmitted && (
          <div className="space-y-4 animate-pop pt-2">
            <div
              className={`p-5 rounded-2xl border flex items-start gap-3 ${
                isCorrect
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-100'
              }`}
            >
              {isCorrect ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-extrabold text-base">
                    {isCorrect ? 'Correct Deduction!' : 'Incorrect Answer'}
                  </h4>
                  {isCorrect && !isPracticeMode && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white">
                      +{pointsWon} XP
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-white/10 space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-sky-500 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                Proof & Explanation:
              </h5>
              <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                {puzzle.explanation}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  setHasSubmitted(false);
                  setIsCorrect(false);
                  setSelectedOptionId(null);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Challenge</span>
              </button>

              <button
                onClick={onBackToHome}
                className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-sky-500/20"
              >
                <span>Back to Library</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
