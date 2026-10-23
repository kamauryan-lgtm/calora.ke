import { RiddlePuzzle } from '../../types';

export const RIDDLE_PUZZLES: RiddlePuzzle[] = [
  {
    id: 'riddle-1',
    title: 'The Silent Destroyer',
    category: 'Riddles',
    mode: 'riddles',
    difficulty: 'Easy',
    description: 'A classic riddle about something powerful yet fragile.',
    estimatedTime: '1-2 min',
    playsCount: 3840,
    rating: 4.8,
    prompt: 'I am so fragile that if you say my name, you break me. What am I?',
    answer: 'silence',
    aliases: ['silence', 'the silence', 'quiet', 'stillness', 'quietness'],
    options: ['Silence', 'A Secret', 'A Bubble', 'Glass'],
    hints: [
      'Think about sound and what happens when words are spoken.',
      'It exists in empty rooms and library halls until someone whispers.',
      'The word begins with the letter "S" and ends with "E".'
    ],
    explanation: 'Silence is broken the very instant any word—including "silence"—is spoken aloud. Its existence depends entirely on absence of sound.'
  },
  {
    id: 'riddle-2',
    title: 'The Inescapable Companion',
    category: 'Riddles',
    mode: 'riddles',
    difficulty: 'Easy',
    description: 'It follows every move you make, but vanishes in the dark.',
    estimatedTime: '1 min',
    playsCount: 4210,
    rating: 4.7,
    prompt: 'Each morning I appear at your feet, all day I follow no matter how fast you run, yet I vanish when the sun sets or the light turns off. What am I?',
    answer: 'shadow',
    aliases: ['shadow', 'a shadow', 'your shadow', 'the shadow'],
    options: ['A Shadow', 'Your Shoes', 'A Reflection', 'An Echo'],
    hints: [
      'It requires a source of illumination and an opaque object.',
      'It changes length depending on the angle of the sun.',
      'Begins with "SH" and has 6 letters.'
    ],
    explanation: 'A shadow is cast whenever an object blocks light rays. In total darkness or diffused shadow, it cannot be distinguished.'
  },
  {
    id: 'riddle-3',
    title: 'The Traveler Without Legs',
    category: 'Riddles',
    mode: 'riddles',
    difficulty: 'Medium',
    description: 'A miniature world traveler that never moves an inch.',
    estimatedTime: '2 min',
    playsCount: 2950,
    rating: 4.9,
    prompt: 'I can travel all around the world while remaining permanently stuck in one single corner. What am I?',
    answer: 'stamp',
    aliases: ['stamp', 'a stamp', 'postage stamp', 'a postage stamp'],
    options: ['A Postage Stamp', 'A Compass', 'A Globe', 'An Envelope'],
    hints: [
      'Think about postal mail and physical letters sent overseas.',
      'You lick it or peel its adhesive before sticking it to the top right corner.',
      'Starts with "ST" and is 5 letters long.'
    ],
    explanation: 'A postage stamp stays affixed in the corner of an envelope while the envelope itself travels across oceans and continents.'
  },
  {
    id: 'riddle-4',
    title: 'The Paradoxical River Bank',
    category: 'Riddles',
    mode: 'riddles',
    difficulty: 'Medium',
    description: 'It has a bed but never sleeps, and runs without legs.',
    estimatedTime: '2-3 min',
    playsCount: 3120,
    rating: 4.6,
    prompt: 'I have a bed but I never sleep. I have a mouth but I never speak. I run day and night, yet I have no legs. What am I?',
    answer: 'river',
    aliases: ['river', 'a river', 'the river', 'stream', 'brook'],
    options: ['A River', 'A Clock', 'A Glacier', 'A Waterfall'],
    hints: [
      'Think of geographical features and natural water systems.',
      'Its "bed" is where sediment lies, and its "mouth" enters the sea.',
      'Begins with "R" and flows.'
    ],
    explanation: 'A river has a riverbed (where water flows), a river mouth (where it discharges into an ocean or lake), and its current continuously "runs".'
  },
  {
    id: 'riddle-5',
    title: 'The Forward Giver, Backward Taker',
    category: 'Riddles',
    mode: 'riddles',
    difficulty: 'Hard',
    description: 'The more you take from it, the bigger it becomes.',
    estimatedTime: '3 min',
    playsCount: 1870,
    rating: 4.9,
    prompt: 'The more you take away from me, the larger I become. What am I?',
    answer: 'hole',
    aliases: ['hole', 'a hole', 'the hole', 'pit', 'cavity'],
    options: ['A Hole', 'A Shadow', 'Debt', 'Time'],
    hints: [
      'Imagine digging in the ground with a shovel.',
      'Every scoop of dirt you remove increases its volume.',
      'A 4-letter word starting with "H".'
    ],
    explanation: 'A hole expands in dimensions the more soil, stone, or material you dig out and remove from it.'
  },
  {
    id: 'riddle-6',
    title: 'The Eternal Mirror of Memory',
    category: 'Riddles',
    mode: 'riddles',
    difficulty: 'Hard',
    description: 'I speak without a voice and hear without ears.',
    estimatedTime: '3 min',
    playsCount: 2150,
    rating: 4.8,
    prompt: 'I speak without a voice, I hear without ears, I have no body, but I come alive with wind and sound. When you shout into the canyon, I answer back. What am I?',
    answer: 'echo',
    aliases: ['echo', 'an echo', 'the echo'],
    options: ['An Echo', 'A Ghost', 'The Wind', 'A Dream'],
    hints: [
      'Think of acoustic reflections off rocky cliffs or empty gymnasiums.',
      'It repeats what you say, fading gradually.',
      'A 4-letter word starting with "E".'
    ],
    explanation: 'An echo is a sound wave reflection bouncing off hard surfaces back to the listener, repeating their spoken words.'
  },
  {
    id: 'riddle-7',
    title: 'The Weightless Vessel',
    category: 'Riddles',
    mode: 'riddles',
    difficulty: 'Expert',
    description: 'Add this to a barrel, and the barrel weighs less.',
    estimatedTime: '4 min',
    playsCount: 1420,
    rating: 4.9,
    prompt: 'What can you put into an airtight wooden barrel filled with water that will make the barrel significantly lighter, without spilling a drop over the brim?',
    answer: 'hole',
    aliases: ['hole', 'holes', 'a hole', 'punctures', 'a puncture'],
    options: ['A Hole', 'Helium Gas', 'Fire', 'A Cork'],
    hints: [
      'Think about what holds the water in and what happens if the wood is penetrated.',
      'It drains the heavy liquid inside.',
      'It is not a physical object you add, but an opening you create.'
    ],
    explanation: 'Drilling or putting a hole into the barrel lets the heavy water drain out, reducing the overall weight.'
  },
  {
    id: 'riddle-8',
    title: 'The Ageless Counter',
    category: 'Riddles',
    mode: 'riddles',
    difficulty: 'Expert',
    description: 'Passed between hands, counted by kings, yet never eaten.',
    estimatedTime: '4-5 min',
    playsCount: 1180,
    rating: 4.9,
    prompt: 'I have keys that open no locks, space with no rooms, and you can enter, but you cannot go outside. What am I?',
    answer: 'keyboard',
    aliases: ['keyboard', 'a keyboard', 'the keyboard', 'computer keyboard'],
    options: ['A Keyboard', 'A Piano', 'A Map', 'A Prison'],
    hints: [
      'You are likely using one right now to type your response.',
      'It has a "Space" bar and an "Enter" key.',
      '8 letters, starts with "K".'
    ],
    explanation: 'A computer keyboard has keys (alphabetical & functional) that open no physical locks, a "space" bar with no rooms, and an "Enter" key.'
  }
];
