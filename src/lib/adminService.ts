import { 
  AdminSession, 
  AuditLogEntry, 
  BasePuzzle, 
  GameSettings, 
  BrandingSettings, 
  FeatureFlags, 
  UserProfile, 
  UserRole,
  Achievement
} from '../types';

import { MindGamesDB, DEFAULT_GAME_SETTINGS } from './database';

const SESSION_KEY = 'mg_admin_session_token';

// Built-in credential hashes / verification
// Default platform administrator: username: 'superadmin', password: 'AdminSecret#2026!'
// Regular admin: username: 'admin', password: 'MindGames#2026!'
const BUILT_IN_CREDENTIALS: Record<string, { role: UserRole; pass: string; title: string }> = {
  superadmin: { role: 'superadmin', pass: 'AdminSecret#2026!', title: 'Platform Super Administrator' },
  admin: { role: 'admin', pass: 'MindGames#2026!', title: 'Editorial Administrator' }
};

export class AdminService {
  // --- AUTHENTICATION ---
  public static loginAdmin(username: string, pass: string): { success: boolean; session?: AdminSession; error?: string } {
    const cleanUser = username.trim().toLowerCase();
    
    // Check built-in admin credentials
    const builtIn = BUILT_IN_CREDENTIALS[cleanUser];
    if (builtIn && builtIn.pass === pass) {
      const session: AdminSession = {
        token: 'adm_tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36),
        userId: 'usr_' + cleanUser,
        username: cleanUser,
        role: builtIn.role,
        expiresAt: Date.now() + 12 * 60 * 60 * 1000 // 12 hours
      };

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      }

      MindGamesDB.addAuditLog({
        actorId: session.userId,
        actorName: session.username,
        action: 'ADMIN_LOGIN',
        targetType: 'system',
        targetId: 'auth_session',
        details: `Administrator ${session.username} successfully authenticated with role ${session.role}.`
      });

      return { success: true, session };
    }

    // Check database users who have admin / superadmin role
    const dbUser = MindGamesDB.getUsers().find(u => u.username.toLowerCase() === cleanUser);
    if (dbUser && (dbUser.role === 'admin' || dbUser.role === 'superadmin')) {
      if (pass === 'MindGames#2026!' || pass === 'AdminSecret#2026!') {
        const session: AdminSession = {
          token: 'adm_tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36),
          userId: dbUser.id,
          username: dbUser.username,
          role: dbUser.role,
          expiresAt: Date.now() + 12 * 60 * 60 * 1000
        };

        if (typeof window !== 'undefined') {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        }

        MindGamesDB.addAuditLog({
          actorId: session.userId,
          actorName: session.username,
          action: 'ADMIN_LOGIN',
          targetType: 'system',
          targetId: 'auth_session',
          details: `Database administrator ${session.username} authenticated.`
        });

        return { success: true, session };
      }
    }

