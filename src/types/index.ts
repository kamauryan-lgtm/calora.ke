export type GameMode = 
  | 'riddles' 
  | 'logic' 
  | 'detective' 
  | 'patterns' 
  | 'sprint' 
  | 'lateral' 
  | 'math' 
  | 'memory' 
  | 'word';

export type Category = 
  | 'Logic' 
  | 'Riddles' 
  | 'Pattern Recognition' 
  | 'Detective Mysteries' 
  | 'Mathematics' 
  | 'Lateral Thinking' 
  | 'Memory' 
  | 'Word Games';

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert';

export type PublicationStatus = 'published' | 'draft' | 'archived';
export type VisibilityTier = 'public' | 'private' | 'premium';
export type UserRole = 'guest' | 'user' | 'admin' | 'superadmin';

export interface BasePuzzle {
  id: string;
  title: string;
  category: Category;
  mode: GameMode;
  difficulty: Difficulty;
  description: string;
  estimatedTime: string;
  playsCount: number;
  rating: number;
  isDailyBonus?: boolean;
  publicationStatus?: PublicationStatus;
  visibility?: VisibilityTier;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  author?: string;
}

export interface RiddlePuzzle extends BasePuzzle {
  prompt: string;
  answer: string;
  aliases: string[];
  options?: string[];
  hints: [string, string, string]; // Progressive 3 hints
  explanation: string;
}

export interface LogicGridCategory {
  name: string;
  items: string[];
}

export interface LogicPuzzle extends BasePuzzle {
  puzzleType: 'grid' | 'truth_tellers' | 'deduction_choice';
  scenario: string;
  clues: string[];
  gridConfig?: {
    categoryA: LogicGridCategory;
    categoryB: LogicGridCategory;
    categoryC?: LogicGridCategory;
  };
  suspects?: {
    id: string;
    name: string;
    claim: string;
    isTruthTeller: boolean;
  }[];
  question: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  solutionExplanation: string;
}

export interface DetectiveSuspect {
  id: string;
  name: string;
  role: string;
  avatar: string;
  statement: string;
  alibi: string;
  interrogationNotes: string[];
}

export interface DetectiveEvidence {
  id: string;
  name: string;
  type: 'forensic' | 'document' | 'physical' | 'digital';
  shortDesc: string;
  fullAnalysis: string;
  locationFound: string;
}

export interface DetectiveTimelineEvent {
  time: string;
  event: string;
  witness: string;
  verified: boolean;
}

export interface DetectiveCase extends BasePuzzle {
  victim: string;
  crimeScene: string;
  briefing: string;
  suspects: DetectiveSuspect[];
  evidence: DetectiveEvidence[];
  timeline: DetectiveTimelineEvent[];
  culpritId: string;
  decisiveEvidenceIds: string[];
  motiveChoiceId: string;
  motiveChoices: { id: string; text: string; isCorrect: boolean }[];
  inspectorVerdict: string;
  solutionBreakdown: string;
}

export interface PatternChoice {
  id: string;
  label: string;
  isCorrect: boolean;
  svgIcon?: 'square_split' | 'circle_dot' | 'cross_plus' | 'diamond_star' | 'triangle_up' | 'triangle_down';
}

export interface PatternPuzzle extends BasePuzzle {
  patternType: 'visual_matrix' | 'number_sequence' | 'abstract_logic';
  displayType: 'sequence' | 'matrix_3x3' | 'geometry';
  sequenceItems?: (string | number)[];
  matrixCells?: (string | { shape: string; dots: number; rotation: number })[];
  prompt: string;
  choices: PatternChoice[];
  ruleExplanation: string;
}

export interface LateralQuestion {
  question: string;
  oracleAnswer: 'Yes' | 'No' | 'Irrelevant' | 'Crucial';
  insight: string;
}

export interface LateralPuzzle extends BasePuzzle {
  scenario: string;
  inquiries: LateralQuestion[];
  hints: string[];
  commonMisconceptions: { claim: string; whyFalse: string }[];
  solution: string;
  insightExplanation: string;
}

export interface ExtendedPuzzle extends BasePuzzle {
  question: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  hints: string[];
  explanation: string;
}

export interface SprintQuestion {
  id: string;
  type: 'math' | 'stroop' | 'sequence' | 'spatial' | 'anagram';
  prompt: string;
  subprompt?: string;
  displayColor?: string;
  options: string[];
  correctIndex: number;
}

