export interface DifficultyLevel {
  id: string;
  name: string;
  description: string;
}

export interface FullBiographyData {
  tutorial: any;
  'story-mode': any;
  normal: any;
  hard: any;
  maddening: any;
}

export const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  {
    id: 'tutorial',
    name: 'Tutorial',
    description: 'Basic facts and essential information'
  },
  {
    id: 'story-mode',
    name: 'Story Mode',
    description: 'Key life events and background'
  },
  {
    id: 'normal',
    name: 'Normal',
    description: 'Balanced overview with personality'
  },
  {
    id: 'hard',
    name: 'Hard',
    description: 'Detailed stories and insights'
  },
  {
    id: 'maddening',
    name: 'Maddening',
    description: 'Complete unfiltered biography'
  }
];

// Import markdown files as components
import tutorialContent from './biography-levels/tutorial.md';
import storyModeContent from './biography-levels/story-mode.md';
import normalContent from './biography-levels/normal.md';
import hardContent from './biography-levels/hard.md';
import maddeningContent from './biography-levels/maddening.md';

export const fullBiographyContent: FullBiographyData = {
  tutorial: tutorialContent,
  'story-mode': storyModeContent,
  normal: normalContent,
  hard: hardContent,
  maddening: maddeningContent
};

export const DEFAULT_DIFFICULTY = 'tutorial';