    return { success: false, error: 'Invalid administrator credentials. Access denied.' };
  }

  public static logoutAdmin(): void {
    const session = this.getActiveAdminSession();
    if (session) {
      MindGamesDB.addAuditLog({
        actorId: session.userId,
        actorName: session.username,
        action: 'ADMIN_LOGOUT',
        targetType: 'system',
        targetId: 'auth_session',
        details: `Administrator ${session.username} ended their session.`
      });
    }

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
    }
  }

  public static getActiveAdminSession(): AdminSession | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      if (!stored) return null;
      const session: AdminSession = JSON.parse(stored);
      if (Date.now() > session.expiresAt) {
        this.logoutAdmin();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  public static requireAdmin(token?: string): AdminSession {
    const session = this.getActiveAdminSession();
    if (!session || (token && session.token !== token)) {
      throw new Error('Unauthorized: Valid administrator privileges are required to access this resource.');
    }
    if (session.role !== 'admin' && session.role !== 'superadmin') {
      throw new Error('Forbidden: User does not possess administrator permissions.');
    }
    return session;
  }

  public static requireSuperAdmin(token?: string): AdminSession {
    const session = this.requireAdmin(token);
    if (session.role !== 'superadmin') {
      throw new Error('Forbidden: Super Administrator authorization is strictly required for this operation.');
    }
    return session;
  }

  // --- PUZZLE MANAGEMENT CRUD ---
  public static createPuzzle(token: string, puzzleData: Partial<BasePuzzle>): BasePuzzle {
    const session = this.requireAdmin(token);
    this.validatePuzzleData(puzzleData);

    const puzzleId = puzzleData.id?.trim() || `puz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    // Ensure unique ID
    if (MindGamesDB.getPuzzleById(puzzleId)) {
      throw new Error(`A puzzle with ID "${puzzleId}" already exists. Please choose a unique identifier.`);
    }

    const newPuzzle = {
      ...puzzleData,
      id: puzzleId,
      playsCount: puzzleData.playsCount || 0,
      rating: puzzleData.rating || 5.0,
      publicationStatus: puzzleData.publicationStatus || 'published',
      visibility: puzzleData.visibility || 'public',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: session.username
    } as BasePuzzle;

    MindGamesDB.savePuzzle(newPuzzle);

    MindGamesDB.addAuditLog({
      actorId: session.userId,
      actorName: session.username,
      action: 'PUZZLE_CREATED',
      targetType: 'puzzle',
      targetId: newPuzzle.id,
      details: `Created new ${newPuzzle.category} puzzle: "${newPuzzle.title}" (${newPuzzle.difficulty})`,
      after: newPuzzle
    });

    return newPuzzle;
  }

  public static updatePuzzle(token: string, puzzle: BasePuzzle): BasePuzzle {
    const session = this.requireAdmin(token);
    this.validatePuzzleData(puzzle);

    const existing = MindGamesDB.getPuzzleById(puzzle.id);
    if (!existing) {
      throw new Error(`Cannot update: Puzzle with ID "${puzzle.id}" does not exist.`);
    }

    const updatedPuzzle = {
      ...existing,
      ...puzzle,
      updatedAt: new Date().toISOString()
    };

    MindGamesDB.savePuzzle(updatedPuzzle);

    MindGamesDB.addAuditLog({
      actorId: session.userId,
      actorName: session.username,
      action: 'PUZZLE_UPDATED',
      targetType: 'puzzle',
      targetId: puzzle.id,
      details: `Updated puzzle "${puzzle.title}" (${puzzle.id})`,
      before: existing,
      after: updatedPuzzle
    });

    return updatedPuzzle;
  }

  public static deletePuzzle(token: string, puzzleId: string): void {
    const session = this.requireAdmin(token);
    const existing = MindGamesDB.getPuzzleById(puzzleId);
    if (!existing) {
      throw new Error(`Puzzle "${puzzleId}" not found.`);
    }

    MindGamesDB.deletePuzzle(puzzleId);

    MindGamesDB.addAuditLog({
      actorId: session.userId,
      actorName: session.username,
      action: 'PUZZLE_DELETED',
      targetType: 'puzzle',
      targetId: puzzleId,
      details: `Deleted puzzle "${existing.title}" (${puzzleId})`,
      before: existing
    });
  }

  public static togglePublishStatus(token: string, puzzleId: string, status: 'published' | 'draft' | 'archived'): BasePuzzle {
    const session = this.requireAdmin(token);
    const puzzle = MindGamesDB.getPuzzleById(puzzleId);
    if (!puzzle) throw new Error(`Puzzle "${puzzleId}" not found.`);

    const beforeStatus = puzzle.publicationStatus;
    puzzle.publicationStatus = status;
    MindGamesDB.savePuzzle(puzzle);

    MindGamesDB.addAuditLog({
      actorId: session.userId,
      actorName: session.username,
      action: 'PUZZLE_STATUS_CHANGED',
      targetType: 'puzzle',
      targetId: puzzleId,
      details: `Changed publication status of "${puzzle.title}" from ${beforeStatus} to ${status}.`
    });

    return puzzle;
  }

  public static importPuzzlesJSON(token: string, jsonString: string): { importedCount: number; errors: string[] } {
    const session = this.requireAdmin(token);
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error('Malformed JSON syntax. Please verify your puzzle data format.');
    }

    const puzzleArray: any[] = Array.isArray(parsed) ? parsed : [parsed];
    const errors: string[] = [];
    let importedCount = 0;

    puzzleArray.forEach((item, idx) => {
      try {
        this.validatePuzzleData(item);
        const puzzleId = item.id || `imp_${Date.now()}_${idx}`;
        const puzzleToSave: BasePuzzle = {
          ...item,
          id: puzzleId,
          playsCount: item.playsCount || 0,
          rating: item.rating || 5.0,
          publicationStatus: item.publicationStatus || 'published',
          visibility: item.visibility || 'public',
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          author: session.username
        };
        MindGamesDB.savePuzzle(puzzleToSave);
        importedCount++;
      } catch (err: any) {
        errors.push(`Item ${idx + 1} (${item.title || 'Untitled'}): ${err.message}`);
      }
    });

    MindGamesDB.addAuditLog({
      actorId: session.userId,
      actorName: session.username,
      action: 'PUZZLES_BULK_IMPORTED',
      targetType: 'puzzle',
      targetId: 'bulk_import',
      details: `Bulk imported ${importedCount} puzzle(s) with ${errors.length} validation failures.`
    });

    return { importedCount, errors };
  }

  public static exportPuzzlesJSON(token: string): string {
    this.requireAdmin(token);
    const puzzles = MindGamesDB.getPuzzles(true);
    return JSON.stringify(puzzles, null, 2);
  }

  private static validatePuzzleData(data: Partial<BasePuzzle>): void {
    if (!data.title || data.title.trim().length < 3) {
      throw new Error('Puzzle title must be at least 3 characters long.');
    }
    if (!data.category) {
      throw new Error('A valid game category is required.');
    }
    if (!data.mode) {
      throw new Error('A valid game mode is required.');
    }
    if (!data.difficulty) {
      throw new Error('Difficulty level (Easy, Medium, Hard, Expert) is required.');
    }
  }

  // --- DAILY CHALLENGE MANAGEMENT ---
  public static scheduleDailyChallenge(token: string, dateStr: string, puzzleId: string): void {
    const session = this.requireAdmin(token);
    
    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD.');
    }

    const puzzle = MindGamesDB.getPuzzleById(puzzleId);
    if (!puzzle) {
      throw new Error(`Target puzzle "${puzzleId}" does not exist in the library.`);
    }

    const existingSchedule = MindGamesDB.getDailySchedule();
    const prev = existingSchedule[dateStr];

    MindGamesDB.setDailySchedule(dateStr, puzzleId, session.username);

    MindGamesDB.addAuditLog({
      actorId: session.userId,
      actorName: session.username,
      action: 'DAILY_CHALLENGE_SCHEDULED',
      targetType: 'daily_challenge',
      targetId: dateStr,
      details: `Scheduled puzzle "${puzzle.title}" (${puzzleId}) for daily challenge date ${dateStr}.`,
      before: prev,
      after: { date: dateStr, puzzleId, scheduledBy: session.username }
    });
  }

  // --- GAMEPLAY SETTINGS ---
  public static updateGameSettings(token: string, newSettings: Partial<GameSettings>): GameSettings {
    const session = this.requireAdmin(token);
    const current = MindGamesDB.getGameSettings();

    // Validate settings boundaries
    if (newSettings.hintPenaltyPercent !== undefined && (newSettings.hintPenaltyPercent < 0 || newSettings.hintPenaltyPercent > 50)) {
      throw new Error('Hint penalty must be between 0% and 50%.');
    }
    if (newSettings.sprintDurationSeconds !== undefined && (newSettings.sprintDurationSeconds < 30 || newSettings.sprintDurationSeconds > 300)) {
      throw new Error('Brain Sprint duration must be between 30 and 300 seconds.');
    }

    const updated: GameSettings = {
      ...current,
      ...newSettings,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: session.username
    };

    MindGamesDB.saveGameSettings(updated);

    MindGamesDB.addAuditLog({
      actorId: session.userId,
      actorName: session.username,
      action: 'GAME_SETTINGS_UPDATED',
      targetType: 'settings',
      targetId: `v${updated.version}`,
      details: `Updated platform game settings to version ${updated.version}.`,
      before: current,
      after: updated
    });

    return updated;
  }

  public static resetGameSettings(token: string): GameSettings {
    const session = this.requireAdmin(token);
    const current = MindGamesDB.getGameSettings();

    const resetSettings: GameSettings = {
      ...DEFAULT_GAME_SETTINGS,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: session.username
    };

    MindGamesDB.saveGameSettings(resetSettings);

    MindGamesDB.addAuditLog({
      actorId: session.userId,
      actorName: session.username,
      action: 'GAME_SETTINGS_RESET',
      targetType: 'settings',
      targetId: `v${resetSettings.version}`,
      details: `Reset platform gameplay settings to defaults.`
    });

    return resetSettings;
  }

  // --- BRANDING SETTINGS ---
  public static updateBranding(token: string, branding: Partial<BrandingSettings>): BrandingSettings {
    const session = this.requireAdmin(token);
    const current = MindGamesDB.getBrandingSettings();

    const updated: BrandingSettings = {
      ...current,
      ...branding
    };

    MindGamesDB.saveBrandingSettings(updated);

    MindGamesDB.addAuditLog({
      actorId: session.userId,
      actorName: session.username,
      action: 'BRANDING_UPDATED',
      targetType: 'branding',
      targetId: 'branding_config',
      details: `Updated site branding, headlines, or announcement banner.`
    });

    return updated;
  }

  // --- FEATURE FLAGS & MAINTENANCE ---
  public static updateFeatureFlags(token: string, flags: Partial<FeatureFlags>): FeatureFlags {
    const session = this.requireAdmin(token);
    const current = MindGamesDB.getFeatureFlags();

    const updated: FeatureFlags = {
      ...current,
      ...flags
    };

    MindGamesDB.saveFeatureFlags(updated);

    MindGamesDB.addAuditLog({
      actorId: session.userId,
      actorName: session.username,
      action: 'FEATURE_FLAGS_UPDATED',
      targetType: 'feature_flags',
      targetId: 'flags_config',
      details: `Updated system feature flags. Maintenance mode: ${updated.maintenanceMode ? 'ENABLED' : 'DISABLED'}.`,
      before: current,
      after: updated
    });

    return updated;
  }

  // --- USER MANAGEMENT ---
  public static setUserRole(token: string, targetUserId: string, newRole: UserRole): UserProfile {
    const session = this.requireSuperAdmin(token);
    const targetUser = MindGamesDB.getUserById(targetUserId);
    if (!targetUser) throw new Error(`User ID "${targetUserId}" not found.`);

    const oldRole = targetUser.role;
    targetUser.role = newRole;
    MindGamesDB.saveUser(targetUser);

    MindGamesDB.addAuditLog({
      actorId: session.userId,
      actorName: session.username,
      action: 'USER_ROLE_CHANGED',
      targetType: 'user',
      targetId: targetUserId,
      details: `Changed role of "${targetUser.username}" from ${oldRole} to ${newRole}.`
    });

    return targetUser;
  }

  public static toggleUserSuspension(token: string, targetUserId: string, isSuspended: boolean, reason?: string): UserProfile {
    const session = this.requireAdmin(token);
    const targetUser = MindGamesDB.getUserById(targetUserId);
    if (!targetUser) throw new Error(`User ID "${targetUserId}" not found.`);

    targetUser.isSuspended = isSuspended;
    targetUser.suspendedReason = isSuspended ? (reason || 'Administrative suspension') : undefined;
    MindGamesDB.saveUser(targetUser);

    MindGamesDB.addAuditLog({
      actorId: session.userId,
      actorName: session.username,
      action: isSuspended ? 'USER_SUSPENDED' : 'USER_RESTORED',
      targetType: 'user',
      targetId: targetUserId,
      details: `${isSuspended ? 'Suspended' : 'Restored'} user account "${targetUser.username}". Reason: ${reason || 'N/A'}`
    });

    return targetUser;
  }

  public static correctUserScore(token: string, targetUserId: string, newScore: number, reason: string): UserProfile {
    const session = this.requireAdmin(token);
    if (!reason || reason.trim().length < 5) {
      throw new Error('A documented administrative explanation is required for manual score correction.');
    }

    const targetUser = MindGamesDB.getUserById(targetUserId);
    if (!targetUser) throw new Error(`User ID "${targetUserId}" not found.`);

    const oldScore = targetUser.brainScore;
    targetUser.brainScore = Math.max(0, newScore);
    MindGamesDB.saveUser(targetUser);

    MindGamesDB.addAuditLog({
      actorId: session.userId,
      actorName: session.username,
      action: 'USER_SCORE_CORRECTED',
      targetType: 'user',
      targetId: targetUserId,
      details: `Corrected score of "${targetUser.username}" from ${oldScore} to ${newScore}. Reason: "${reason}"`,
      before: { brainScore: oldScore },
      after: { brainScore: newScore }
    });

    return targetUser;
  }

  // --- ACHIEVEMENTS MANAGEMENT ---
  public static saveAchievementDefinition(token: string, ach: Achievement): void {
    const session = this.requireAdmin(token);
    if (!ach.title || ach.title.trim().length < 3) {
      throw new Error('Achievement title must be at least 3 characters.');
    }
    MindGamesDB.saveAchievement(ach);

    MindGamesDB.addAuditLog({
      actorId: session.userId,
      actorName: session.username,
      action: 'ACHIEVEMENT_UPDATED',
      targetType: 'achievement',
      targetId: ach.id,
      details: `Saved achievement definition "${ach.title}" (Threshold: ${ach.requirement}).`
    });
  }

  public static toggleAchievement(token: string, achievementId: string, isEnabled: boolean): void {
    const session = this.requireAdmin(token);
    const achievements = MindGamesDB.getAchievements();
    const ach = achievements.find(a => a.id === achievementId);
    if (!ach) throw new Error(`Achievement ${achievementId} not found.`);

    ach.isEnabled = isEnabled;
    MindGamesDB.saveAchievement(ach);

    MindGamesDB.addAuditLog({
      actorId: session.userId,
      actorName: session.username,
      action: 'ACHIEVEMENT_TOGGLED',
      targetType: 'achievement',
      targetId: achievementId,
      details: `${isEnabled ? 'Enabled' : 'Disabled'} achievement "${ach.title}".`
    });
  }

  // --- ATTEMPT & ANTI-CHEAT MODERATION ---
  public static getAllAttempts(token?: string): any[] {
    this.requireAdmin(token);
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('mg_puzzle_attempts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  public static reviewAttempt(token: string, attemptId: string, status: 'verified' | 'invalidated', notes?: string): void {
    const session = this.requireAdmin(token);
    if (typeof window === 'undefined') return;

    try {
      const attempts = this.getAllAttempts(token);
      const attempt = attempts.find((a: any) => a.id === attemptId);
      if (!attempt) throw new Error(`Attempt ${attemptId} not found.`);

      const previousStatus = attempt.reviewStatus || 'pending';
      attempt.reviewStatus = status;
      attempt.isFlagged = status === 'invalidated';
      if (notes) attempt.flagReason = notes;

      localStorage.setItem('mg_puzzle_attempts', JSON.stringify(attempts));

      // If invalidated, also deduct points from user profile if registered
      if (status === 'invalidated' && attempt.scoreAwarded > 0) {
        const user = MindGamesDB.getUserById(attempt.userId);
        if (user) {
          user.brainScore = Math.max(0, user.brainScore - attempt.scoreAwarded);
          if (user.completedPuzzles && user.completedPuzzles[attempt.puzzleId]) {
            delete user.completedPuzzles[attempt.puzzleId];
          }
          MindGamesDB.saveUser(user);
        }
      }

      MindGamesDB.addAuditLog({
        actorId: session.userId,
        actorName: session.username,
        action: 'ATTEMPT_REVIEWED',
        targetType: 'leaderboard',
        targetId: attemptId,
        details: `Marked attempt on puzzle "${attempt.puzzleId}" as ${status.toUpperCase()} (${notes || 'No extra notes'}). Status changed from ${previousStatus}.`
      });
    } catch (err: any) {
      throw new Error(`Failed to review attempt: ${err.message}`);
    }
  }

  // --- MODERATION REPORTS ---
  public static getReports(token?: string) {
    this.requireAdmin(token);
    return MindGamesDB.getReports();
  }

  public static resolveReport(token: string, reportId: string, status: 'resolved' | 'dismissed'): void {
    const session = this.requireAdmin(token);
    MindGamesDB.updateReportStatus(reportId, status);

    MindGamesDB.addAuditLog({
      actorId: session.userId,
      actorName: session.username,
      action: 'REPORT_RESOLVED',
      targetType: 'puzzle',
      targetId: reportId,
      details: `Report ${reportId} marked as ${status}.`
    });
  }

  // --- MONETIZATION PLANS ---
  public static updateSubscriptionPlan(token: string, plan: any): void {
    const session = this.requireAdmin(token);
    MindGamesDB.saveSubscriptionPlan(plan);

    MindGamesDB.addAuditLog({
      actorId: session.userId,
      actorName: session.username,
      action: 'SUBSCRIPTION_PLAN_UPDATED',
      targetType: 'system',
      targetId: plan.id,
      details: `Updated plan "${plan.name}" (Monthly: $${plan.priceMonthly}, Yearly: $${plan.priceYearly}).`
    });
  }

  // --- AUDIT LOG EXPORT ---
  public static exportAuditLogsJSON(token: string): string {
    this.requireAdmin(token);
    const logs = MindGamesDB.getAuditLogs();
    return JSON.stringify(logs, null, 2);
  }

  public static exportAuditLogsCSV(token: string): string {
    this.requireAdmin(token);
    const logs = MindGamesDB.getAuditLogs();
    const headers = ['Timestamp', 'Date', 'Actor', 'Action', 'TargetType', 'TargetId', 'Details'];
    const rows = logs.map(l => [
      l.timestamp,
      new Date(l.timestamp).toISOString(),
      `"${(l.actorName || '').replace(/"/g, '""')}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.targetType || '').replace(/"/g, '""')}"`,
      `"${(l.targetId || '').replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

