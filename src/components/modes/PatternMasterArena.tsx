import React, { useState, useEffect } from 'react';
import { PatternPuzzle } from '../../types';
import { useGame } from '../../context/GameContext';
import { 
  Grid, 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  ArrowRight,
  BookOpen,
  RotateCcw
} from 'lucide-react';
import { PATTERN_PUZZLES } from '../../data/puzzles/patterns';

interface PatternMasterArenaProps {
  initialPuzzle?: PatternPuzzle;
  onBackToHome: () => void;
}

export const PatternMasterArena: React.FC<PatternMasterArenaProps> = ({
  initialPuzzle,
  onBackToHome
}) => {
  const { completePuzzle, isPracticeMode } = useGame();

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (initialPuzzle) {
      const idx = PATTERN_PUZZLES.findIndex(p => p.id === initialPuzzle.id);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  const puzzle = PATTERN_PUZZLES[currentIndex];

  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [pointsWon, setPointsWon] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    setSelectedChoiceId(null);
    setHasSubmitted(false);
    setIsCorrect(false);
    setPointsWon(0);
    setStartTime(Date.now());
    setElapsedSeconds(0);

    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  const handleSelectChoice = (choiceId: string) => {
    if (hasSubmitted) return;
    setSelectedChoiceId(choiceId);

    const chosen = puzzle.choices.find(c => c.id === choiceId);
    const correct = Boolean(chosen?.isCorrect);
    const durationMs = Date.now() - startTime;

    setIsCorrect(correct);
    setHasSubmitted(true);

    if (correct) {
      const { points } = completePuzzle(puzzle.id, true, 0, durationMs);
      setPointsWon(points);
    } else {
      completePuzzle(puzzle.id, false, 0, durationMs);
    }
  };

  const handleNextPuzzle = () => {
    setCurrentIndex(prev => (prev + 1) % PATTERN_PUZZLES.length);
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
            Pattern {currentIndex + 1} of {PATTERN_PUZZLES.length}
          </span>
          {!isPracticeMode && (
            <div className="flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-navy-800 text-sky-500">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Pattern Card */}
      <div className="rounded-2xl p-6 sm:p-8 bg-white dark:bg-navy-900 border border-slate-200/90 dark:border-white/10 shadow-2xl backdrop-blur-xl space-y-6">
        
        {/* Title */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center gap-1">
              <Grid className="w-3.5 h-3.5" />
              Pattern Master
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

        {/* Display Pattern Canvas / Boxes */}
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-navy-850 border border-slate-200/80 dark:border-white/5 text-center">
          
          {puzzle.displayType === 'sequence' && puzzle.sequenceItems && (
            <div className="flex flex-wrap items-center justify-center gap-3 py-4">
              {puzzle.sequenceItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center font-mono font-bold text-lg sm:text-xl border shadow-sm ${
                    String(item) === '?'
                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/40 animate-pulse'
                      : 'bg-white dark:bg-navy-900 text-slate-900 dark:text-white border-slate-200 dark:border-white/10'
                  }`}
                >
                  {item}
                </div>
              ))}
            </div>
          )}

          {puzzle.displayType === 'matrix_3x3' && (
            <div className="max-w-md mx-auto space-y-2 py-2">
              {puzzle.sequenceItems?.map((row, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 font-mono text-sm text-slate-800 dark:text-slate-200"
                >
                  {row}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 font-semibold text-sm text-slate-700 dark:text-slate-300">
            {puzzle.prompt}
          </div>
        </div>

        {/* Answer Choices Grid */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Select the item that completes the sequence:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {puzzle.choices.map((choice, i) => {
              const isSelected = selectedChoiceId === choice.id;
              return (
                <button
                  key={choice.id}
                  onClick={() => handleSelectChoice(choice.id)}
                  disabled={hasSubmitted}
                  className={`p-4 rounded-xl border text-left text-sm font-semibold transition-all flex items-center justify-between group ${
                    isSelected
                      ? 'bg-purple-500/20 border-purple-500 text-purple-900 dark:text-purple-200 shadow-sm'
                      : 'bg-slate-50 dark:bg-navy-800/80 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:border-purple-500/40'
                  }`}
                >
                  <span>{choice.label}</span>
                  <span className="text-xs font-mono text-slate-400 group-hover:text-purple-400">
                    [{i + 1}]
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Result & Rule Explanation */}
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
                    {isCorrect ? 'Pattern Cracked!' : 'Incorrect Next Item'}
                  </h4>
                  {isCorrect && !isPracticeMode && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white">
                      +{pointsWon} XP
                    </span>
                  )}
                </div>
                <p className="text-xs opacity-90 mt-1">
                  {isCorrect ? 'You deduced the progression algorithm.' : 'Check the underlying rule breakdown below.'}
                </p>
              </div>
            </div>

            {/* Explanation */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-white/10 space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                Underlying Pattern Logic:
              </h5>
              <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                {puzzle.ruleExplanation}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  setHasSubmitted(false);
                  setIsCorrect(false);
                  setSelectedChoiceId(null);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Pattern</span>
              </button>

              <button
                onClick={handleNextPuzzle}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-purple-600/20"
              >
                <span>Next Pattern</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
