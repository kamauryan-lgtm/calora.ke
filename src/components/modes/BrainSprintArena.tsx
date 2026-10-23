import React, { useState, useEffect, useRef } from 'react';
import { SprintQuestion } from '../../types';
import { useGame } from '../../context/GameContext';
import { sound } from '../../lib/sound';
import { MindGamesStorage } from '../../lib/storage';
import { 
  Flame, 
  ArrowLeft, 
  Clock, 
  Sparkles, 
  Trophy, 
  RotateCcw, 
  Zap, 
  CheckCircle2, 
  XCircle,
  Play
} from 'lucide-react';
import { SPRINT_QUESTIONS } from '../../data/puzzles/sprintQuestions';

interface BrainSprintArenaProps {
  onBackToHome: () => void;
}

export const BrainSprintArena: React.FC<BrainSprintArenaProps> = ({ onBackToHome }) => {
  const { profile, addToast } = useGame();

  const [roundDuration] = useState<number>(60); // 60 seconds
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'summary'>('lobby');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  
  // Game metrics
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [shuffledQuestions, setShuffledQuestions] = useState<SprintQuestion[]>([]);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [mistakeCount, setMistakeCount] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [highestStreak, setHighestStreak] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [feedbackEffect, setFeedbackEffect] = useState<'correct' | 'wrong' | null>(null);

  const timerRef = useRef<any>(null);

  // Shuffle questions on lobby load
  useEffect(() => {
    shuffleDeck();
  }, []);

  const shuffleDeck = () => {
    const shuffled = [...SPRINT_QUESTIONS].sort(() => 0.5 - Math.random());
    setShuffledQuestions(shuffled);
  };

  const startSprint = () => {
    sound.playClick();
    shuffleDeck();
    setQuestionIndex(0);
    setCorrectCount(0);
    setMistakeCount(0);
    setStreak(0);
    setHighestStreak(0);
    setTotalScore(0);
    setSecondsRemaining(roundDuration);
    setGameState('playing');

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          finishSprint();
          return 0;
        }
        if (prev <= 6) {
          sound.playTimerTick();
        }
        return prev - 1;
      });
    }, 1000);
  };

  const finishSprint = () => {
    setGameState('summary');
    sound.playCaseSolved();
  };

  // Sync sprint stats when finished
  useEffect(() => {
    if (gameState === 'summary') {
      const currentStats = profile.sprintStats || { bestScore: 0, highestStreak: 0, roundsPlayed: 0, totalCorrect: 0 };
      const updatedBestScore = Math.max(currentStats.bestScore, totalScore);
      const updatedBestStreak = Math.max(currentStats.highestStreak, highestStreak);

      const updated = MindGamesStorage.updateProfile({
        brainScore: profile.brainScore + Math.round(totalScore / 2),
        sprintStats: {
          bestScore: updatedBestScore,
          highestStreak: updatedBestStreak,
          roundsPlayed: currentStats.roundsPlayed + 1,
          totalCorrect: currentStats.totalCorrect + correctCount
        }
      });

      if (totalScore >= 500 && !profile.unlockedAchievements.includes('ach-sprint-demon')) {
        addToast('🏆 Milestone Unlocked: Synapse Surge (500+ pts in Sprint)!', 'achievement');
      }
    }
  }, [gameState]);

  const currentQ = shuffledQuestions[questionIndex % shuffledQuestions.length];

  const handleSelectOption = (index: number) => {
    if (gameState !== 'playing' || !currentQ) return;

    const isCorrect = index === currentQ.correctIndex;
    if (isCorrect) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak > highestStreak) setHighestStreak(nextStreak);

      // Score formula: 20 base * streak multiplier
      const multiplier = Math.min(3.0, 1.0 + (nextStreak - 1) * 0.2);
      const points = Math.round(20 * multiplier);
      setTotalScore(prev => prev + points);
      setCorrectCount(prev => prev + 1);

      sound.playSprintCombo(nextStreak);
      setFeedbackEffect('correct');
    } else {
      setStreak(0);
      setMistakeCount(prev => prev + 1);
      sound.playWrong();
      setFeedbackEffect('wrong');
    }

    setTimeout(() => {
      setFeedbackEffect(null);
    }, 250);

    setQuestionIndex(prev => prev + 1);
  };

  const accuracy = Math.round((correctCount / Math.max(1, correctCount + mistakeCount)) * 100);
  const avgSpeed = (roundDuration / Math.max(1, correctCount + mistakeCount)).toFixed(1);

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/60 dark:border-white/10">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Sprint</span>
        </button>

        {gameState === 'playing' && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-xs font-mono font-bold px-3 py-1 rounded-lg bg-purple-500/10 text-purple-400">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{streak}x Combo</span>
            </div>
            <div className={`flex items-center gap-1.5 text-sm font-mono font-extrabold px-3 py-1 rounded-lg ${
              secondsRemaining <= 10 ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-navy-800 text-slate-900 dark:text-white'
            }`}>
              <Clock className="w-4 h-4" />
              <span>{secondsRemaining}s</span>
            </div>
          </div>
        )}
      </div>

      {/* Screen 1: Lobby */}
      {gameState === 'lobby' && (
        <div className="rounded-2xl p-8 bg-white dark:bg-navy-900 border border-slate-200/90 dark:border-white/10 shadow-2xl backdrop-blur-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/15 text-purple-500 mx-auto flex items-center justify-center">
            <Zap className="w-8 h-8 fill-purple-500" />
          </div>

          <div>
            <h1 className="font-display font-extrabold text-3xl text-slate-900 dark:text-white mb-2">
              Brain Sprint Arena
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              60 seconds of rapid cognitive reflex. Test your mental arithmetic, Stroop color discrimination, and sequence speed.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-xs text-left p-4 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-white/5">
            <div>
              <div className="text-slate-400">Your Record</div>
              <div className="font-bold text-base text-purple-400">
                {profile.sprintStats.bestScore || 0} pts
              </div>
            </div>
            <div>
              <div className="text-slate-400">Peak Streak</div>
              <div className="font-bold text-base text-amber-400">
                {profile.sprintStats.highestStreak || 0}x
              </div>
            </div>
          </div>

          <button
            onClick={startSprint}
            className="w-full sm:w-auto px-10 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-base shadow-xl shadow-purple-600/25 hover:shadow-purple-600/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 mx-auto"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>Start 60s Sprint</span>
          </button>
        </div>
      )}

      {/* Screen 2: Playing */}
      {gameState === 'playing' && currentQ && (
        <div className={`rounded-2xl p-6 sm:p-8 bg-white dark:bg-navy-900 border shadow-2xl backdrop-blur-xl space-y-6 transition-colors duration-150 ${
          feedbackEffect === 'correct'
            ? 'border-emerald-500 ring-2 ring-emerald-500/20'
            : feedbackEffect === 'wrong'
              ? 'border-rose-500 ring-2 ring-rose-500/20 animate-shake'
              : 'border-slate-200/90 dark:border-white/10'
        }`}>
          
          {/* Score & Category */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-purple-400 font-mono">
              Q #{questionIndex + 1} • {currentQ.type}
            </span>
            <span className="font-mono font-extrabold text-lg text-slate-900 dark:text-white">
              {totalScore} <span className="text-xs text-slate-400">pts</span>
            </span>
          </div>

          {/* Question Box */}
          <div className="p-8 rounded-2xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-white/5 text-center min-h-[140px] flex flex-col items-center justify-center">
            {currentQ.subprompt && (
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                {currentQ.subprompt}
              </div>
            )}
            <div
              className="font-display font-black text-3xl sm:text-4xl tracking-tight"
              style={{ color: currentQ.displayColor || undefined }}
            >
              {currentQ.prompt}
            </div>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-2 gap-3">
            {currentQ.options.map((opt, idx) => (
              <button
                key={opt + idx}
                onClick={() => handleSelectOption(idx)}
                className="py-4 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-800 hover:bg-purple-500/10 hover:border-purple-500 text-center font-bold text-base sm:text-lg text-slate-900 dark:text-white transition-all active:scale-95"
              >
                {opt}
              </button>
            ))}
          </div>

        </div>
      )}

      {/* Screen 3: Performance Summary */}
      {gameState === 'summary' && (
        <div className="rounded-2xl p-8 bg-white dark:bg-navy-900 border border-slate-200/90 dark:border-white/10 shadow-2xl backdrop-blur-xl text-center space-y-6 animate-pop">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-500 mx-auto flex items-center justify-center">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <h2 className="font-display font-extrabold text-3xl text-slate-900 dark:text-white">
              Sprint Complete!
            </h2>
            <div className="font-display font-black text-4xl text-purple-500 mt-2">
              {totalScore} <span className="text-base font-normal text-slate-400">pts</span>
            </div>
          </div>

          {/* 4 Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-white/5">
              <div className="text-[11px] text-slate-400">Correct</div>
              <div className="font-bold text-lg text-emerald-500">{correctCount}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-white/5">
              <div className="text-[11px] text-slate-400">Accuracy</div>
              <div className="font-bold text-lg text-sky-500">{accuracy}%</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-white/5">
              <div className="text-[11px] text-slate-400">Best Combo</div>
              <div className="font-bold text-lg text-amber-500">{highestStreak}x</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-white/5">
              <div className="text-[11px] text-slate-400">Speed</div>
              <div className="font-bold text-lg text-purple-400">{avgSpeed}s / Q</div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={startSprint}
              className="flex-1 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry Sprint</span>
            </button>
            <button
              onClick={onBackToHome}
              className="px-6 py-3.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-white/5"
            >
              Back to Home
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
