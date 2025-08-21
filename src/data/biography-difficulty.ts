export interface DifficultyLevel {
  id: string;
  name: string;
  description: string;
}

export interface BiographyData {
  tutorial: string;
  'story-mode': string;
  normal: string;
  hard: string;
  maddening: string;
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

export const biographyContent: BiographyData = {
  tutorial: `Hello! I'm <strong>Emily</strong>, a software engineer who builds web applications.`,
  
  'story-mode': `Hello! I'm <strong>Emily</strong>, an engineering type who discovered coding and never looked back. 
  I build things on the web and try to make them not terrible.`,
  
  normal: `Hello! I'm <strong>Emily</strong>, an engineering type just trying to have a good time. GOD FORBID.
  Check out my <a href="https://www.github.com/emily-flambe" target="_blank">GitHub</a> or
  <a href="https://www.linkedin.com/in/emilycogsdill" target="_blank">LinkedIn</a>, I guess.`,
  
  hard: `Hello! I'm <strong>Emily</strong>, an engineering type just trying to have a good time. GOD FORBID.
  I spend my days wrestling with TypeScript, building web applications, and pretending I understand how databases work.
  When I'm not debugging someone else's "temporary" solution from 2019, you can find me on
  <a href="https://www.github.com/emily-flambe" target="_blank">GitHub</a> committing crimes against clean code, or on
  <a href="https://www.linkedin.com/in/emilycogsdill" target="_blank">LinkedIn</a> maintaining the professional facade.`,
  
  maddening: `Hello! I'm <strong>Emily</strong>, an engineering type just trying to have a good time. GOD FORBID.
  I spend my days wrestling with TypeScript, building web applications, and pretending I understand how databases work.
  When I'm not debugging someone else's "temporary" solution from 2019, you can find me questioning my life choices
  while staring at a screen full of red squiggly lines. I have strong opinions about semicolons, an unhealthy
  relationship with CSS, and I once spent three hours debugging a problem that was solved by turning it off and on again.
  My GitHub (<a href="https://www.github.com/emily-flambe" target="_blank">emily-flambe</a>) is a monument to my
  hubris, and my LinkedIn (<a href="https://www.linkedin.com/in/emilycogsdill" target="_blank">profile</a>) is a
  carefully curated lie about how together I have it all. I believe in the Oxford comma, tabs over spaces (fight me),
  and that there are only two hard problems in computer science: cache invalidation, naming things, and off-by-one errors.`
};

export const DEFAULT_DIFFICULTY = 'normal';