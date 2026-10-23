import React from 'react';
import { Difficulty } from '../../types';
import { Search, Filter, X } from 'lucide-react';

interface DifficultyFilterProps {
  selectedDifficulty: Difficulty | 'All';
  onSelectDifficulty: (difficulty: Difficulty | 'All') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilterCount: number;
  onResetFilters: () => void;
}

export const DifficultyFilter: React.FC<DifficultyFilterProps> = ({
  selectedDifficulty,
  onSelectDifficulty,
  searchQuery,
  onSearchChange,
  activeFilterCount,
  onResetFilters
}) => {
  const difficulties: (Difficulty | 'All')[] = ['All', 'Easy', 'Medium', 'Hard', 'Expert'];

  const getDifficultyColor = (diff: Difficulty | 'All') => {
    switch (diff) {
      case 'Easy': return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
      case 'Medium': return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
      case 'Hard': return 'text-orange-500 border-orange-500/30 bg-orange-500/10';
      case 'Expert': return 'text-rose-500 border-rose-500/30 bg-rose-500/10';
      default: return 'text-sky-500 border-sky-500/30 bg-sky-500/10';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
      
      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search puzzles, riddles, keywords..."
          className="w-full pl-10 pr-9 py-2 rounded-xl text-sm bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Difficulty Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
        <span className="text-xs font-semibold text-slate-400 mr-1 hidden lg:inline flex items-center gap-1">
          <Filter className="w-3 h-3" />
          Difficulty:
        </span>
        {difficulties.map(diff => {
          const isSelected = selectedDifficulty === diff;
          return (
            <button
              key={diff}
              onClick={() => onSelectDifficulty(diff)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap ${
                isSelected
                  ? `${getDifficultyColor(diff)} shadow-sm ring-1 ring-offset-0`
                  : 'bg-white dark:bg-navy-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              {diff === 'All' ? 'All Difficulties' : diff}
            </button>
          );
        })}

        {activeFilterCount > 0 && (
          <button
            onClick={onResetFilters}
            className="px-2 py-1 text-xs text-rose-500 hover:underline font-semibold"
          >
            Reset
          </button>
        )}
      </div>

    </div>
  );
};
