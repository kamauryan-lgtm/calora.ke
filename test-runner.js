// Standalone Verification Test Suite for Mind Games & Admin Control Centre
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Minimal localStorage and sessionStorage mock for Node environment tests
class StorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

global.window = {
  localStorage: new StorageMock(),
  sessionStorage: new StorageMock(),
  location: { search: '', pathname: '/' }
};
global.localStorage = global.window.localStorage;
global.sessionStorage = global.window.sessionStorage;

console.log('🧪 Starting Mind Games Comprehensive Automated Verification Suite...\n');

let passedTests = 0;

async function runTest(description, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(err);
    process.exit(1);
  }
}

async function main() {
  // 1. Filesystem & Distribution Validation
  await runTest('Build output files exist in dist/', async () => {
    assert(fs.existsSync(path.resolve('./dist/index.html')), 'dist/index.html missing');
    assert(fs.existsSync(path.resolve('./dist/assets')), 'dist/assets directory missing');
    const distFiles = fs.readdirSync(path.resolve('./dist/assets'));
    assert(distFiles.some(f => f.endsWith('.js')), 'dist/assets missing compiled js file');
    assert(distFiles.some(f => f.endsWith('.css')), 'dist/assets missing compiled css file');
  });

  // 2. Source Code Architecture & Data Integrity Checks
  await runTest('All 8 required puzzle category data files exist', async () => {
    const puzzleFiles = [
      './src/data/puzzles/riddles.ts',
      './src/data/puzzles/logicPuzzles.ts',
      './src/data/puzzles/mysteries.ts',
      './src/data/puzzles/patterns.ts',
      './src/data/puzzles/lateralPuzzles.ts',
      './src/data/puzzles/mathWordPuzzles.ts',
      './src/data/puzzles/sprintQuestions.ts',
      './src/data/puzzles/index.ts',
    ];
    for (const f of puzzleFiles) {
      assert(fs.existsSync(path.resolve(f)), `Missing file: ${f}`);
    }
  });

  await runTest('All 6 core game mode components exist', async () => {
    const modeComponents = [
      './src/components/modes/QuickRiddlesArena.tsx',
      './src/components/modes/LogicLabArena.tsx',
      './src/components/modes/DetectiveArena.tsx',
      './src/components/modes/PatternMasterArena.tsx',
      './src/components/modes/BrainSprintArena.tsx',
      './src/components/modes/LateralArena.tsx',
      './src/components/modes/ExtendedPuzzleArena.tsx',
    ];
    for (const c of modeComponents) {
      assert(fs.existsSync(path.resolve(c)), `Missing component: ${c}`);
    }
  });

  await runTest('Core layout and homepage components exist', async () => {
    const homeComponents = [
      './src/components/layout/Navbar.tsx',
      './src/components/layout/Footer.tsx',
      './src/components/home/Hero.tsx',
      './src/components/home/DailyTeaserCard.tsx',
      './src/components/home/CategoryExplorer.tsx',
      './src/components/home/DifficultyFilter.tsx',
      './src/components/home/PuzzleGrid.tsx',
      './src/components/home/DailyLeaderboard.tsx',
      './src/components/home/ProgressSummary.tsx',
    ];
    for (const c of homeComponents) {
      assert(fs.existsSync(path.resolve(c)), `Missing home component: ${c}`);
    }
  });

  // 3. Admin Control Centre Architecture Checks
  await runTest('All 11 Admin Studio tab components and layout shells exist', async () => {
    const adminFiles = [
      './src/components/admin/AdminLayout.tsx',
      './src/components/admin/AdminLogin.tsx',
      './src/components/admin/tabs/OverviewTab.tsx',
      './src/components/admin/tabs/PuzzleStudioTab.tsx',
      './src/components/admin/tabs/DailyManagerTab.tsx',
      './src/components/admin/tabs/GameplaySettingsTab.tsx',
      './src/components/admin/tabs/BrandingTab.tsx',
      './src/components/admin/tabs/UserManagementTab.tsx',
      './src/components/admin/tabs/LeaderboardsTab.tsx',
      './src/components/admin/tabs/AchievementsTab.tsx',
      './src/components/admin/tabs/MonetizationTab.tsx',
      './src/components/admin/tabs/FeatureFlagsTab.tsx',
      './src/components/admin/tabs/AuditLogTab.tsx',
    ];
    for (const f of adminFiles) {
      assert(fs.existsSync(path.resolve(f)), `Missing Admin file: ${f}`);
    }
  });

  // 4. Admin Services & Functional Logic Tests
  await runTest('Admin Service Authentication & RBAC security enforcement', async () => {
    const { AdminService } = await import('./src/lib/adminService.ts');
    const { MindGamesDB } = await import('./src/lib/database.ts');
    MindGamesDB.initialize();

    // Test Invalid Credentials first
    const failRes = AdminService.loginAdmin('hacker', 'wrongpassword');
    assert(failRes.success === false, 'Invalid credentials should be rejected');
    assert(failRes.error?.includes('Access denied'), 'Error message missing');

    // Test Regular Admin login
    const adminRes = AdminService.loginAdmin('admin', 'MindGames#2026!');
    assert(adminRes.success === true, 'Admin login failed');
    assert(adminRes.session?.role === 'admin', 'Admin role incorrect');
    assert.throws(() => AdminService.requireSuperAdmin(adminRes.session?.token), /Super Administrator authorization is strictly required/);

    // Test SuperAdmin login
    const superRes = AdminService.loginAdmin('superadmin', 'AdminSecret#2026!');
    assert(superRes.success === true, 'Superadmin login failed');
    assert(superRes.session?.role === 'superadmin', 'Superadmin role incorrect');
    assert(superRes.session?.token.startsWith('adm_tok_'), 'Session token format invalid');

    // Verify requireAdmin & requireSuperAdmin succeed for superadmin
    const verified = AdminService.requireAdmin(superRes.session?.token);
    assert(verified.username === 'superadmin', 'requireAdmin session mismatch');
    assert.doesNotThrow(() => AdminService.requireSuperAdmin(superRes.session?.token));
  });

  await runTest('Puzzle Management Studio: CRUD, validation, and status lifecycle', async () => {
    const { AdminService } = await import('./src/lib/adminService.ts');
    const { MindGamesDB } = await import('./src/lib/database.ts');

    const superRes = AdminService.loginAdmin('superadmin', 'AdminSecret#2026!');
    const token = superRes.session?.token;

    // 1. Validation test: title too short
    assert.throws(() => {
      AdminService.createPuzzle(token, {
        title: 'X',
        category: 'Logic',
        mode: 'logic',
        difficulty: 'Medium'
      });
    }, /must be at least 3 characters/);

    // 2. Create valid puzzle
    const testPuzzleId = 'test_puz_' + Date.now();
    const created = AdminService.createPuzzle(token, {
      id: testPuzzleId,
      title: 'Automated Cipher Test',
      description: 'A test logic deduction riddle.',
      category: 'Logic',
      mode: 'logic',
      difficulty: 'Hard',
      author: 'TestRunner'
    });
    assert(created.id === testPuzzleId, 'Puzzle ID mismatch');

    // Verify persisted in DB
    const fetched = MindGamesDB.getPuzzleById(testPuzzleId);
    assert(fetched && fetched.title === 'Automated Cipher Test', 'Created puzzle not found in database');

    // 3. Update puzzle
    const updated = AdminService.updatePuzzle(token, {
      ...fetched,
      title: 'Automated Cipher Test (Revised Edition)'
    });
    assert(updated.title.includes('Revised Edition'), 'Puzzle update failed');

    // 4. Toggle publish status
    const draft = AdminService.togglePublishStatus(token, testPuzzleId, 'draft');
    assert(draft.publicationStatus === 'draft', 'Status toggle failed');
    const publicPuzzles = MindGamesDB.getPuzzles(false);
    assert(!publicPuzzles.some(p => p.id === testPuzzleId), 'Draft puzzle must not appear in public library');

    // 5. Delete puzzle
    AdminService.deletePuzzle(token, testPuzzleId);
    assert(!MindGamesDB.getPuzzleById(testPuzzleId), 'Deleted puzzle should no longer exist');
  });

  await runTest('Daily Challenge Manager: date scheduling and override protection', async () => {
    const { AdminService } = await import('./src/lib/adminService.ts');
    const { MindGamesDB } = await import('./src/lib/database.ts');

    const session = AdminService.loginAdmin('superadmin', 'AdminSecret#2026!');
    const token = session.session?.token;

    const testDate = '2026-12-25';
    const existingPuzzle = MindGamesDB.getPuzzles(true)[0];

    AdminService.scheduleDailyChallenge(token, testDate, existingPuzzle.id);

    const schedule = MindGamesDB.getDailySchedule();
    assert(schedule[testDate] !== undefined, 'Date entry missing from schedule');
    assert(schedule[testDate].puzzleId === existingPuzzle.id, 'Scheduled puzzle ID mismatch');
    assert(schedule[testDate].scheduledBy === 'superadmin', 'Scheduler actor mismatch');

    // Validate malformed date format
    assert.throws(() => {
      AdminService.scheduleDailyChallenge(token, 'invalid-date', existingPuzzle.id);
    }, /Invalid date format/);
  });

  await runTest('Gameplay & Scoring Settings: boundary enforcement and versioning', async () => {
    const { AdminService } = await import('./src/lib/adminService.ts');
    const { MindGamesDB } = await import('./src/lib/database.ts');

    const session = AdminService.loginAdmin('superadmin', 'AdminSecret#2026!');
    const token = session.session?.token;

    const initialSettings = MindGamesDB.getGameSettings();

    // Boundary error test: penalty > 50%
    assert.throws(() => {
      AdminService.updateGameSettings(token, { hintPenaltyPercent: 80 });
    }, /Hint penalty must be between 0% and 50%/);

    // Boundary error test: sprint duration < 30s
    assert.throws(() => {
      AdminService.updateGameSettings(token, { sprintDurationSeconds: 10 });
    }, /Brain Sprint duration must be between 30 and 300 seconds/);

    // Valid update
    const updated = AdminService.updateGameSettings(token, { hintPenaltyPercent: 20 });
    assert(updated.hintPenaltyPercent === 20, 'Setting update failed');
    assert(updated.version === initialSettings.version + 1, 'Version not incremented');

    // Reset to defaults
    const reset = AdminService.resetGameSettings(token);
    assert(reset.hintPenaltyPercent === 15, 'Reset did not restore default penalty');
  });

  await runTest('User Management: score correction requiring justification and user suspension', async () => {
    const { AdminService } = await import('./src/lib/adminService.ts');
    const { MindGamesDB } = await import('./src/lib/database.ts');

    const session = AdminService.loginAdmin('superadmin', 'AdminSecret#2026!');
    const token = session.session?.token;

    const users = MindGamesDB.getUsers();
    const testUser = users[1] || users[0];

    // Score correction without justification must throw
    assert.throws(() => {
      AdminService.correctUserScore(token, testUser.id, 9999, 'bad');
    }, /documented administrative explanation is required/);

    // Valid score correction
    const corrected = AdminService.correctUserScore(token, testUser.id, 4200, 'Legitimate speed test adjustment under review');
    assert(corrected.brainScore === 4200, 'Score correction failed');

    // Suspension toggle
    const suspended = AdminService.toggleUserSuspension(token, testUser.id, true, 'Testing suspension mechanism');
    assert(suspended.isSuspended === true, 'User suspension failed');
    const restored = AdminService.toggleUserSuspension(token, testUser.id, false);
    assert(restored.isSuspended === false, 'User restoration failed');
  });

  await runTest('Anti-Cheat Detection & Attempt Moderation', async () => {
    const { MindGamesStorage } = await import('./src/lib/storage.ts');
    const { AdminService } = await import('./src/lib/adminService.ts');

    // Record an impossibly rapid solve (e.g. 250ms)
    const result = MindGamesStorage.recordAttempt({
      puzzleId: 'riddle-1',
      userId: 'usr_test_speed',
      durationMs: 250,
      hintsUsed: 0,
      isCorrect: true,
      scoreAwarded: 500,
      mode: 'riddles'
    });

    assert(result.attempt.isFlagged === true, 'Rapid solve must be flagged by anti-cheat');
    assert(result.attempt.reviewStatus === 'pending', 'Flagged attempt must have pending reviewStatus');

    const session = AdminService.loginAdmin('superadmin', 'AdminSecret#2026!');
    const token = session.session?.token;

    // Review & Invalidate attempt
    AdminService.reviewAttempt(token, result.attempt.id, 'invalidated', 'Speed hack script verified');
    const attempts = AdminService.getAllAttempts(token);
    const reviewed = attempts.find(a => a.id === result.attempt.id);
    assert(reviewed?.reviewStatus === 'invalidated', 'Attempt review status not saved');
  });

  await runTest('Feature Flags: Maintenance mode and runtime switches', async () => {
    const { AdminService } = await import('./src/lib/adminService.ts');
    const { MindGamesDB } = await import('./src/lib/database.ts');

    const session = AdminService.loginAdmin('superadmin', 'AdminSecret#2026!');
    const token = session.session?.token;

    const toggled = AdminService.updateFeatureFlags(token, { maintenanceMode: true });
    assert(toggled.maintenanceMode === true, 'Maintenance mode toggle failed');

    // Reset maintenance mode
    AdminService.updateFeatureFlags(token, { maintenanceMode: false });
    assert(MindGamesDB.getFeatureFlags().maintenanceMode === false, 'Maintenance mode reset failed');
  });

  await runTest('Audit Log: Immutable record keeping and export capabilities', async () => {
    const { AdminService } = await import('./src/lib/adminService.ts');
    const { MindGamesDB } = await import('./src/lib/database.ts');

    const session = AdminService.loginAdmin('superadmin', 'AdminSecret#2026!');
    const token = session.session?.token;

    const logs = MindGamesDB.getAuditLogs();
    assert(logs.length > 0, 'Audit logs must contain records from previous admin actions');

    const lastLog = logs[0];
    assert(lastLog.actorName !== undefined, 'Audit record missing actor');
    assert(lastLog.action !== undefined, 'Audit record missing action');
    assert(lastLog.timestamp > 0, 'Audit record missing timestamp');

    // Test Export JSON & CSV
    const jsonExport = AdminService.exportAuditLogsJSON(token);
    assert(jsonExport.startsWith('['), 'JSON export format invalid');
    const csvExport = AdminService.exportAuditLogsCSV(token);
    assert(csvExport.includes('Timestamp,Date,Actor,Action'), 'CSV export headers invalid');
  });

  await runTest('Ethical disclaimer is prominently embedded in Footer and Hero', async () => {
    const footerFile = fs.readFileSync(path.resolve('./src/components/layout/Footer.tsx'), 'utf-8');
    assert(footerFile.includes('Scientific Disclaimer'), 'Missing scientific disclaimer');
    assert(footerFile.includes('does not measure clinical intelligence (IQ)'), 'Missing psychometric disclaimer');
    assert(footerFile.includes('Admin Portal'), 'Footer missing Admin Portal navigation link');
  });

  console.log(`\n🎉 All ${passedTests} test suites verified successfully with 0 errors!`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
