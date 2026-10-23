import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { BasePuzzle } from '../../types';
import { X, Copy, Check, Share2, Sparkles, MessageCircle, Twitter } from 'lucide-react';

interface ShareModalProps {
  data: { isOpen: boolean; puzzle?: BasePuzzle; score?: number } | null;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ data, onClose }) => {
  const { profile, addToast } = useGame();
  const [copied, setCopied] = useState(false);

  if (!data || !data.isOpen) return null;

  const puzzle = data.puzzle;
  const score = data.score || profile.brainScore;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://mindgames.app';
  const shareUrl = puzzle ? `${baseUrl}?puzzle=${puzzle.id}` : baseUrl;

  const challengeMessage = puzzle
    ? `🧠 Mind Games: I just solved "${puzzle.title}" (${puzzle.difficulty}) with ${score} XP! Think your brain is sharper? Try to beat me: ${shareUrl}`
    : `🧠 Mind Games: I reached ${score} Brain Points and Tier "${profile.title}"! Step into the arena: ${shareUrl}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(challengeMessage);
    setCopied(true);
    addToast('Challenge link and badge copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(challengeMessage)}`, '_blank');
  };

  const handleTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(challengeMessage)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-pop">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 p-6 shadow-2xl space-y-5">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-lg text-slate-900 dark:text-white">
                Share Brain Challenge
              </h3>
              <p className="text-xs text-slate-400">
                Challenge friends to solve this puzzle and beat your score.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visual Share Card Preview */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-navy-950 text-white border border-white/10 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-sky-400">
              <span>🧠 MIND GAMES CHALLENGE</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 font-mono">
              {puzzle ? puzzle.difficulty : 'Profile'}
            </span>
          </div>

          <div className="text-base font-extrabold font-display">
            {puzzle ? puzzle.title : `${profile.username}'s Brain Standing`}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
            <span className="text-slate-400">Achieved Score:</span>
            <span className="font-extrabold font-mono text-amber-400">{score.toLocaleString()} XP</span>
          </div>
        </div>

        {/* Copyable link input */}
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-none"
          />
          <button
            onClick={handleCopy}
            className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-500/20"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        {/* Social Share Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            onClick={handleWhatsApp}
            className="py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>
          <button
            onClick={handleTwitter}
            className="py-2.5 px-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Twitter className="w-4 h-4" />
            <span>X / Twitter</span>
          </button>
        </div>

      </div>
    </div>
  );
};
