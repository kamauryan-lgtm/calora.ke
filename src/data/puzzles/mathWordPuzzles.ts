import { BasePuzzle } from '../../types';

export interface ExtendedPuzzle extends BasePuzzle {
  question: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  hints: string[];
  explanation: string;
}

export const MATH_WORD_PUZZLES: ExtendedPuzzle[] = [
  // Mathematics
  {
    id: 'math-1',
    title: 'The Counterfeit Gold Coin',
    category: 'Mathematics',
    mode: 'math',
    difficulty: 'Medium',
    description: 'You have 9 gold coins. One is counterfeit and slightly lighter. Find it in the minimum weighings.',
    estimatedTime: '2-3 min',
    playsCount: 3950,
    rating: 4.9,
    question: 'Using a two-pan balance scale with no weights, what is the MINIMUM number of weighings guaranteed to pinpoint the lighter fake coin among 9 identical-looking coins?',
    options: [
      { id: 'm1-opt-2', text: '2 weighings', isCorrect: true },
      { id: 'm1-opt-3', text: '3 weighings', isCorrect: false },
      { id: 'm1-opt-1', text: '1 weighing', isCorrect: false },
      { id: 'm1-opt-4', text: '4 weighings', isCorrect: false }
    ],
    hints: [
      'Think in base 3: a balance scale has three outcomes (left heavier, right heavier, or balanced).',
      'Divide the 9 coins into 3 equal piles of 3 coins each.',
      'Weigh Pile A vs Pile B. If they balance, the fake is in Pile C!'
    ],
    explanation: `Step-by-Step Proof:
1. Divide 9 coins into three groups: [3, 3, 3].
2. Weighing 1: Place 3 on Left, 3 on Right.
   - If one side rises, the fake coin is in those 3.
   - If they balance, the fake coin is in the unweighed 3.
   You now know which group of 3 contains the fake.
3. Weighing 2: From those 3 coins, place 1 on Left, 1 on Right, leaving 1 aside.
   - If one rises, it is the fake.
   - If they balance, the remaining coin is the fake!
Guaranteed in exactly 2 weighings.`
  },
  {
    id: 'math-2',
    title: 'The Snail in the 30-Foot Well',
    category: 'Mathematics',
    mode: 'math',
    difficulty: 'Easy',
    description: 'A snail climbs 3 feet up each day and slips back 2 feet each night.',
    estimatedTime: '1-2 min',
    playsCount: 4890,
    rating: 4.7,
    question: 'A snail is at the bottom of a 30-foot well. Each daylight period it climbs up 3 feet, but each night it slides down 2 feet. On which day will the snail finally reach the top and escape?',
    options: [
      { id: 'm2-opt-28', text: 'Day 28', isCorrect: true },
      { id: 'm2-opt-30', text: 'Day 30', isCorrect: false },
      { id: 'm2-opt-29', text: 'Day 29', isCorrect: false },
      { id: 'm2-opt-27', text: 'Day 27', isCorrect: false }
    ],
    hints: [
      'Be careful with the final day: once the snail reaches the top, does it slide back down?',
      'At the start of day 28, how high is the snail?',
      'On day 27 evening, it is at 27 feet. On day 28 morning, it climbs 3 feet!'
    ],
    explanation: `Explanation:
At the end of Day 27 (after slipping down), the snail is at 27 feet.
On Day 28 during the day, it climbs 3 feet: 27 + 3 = 30 feet!
It reaches the rim of the well and crawls out immediately, so it never slips back down.
Therefore, it escapes on Day 28, not Day 30!`
  },
  {
    id: 'math-3',
    title: 'The Burning Ropes Timer',
    category: 'Mathematics',
    mode: 'math',
    difficulty: 'Hard',
    description: 'Measure exactly 45 minutes using two ropes that each burn in 60 minutes with non-uniform density.',
    estimatedTime: '4-5 min',
    playsCount: 2210,
    rating: 4.9,
    question: 'You have two ropes. Each rope takes exactly 60 minutes to burn from one end to the other, but they burn unevenly (one section may burn fast, another slow). How can you measure exactly 45 minutes?',
    options: [
      { id: 'm3-opt-correct', text: 'Light Rope 1 at both ends, and Rope 2 at one end; when Rope 1 finishes (at 30 min), light the other end of Rope 2.', isCorrect: true },
      { id: 'm3-opt-wrong1', text: 'Cut both ropes into quarters and burn 3 quarters.', isCorrect: false },
      { id: 'm3-opt-wrong2', text: 'Light Rope 1 at one end for 30 minutes, then extinguish and light Rope 2.', isCorrect: false },
      { id: 'm3-opt-wrong3', text: 'Ropes cannot measure time if their density is non-uniform.', isCorrect: false }
    ],
    hints: [
      'If you light a rope from BOTH ends simultaneously, it will burn out in exactly half its normal time (30 minutes), regardless of uneven density!',
      'When Rope 1 finishes burning (30 minutes have elapsed), Rope 2 still has 30 minutes of burn time remaining.',
      'At that 30-minute mark, light the other end of Rope 2 to burn its remaining 30 minutes in half (15 minutes)!'
    ],
    explanation: `Step-by-Step Solution:
1. Light Rope 1 at BOTH ends, and simultaneously light Rope 2 at ONE end.
2. Because Rope 1 is burning from both ends, it will completely burn out in exactly 30 minutes (even though the burning rate varies).
3. The instant Rope 1 burns out (30 minutes mark), light the SECOND end of Rope 2.
4. Rope 2 had 30 minutes of fuel left. By lighting its other end, it will burn out in exactly 15 minutes!
5. 30 minutes + 15 minutes = exactly 45 minutes.`
  },

  // Word Games
  {
    id: 'word-1',
    title: 'The Word Triangle Transformation',
    category: 'Word Games',
    mode: 'word',
    difficulty: 'Easy',
    description: 'A 7-letter word from which you can remove letters one by one and still leave a valid word.',
    estimatedTime: '2 min',
    playsCount: 3620,
    rating: 4.8,
    question: 'What 7-letter English word remains a valid common word each time you remove a letter, all the way down to a single letter?',
    options: [
      { id: 'w1-start', text: 'STARTING', isCorrect: true },
      { id: 'w1-friend', text: 'FRIENDS', isCorrect: false },
      { id: 'w1-letter', text: 'LETTERS', isCorrect: false },
      { id: 'w1-simple', text: 'SIMPLES', isCorrect: false }
    ],
    hints: [
      'STARTING (8 letters) / STARING (7) / STARING -> STRING -> STING -> SING -> SIN -> IN -> I',
      'Look at the letter sequence: STARING -> STRING -> STING -> SING -> SIN -> IN -> I.',
      'It starts with the letter S.'
    ],
    explanation: 'STARTING (or STARING): Remove T -> STARING. Remove A -> STRING. Remove R -> STING. Remove T -> SING. Remove G -> SIN. Remove S -> IN. Remove N -> I! Every stage forms an authentic dictionary word.'
  },
  {
    id: 'word-2',
    title: 'The Cryptic Triple Homophone',
    category: 'Word Games',
    mode: 'word',
    difficulty: 'Medium',
    description: 'Three English words spelled differently with different definitions, but pronounced identically.',
    estimatedTime: '2-3 min',
    playsCount: 2980,
    rating: 4.6,
    question: 'One is a direction / motion, one is an excess or also, and one is a quantity following one. What are these three words?',
    options: [
      { id: 'w2-to', text: 'To, Too, Two', isCorrect: true },
      { id: 'w2-there', text: 'There, Their, They\'re', isCorrect: false },
      { id: 'w2-right', text: 'Right, Write, Rite', isCorrect: false },
      { id: 'w2-by', text: 'By, Buy, Bye', isCorrect: false }
    ],
    hints: [
      'Count 1, then the next number is...',
      '"I am going ___ the store, would you like to come ___? Please bring ___ apples."',
      'Begins with the letter T.'
    ],
    explanation: 'To (preposition of direction), Too (adverb meaning also/excessively), and Two (the cardinal number following one) are phonetically identical homophones (/tuː/).'
  },

  // Memory
  {
    id: 'memory-1',
    title: 'The Chime Sequence Recall',
    category: 'Memory',
    mode: 'memory',
    difficulty: 'Easy',
    description: 'Recall the sequential order of 5 flashing colored memory nodes.',
    estimatedTime: '2 min',
    playsCount: 3100,
    rating: 4.7,
    question: 'A neural matrix flashes 5 colors in order: [Emerald Green -> Cyan Blue -> Violet -> Crimson Red -> Golden Yellow]. Which color was in the 4th position?',
    options: [
      { id: 'mem1-red', text: 'Crimson Red', isCorrect: true },
      { id: 'mem1-violet', text: 'Violet', isCorrect: false },
      { id: 'mem1-cyan', text: 'Cyan Blue', isCorrect: false },
      { id: 'mem1-yellow', text: 'Golden Yellow', isCorrect: false }
    ],
    hints: [
      'Review the order: 1st Emerald, 2nd Cyan, 3rd Violet...',
      'It was a warm shade before Golden Yellow.',
      'Crimson Red.'
    ],
    explanation: 'The order was: 1: Emerald Green, 2: Cyan Blue, 3: Violet, 4: Crimson Red, 5: Golden Yellow. The 4th item was Crimson Red.'
  }
];
