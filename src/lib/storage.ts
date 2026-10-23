import { UserProfile, PuzzleAttempt, LeaderboardEntry, Category, Difficulty, GameMode } from '../types';
import { ACHIEVEMENTS } from '../data/achievements';
import { MindGamesDB } from './database';

const STORAGE_KEY_PROFILE = 'mg_user_profile';
const STORAGE_KEY_ATTEMPTS = 'mg_puzzle_attempts';

const DEFAULT_CATEGORIES: Category[] = [
  'Logic',
  'Riddles',
  'Pattern Recognition',
  'Detective Mysteries',
  'Mathematics',
  'Lateral Thinking',
  'Memory',
  'Word Games'
];

function createInitialProfile(): UserProfile {
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const initialCategoryMastery = DEFAULT_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = { solved: 0, total: 3 };
    return acc;
  }, {} as Record<Category, { solved: number; total: number }>);

  const now = new Date().toISOString();
  return {
    id: 'guest_' + Math.random().toString(36).substring(2, 9),
    username: `MindExplorer_${randomSuffix}`,
    avatar: '🧠',
    title: 'Curious Thinker',
    role: 'guest',
    brainScore: 120,
    streak: 1,
    bestStreak: 1,
    lastPlayedDate: now.split('T')[0],
    createdAt: now,
    lastActiveAt: now,
    dailyCompletedDates: [],
    completedPuzzles: {},
    categoryMastery: initialCategoryMastery,
    unlockedAchievements: [],
    isRegistered: false,
    sprintStats: {
      bestScore: 0,
      highestStreak: 0,
      roundsPlayed: 0,
      totalCorrect: 0
    }
  };
}

