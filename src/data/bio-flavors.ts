export interface BioFlavor {
  id: string;
  name: string;
  description: string;
  content: string;
  emoji: string;
}

export const bioFlavors: BioFlavor[] = [
  {
    id: 'professional',
    name: 'Professional',
    description: 'LinkedIn-ready version',
    emoji: '💼',
    content: `Hello! I'm <strong>Emily Cogsdill</strong>, a software engineer with expertise in full-stack development, 
    system architecture, and cloud technologies. I'm passionate about building scalable solutions and contributing to 
    open-source projects. Connect with me on <a href="https://www.linkedin.com/in/emilycogsdill" target="_blank">LinkedIn</a> 
    or explore my work on <a href="https://www.github.com/emily-flambe" target="_blank">GitHub</a>.`
  },
  {
    id: 'casual',
    name: 'Casual',
    description: 'Friendly and approachable',
    emoji: '😊',
    content: `Hello! I'm <strong>Emily</strong>, an engineering type just trying to have a good time. GOD FORBID.
    Check out my <a href="https://www.github.com/emily-flambe" target="_blank">GitHub</a> or
    <a href="https://www.linkedin.com/in/emilycogsdill" target="_blank">LinkedIn</a>, I guess.`
  },
  {
    id: 'sarcastic',
    name: 'Sarcastic',
    description: 'Witty and tongue-in-cheek',
    emoji: '😏',
    content: `Oh, hi there! I'm <strong>Emily</strong>, allegedly a "software engineer" who spends way too much time 
    arguing with computers and somehow gets paid for it. When I'm not debugging other people's "features," you can find 
    my questionable code on <a href="https://www.github.com/emily-flambe" target="_blank">GitHub</a> or my overly 
    professional facade on <a href="https://www.linkedin.com/in/emilycogsdill" target="_blank">LinkedIn</a>. 
    Results may vary.`
  },
  {
    id: 'technical',
    name: 'Technical',
    description: 'Engineering-focused details',
    emoji: '🔧',
    content: `Hi! I'm <strong>Emily</strong>, a software engineer specializing in TypeScript, React, Node.js, and cloud 
    infrastructure. I work with modern web frameworks, API design, database optimization, and CI/CD pipelines. 
    Currently exploring Astro, Cloudflare Workers, and edge computing. View my technical projects on 
    <a href="https://www.github.com/emily-flambe" target="_blank">GitHub</a> or professional experience on 
    <a href="https://www.linkedin.com/in/emilycogsdill" target="_blank">LinkedIn</a>.`
  },
  {
    id: 'mysterious',
    name: 'Mysterious',
    description: 'Enigmatic and intriguing',
    emoji: '🌙',
    content: `They call me <strong>Emily</strong>... among other things. I emerge from the digital shadows to craft 
    code that dances between logic and chaos. Some say I speak fluent TypeScript in my sleep. Others whisper that 
    I can debug production issues with nothing but semicolons and determination. The truth lies somewhere in my 
    <a href="https://www.github.com/emily-flambe" target="_blank">repositories</a>, if you dare to seek it. 
    Professional inquiries may find me lurking on 
    <a href="https://www.linkedin.com/in/emilycogsdill" target="_blank">LinkedIn</a>... occasionally.`
  }
];

export const defaultFlavorId = 'casual';