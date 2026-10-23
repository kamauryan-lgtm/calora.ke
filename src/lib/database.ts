import { 
  BasePuzzle, 
  UserProfile, 
  GameSettings, 
  BrandingSettings, 
  FeatureFlags, 
  DailyScheduleEntry, 
  AuditLogEntry, 
  Achievement, 
  SubscriptionPlan, 
  ModerationReport,
  PuzzleAttempt,
  Category,
  Difficulty
} from '../types';

import { ALL_PUZZLES } from '../data/puzzles';
import { ACHIEVEMENTS } from '../data/achievements';

const DB_KEYS = {
  PUZZLES: 'mg_db_puzzles',
  USERS: 'mg_db_users',
  ATTEMPTS: 'mg_db_attempts',
  GAME_SETTINGS: 'mg_db_game_settings',
  BRANDING: 'mg_db_branding_settings',
  FEATURE_FLAGS: 'mg_db_feature_flags',
  DAILY_SCHEDULE: 'mg_db_daily_schedule',
  AUDIT_LOGS: 'mg_db_audit_logs',
  ACHIEVEMENTS: 'mg_db_achievements',
  MODERATION: 'mg_db_moderation_reports',
  PLANS: 'mg_db_subscription_plans',
  ACTIVE_SESSION: 'mg_db_active_admin_session'
};

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  version: 1,
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
  basePoints: {
    Easy: 100,
    Medium: 250,
    Hard: 500,
    Expert: 1000
  },
  hintPenaltyPercent: 15,
  wrongPenaltyPercent: 0,
  maxTimeBonusPercent: 25,
  streakBonusPerDay: 0.05,
  maxStreakBonus: 1.50,
  sprintDurationSeconds: 60,
  sprintQuestionCount: 20,
  dailyChallengeBonusMultiplier: 1.25,
  practiceModeEnabled: true,
  antiCheatMinDurationMs: 1200
};

export const DEFAULT_BRANDING_SETTINGS: BrandingSettings = {
  siteName: 'Mind Games',
  tagline: 'Think sharper. See differently.',
  headline: 'Your brain called. It wants a challenge.',
  headlineSub: 'Step into an interactive sanctuary of logic, crime scene deduction, poetic riddles, and abstract sequences.',
  primaryAccent: '#38BDF8',
  secondaryAccent: '#8B5CF6',
  announcementBanner: {
    enabled: true,
    text: '⚡ Daily Challenge Active • Day Streak Multipliers in Effect!',
    type: 'info'
  },
  maintenanceNotice: 'Mind Games is undergoing scheduled cognitive optimization. Check back shortly!',
  contactEmail: 'contact@mindgames.local',
  socialTwitter: 'https://twitter.com/MindGamesApp',
  socialDiscord: 'https://discord.gg/mindgames',
  footerDisclaimerText: 'Mind Games is created solely for recreational mental stimulation, logical curiosity, and entertainment. Mind Games does not measure clinical intelligence (IQ) or diagnose cognitive function.'
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  maintenanceMode: false,
  guestPlayEnabled: true,
  registrationEnabled: true,
  dailyChallengeEnabled: true,
  brainSprintEnabled: true,
  publicLeaderboardsEnabled: true,
  puzzleReportingEnabled: true,
  premiumTiersEnabled: true,
  soundSynthesizerEnabled: true
};

export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-free',
    name: 'Free Thinker',
    description: 'Full access to daily challenges, basic game modes, and progress radar.',
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      'Daily Brain Teaser with streaks',
      'Quick Riddles library',
      'Logic Lab deduction grids',
      'Brain Sprint speed rounds',
      'Personal progress dashboard'
    ],
    isActive: true
  },
  {
    id: 'plan-pro',
    name: 'Mind Games Pro',
    description: 'Uncut forensic mystery dossiers, grandmaster collections, and tournaments.',
    priceMonthly: 4.99,
    priceYearly: 29.00,
    features: [
      'Everything in Free',
      'Uncut Detective Case Files (audio logs & autopsy reports)',
      'Grandmaster 4x4 Logic Grids',
      'Weekly Mystery Tournaments & Global Badges',
      'Zero Ads & Custom Noir Midnight Themes',
      'Unlimited Practice Sandboxes'
    ],
    isActive: true,
    isPopular: true
  }
];

