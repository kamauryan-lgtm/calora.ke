import React from 'react';
import { Brain, ShieldCheck, Heart, Sparkles, Scale, BookOpen } from 'lucide-react';
import { useGame } from '../../context/GameContext';

export const Footer: React.FC = () => {
  const { setActiveMode, setActivePuzzle, setProModalOpen } = useGame();

  return (
    <footer className="mt-20 border-t border-slate-200/10 dark:border-white/10 bg-slate-50 dark:bg-navy-950/70 text-slate-600 dark:text-slate-400 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          
          {/* Brand & mission */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-white">
                <Brain className="w-4 h-4" />
              </div>
              <span className="font-display font-extrabold text-lg text-slate-900 dark:text-white">
                Mind<span className="text-sky-500">Games</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              "Think sharper. See differently." An interactive sanctuary for curious thinkers, riddle crackers, and deductive minds.
            </p>
            <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Server-verified fair scoring</span>
            </div>
          </div>

          {/* Core Game Modes */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Core Game Modes
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button 
                  onClick={() => { setActiveMode('riddles'); setActivePuzzle(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="hover:text-sky-500 transition-colors"
                >
                  Quick Riddles
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setActiveMode('logic'); setActivePuzzle(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="hover:text-sky-500 transition-colors"
                >
                  Logic Lab
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setActiveMode('detective'); setActivePuzzle(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="hover:text-sky-500 transition-colors"
                >
                  Detective Mode
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setActiveMode('patterns'); setActivePuzzle(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="hover:text-sky-500 transition-colors"
                >
                  Pattern Master
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setActiveMode('sprint'); setActivePuzzle(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="hover:text-sky-500 transition-colors"
                >
                  Brain Sprint
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setActiveMode('lateral'); setActivePuzzle(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="hover:text-sky-500 transition-colors"
                >
                  Lateral Thinking
                </button>
              </li>
            </ul>
          </div>

          {/* Puzzle Categories */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Categories
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li className="text-slate-500 dark:text-slate-400">Logic Deductions & Grids</li>
              <li className="text-slate-500 dark:text-slate-400">Classic & Poetic Riddles</li>
              <li className="text-slate-500 dark:text-slate-400">Abstract Visual Patterns</li>
              <li className="text-slate-500 dark:text-slate-400">Crime Scene Investigations</li>
              <li className="text-slate-500 dark:text-slate-400">Mathematical Curiosities</li>
              <li className="text-slate-500 dark:text-slate-400">Memory Matrix Recalls</li>
            </ul>
          </div>

          {/* Philosophy & Disclaimer */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-sky-500" />
              <span>Scientific Disclaimer</span>
            </h4>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Mind Games is created solely for recreational mental stimulation, logical curiosity, and entertainment. Mind Games does not measure clinical intelligence (IQ) or diagnose cognitive function.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setProModalOpen(true)}
                className="text-xs text-amber-500 hover:text-amber-400 font-semibold flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Explore Mind Games Pro</span>
              </button>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200/10 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div>
            © {new Date().getFullYear()} Mind Games. Built with precision for sharp thinkers worldwide.
          </div>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1">
              Made with <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> for the curious mind
            </span>
            <button
              onClick={() => { setActiveMode('admin'); setActivePuzzle(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="text-slate-400 hover:text-sky-400 flex items-center gap-1.5 transition-colors font-medium"
              title="Access Platform Administration & Control Centre"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Admin Portal</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
