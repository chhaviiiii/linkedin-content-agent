import type { EngagementGoal, HookFormula } from './types.js';

export const HOOK_FORMULAS: HookFormula[] = [
  {
    id: 1,
    name: 'Pattern interrupt',
    template: '{claim}. Not because {expected_reason}. Because {real_reason}.',
    goals: ['reach', 'profile_visits'],
    description: 'Break the scroll with an unexpected reframe.',
  },
  {
    id: 2,
    name: 'Contrarian take',
    template: 'Unpopular opinion: {contrarian_claim}.',
    goals: ['comments', 'reach'],
    description: 'Polarize gently to spark debate.',
  },
  {
    id: 3,
    name: 'Quantified proof',
    template: '{number} {things} were analyzed. Here is what the top {percent}% did differently.',
    goals: ['saves', 'reach'],
    description: 'Lead with data to earn credibility fast.',
  },
  {
    id: 4,
    name: 'Open loop',
    template: 'I almost quit {thing}. Then I discovered {hint} (thread).',
    goals: ['profile_visits', 'saves'],
    description: 'Create tension that demands a read-through.',
  },
  {
    id: 5,
    name: 'Curiosity gap',
    template: 'Everyone is talking about {topic}. Almost nobody mentions {missing_piece}.',
    goals: ['reach', 'comments'],
    description: 'Name the gap between hype and reality.',
  },
  {
    id: 6,
    name: 'Before / after',
    template: '6 months ago: {before}. Today: {after}. What changed:',
    goals: ['saves', 'profile_visits'],
    description: 'Show transformation with specifics.',
  },
  {
    id: 7,
    name: 'Nobody talks about',
    template: 'Nobody talks about {hidden_truth} when it comes to {topic}.',
    goals: ['comments', 'reach'],
    description: 'Call out the overlooked angle.',
  },
  {
    id: 8,
    name: 'Personal story',
    template: 'Last {timeframe}, I {mistake}. It cost me {cost}. Here is the fix.',
    goals: ['comments', 'profile_visits'],
    description: 'Vulnerability plus lesson.',
  },
  {
    id: 9,
    name: 'Myth bust',
    template: 'Myth: {myth}. Reality: {reality}.',
    goals: ['saves', 'comments'],
    description: 'Correct a common misconception.',
  },
  {
    id: 10,
    name: 'Listicle promise',
    template: '{n} {things} that {outcome} (most people skip #{k}):',
    goals: ['saves', 'reach'],
    description: 'Promise a scannable, high-value list.',
  },
  {
    id: 11,
    name: 'Vulnerability',
    template: 'I was embarrassed to admit this: {confession}.',
    goals: ['comments', 'profile_visits'],
    description: 'Human moment that builds trust.',
  },
  {
    id: 12,
    name: 'Social proof',
    template: '{n} creators in {niche} are doing {behavior}. Here is why it works.',
    goals: ['reach', 'saves'],
    description: 'Borrow momentum from what is already working.',
  },
  {
    id: 13,
    name: 'Polarization',
    template: 'If you still {old_behavior} in {year}, you are already behind.',
    goals: ['comments', 'reach'],
    description: 'Strong stance that filters the feed.',
  },
  {
    id: 14,
    name: 'Micro open loop',
    template: 'One line changed my {metric}. It was not the hook. It was {surprise}.',
    goals: ['profile_visits', 'saves'],
    description: 'Small tease with a delayed payoff.',
  },
  {
    id: 15,
    name: 'Memorable quote',
    template: '"{quote}" — and it explains why {topic} feels broken right now.',
    goals: ['reach', 'saves'],
    description: 'Anchor the post with a quotable line.',
  },
  {
    id: 16,
    name: 'Challenge bet',
    template: 'I bet you cannot fix {problem} without changing {lever}. Prove me wrong.',
    goals: ['comments', 'profile_visits'],
    description: 'Invite participation and replies.',
  },
];

export function pickHookFormula(goal: EngagementGoal, seed?: number): HookFormula {
  const matches = HOOK_FORMULAS.filter((f) => f.goals.includes(goal));
  const pool = matches.length > 0 ? matches : HOOK_FORMULAS;
  const index = seed !== undefined ? seed % pool.length : Math.floor(Math.random() * pool.length);
  return pool[index]!;
}

export function getHookFormulaById(id: number): HookFormula | undefined {
  return HOOK_FORMULAS.find((f) => f.id === id);
}
