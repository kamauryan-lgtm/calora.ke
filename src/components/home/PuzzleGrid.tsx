import React from 'react';
import { BasePuzzle } from '../../types';
import { useGame } from '../../context/GameContext';
import { 
  Clock, 
  Users, 
  Star, 
  CheckCircle2, 
  Play, 
  Share2, 
  HelpCircle, 
  Cpu, 
  Search, 
  Grid, 
  Lightbulb,
  Calculator,
  BrainCircuit,
  BookOpen
} from 'lucide-react';

interface PuzzleGridProps {
  puzzles: BasePuzzle[];
}

export const PuzzleGrid: React.FC<PuzzleGridProps> = ({ puzzles }) => {
  const { launchPuzzle, profile, setShareModalData } = useGame();

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Logic': return <Cpu className="w-3.5 h-3.5 text-indigo-400" />;
      case 'Riddles': return <HelpCircle className="w-3.5 h-3.5 text-sky-400" />;
      case 'Pattern Recognition': return <Grid className="w-3.5 h-3.5 text-purple-400" />;
      case 'Detective Mysteries': return <Search className="w-3.5 h-3.5 text-amber-400" />;
      case 'Mathematics': return <Calculator className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Lateral Thinking': return <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />;
      case 'Memory': return <BrainCircuit className="w-3.5 h-3.5 text-pink-400" />;
      case 'Word Games': return <BookOpen className="w-3.5 h-3.5 text-cyan-400" />;
      default: return <Cpu className="w-3.5 h-3.5 text-sky-400" />;
    }
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'Easy': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Hard': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'Expert': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
    }
  };

  if (puzzles.length === 0) {
    return (
      <div className="py-16 text-center rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-navy-900/40">
        <HelpCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="font-display font-bold text-lg text-slate-800 dark:text-slate-200">
          No challenges matched your filters
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          Try loosening your difficulty filters or search query to explore other brain teasers.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {puzzles.map(puzzle => {
        const solveData = profile.completedPuzzles[puzzle.id];
        const isSolved = Boolean(solveData?.solved);

        return (
          <div
            key={puzzle.id}
            className="group relative rounded-2xl p-5 bg-white dark:bg-navy-900/80 border border-slate-200/90 dark:border-white/10 hover:border-sky-500/40 dark:hover:border-sky-500/40 transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1"
          >
            {/* Top metadata row */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-navy-800 border border-slate-200 dark:border-white/5">
                  {getCategoryIcon(puzzle.category)}
                  <span className="text-slate-700 dark:text-slate-300">{puzzle.category}</span>
                </div>
                
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${getDifficultyBadge(puzzle.difficulty)}`}>
                  {puzzle.difficulty}
                </span>
              </div>

              {/* Title & description */}
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white group-hover:text-sky-500 transition-colors line-clamp-1 mb-1.5">
                {puzzle.title}
              </h3>
              
              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                {puzzle.description}
              </p>
            </div>

            {/* Bottom stats & Launch row */}
            <div className="pt-3 border-t border-slate-100 dark:border-white/5">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3 font-medium">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-sky-500" />
                  {puzzle.estimatedTime}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  {puzzle.rating}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {puzzle.playsCount.toLocaleString()} plays
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => launchPuzzle(puzzle)}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                    isSolved
                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-900 hover:bg-sky-600 dark:bg-sky-500 dark:hover:bg-sky-400 text-white shadow-sky-500/20'
                  }`}
                >
                  {isSolved ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Solved ({solveData.bestScore} pts)</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Solve Challenge</span>
                    </>
                  )}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShareModalData({ isOpen: true, puzzle, score: solveData?.bestScore });
                  }}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 hover:text-sky-500 hover:border-sky-500/30 dark:hover:bg-white/5 transition-colors"
                  title="Share this puzzle with friends"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
};
