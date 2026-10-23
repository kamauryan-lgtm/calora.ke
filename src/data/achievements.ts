import { Achievement } from '../types';

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach-first-spark',
    title: 'First Spark',
    description: 'Solve your very first puzzle in any category.',
    iconName: 'Zap',
    category: 'general',
    requirement: 1,
    progress: 0
  },
  {
    id: 'ach-sleuth',
    title: 'Inspector’s Eye',
    description: 'Accurately solve a full Detective Mystery case with valid motive and evidence.',
    iconName: 'Search',
    category: 'detective',
    requirement: 1,
    progress: 0
  },
  {
    id: 'ach-riddle-master',
    title: 'The Sphinx Whisperer',
    description: 'Solve 3 Quick Riddles without using any hints.',
    iconName: 'HelpCircle',
    category: 'riddles',
    requirement: 3,
    progress: 0
  },
  {
    id: 'ach-logic-pro',
    title: 'Pure Deduction',
    description: 'Complete a Logic Lab puzzle with 100% deductive accuracy.',
    iconName: 'Cpu',
    category: 'logic',
    requirement: 1,
    progress: 0
  },
  {
    id: 'ach-sprint-demon',
    title: 'Synapse Surge',
    description: 'Achieve a score of at least 500 points in a single Brain Sprint session.',
    iconName: 'Flame',
    category: 'sprint',
    requirement: 500,
    progress: 0
  },
  {
    id: 'ach-streak-3',
    title: 'Cognitive Rhythm',
    description: 'Maintain a 3-day daily challenge streak.',
    iconName: 'Calendar',
    category: 'streak',
    requirement: 3,
    progress: 0
  },
  {
    id: 'ach-streak-7',
    title: 'Neural Momentum',
    description: 'Maintain a 7-day daily challenge streak.',
    iconName: 'Award',
    category: 'streak',
    requirement: 7,
    progress: 0
  },
  {
    id: 'ach-lateral-thinker',
    title: 'Box Breaker',
    description: 'Crack a Lateral Thinking conundrum by identifying the critical assumption.',
    iconName: 'Lightbulb',
    category: 'general',
    requirement: 1,
    progress: 0
  },
  {
    id: 'ach-expert-conqueror',
    title: 'Grandmaster Polymath',
    description: 'Solve an Expert difficulty puzzle in any mode.',
    iconName: 'ShieldAlert',
    category: 'general',
    requirement: 1,
    progress: 0
  },
  {
    id: 'ach-polymath-10',
    title: 'Decathlon of the Mind',
    description: 'Complete 10 different puzzles across the library.',
    iconName: 'Trophy',
    category: 'general',
    requirement: 10,
    progress: 0
  }
];
