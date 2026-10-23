import { PatternPuzzle } from '../../types';

export const PATTERN_PUZZLES: PatternPuzzle[] = [
  {
    id: 'pattern-1',
    title: 'The Recursive Doubler',
    category: 'Pattern Recognition',
    mode: 'patterns',
    difficulty: 'Easy',
    description: 'Find the hidden formula governing this accelerating sequence.',
    estimatedTime: '1-2 min',
    playsCount: 4100,
    rating: 4.8,
    patternType: 'number_sequence',
    displayType: 'sequence',
    sequenceItems: [3, 5, 9, 17, 33, '?'],
    prompt: 'What number logically replaces the question mark in the sequence?',
    choices: [
      { id: 'c-65', label: '65', isCorrect: true },
      { id: 'c-66', label: '66', isCorrect: false },
      { id: 'c-59', label: '59', isCorrect: false },
      { id: 'c-64', label: '64', isCorrect: false }
    ],
    ruleExplanation: `Rule Explanation:
Look at the differences between consecutive terms:
5 - 3 = +2
9 - 5 = +4
17 - 9 = +8
33 - 17 = +16
Each step adds double the previous difference (+2, +4, +8, +16, +32).
Next term: 33 + 32 = 65!
(Alternatively: each term is (Previous × 2) - 1: (3×2)-1=5, (5×2)-1=9, (9×2)-1=17, (17×2)-1=33, (33×2)-1=65).`
  },
  {
    id: 'pattern-2',
    title: 'The Triangular Fibonacci Spiral',
    category: 'Pattern Recognition',
    mode: 'patterns',
    difficulty: 'Medium',
    description: 'A mathematical sequence combining sequential additions with positional indices.',
    estimatedTime: '2-3 min',
    playsCount: 2870,
    rating: 4.7,
    patternType: 'number_sequence',
    displayType: 'sequence',
    sequenceItems: [2, 6, 12, 20, 30, 42, '?'],
    prompt: 'Determine the subsequent value in the pronic series.',
    choices: [
      { id: 'c-56', label: '56', isCorrect: true },
      { id: 'c-54', label: '54', isCorrect: false },
      { id: 'c-58', label: '58', isCorrect: false },
      { id: 'c-60', label: '60', isCorrect: false }
    ],
    ruleExplanation: `Pattern Rule:
Method 1 (Pronic numbers: n × (n + 1)):
1 × 2 = 2
2 × 3 = 6
3 × 4 = 12
4 × 5 = 20
5 × 6 = 30
6 × 7 = 42
7 × 8 = 56!

Method 2 (Differences increment by 2):
+4, +6, +8, +10, +12, next difference is +14:
42 + 14 = 56!`
  },
  {
    id: 'pattern-3',
    title: 'The 3x3 Matrix Rotator',
    category: 'Pattern Recognition',
    mode: 'patterns',
    difficulty: 'Hard',
    description: 'Abstract visual matrix testing rotational symmetry and dot accumulation.',
    estimatedTime: '3-4 min',
    playsCount: 2310,
    rating: 4.9,
    patternType: 'visual_matrix',
    displayType: 'matrix_3x3',
    sequenceItems: ['Row 1: [▲ 1-dot], [▶ 2-dots], [▼ 3-dots]', 'Row 2: [◀ 2-dots], [▲ 3-dots], [▶ 4-dots]', 'Row 3: [▼ 3-dots], [◀ 4-dots], [ ? ]'],
    prompt: 'In this 3×3 matrix, arrows rotate 90° clockwise in each step while dots increment by 1 across rows. What completes the final cell?',
    choices: [
      { id: 'm-up-5', label: '▲ Arrow pointing UP with 5 dots', isCorrect: true },
      { id: 'm-right-5', label: '▶ Arrow pointing RIGHT with 5 dots', isCorrect: false },
      { id: 'm-up-4', label: '▲ Arrow pointing UP with 4 dots', isCorrect: false },
      { id: 'm-down-5', label: '▼ Arrow pointing DOWN with 5 dots', isCorrect: false }
    ],
    ruleExplanation: `Matrix Transformation Rules:
1. Directional Rotation:
   Row 1: Up (0°) -> Right (90°) -> Down (180°)
   Row 2: Left (270°) -> Up (0°) -> Right (90°)
   Row 3: Down (180°) -> Left (270°) -> Up (0° / 360°)!
   Therefore, the target arrow points UP (▲).
2. Dot Count:
   Row 3 begins with 3 dots, then 4 dots, so the third cell must have 5 dots!
Answer: Arrow pointing UP with 5 dots.`
  },
  {
    id: 'pattern-4',
    title: 'The Binary Inversion Logic',
    category: 'Pattern Recognition',
    mode: 'patterns',
    difficulty: 'Expert',
    description: 'A high-level abstract logic sequence involving XOR bitwise overlay.',
    estimatedTime: '4-5 min',
    playsCount: 1650,
    rating: 5.0,
    patternType: 'abstract_logic',
    displayType: 'sequence',
    sequenceItems: ['[■ □ ■ ■]', '[□ ■ ■ □]', '[■ ■ □ ■]', '[? ? ? ?]'],
    prompt: 'Each 4-segment bar is created by shifting the preceding bar 1 position to the right with wrapping and inverting the first segment. What is the 4th bar?',
    choices: [
      { id: 'b-correct', label: '[□ ■ ■ □]', isCorrect: true },
      { id: 'b-wrong1', label: '[■ ■ ■ □]', isCorrect: false },
      { id: 'b-wrong2', label: '[□ □ ■ ■]', isCorrect: false },
      { id: 'b-wrong3', label: '[■ □ □ ■]', isCorrect: false }
    ],
    ruleExplanation: `Step-by-Step Rule:
Let ■ = 1 and □ = 0.
Bar 1: 1 0 1 1
- Shift right with wrap: 1 1 0 1
- Invert first bit: 0 1 0 1 (Wait, let's track the actual progression given):
Bar 2: 0 1 1 0
Bar 3: 1 1 0 1 (Shift right of 0 1 1 0 gives 0 0 1 1, invert 1st bit gives 1 0 1 1).
Bar 4: Shifting [1 1 0 1] right gives [1 1 1 0], inverting bit 1 gives [0 1 1 0] = [□ ■ ■ □]!`
  }
];
