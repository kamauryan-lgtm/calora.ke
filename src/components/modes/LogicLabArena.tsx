import React, { useState, useEffect } from 'react';
import { LogicPuzzle } from '../../types';
import { useGame } from '../../context/GameContext';
import { 
  Cpu, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Clock, 
  Check, 
  X, 
  RotateCcw,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { LOGIC_PUZZLES } from '../../data/puzzles/logicPuzzles';

interface LogicLabArenaProps {
  initialPuzzle?: LogicPuzzle;
  onBackToHome: () => void;
}

export const LogicLabArena: React.FC<LogicLabArenaProps> = ({
  initialPuzzle,
  onBackToHome
}) => {
  const { completePuzzle, isPracticeMode } = useGame();

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (initialPuzzle) {
      const idx = LOGIC_PUZZLES.findIndex(p => p.id === initialPuzzle.id);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  const puzzle = LOGIC_PUZZLES[currentIndex];

  // Interactive Grid state: key is `catAItem_catBItem` -> 'empty' | 'no' | 'yes'
  const [gridCells, setGridCells] = useState<Record<string, 'empty' | 'no' | 'yes'>>({});
  // Clues checked off by player
  const [checkedClues, setCheckedClues] = useState<Record<number, boolean>>({});
  // Knights/Knaves hypothesis state
  const [suspectHypotheses, setSuspectHypotheses] = useState<Record<string, 'knight' | 'knave'>>({
    vance: 'knight',
    zephyr: 'knave'
  });

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [pointsWon, setPointsWon] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    setGridCells({});
    setCheckedClues({});
    setSelectedOptionId(null);
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

  const handleCellClick = (key: string) => {
    setGridCells(prev => {
      const current = prev[key] || 'empty';
      let next: 'empty' | 'no' | 'yes' = 'no';
      if (current === 'empty') next = 'no';
      else if (current === 'no') next = 'yes';
      else next = 'empty';
      return { ...prev, [key]: next };
    });
  };

  const toggleClue = (idx: number) => {
    setCheckedClues(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleSubmit = () => {
    if (!selectedOptionId || hasSubmitted) return;

    const chosen = puzzle.options.find(o => o.id === selectedOptionId);
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
    setCurrentIndex(prev => (prev + 1) % LOGIC_PUZZLES.length);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      
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
            Puzzle {currentIndex + 1} of {LOGIC_PUZZLES.length}
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
        
        {/* Title & Metadata */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5" />
              Logic Lab
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300">
              {puzzle.difficulty}
            </span>
          </div>

          <h2 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">
            {puzzle.title}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
            {puzzle.scenario}
          </p>
        </div>

        {/* Clues Card */}
        <div className="p-5 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200/80 dark:border-white/5 space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Deduction Clues (Click to mark off as applied):
          </h4>
          <div className="space-y-2">
            {puzzle.clues.map((clue, idx) => {
              const isDone = Boolean(checkedClues[idx]);
              return (
                <div
                  key={idx}
                  onClick={() => toggleClue(idx)}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center gap-3 select-none ${
                    isDone 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-400 line-through' 
                      : 'bg-white dark:bg-navy-900 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:border-sky-500/30'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isDone ? 'bg-emerald-500 text-white border-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                    {isDone && <Check className="w-3 h-3" />}
                  </div>
                  <span>{clue}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive Deduction Grid (if gridConfig exists) */}
        {puzzle.gridConfig && (
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200/80 dark:border-white/5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                <span>Interactive Elimination Matrix</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                Click cell to toggle: [Blank] → ❌ (Eliminate) → ✔️ (Confirm)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-navy-800 text-left font-bold text-slate-600 dark:text-slate-300">
                      {puzzle.gridConfig.categoryA.name}
                    </th>
                    {puzzle.gridConfig.categoryB.items.map(bItem => (
                      <th
                        key={bItem}
                        className="p-2 border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-navy-800 text-center font-bold text-slate-600 dark:text-slate-300"
                      >
                        {bItem}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {puzzle.gridConfig.categoryA.items.map(aItem => (
                    <tr key={aItem}>
                      <td className="p-2 border border-slate-200 dark:border-white/10 font-bold bg-slate-50 dark:bg-navy-900 text-slate-700 dark:text-slate-200">
                        {aItem}
                      </td>
                      {puzzle.gridConfig?.categoryB.items.map(bItem => {
                        const cellKey = `${aItem}_${bItem}`;
                        const cellState = gridCells[cellKey] || 'empty';

                        return (
                          <td
                            key={bItem}
                            onClick={() => handleCellClick(cellKey)}
                            className={`p-3 border border-slate-200 dark:border-white/10 text-center cursor-pointer transition-colors font-bold select-none ${
                              cellState === 'yes'
                                ? 'bg-emerald-500/20 text-emerald-500 font-extrabold text-base'
                                : cellState === 'no'
                                  ? 'bg-rose-500/10 text-rose-500 text-base'
                                  : 'hover:bg-slate-200/50 dark:hover:bg-white/5'
                            }`}
                          >
                            {cellState === 'yes' ? '✔️' : cellState === 'no' ? '❌' : '·'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Question & Answer Options */}
        <div className="space-y-4 pt-2">
          <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
            {puzzle.question}
          </h3>

          <div className="space-y-2.5">
            {puzzle.options.map(option => {
              const isSelected = selectedOptionId === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => !hasSubmitted && setSelectedOptionId(option.id)}
                  disabled={hasSubmitted}
                  className={`w-full p-4 rounded-xl text-left text-sm font-semibold border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-500/15 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-sm'
                      : 'bg-slate-50 dark:bg-navy-800/70 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <span>{option.text}</span>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-500 text-white border-indigo-500' : 'border-slate-300 dark:border-slate-600'}`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          {!hasSubmitted ? (
            <button
              onClick={handleSubmit}
              disabled={!selectedOptionId}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all mt-4"
            >
              Verify Deduction
            </button>
          ) : (
            /* Result and Step-by-Step Logic Proof */
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
                      {isCorrect ? 'Flawless Deduction!' : 'Incomplete Proof'}
                    </h4>
                    {isCorrect && !isPracticeMode && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white">
                        +{pointsWon} XP
                      </span>
                    )}
                  </div>
                  <p className="text-xs opacity-90 mt-1">
                    {isCorrect ? 'Every premise holds and no contradictions remain.' : 'Your deduction violated one of the constraints.'}
                  </p>
                </div>
              </div>

              {/* Step by Step Proof Explanation */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-white/10 space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  Step-by-Step Logical Proof:
                </h5>
                <pre className="text-xs font-sans text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {puzzle.solutionExplanation}
                </pre>
              </div>

              {/* Next Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNextPuzzle}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20"
                >
                  <span>Next Logic Puzzle</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