export interface PuzzleAttempt {
  id: string;
  puzzleId: string;
  userId: string;
  timestamp: number;
  durationMs: number;
  hintsUsed: number;
  isCorrect: boolean;
  scoreAwarded: number;
  mode: GameMode;
  isFlagged?: boolean;
  flagReason?: string;
  reviewStatus?: 'pending' | 'verified' | 'invalidated';
}

export interface UserProfile {
  id: string;
  username: string;
  avatar: string;
  title: string;
  role: UserRole;
  isSuspended?: boolean;
  suspendedReason?: string;
  brainScore: number;
  streak: number;
  bestStreak: number;
  lastPlayedDate: string; // YYYY-MM-DD
  createdAt: string;
  lastActiveAt: string;
  dailyCompletedDates: string[];
  completedPuzzles: Record<string, { solved: boolean; bestScore: number; hintsUsed: number }>;
  categoryMastery: Record<Category, { solved: number; total: number }>;
  unlockedAchievements: string[];
  isRegistered: boolean;
  email?: string;
  sprintStats: {
    bestScore: number;
    highestStreak: number;
    roundsPlayed: number;
    totalCorrect: number;
  };
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar: string;
  score: number;
  durationFormatted: string;
  hintsUsed: number;
  badge?: string;
  isCurrentUser?: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  category: 'general' | 'riddles' | 'logic' | 'detective' | 'sprint' | 'streak';
  requirement: number;
  unlocked?: boolean;
  isEnabled?: boolean;
  progress: number;
}

/* ==========================================================================
   ADMIN, PLATFORM & CONFIGURATION TYPES
   ========================================================================== */

export interface AdminSession {
  token: string;
  userId: string;
  username: string;
  role: UserRole;
  expiresAt: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  actorId: string;
  actorName: string;
  action: string;
  targetType: 'puzzle' | 'user' | 'daily_challenge' | 'settings' | 'branding' | 'feature_flags' | 'achievement' | 'leaderboard' | 'system';
  targetId: string;
  details: string;
  before?: any;
  after?: any;
  ipAddress?: string;
}

export interface GameSettings {
  version: number;
  updatedAt: string;
  updatedBy: string;
  basePoints: Record<Difficulty, number>;
  hintPenaltyPercent: number; // e.g. 15 = -15% per hint
  wrongPenaltyPercent: number;
  maxTimeBonusPercent: number; // e.g. 25 = +25%
  streakBonusPerDay: number; // e.g. 0.05
  maxStreakBonus: number; // e.g. 1.50
  sprintDurationSeconds: number; // e.g. 60
  sprintQuestionCount: number;
  dailyChallengeBonusMultiplier: number;
  practiceModeEnabled: boolean;
  antiCheatMinDurationMs: number; // below this threshold, attempt is flagged
}

export interface AnnouncementBanner {
  enabled: boolean;
  text: string;
  linkText?: string;
  linkUrl?: string;
  type: 'info' | 'warning' | 'celebration';
}

export interface BrandingSettings {
  siteName: string;
  tagline: string;
  headline: string;
  headlineSub: string;
  primaryAccent: string;
  secondaryAccent: string;
  announcementBanner: AnnouncementBanner;
  maintenanceNotice: string;
  contactEmail: string;
  socialTwitter: string;
  socialDiscord: string;
  featuredChallengeId?: string;
  footerDisclaimerText: string;
}

export interface FeatureFlags {
  maintenanceMode: boolean;
  guestPlayEnabled: boolean;
  registrationEnabled: boolean;
  dailyChallengeEnabled: boolean;
  brainSprintEnabled: boolean;
  publicLeaderboardsEnabled: boolean;
  puzzleReportingEnabled: boolean;
  premiumTiersEnabled: boolean;
  soundSynthesizerEnabled: boolean;
}

export interface DailyScheduleEntry {
  date: string; // YYYY-MM-DD
  puzzleId: string;
  scheduledBy: string;
  scheduledAt: number;
  isPublished: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  isActive: boolean;
  isPopular?: boolean;
}

export interface ModerationReport {
  id: string;
  puzzleId: string;
  puzzleTitle: string;
  reportedBy: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'resolved';
  createdAt: number;
}