export class MindGamesDB {
  private static isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  // --- SEED / INITIALIZATION ---
  public static initialize(): void {
    if (!this.isBrowser()) return;

    // Seed Puzzles if not present
    if (!localStorage.getItem(DB_KEYS.PUZZLES)) {
      const initializedPuzzles: BasePuzzle[] = ALL_PUZZLES.map(p => ({
        ...p,
        publicationStatus: 'published',
        visibility: 'public',
        tags: [p.category.toLowerCase(), p.difficulty.toLowerCase(), p.mode],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'Mind Games Editorial'
      }));
      localStorage.setItem(DB_KEYS.PUZZLES, JSON.stringify(initializedPuzzles));
    }

    // Seed Game Settings
    if (!localStorage.getItem(DB_KEYS.GAME_SETTINGS)) {
      localStorage.setItem(DB_KEYS.GAME_SETTINGS, JSON.stringify(DEFAULT_GAME_SETTINGS));
    }

    // Seed Branding Settings
    if (!localStorage.getItem(DB_KEYS.BRANDING)) {
      localStorage.setItem(DB_KEYS.BRANDING, JSON.stringify(DEFAULT_BRANDING_SETTINGS));
    }

    // Seed Feature Flags
    if (!localStorage.getItem(DB_KEYS.FEATURE_FLAGS)) {
      localStorage.setItem(DB_KEYS.FEATURE_FLAGS, JSON.stringify(DEFAULT_FEATURE_FLAGS));
    }

    // Seed Achievements
    if (!localStorage.getItem(DB_KEYS.ACHIEVEMENTS)) {
      const initialAch = ACHIEVEMENTS.map(a => ({ ...a, isEnabled: true }));
      localStorage.setItem(DB_KEYS.ACHIEVEMENTS, JSON.stringify(initialAch));
    }

    // Seed Plans
    if (!localStorage.getItem(DB_KEYS.PLANS)) {
      localStorage.setItem(DB_KEYS.PLANS, JSON.stringify(DEFAULT_SUBSCRIPTION_PLANS));
    }

    // Seed Users & Admins
    if (!localStorage.getItem(DB_KEYS.USERS)) {
      const initialUsers: UserProfile[] = [
        {
          id: 'usr_superadmin_01',
          username: 'superadmin',
          avatar: '👑',
          title: 'Platform Administrator',
          role: 'superadmin',
          brainScore: 5000,
          streak: 14,
          bestStreak: 14,
          lastPlayedDate: new Date().toISOString().split('T')[0],
          createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
          lastActiveAt: new Date().toISOString(),
          dailyCompletedDates: [],
          completedPuzzles: {},
          categoryMastery: {} as any,
          unlockedAchievements: ['ach-first-spark', 'ach-sleuth', 'ach-streak-7'],
          isRegistered: true,
          email: 'admin@mindgames.app',
          sprintStats: { bestScore: 920, highestStreak: 15, roundsPlayed: 40, totalCorrect: 120 }
        },
        {
          id: 'usr_ada_02',
          username: 'AdaLovelace',
          avatar: '💻',
          title: 'Logic Adept',
          role: 'user',
          brainScore: 2850,
          streak: 7,
          bestStreak: 7,
          lastPlayedDate: new Date().toISOString().split('T')[0],
          createdAt: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
          lastActiveAt: new Date().toISOString(),
          dailyCompletedDates: [],
          completedPuzzles: {},
          categoryMastery: {} as any,
          unlockedAchievements: ['ach-first-spark', 'ach-logic-pro'],
          isRegistered: true,
          email: 'ada@mindgames.local',
          sprintStats: { bestScore: 780, highestStreak: 12, roundsPlayed: 25, totalCorrect: 80 }
        },
        {
          id: 'usr_sherlock_03',
          username: 'Sherlock_Holmes',
          avatar: '🕵️‍♂️',
          title: 'Master Detective',
          role: 'user',
          brainScore: 3400,
          streak: 10,
          bestStreak: 10,
          lastPlayedDate: new Date().toISOString().split('T')[0],
          createdAt: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(),
          lastActiveAt: new Date().toISOString(),
          dailyCompletedDates: [],
          completedPuzzles: {},
          categoryMastery: {} as any,
          unlockedAchievements: ['ach-first-spark', 'ach-sleuth', 'ach-polymath-10'],
          isRegistered: true,
          email: 'sherlock@221b.co.uk',
          sprintStats: { bestScore: 850, highestStreak: 14, roundsPlayed: 30, totalCorrect: 95 }
        }
      ];
      localStorage.setItem(DB_KEYS.USERS, JSON.stringify(initialUsers));
    }
  }

