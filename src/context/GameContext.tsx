import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  UserProfile, 
  GameMode, 
  BasePuzzle, 
  Difficulty, 
  AdminSession, 
  BrandingSettings, 
  FeatureFlags, 
  GameSettings 
} from '../types';
import { MindGamesStorage } from '../lib/storage';
import { MindGamesDB, DEFAULT_BRANDING_SETTINGS, DEFAULT_FEATURE_FLAGS, DEFAULT_GAME_SETTINGS } from '../lib/database';
import { AdminService } from '../lib/adminService';
import { sound } from '../lib/sound';
import { getPuzzleById } from '../data/puzzles';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'achievement' | 'error';
}

interface GameContextType {
  profile: UserProfile;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  isSoundMuted: boolean;
  toggleSound: () => void;
  activeMode: GameMode | 'home' | 'practice' | 'admin';
  setActiveMode: (mode: GameMode | 'home' | 'practice' | 'admin') => void;
  activePuzzle: BasePuzzle | null;
  setActivePuzzle: (puzzle: BasePuzzle | null) => void;
  isPracticeMode: boolean;
  setIsPracticeMode: (val: boolean) => void;
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
  
  // Platform & Admin
  adminSession: AdminSession | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  branding: BrandingSettings;
  featureFlags: FeatureFlags;
  gameSettings: GameSettings;
  refreshAppState: () => void;
  refreshAppData: () => void;
  loginAdmin: (user: string, pass: string) => { success: boolean; error?: string };
  logoutAdmin: () => void;
  adminLogout: () => void;

  // Modals
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  profileModalOpen: boolean;
  setProfileModalOpen: (open: boolean) => void;
  shareModalData: { isOpen: boolean; puzzle?: BasePuzzle; score?: number } | null;
  setShareModalData: (data: { isOpen: boolean; puzzle?: BasePuzzle; score?: number } | null) => void;
  proModalOpen: boolean;
  setProModalOpen: (open: boolean) => void;

