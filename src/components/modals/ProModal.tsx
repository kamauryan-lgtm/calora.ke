import React from 'react';
import { useGame } from '../../context/GameContext';
import { X, Sparkles, Check, ShieldCheck, Star, Trophy, BookOpen } from 'lucide-react';

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProModal: React.FC<ProModalProps> = ({ isOpen, onClose }) => {
  const { addToast } = useGame();

  if (!isOpen) return null;

  const handleUnlockDemo = () => {
    addToast('✨ Pro Case Files & Masterclass features unlocked in demo preview!', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-pop">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mind Games Pro</span>
          </div>

          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">
            For the Uncompromising Mind
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Elevate your deductive journey with premium forensic mystery cases and grandmaster collections.
          </p>
        </div>

        {/* Transparent Guarantee Callout */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-white/5 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>
            <strong>Our Transparent Ethics Guarantee:</strong> Daily puzzles, basic game modes, and full explanations are 100% FREE forever. We never charge to view answers, hints, or correct inputs.
          </span>
        </div>

        {/* Pro Features List */}
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-200">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Uncut Detective Case Files (The Cyanide Sonata, Blackwood Manor Heist)</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-200">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Grandmaster Logic Grids & Unlimited Practice Sandbox</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-200">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Official Weekly Mystery Tournaments with Global Badges</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-200">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Ad-free pristine cognitive environment & custom Noir themes</span>
          </div>
        </div>

        {/* Pricing Card */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-sky-500/10 border border-amber-500/30 text-center">
          <div className="text-xs text-slate-400 font-medium">Early Member Pass</div>
          <div className="font-display font-extrabold text-2xl text-slate-900 dark:text-white mt-0.5">
            $4.99 <span className="text-xs font-normal text-slate-400">/ month or $29/yr</span>
          </div>
          <div className="text-[10px] text-amber-500 font-semibold mt-1">
            Includes 7-day unrestricted trial. Cancel anytime with 1 click.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={handleUnlockDemo}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-sky-500 hover:from-amber-400 hover:to-sky-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-500/20 transition-all"
          >
            Explore Pro Features Free (Instant Demo)
          </button>
          
          <button
            onClick={onClose}
            className="w-full py-2.5 text-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            Continue with Free Daily Puzzles
          </button>
        </div>

      </div>
    </div>
  );
};
