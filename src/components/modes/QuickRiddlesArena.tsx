import React, { useState, useEffect } from 'react';
import { RiddlePuzzle } from '../../types';
import { useGame } from '../../context/GameContext';
import { 
  Lightbulb, 
  HelpCircle, 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Flame, 
  Clock,
  ToggleLeft,
  ToggleRight,
  Send,
  Flag
} from 'lucide-react';
import { RIDDLE_PUZZLES } from '../../data/puzzles/riddles';

interface QuickRiddlesArenaProps {
  initialPuzzle?: RiddlePuzzle;
  onBackToHome: () => void;
}

export const QuickRiddlesArena: React.FC<QuickRiddlesArenaProps> = ({
  initialPuzzle,
  onBackToHome
}) => {
  const { completePuzzle, profile, isPracticeMode } = useGame();

  // Active riddle in session
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (initialPuzzle) {
      const idx = RIDDLE_PUZZLES.findIndex(r => r.id === initialPuzzle.id);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  const puzzle = RIDDLE_PUZZLES[currentIndex];

  // State
  const [inputMode, setInputMode] = useState<'text' | 'mcq'>('text');
  const [textGuess, setTextGuess] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [unlockedHints, setUnlockedHints] = useState<number>(0);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [gaveUp, setGaveUp] = useState<boolean>(false);
  const [pointsWon, setPointsWon] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Timer
  useEffect(() => {
    setStartTime(Date.now());
    setElapsedSeconds(0);
    setHasSubmitted(false);
    setIsCorrect(false);
    setGaveUp(false);
    setTextGuess('');
    setSelectedOption(null);
    setUnlockedHints(0);
    setPointsWon(0);

    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .trim()
      .replace(/^(a|an|the)\s+/, '')
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .trim();
  };

  const checkAnswer = (answerGuess: string): boolean => {
    const cleanGuess = normalize(answerGuess);
    const cleanAnswer = normalize(puzzle.answer);
    if (cleanGuess === cleanAnswer) return true;
    return puzzle.aliases.some(alias => normalize(alias) === cleanGuess);
  };

  const handleSubmitText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textGuess.trim() || hasSubmitted) return;

    const correct = checkAnswer(textGuess);
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

  const handleSelectOption = (opt: string) => {
    if (hasSubmitted) return;
    setSelectedOption(opt);
    const correct = checkAnswer(opt);
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

  const handleGiveUp = () => {
    setGaveUp(true);
    setHasSubmitted(true);
    setIsCorrect(false);
  };

  const handleNextRiddle = () => {
    const nextIdx = (currentIndex + 1) % RIDDLE_PUZZLES.length;
    setCurrentIndex(nextIdx);
  };

  const handlePrevRiddle = () => {
    const prevIdx = (currentIndex - 1 + RIDDLE_PUZZLES.length) % RIDDLE_PUZZLES.length;
    setCurrentIndex(prevIdx);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      
      {/* Top Navigation Bar */}
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
            Riddle {currentIndex + 1} of {RIDDLE_PUZZLES.length}
          </span>
          {!isPracticeMode && (
            <div className="flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-navy-800 text-sky-500">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Riddle Container */}
      <div className="rounded-2xl p-6 sm:p-8 bg-white dark:bg-navy-900 border border-slate-200/90 dark:border-white/10 shadow-2xl backdrop-blur-xl">
        
        {/* Riddle Header info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-500 border border-sky-500/20">
              Quick Riddles
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300">
              {puzzle.difficulty}
            </span>
          </div>

          {/* Text vs MCQ Toggle */}
          <button
            onClick={() => {
              if (!hasSubmitted) {
                setInputMode(prev => (prev === 'text' ? 'mcq' : 'text'));
              }
            }}
            disabled={hasSubmitted}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            {inputMode === 'text' ? <ToggleLeft className="w-4 h-4 text-sky-500" /> : <ToggleRight className="w-4 h-4 text-purple-500" />}
            <span>Mode: {inputMode === 'text' ? 'Free Text' : 'Multiple Choice'}</span>
          </button>
        </div>

        <h2 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white mb-6">
          {puzzle.title}
        </h2>

        {/* Prompt Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-sky-50/30 dark:from-navy-850 dark:to-navy-800 border border-slate-200/80 dark:border-white/10 mb-6">
          <p className="font-serif italic text-lg sm:text-xl text-slate-800 dark:text-slate-100 leading-relaxed text-center">
            "{puzzle.prompt}"
          </p>
        </div>

        {/* Input Interface */}
        {!hasSubmitted ? (
          <div>
            {inputMode === 'text' ? (
              <form onSubmit={handleSubmitText} className="flex gap-2">
                <input
                  type="text"
                  value={textGuess}
                  onChange={(e) => setTextGuess(e.target.value)}
                  placeholder="Type your answer here..."
                  autoFocus
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                />
                <button
                  type="submit"
                  disabled={!textGuess.trim()}
                  className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition-all"
                >
                  <span>Submit</span>
                  <Send className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {puzzle.options?.map((opt, i) => (
                  <button
                    key={opt}
                    onClick={() => handleSelectOption(opt)}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-800/80 hover:bg-sky-500/10 hover:border-sky-500 text-left text-sm font-semibold text-slate-800 dark:text-slate-200 transition-all flex items-center justify-between group"
                  >
                    <span>{opt}</span>
                    <span className="text-xs font-mono text-slate-400 group-hover:text-sky-500">
                      [{i + 1}]
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Hint & Give Up Bar */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleUnlockHint}
                disabled={unlockedHints >= puzzle.hints.length}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 disabled:opacity-40 transition-colors"
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

              <button
                type="button"
                onClick={handleGiveUp}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Give Up & Show Answer</span>
              </button>
            </div>
          </div>
        ) : (
          /* Result Feedback Card */
          <div className="space-y-4 animate-pop">
            <div
              className={`p-5 rounded-2xl border flex items-start gap-4 ${
                isCorrect
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-100'
              }`}
            >
              {isCorrect ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-7 h-7 text-rose-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-extrabold text-lg">
                    {isCorrect ? 'Brilliant Deduction!' : gaveUp ? 'Answer Revealed' : 'Not Quite Right'}
                  </h4>
                  {isCorrect && !isPracticeMode && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-500 text-white shadow-sm">
                      +{pointsWon} XP
                    </span>
                  )}
                </div>

                <div className="mt-2 text-sm">
                  The correct answer is:{' '}
                  <span className="font-bold uppercase tracking-wider text-sky-500 dark:text-sky-400">
                    {puzzle.answer}
                  </span>
                </div>

                <p className="mt-2 text-xs opacity-90 leading-relaxed">
                  {puzzle.explanation}
                </p>
              </div>
            </div>

            {/* Navigation / Next Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  setHasSubmitted(false);
                  setIsCorrect(false);
                  setGaveUp(false);
                  setTextGuess('');
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>

              <button
                onClick={handleNextRiddle}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20 transition-all"
              >
                <span>Next Riddle</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Hints Display Drawer */}
        {unlockedHints > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 space-y-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              Progressive Hints ({unlockedHints}/{puzzle.hints.length})
            </h5>
            {puzzle.hints.slice(0, unlockedHints).map((hint, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2 animate-pop"
              >
                <span className="font-bold text-amber-500">#{idx + 1}:</span>
                <span>{hint}</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