  // Actions
  launchPuzzle: (puzzleOrId: BasePuzzle | string, asPractice?: boolean) => void;
  completePuzzle: (puzzleId: string, isCorrect: boolean, hintsUsed: number, durationMs: number) => { points: number; achievements: string[] };
  loginAsGuest: (customName?: string) => void;
  registerAccount: (username: string, email?: string) => void;
  updateUserAvatar: (avatar: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile>(() => MindGamesStorage.getProfile());
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mg_theme');
      if (stored === 'light' || stored === 'dark') return stored;
    }
    return 'dark';
  });
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(() => sound.isMuted());
  const [activeMode, setActiveMode] = useState<GameMode | 'home' | 'practice' | 'admin'>('home');
  const [activePuzzle, setActivePuzzle] = useState<BasePuzzle | null>(null);
  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Admin & Platform states
  const [adminSession, setAdminSession] = useState<AdminSession | null>(() => AdminService.getActiveAdminSession());
  const [branding, setBranding] = useState<BrandingSettings>(() => MindGamesDB.getBrandingSettings());
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(() => MindGamesDB.getFeatureFlags());
  const [gameSettings, setGameSettings] = useState<GameSettings>(() => MindGamesDB.getGameSettings());
  
  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [shareModalData, setShareModalData] = useState<{ isOpen: boolean; puzzle?: BasePuzzle; score?: number } | null>(null);
  const [proModalOpen, setProModalOpen] = useState(false);

  // Sync theme to HTML class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('mg_theme', theme);
  }, [theme]);

  // Handle URL route check for /admin on load or popstate
  useEffect(() => {
    const checkAdminRoute = () => {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname.toLowerCase();
        const search = window.location.search.toLowerCase();
        const hash = window.location.hash.toLowerCase();
        if (path === '/admin' || search.includes('admin') || hash === '#/admin') {
          setActiveMode('admin');
        }
      }
    };
    checkAdminRoute();
    window.addEventListener('popstate', checkAdminRoute);
    return () => window.removeEventListener('popstate', checkAdminRoute);
  }, []);

  const refreshAppState = () => {
    setProfile(MindGamesStorage.getProfile());
    setBranding(MindGamesDB.getBrandingSettings());
    setFeatureFlags(MindGamesDB.getFeatureFlags());
    setGameSettings(MindGamesDB.getGameSettings());
    setAdminSession(AdminService.getActiveAdminSession());
  };

  const loginAdmin = (username: string, pass: string) => {
    const res = AdminService.loginAdmin(username, pass);
    if (res.success && res.session) {
      setAdminSession(res.session);
      addToast(`Authenticated as ${res.session.username} (${res.session.role})`, 'success');
      return { success: true };
    }
    return { success: false, error: res.error || 'Login failed' };
  };

  const logoutAdmin = () => {
    AdminService.logoutAdmin();
    setAdminSession(null);
    addToast('Admin session logged out.', 'info');
  };

  const toggleTheme = () => {
    sound.playClick();
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleSound = () => {
    const nextMuted = sound.toggleMute();
    setIsSoundMuted(nextMuted);
    if (!nextMuted) {
      sound.playClick();
    }
  };

  const addToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const launchPuzzle = (puzzleOrId: BasePuzzle | string, asPractice: boolean = false) => {
    sound.playClick();
    let target: BasePuzzle | undefined;
    if (typeof puzzleOrId === 'string') {
      target = getPuzzleById(puzzleOrId);
    } else {
      target = puzzleOrId;
    }

    if (target) {
      setActivePuzzle(target);
      setActiveMode(target.mode);
      setIsPracticeMode(asPractice);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const completePuzzle = (puzzleId: string, isCorrect: boolean, hintsUsed: number, durationMs: number) => {
    const puzzle = getPuzzleById(puzzleId) || activePuzzle;
    const diff: Difficulty = puzzle ? puzzle.difficulty : 'Medium';
    const mode: GameMode = puzzle ? puzzle.mode : 'riddles';

    let points = 0;
    if (isCorrect && !isPracticeMode) {
      points = MindGamesStorage.calculateScore(diff, hintsUsed, durationMs, profile.streak);
    }

    const { pointsEarned, newAchievements } = MindGamesStorage.recordAttempt({
      puzzleId,
      userId: profile.id,
      durationMs,
      hintsUsed,
      isCorrect,
      scoreAwarded: points,
      mode
    });

    // Refresh profile state
    setProfile(MindGamesStorage.getProfile());

    if (isCorrect) {
      sound.playCorrect();
      if (newAchievements.length > 0) {
        newAchievements.forEach(ach => {
          addToast(`🏆 Milestone Unlocked: ${ach}!`, 'achievement');
        });
      }
    } else {
      sound.playWrong();
    }

    return { points: pointsEarned, achievements: newAchievements };
  };

  const loginAsGuest = (customName?: string) => {
    const updated = MindGamesStorage.updateProfile({
      username: customName || `Thinker_${Math.floor(100 + Math.random() * 900)}`,
      isRegistered: false,
      role: 'guest'
    });
    setProfile(updated);
    addToast(`Signed in as ${updated.username}`, 'info');
  };

  const registerAccount = (username: string, email?: string) => {
    const updated = MindGamesStorage.updateProfile({
      username,
      email: email || `${username.toLowerCase()}@mindgames.local`,
      isRegistered: true,
      role: 'user',
      brainScore: profile.brainScore + 50 // Registration welcome bonus!
    });
    setProfile(updated);
    sound.playCaseSolved();
    addToast(`Welcome to Mind Games, ${username}! +50 Bonus XP awarded.`, 'success');
  };

  const updateUserAvatar = (avatar: string) => {
    sound.playClick();
    const updated = MindGamesStorage.updateProfile({ avatar });
    setProfile(updated);
  };

  const isAdmin = Boolean(adminSession && (adminSession.role === 'admin' || adminSession.role === 'superadmin'));
  const isSuperAdmin = Boolean(adminSession && adminSession.role === 'superadmin');

  return (
    <GameContext.Provider
      value={{
        profile,
        theme,
        toggleTheme,
        isSoundMuted,
        toggleSound,
        activeMode,
        setActiveMode,
        activePuzzle,
        setActivePuzzle,
        isPracticeMode,
        setIsPracticeMode,
        toasts,
        addToast,
        removeToast,
        adminSession,
        isAdmin,
        isSuperAdmin,
        branding,
        featureFlags,
        gameSettings,
        refreshAppState,
        refreshAppData: refreshAppState,
        loginAdmin,
        logoutAdmin,
        adminLogout: logoutAdmin,
        authModalOpen,
        setAuthModalOpen,
        profileModalOpen,
        setProfileModalOpen,
        shareModalData,
        setShareModalData,
        proModalOpen,
        setProModalOpen,
        launchPuzzle,
        completePuzzle,
        loginAsGuest,
        registerAccount,
        updateUserAvatar
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
