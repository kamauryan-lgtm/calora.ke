import { LateralPuzzle } from '../../types';

export const LATERAL_PUZZLES: LateralPuzzle[] = [
  {
    id: 'lateral-1',
    title: 'The Man in the Elevator',
    category: 'Lateral Thinking',
    mode: 'lateral',
    difficulty: 'Easy',
    description: 'A man lives on the 30th floor. On sunny days he rides to the 20th floor, but on rainy days he goes all the way to the 30th.',
    estimatedTime: '2-3 min',
    playsCount: 4620,
    rating: 4.9,
    scenario: `A man lives on the 30th floor of a high-rise luxury apartment building. Every morning, he takes the elevator all the way down to the ground floor to go to work.

Every evening when he returns home:
- On sunny days, he enters the elevator, presses the button for the 20th floor, gets out, and walks the remaining 10 flights of stairs up to his apartment.
- On rainy days, or on days when other people ride the elevator with him, he rides all the way directly to the 30th floor.

He dislikes physical exercise and hates walking up stairs. Why does he do this?`,
    inquiries: [
      {
        question: 'Is there a technical malfunction with the elevator machinery above the 20th floor on sunny days?',
        oracleAnswer: 'No',
        insight: 'The elevator operates flawlessly at all times and can reach all 30 floors.'
      },
      {
        question: 'Is the physical height or reach of the man a critical factor?',
        oracleAnswer: 'Crucial',
        insight: 'His physical stature is the central key to the entire mystery!'
      },
      {
        question: 'Does the man carry something specific on rainy days that he lacks on sunny days?',
        oracleAnswer: 'Crucial',
        insight: 'On rainy days, what everyday item does someone typically bring outside?'
      },
      {
        question: 'Does he walk up the stairs for exercise or fitness?',
        oracleAnswer: 'No',
        insight: 'He detests walking up stairs and avoids it whenever possible.'
      }
    ],
    hints: [
      'Think about how high the buttons are placed on the elevator control panel.',
      'Consider what an umbrella allows someone to do without touching something directly with their fingers.',
      'He is a person of very short stature (a dwarf or child) who cannot physically reach higher buttons with his hands!'
    ],
    commonMisconceptions: [
      { claim: 'The elevator has a weight limit on sunny days', whyFalse: 'Weight limits do not correlate with weather or sunny days.' },
      { claim: 'He likes the rooftop view on rainy days', whyFalse: 'He hates taking the stairs and prefers riding all the way when possible.' },
      { claim: 'The top 10 floors lose power when dry', whyFalse: 'The elevator mechanical system is completely functional.' }
    ],
    solution: 'The man is a person of short stature (a dwarf). He can only reach up to the 20th floor button with his hands. On rainy days, he carries an umbrella, which he uses to press the high button for the 30th floor! When other people are in the elevator, he simply asks them to press 30 for him.',
    insightExplanation: 'This classic lateral puzzle shatters the default assumption that the actor has average adult height and that the choice to walk is intentional rather than forced by physical limitation.'
  },
  {
    id: 'lateral-2',
    title: 'The Puddle in the Empty Room',
    category: 'Lateral Thinking',
    mode: 'lateral',
    difficulty: 'Medium',
    description: 'A man is found hanging from the center beam of a locked room with only a pool of water beneath his feet.',
    estimatedTime: '3-4 min',
    playsCount: 3890,
    rating: 4.8,
    scenario: `A man is found hanging from a rope tied to the high ceiling beam of an empty wooden room. 
The room is locked from the inside. 
There is no furniture, no ladder, no chair, and no table in the room.
His feet are suspended three feet above the floor.
Directly beneath him is a large puddle of ordinary water.
How did he hang himself?`,
    inquiries: [
      {
        question: 'Did someone else lock the room and help him from outside?',
        oracleAnswer: 'No',
        insight: 'No one else was involved. It was executed entirely alone inside.'
      },
      {
        question: 'Did the puddle of water originate from something that was previously solid?',
        oracleAnswer: 'Crucial',
        insight: 'Water changes states depending on ambient temperature!'
      },
      {
        question: 'Was there any apparatus, rope pulley, or hidden elevator mechanism in the ceiling?',
        oracleAnswer: 'No',
        insight: 'The ceiling is plain solid timber with a simple fixed rope loop.'
      }
    ],
    hints: [
      'What solid object made of water could support a human body\'s weight?',
      'Consider what happens to ice when left in a warm room over several hours.',
      'He stood on a giant block of ice!'
    ],
    commonMisconceptions: [
      { claim: 'He jumped from a secret trapdoor', whyFalse: 'The room has solid uninterrupted walls and floor.' },
      { claim: 'The water was pumped in through a hose', whyFalse: 'There is no plumbing or exterior hose.' }
    ],
    solution: 'The man stood upon a massive block of ice, tied the noose around his neck, and waited. Over the course of the day, the ice completely melted into the harmless puddle of water found on the floor, leaving him suspended.',
    insightExplanation: 'The assumption broken here is that physical platforms must remain in their original form after use. Change of state (solid ice into liquid water) makes the platform seemingly vanish.'
  },
  {
    id: 'lateral-3',
    title: 'The Midnight Express Whistle',
    category: 'Lateral Thinking',
    mode: 'lateral',
    difficulty: 'Hard',
    description: 'A blind passenger on a sleeper train hears the train enter a tunnel and immediately commits an act of despair.',
    estimatedTime: '4-5 min',
    playsCount: 2710,
    rating: 5.0,
    scenario: `A man who had just undergone miraculous eye surgery to cure his lifelong blindness is traveling home on a train. 
The train enters a dark mountain tunnel. 
Moments later, the man throws himself from the train car.
Why?`,
    inquiries: [
      {
        question: 'Was the man physically harmed or threatened by another passenger?',
        oracleAnswer: 'No',
        insight: 'He was alone in the compartment and suffered no physical threat.'
      },
      {
        question: 'Did the surgery fail or was his vision actually restored?',
        oracleAnswer: 'Crucial',
        insight: 'The surgery was 100% successful—his vision had truly been cured!'
      },
      {
        question: 'Did he know the train was entering an unlit tunnel?',
        oracleAnswer: 'Crucial',
        insight: 'He was unfamiliar with the railway route and did not realize a tunnel existed!'
      }
    ],
    hints: [
      'He had been blind his entire life until that very day.',
      'When the train entered the pitch-black tunnel, all light disappeared instantly.',
      'He mistakenly believed that his blindness had suddenly returned.'
    ],
    commonMisconceptions: [
      { claim: 'The train was about to crash', whyFalse: 'The train was on a routine safe schedule.' },
      { claim: 'He hallucinated monsters', whyFalse: 'He was mentally sane, but in overwhelming grief.' }
    ],
    solution: 'Having been blind since birth, he had never experienced a train tunnel. When the train plunged into total darkness, he believed his miracle surgery had failed and that he was blind once again. In despair, he jumped before the train exited the tunnel into daylight.',
    insightExplanation: 'This tragic riddle hinges on the perspective gap of someone experiencing sight for the first time without understanding environmental darkness.'
  }
];