  // --- PUZZLES COLLECTION ---
  public static getPuzzles(includeDrafts = false): BasePuzzle[] {
    this.initialize();
    if (!this.isBrowser()) return ALL_PUZZLES;
    try {
      const data = localStorage.getItem(DB_KEYS.PUZZLES);
      if (!data) return ALL_PUZZLES;
      const parsed: BasePuzzle[] = JSON.parse(data);
      if (includeDrafts) return parsed;
      return parsed.filter(p => p.publicationStatus !== 'draft' && p.publicationStatus !== 'archived');
    } catch {
      return ALL_PUZZLES;
    }
  }

  public static getPuzzleById(id: string): BasePuzzle | undefined {
    const list = this.getPuzzles(true);
    return list.find(p => p.id === id);
  }

  public static savePuzzle(puzzle: BasePuzzle): void {
    const list = this.getPuzzles(true);
    const index = list.findIndex(p => p.id === puzzle.id);
    const now = new Date().toISOString();

    const normalizedPuzzle = {
      ...puzzle,
      updatedAt: now,
      createdAt: puzzle.createdAt || now,
      publicationStatus: puzzle.publicationStatus || 'published',
      visibility: puzzle.visibility || 'public'
    };

    if (index >= 0) {
      list[index] = normalizedPuzzle;
    } else {
      list.unshift(normalizedPuzzle);
    }

    if (this.isBrowser()) {
      localStorage.setItem(DB_KEYS.PUZZLES, JSON.stringify(list));
    }
  }

  public static deletePuzzle(id: string): boolean {
    const list = this.getPuzzles(true);
    const filtered = list.filter(p => p.id !== id);
    if (filtered.length !== list.length) {
      if (this.isBrowser()) {
        localStorage.setItem(DB_KEYS.PUZZLES, JSON.stringify(filtered));
      }
      return true;
    }
    return false;
  }

