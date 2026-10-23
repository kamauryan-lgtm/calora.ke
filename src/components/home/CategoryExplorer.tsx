import React from 'react';
import { Category } from '../../types';
import { 
  Cpu, 
  HelpCircle, 
  Grid, 
  Search, 
  Calculator, 
  Lightbulb, 
  BrainCircuit, 
  BookOpen 
} from 'lucide-react';

interface CategoryExplorerProps {
  selectedCategory: Category | 'All';
  onSelectCategory: (category: Category | 'All') => void;
}

interface CategoryMeta {
  category: Category;
  icon: React.ReactNode;
  subtitle: string;
  color: string;
  count: number;
}

export const CategoryExplorer: React.FC<CategoryExplorerProps> = ({
  selectedCategory,
  onSelectCategory
}) => {
  const categories: CategoryMeta[] = [
    {
      category: 'Logic',
      icon: <Cpu className="w-5 h-5 text-indigo-400" />,
      subtitle: 'Grids, deductions & truth tellers',
      color: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30',
      count: 4
    },
    {
      category: 'Riddles',
      icon: <HelpCircle className="w-5 h-5 text-sky-400" />,
      subtitle: 'Poetic enigmas & dual meanings',
      color: 'from-sky-500/20 to-sky-600/10 border-sky-500/30',
      count: 8
    },
    {
      category: 'Pattern Recognition',
      icon: <Grid className="w-5 h-5 text-purple-400" />,
      subtitle: 'Visual matrices & number sequences',
      color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
      count: 4
    },
    {
      category: 'Detective Mysteries',
      icon: <Search className="w-5 h-5 text-amber-400" />,
      subtitle: 'Crime scene dossiers & forensics',
      color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
      count: 2
    },
    {
      category: 'Mathematics',
      icon: <Calculator className="w-5 h-5 text-emerald-400" />,
      subtitle: 'Weighing paradoxes & numeric puzzles',
      color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
      count: 3
    },
    {
      category: 'Lateral Thinking',
      icon: <Lightbulb className="w-5 h-5 text-yellow-400" />,
      subtitle: 'Assumption-shattering scenarios',
      color: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
      count: 3
    },
    {
      category: 'Memory',
      icon: <BrainCircuit className="w-5 h-5 text-pink-400" />,
      subtitle: 'Sequence & matrix recall retention',
      color: 'from-pink-500/20 to-pink-600/10 border-pink-500/30',
      count: 2
    },
    {
      category: 'Word Games',
      icon: <BookOpen className="w-5 h-5 text-cyan-400" />,
      subtitle: 'Ciphers, homophones & letter shifts',
      color: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
      count: 2
    }
  ];

  return (
    <div className="my-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">
            Explore Categories
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select a discipline to sharpen specific cognitive faculties.
          </p>
        </div>

        {selectedCategory !== 'All' && (
          <button
            onClick={() => onSelectCategory('All')}
            className="text-xs font-semibold text-sky-500 hover:text-sky-400"
          >
            Show All Categories
          </button>
        )}
      </div>

      {/* Categories Horizontal / Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {categories.map(cat => {
          const isSelected = selectedCategory === cat.category;
          return (
            <div
              key={cat.category}
              onClick={() => onSelectCategory(isSelected ? 'All' : cat.category)}
              className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 select-none ${
                isSelected
                  ? 'bg-sky-500/15 border-sky-500 shadow-md shadow-sky-500/15 scale-[1.02]'
                  : 'bg-white/80 dark:bg-navy-900/60 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-navy-800">
                  {cat.icon}
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {cat.count} puzzles
                </span>
              </div>
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white mb-0.5">
                {cat.category}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                {cat.subtitle}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
