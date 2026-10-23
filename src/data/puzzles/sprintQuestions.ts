import { SprintQuestion } from '../../types';

export const SPRINT_QUESTIONS: SprintQuestion[] = [
  // Mental Arithmetic
  {
    id: 'sprint-math-1',
    type: 'math',
    prompt: '37 + 48 = ?',
    options: ['85', '83', '87', '75'],
    correctIndex: 0
  },
  {
    id: 'sprint-math-2',
    type: 'math',
    prompt: '13 × 7 = ?',
    options: ['91', '84', '97', '81'],
    correctIndex: 0
  },
  {
    id: 'sprint-math-3',
    type: 'math',
    prompt: '144 ÷ 12 + 19 = ?',
    options: ['31', '33', '29', '32'],
    correctIndex: 0
  },
  {
    id: 'sprint-math-4',
    type: 'math',
    prompt: '85 - 29 = ?',
    options: ['56', '54', '66', '58'],
    correctIndex: 0
  },
  {
    id: 'sprint-math-5',
    type: 'math',
    prompt: '15 × 15 - 25 = ?',
    options: ['200', '225', '195', '210'],
    correctIndex: 0
  },
  {
    id: 'sprint-math-6',
    type: 'math',
    prompt: '7² + 4² = ?',
    options: ['65', '63', '55', '71'],
    correctIndex: 0
  },
  {
    id: 'sprint-math-7',
    type: 'math',
    prompt: '25% of 280 = ?',
    options: ['70', '65', '75', '80'],
    correctIndex: 0
  },

  // Stroop Test (What COLOR is the ink?)
  {
    id: 'sprint-stroop-1',
    type: 'stroop',
    prompt: 'RED',
    subprompt: 'Click the COLOR of the text (not what it spells!):',
    displayColor: '#0EA5E9', // Blue color
    options: ['Blue', 'Red', 'Green', 'Yellow'],
    correctIndex: 0
  },
  {
    id: 'sprint-stroop-2',
    type: 'stroop',
    prompt: 'YELLOW',
    subprompt: 'Click the COLOR of the text (not what it spells!):',
    displayColor: '#10B981', // Green color
    options: ['Green', 'Yellow', 'Purple', 'Orange'],
    correctIndex: 0
  },
  {
    id: 'sprint-stroop-3',
    type: 'stroop',
    prompt: 'GREEN',
    subprompt: 'Click the COLOR of the text (not what it spells!):',
    displayColor: '#EF4444', // Red color
    options: ['Red', 'Green', 'Blue', 'Pink'],
    correctIndex: 0
  },
  {
    id: 'sprint-stroop-4',
    type: 'stroop',
    prompt: 'PURPLE',
    subprompt: 'Click the COLOR of the text (not what it spells!):',
    displayColor: '#F59E0B', // Amber/Yellow color
    options: ['Yellow', 'Purple', 'Blue', 'White'],
    correctIndex: 0
  },
  {
    id: 'sprint-stroop-5',
    type: 'stroop',
    prompt: 'BLUE',
    subprompt: 'Click the COLOR of the text (not what it spells!):',
    displayColor: '#8B5CF6', // Purple color
    options: ['Purple', 'Blue', 'Red', 'Cyan'],
    correctIndex: 0
  },

  // Rapid Sequences
  {
    id: 'sprint-seq-1',
    type: 'sequence',
    prompt: '4, 9, 16, 25, ?',
    options: ['36', '35', '38', '49'],
    correctIndex: 0
  },
  {
    id: 'sprint-seq-2',
    type: 'sequence',
    prompt: '2, 6, 18, 54, ?',
    options: ['162', '158', '144', '172'],
    correctIndex: 0
  },
  {
    id: 'sprint-seq-3',
    type: 'sequence',
    prompt: '1, 1, 2, 3, 5, 8, ?',
    options: ['13', '12', '14', '15'],
    correctIndex: 0
  },
  {
    id: 'sprint-seq-4',
    type: 'sequence',
    prompt: '100, 93, 85, 76, ?',
    options: ['66', '67', '65', '64'],
    correctIndex: 0
  },
  {
    id: 'sprint-seq-5',
    type: 'sequence',
    prompt: 'Z, X, V, T, ?',
    options: ['R', 'S', 'Q', 'P'],
    correctIndex: 0
  },

  // Spatial Navigation & Arrow Reflex
  {
    id: 'sprint-spatial-1',
    type: 'spatial',
    prompt: 'Facing NORTH. Turn 90° RIGHT, then 180° around. Which way now?',
    options: ['West', 'East', 'South', 'North'],
    correctIndex: 0
  },
  {
    id: 'sprint-spatial-2',
    type: 'spatial',
    prompt: 'Facing SOUTH. Turn LEFT twice. Which way are you facing?',
    options: ['North', 'South', 'East', 'West'],
    correctIndex: 0
  },
  {
    id: 'sprint-spatial-3',
    type: 'spatial',
    prompt: 'Facing WEST. Turn 270° clockwise. Which way are you facing?',
    options: ['South', 'North', 'East', 'West'],
    correctIndex: 0
  },

  // Word & Anagram Reflex
  {
    id: 'sprint-ana-1',
    type: 'anagram',
    prompt: 'Unscramble: L S I N T E',
    options: ['LISTEN', 'INSECT', 'TINSEL', 'SILENT'],
    correctIndex: 0
  },
  {
    id: 'sprint-ana-2',
    type: 'anagram',
    prompt: 'Which word means the OPPOSITE of "EXPEDITE"?',
    options: ['Delay', 'Accelerate', 'Approve', 'Hasten'],
    correctIndex: 0
  },
  {
    id: 'sprint-ana-3',
    type: 'anagram',
    prompt: 'Odd one out: Apple, Pear, Peach, Potato, Plum',
    options: ['Potato', 'Apple', 'Peach', 'Pear'],
    correctIndex: 0
  }
];
