import { BasePuzzle, Category, Difficulty, GameMode } from '../../types';
import { RIDDLE_PUZZLES } from './riddles';
import { LOGIC_PUZZLES } from './logicPuzzles';
import { DETECTIVE_CASES } from './mysteries';
import { PATTERN_PUZZLES } from './patterns';
import { LATERAL_PUZZLES } from './lateralPuzzles';
import { MATH_WORD_PUZZLES } from './mathWordPuzzles';
import { MindGamesDB } from '../../lib/database';

export { RIDDLE_PUZZLES } from './riddles';
export { LOGIC_PUZZLES } from './logicPuzzles';
export { DETECTIVE_CASES } from './mysteries';
export { PATTERN_PUZZLES } from './patterns';
export { LATERAL_PUZZLES } from './lateralPuzzles';
export { MATH_WORD_PUZZLES } from './mathWordPuzzles';
export { SPRINT_QUESTIONS } from './sprintQuestions';

export const INITIAL_STATIC_PUZZLES: BasePuzzle[] = [
  ...RIDDLE_PUZZLES,
  ...LOGIC_PUZZLES,
  ...DETECTIVE_CASES,
  ...PATTERN_PUZZLES,
  ...LATERAL_PUZZLES,
  ...MATH_WORD_PUZZLES
];

export function getAllPuzzles(includeDrafts = false): BasePuzzle[] {
  if (typeof window === 'undefined') return INITIAL_STATIC_PUZZLES;
  return MindGamesDB.getPuzzles(includeDrafts);
}

export const ALL_PUZZLES: BasePuzzle[] = INITIAL_STATIC_PUZZLES;

export function getPuzzleById(id: string): BasePuzzle | undefined {
  if (typeof window === 'undefined') {
    return INITIAL_STATIC_PUZZLES.find(p => p.id === id);
  }
  return MindGamesDB.getPuzzleById(id) || INITIAL_STATIC_PUZZLES.find(p => p.id === id);
}

export function getPuzzlesByCategory(cat: Category): BasePuzzle[] {
  return getAllPuzzles().filter(p => p.category === cat);
}

export function getPuzzlesByDifficulty(diff: Difficulty): BasePuzzle[] {
  return getAllPuzzles().filter(p => p.difficulty === diff);
}

export function getPuzzlesByMode(mode: GameMode): BasePuzzle[] {
  return getAllPuzzles().filter(p => p.mode === mode);
}

/**
 * Deterministically pick today's Daily Brain Teaser based on UTC calendar date,
 * checking first if an administrator scheduled a specific challenge for today!
 */
export function getDailyPuzzle(dateString?: string): BasePuzzle {
  const dateStr = dateString || new Date().toISOString().split('T')[0];

  if (typeof window !== 'undefined') {
    const scheduledMap = MindGamesDB.getDailySchedule();
    if (scheduledMap && scheduledMap[dateStr] && scheduledMap[dateStr].isPublished) {
      const scheduledPuzzle = MindGamesDB.getPuzzleById(scheduledMap[dateStr].puzzleId);
      if (scheduledPuzzle) return scheduledPuzzle;
    }
  }

  const pool = getAllPuzzles();
  const validPool = pool.length > 0 ? pool : INITIAL_STATIC_PUZZLES;

  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) % 2147483647;
  }
  const index = Math.abs(hash) % validPool.length;
  return validPool[index];
}