  // --- USERS COLLECTION ---
  public static getUsers(): UserProfile[] {
    this.initialize();
    if (!this.isBrowser()) return [];
    try {
      const data = localStorage.getItem(DB_KEYS.USERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static getUserById(id: string): UserProfile | undefined {
    return this.getUsers().find(u => u.id === id);
  }

  public static saveUser(user: UserProfile): void {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    if (this.isBrowser()) {
      localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
    }
  }

  // --- GAMEPLAY SETTINGS ---
  public static getGameSettings(): GameSettings {
    this.initialize();
    if (!this.isBrowser()) return DEFAULT_GAME_SETTINGS;
    try {
      const data = localStorage.getItem(DB_KEYS.GAME_SETTINGS);
      return data ? JSON.parse(data) : DEFAULT_GAME_SETTINGS;
    } catch {
      return DEFAULT_GAME_SETTINGS;
    }
  }

  public static saveGameSettings(settings: GameSettings): void {
    if (this.isBrowser()) {
      localStorage.setItem(DB_KEYS.GAME_SETTINGS, JSON.stringify(settings));
    }
  }

  // --- BRANDING SETTINGS ---
  public static getBrandingSettings(): BrandingSettings {
    this.initialize();
    if (!this.isBrowser()) return DEFAULT_BRANDING_SETTINGS;
    try {
      const data = localStorage.getItem(DB_KEYS.BRANDING);
      return data ? JSON.parse(data) : DEFAULT_BRANDING_SETTINGS;
    } catch {
      return DEFAULT_BRANDING_SETTINGS;
    }
  }

  public static saveBrandingSettings(settings: BrandingSettings): void {
    if (this.isBrowser()) {
      localStorage.setItem(DB_KEYS.BRANDING, JSON.stringify(settings));
    }
  }

  // --- FEATURE FLAGS ---
  public static getFeatureFlags(): FeatureFlags {
    this.initialize();
    if (!this.isBrowser()) return DEFAULT_FEATURE_FLAGS;
    try {
      const data = localStorage.getItem(DB_KEYS.FEATURE_FLAGS);
      return data ? JSON.parse(data) : DEFAULT_FEATURE_FLAGS;
    } catch {
      return DEFAULT_FEATURE_FLAGS;
    }
  }

  public static saveFeatureFlags(flags: FeatureFlags): void {
    if (this.isBrowser()) {
      localStorage.setItem(DB_KEYS.FEATURE_FLAGS, JSON.stringify(flags));
    }
  }

  // --- DAILY SCHEDULE ---
  public static getDailySchedule(): Record<string, DailyScheduleEntry> {
    this.initialize();
    if (!this.isBrowser()) return {};
    try {
      const data = localStorage.getItem(DB_KEYS.DAILY_SCHEDULE);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  public static setDailySchedule(date: string, puzzleId: string, scheduledBy = 'admin'): void {
    const schedule = this.getDailySchedule();
    schedule[date] = {
      date,
      puzzleId,
      scheduledBy,
      scheduledAt: Date.now(),
      isPublished: true
    };
    if (this.isBrowser()) {
      localStorage.setItem(DB_KEYS.DAILY_SCHEDULE, JSON.stringify(schedule));
    }
  }

  // --- AUDIT LOGS ---
  public static getAuditLogs(): AuditLogEntry[] {
    this.initialize();
    if (!this.isBrowser()) return [];
    try {
      const data = localStorage.getItem(DB_KEYS.AUDIT_LOGS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const logs = this.getAuditLogs();
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now()
    };
    logs.unshift(fullEntry);
    if (this.isBrowser()) {
      localStorage.setItem(DB_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, 500)));
    }
    return fullEntry;
  }

  // --- ACHIEVEMENTS ---
  public static getAchievements(): Achievement[] {
    this.initialize();
    if (!this.isBrowser()) return ACHIEVEMENTS;
    try {
      const data = localStorage.getItem(DB_KEYS.ACHIEVEMENTS);
      return data ? JSON.parse(data) : ACHIEVEMENTS;
    } catch {
      return ACHIEVEMENTS;
    }
  }

  public static saveAchievement(ach: Achievement): void {
    const list = this.getAchievements();
    const idx = list.findIndex(a => a.id === ach.id);
    if (idx >= 0) {
      list[idx] = ach;
    } else {
      list.push(ach);
    }
    if (this.isBrowser()) {
      localStorage.setItem(DB_KEYS.ACHIEVEMENTS, JSON.stringify(list));
    }
  }

  // --- MODERATION REPORTS ---
  public static getReports(): ModerationReport[] {
    this.initialize();
    if (!this.isBrowser()) return [];
    try {
      const data = localStorage.getItem(DB_KEYS.MODERATION);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static addReport(report: Omit<ModerationReport, 'id' | 'createdAt' | 'status'>): ModerationReport {
    const list = this.getReports();
    const full: ModerationReport = {
      ...report,
      id: 'rep_' + Date.now(),
      createdAt: Date.now(),
      status: 'pending'
    };
    list.unshift(full);
    if (this.isBrowser()) {
      localStorage.setItem(DB_KEYS.MODERATION, JSON.stringify(list));
    }
    return full;
  }

  public static updateReportStatus(reportId: string, status: ModerationReport['status']): void {
    const list = this.getReports();
    const item = list.find(r => r.id === reportId);
    if (item) {
      item.status = status;
      if (this.isBrowser()) {
        localStorage.setItem(DB_KEYS.MODERATION, JSON.stringify(list));
      }
    }
  }

  // --- SUBSCRIPTION PLANS ---
  public static getSubscriptionPlans(): SubscriptionPlan[] {
    this.initialize();
    if (!this.isBrowser()) return DEFAULT_SUBSCRIPTION_PLANS;
    try {
      const data = localStorage.getItem(DB_KEYS.PLANS);
      return data ? JSON.parse(data) : DEFAULT_SUBSCRIPTION_PLANS;
    } catch {
      return DEFAULT_SUBSCRIPTION_PLANS;
    }
  }

  public static saveSubscriptionPlan(plan: SubscriptionPlan): void {
    const plans = this.getSubscriptionPlans();
    const idx = plans.findIndex(p => p.id === plan.id);
    if (idx >= 0) {
      plans[idx] = plan;
    } else {
      plans.push(plan);
    }
    if (this.isBrowser()) {
      localStorage.setItem(DB_KEYS.PLANS, JSON.stringify(plans));
    }
  }
}