export class MindGamesStorage {
  public static getProfile(): UserProfile {
    if (typeof window === 'undefined') return createInitialProfile();
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (stored) {
        const parsed: UserProfile = JSON.parse(stored);
        if (!parsed.role) parsed.role = parsed.isRegistered ? 'user' : 'guest';
        if (!parsed.createdAt) parsed.createdAt = new Date().toISOString();
        if (!parsed.lastActiveAt) parsed.lastActiveAt = new Date().toISOString();
        return parsed;
      }
    } catch {
      // Fallback
    }
    const fresh = createInitialProfile();
    this.saveProfile(fresh);
    return fresh;
  }

  public static saveProfile(profile: UserProfile): void {
    if (typeof window === 'undefined') return;
    try {
      profile.lastActiveAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
      MindGamesDB.saveUser(profile);
    } catch {
      // Ignore
    }
  }

  public static updateProfile(updates: Partial<UserProfile>): UserProfile {
    const current = this.getProfile();
    const updated = { ...current, ...updates };
    this.saveProfile(updated);
    return updated;
  }

  public static getAttempts(): PuzzleAttempt[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ATTEMPTS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  public static recordAttempt(attempt: Omit<PuzzleAttempt, 'id' | 'timestamp'>): { attempt: PuzzleAttempt; pointsEarned: number; newAchievements: string[] } {
    const settings = MindGamesDB.getGameSettings();
    const isSuspicious = attempt.durationMs < settings.antiCheatMinDurationMs && attempt.isCorrect;

    const fullAttempt: PuzzleAttempt = {
      ...attempt,
      id: 'att_' + Date.now(),
      timestamp: Date.now(),
      isFlagged: isSuspicious,
      flagReason: isSuspicious ? `Solve completed in ${attempt.durationMs}ms (below ${settings.antiCheatMinDurationMs}ms threshold)` : undefined,
      reviewStatus: isSuspicious ? 'pending' : 'verified'
    };

    if (isSuspicious) {
      console.warn('Anti-cheat triggered: Attempt flagged for administrative review.', fullAttempt);
    }

    // Save attempt
    const attempts = this.getAttempts();
    attempts.unshift(fullAttempt);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_ATTEMPTS, JSON.stringify(attempts.slice(0, 200)));
      } catch {}
    }

    // Update profile
    const profile = this.getProfile();
    const today = new Date().toISOString().split('T')[0];

    // Calculate streak
    if (profile.lastPlayedDate !== today) {
      const last = new Date(profile.lastPlayedDate);
      const curr = new Date(today);
      const diffDays = Math.round((curr.getTime() - last.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 1) {
        profile.streak += 1;
        if (profile.streak > profile.bestStreak) {
          profile.bestStreak = profile.streak;
        }
      } else if (diffDays > 1) {
        profile.streak = 1;
      }
      profile.lastPlayedDate = today;
    }

    const prevSolve = profile.completedPuzzles[attempt.puzzleId];
    if (attempt.isCorrect) {
      if (!prevSolve || !prevSolve.solved) {
        profile.completedPuzzles[attempt.puzzleId] = {
          solved: true,
          bestScore: attempt.scoreAwarded,
          hintsUsed: attempt.hintsUsed
        };
        profile.brainScore += attempt.scoreAwarded;
      } else if (attempt.scoreAwarded > prevSolve.bestScore) {
        profile.brainScore += (attempt.scoreAwarded - prevSolve.bestScore);
        profile.completedPuzzles[attempt.puzzleId].bestScore = attempt.scoreAwarded;
      }
    }

    // Update title based on score
    if (profile.brainScore > 2500) profile.title = 'Grandmaster Polymath';
    else if (profile.brainScore > 1500) profile.title = 'Master Sleuth';
    else if (profile.brainScore > 800) profile.title = 'Logic Adept';
    else if (profile.brainScore > 350) profile.title = 'Sharp Mind';

    // Check achievements
    const newlyUnlocked: string[] = [];
    const totalSolved = Object.values(profile.completedPuzzles).filter(p => p.solved).length;

    ACHIEVEMENTS.forEach(ach => {
      if (profile.unlockedAchievements.includes(ach.id)) return;

      let qualified = false;
      if (ach.id === 'ach-first-spark' && totalSolved >= 1) qualified = true;
      if (ach.id === 'ach-sleuth' && attempt.mode === 'detective' && attempt.isCorrect) qualified = true;
      if (ach.id === 'ach-logic-pro' && attempt.mode === 'logic' && attempt.isCorrect && attempt.hintsUsed === 0) qualified = true;
      if (ach.id === 'ach-streak-3' && profile.streak >= 3) qualified = true;
      if (ach.id === 'ach-streak-7' && profile.streak >= 7) qualified = true;
      if (ach.id === 'ach-polymath-10' && totalSolved >= 10) qualified = true;
      if (ach.id === 'ach-lateral-thinker' && attempt.mode === 'lateral' && attempt.isCorrect) qualified = true;

      if (qualified) {
        profile.unlockedAchievements.push(ach.id);
        newlyUnlocked.push(ach.title);
      }
    });

    this.saveProfile(profile);

    return {
      attempt: fullAttempt,
      pointsEarned: attempt.scoreAwarded,
      newAchievements: newlyUnlocked
    };
  }

  public static calculateScore(difficulty: Difficulty, hintsUsed: number, durationMs: number, streak: number): number {
    const settings = MindGamesDB.getGameSettings();
    let score = settings.basePoints[difficulty] || 150;

    // Hint deduction: from settings.hintPenaltyPercent (e.g. 15%)
    const penaltyRate = (settings.hintPenaltyPercent || 15) / 100;
    const hintMultiplier = Math.max(0.4, 1 - hintsUsed * penaltyRate);
    score = score * hintMultiplier;

    // Time bonus (e.g. up to settings.maxTimeBonusPercent)
    if (durationMs > 2000 && durationMs < 60000) {
      const bonusRate = (settings.maxTimeBonusPercent || 25) / 100;
      const timeBonus = 1 + (1 - durationMs / 60000) * bonusRate;
      score = score * timeBonus;
    }

    // Streak multiplier (e.g. settings.streakBonusPerDay up to settings.maxStreakBonus)
    const perDay = settings.streakBonusPerDay || 0.05;
    const maxBonus = settings.maxStreakBonus || 1.5;
    const streakBonus = Math.min(maxBonus, 1.0 + (streak - 1) * perDay);
    score = score * streakBonus;

    return Math.round(score);
  }

  public static getDailyLeaderboard(): LeaderboardEntry[] {
    const baseLeaderboard: LeaderboardEntry[] = [
      { rank: 1, username: 'Sherlock_Holmes', avatar: '🕵️‍♂️', score: 980, durationFormatted: '0:42', hintsUsed: 0, badge: 'Grandmaster' },
      { rank: 2, username: 'AdaLovelace', avatar: '💻', score: 940, durationFormatted: '0:56', hintsUsed: 0, badge: 'Genius' },
      { rank: 3, username: 'AlanTuring', avatar: '🔐', score: 890, durationFormatted: '1:08', hintsUsed: 0, badge: 'Adept' },
      { rank: 4, username: 'QuantumLeap', avatar: '⚡', score: 820, durationFormatted: '1:24', hintsUsed: 1, badge: 'Pro' },
      { rank: 5, username: 'Hypatia_Alex', avatar: '📜', score: 780, durationFormatted: '1:35', hintsUsed: 0, badge: 'Adept' },
      { rank: 6, username: 'CipherSphinx', avatar: '🐾', score: 720, durationFormatted: '1:52', hintsUsed: 1, badge: 'Thinker' },
      { rank: 7, username: 'NeoMatrix', avatar: '🕶️', score: 690, durationFormatted: '2:10', hintsUsed: 1, badge: 'Seeker' },
      { rank: 8, username: 'ZenRiddler', avatar: '🧘', score: 640, durationFormatted: '2:30', hintsUsed: 2, badge: 'Thinker' },
    ];

    const profile = this.getProfile();
    const attempts = this.getAttempts();
    const todayAttempt = attempts.find(a => a.isCorrect && !a.isFlagged);

    if (todayAttempt) {
      const userEntry: LeaderboardEntry = {
        rank: 4,
        username: profile.username,
        avatar: profile.avatar,
        score: todayAttempt.scoreAwarded,
        durationFormatted: `${Math.floor(todayAttempt.durationMs / 60000)}:${Math.floor((todayAttempt.durationMs % 60000) / 1000).toString().padStart(2, '0')}`,
        hintsUsed: todayAttempt.hintsUsed,
        badge: profile.title,
        isCurrentUser: true
      };

      const combined = [...baseLeaderboard, userEntry].sort((a, b) => b.score - a.score);
      return combined.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
    }

    return baseLeaderboard;
  }
}
