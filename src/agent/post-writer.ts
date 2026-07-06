import type { EngagementGoal, HookFormula, TrendTopic } from './types.js';

interface WriterInput {
  topic: TrendTopic;
  formula: HookFormula;
  goal: EngagementGoal;
  product?: ProductContext;
}

export interface ProductContext {
  name: string;
  tools: Array<{ name: string; description: string }>;
  cta: string;
}

const DEFAULT_PRODUCT: ProductContext = {
  name: 'Content Toolkit',
  tools: [
    { name: 'Post Writer', description: '16 hook formulas picked by engagement goal' },
    { name: 'Post Audit', description: 'Scores drafts against 2026 LinkedIn algorithm rules' },
    { name: 'Humanizer', description: 'Strips AI fingerprints like em dashes and corporate filler' },
    { name: 'Hook Extractor', description: 'Reverse-engineers the formula from any viral post' },
  ],
  cta: 'Comment TOOLS for early access.',
};

export function writeToolkitPost(goal: EngagementGoal = 'saves'): string {
  const cta: Record<EngagementGoal, string> = {
    comments: 'Drop a 🔥 if you want early access.',
    saves: 'Swipe the carousel for the full workflow →',
    reach: 'Building in public. Drop a 🔥 if you want early access.',
    profile_visits: 'Full breakdown on my profile. More soon.',
  };

  return `438,413 LinkedIn posts were analyzed in 2026.

The #1 killer wasn't bad ideas. It was posts that sounded like ChatGPT wrote them on a lunch break.

AI-sounding posts get 57% fewer likes. Em dashes. "Leverage." "Delve." Same hook every time.

I got tired of fixing this manually, so I built 4 tools:

→ Post Writer: 16 hook formulas, picked by your engagement goal (comments, saves, reach)
→ Post Audit: scores your draft against 2026 algorithm rules before you hit publish
→ Humanizer: strips AI fingerprints (em dashes, corporate filler words, template cadence)
→ Hook Extractor: paste any viral post, get the formula behind it

None of this replaces your voice. It just makes sure what you publish actually sounds like you.

${cta[goal]}

Building in public. Drop a 🔥 if you want early access.`.trim();
}

export function writePost(input: WriterInput): string {
  const { topic, formula, goal, product = DEFAULT_PRODUCT } = input;
  const hook = buildHook(topic, formula);
  const body = buildBody(topic, product, goal);
  const cta = buildCta(goal, product);

  return [hook, '', body, '', cta].join('\n').trim();
}

function buildHook(topic: TrendTopic, formula: HookFormula): string {
  const t = topic.title;
  const a = topic.angle;

  switch (formula.id) {
    case 1:
      return `${t}.\nNot because people lack ideas. Because ${a}.`;
    case 2:
      return `Unpopular opinion: ${a}.`;
    case 3:
      return `438,413 LinkedIn posts were analyzed in 2026.\nThe top 1% did one thing differently: ${a}.`;
    case 4:
      return `I almost quit posting on LinkedIn.\nThen I found the real problem: ${a}.`;
    case 5:
      return `Everyone is talking about ${t.toLowerCase()}.\nAlmost nobody mentions ${a}.`;
    case 6:
      return `6 months ago: my posts sounded like AI.\nToday: they sound like me.\nWhat changed: ${a}.`;
    case 7:
      return `Nobody talks about ${a} when it comes to ${t.toLowerCase()}.`;
    case 8:
      return `Last month I published a post that got 12 likes.\nIt read exactly like ChatGPT.\nThe fix was ${a}.`;
    case 9:
      return `Myth: ${t} is about posting more.\nReality: ${a}.`;
    case 10:
      return `4 tools that fix ${t.toLowerCase()} (most people skip #3):`;
    case 11:
      return `I was embarrassed to admit my posts were getting 57% less engagement because ${a}.`;
    case 12:
      return `Top creators in 2026 are not writing more. They are using ${a}.`;
    case 13:
      return `If you still publish AI-sounding posts in 2026, you are already behind.`;
    case 14:
      return `One line changed my engagement.\nIt was not the topic. It was ${a}.`;
    case 15:
      return `"Your voice is the product." — and it explains why ${a}.`;
    case 16:
      return `I bet you cannot fix ${t.toLowerCase()} without changing how you write hooks. Prove me wrong.`;
    default:
      return `${t}. ${a}.`;
  }
}

function buildBody(topic: TrendTopic, product: ProductContext, goal: EngagementGoal): string {
  const isToolkit = topic.title.toLowerCase().includes('ai content') ||
    topic.keywords.some((k) => /toolkit|humanizer|post writer/i.test(k));

  if (isToolkit) {
    const toolLines = product.tools.map((t) => `→ ${t.name}: ${t.description}`).join('\n');
    const goalLine: Record<EngagementGoal, string> = {
      comments: 'Which tool would you use first? Drop it below.',
      saves: 'Swipe the carousel for the full workflow.',
      reach: 'This is the pipeline I use before every publish.',
      profile_visits: 'Full breakdown on my profile. More soon.',
    };
    return [
      topic.angle.charAt(0).toUpperCase() + topic.angle.slice(1) + '.',
      '',
      `So I built ${product.name}:`,
      '',
      toolLines,
      '',
      'None of this replaces your voice. It makes sure what you publish sounds like you.',
      '',
      goalLine[goal],
    ].join('\n');
  }

  const insights = topicInsights(topic);
  const goalLine: Record<EngagementGoal, string> = {
    comments: 'Agree or disagree? Tell me below.',
    saves: 'Save this before your next post.',
    reach: 'Repost if your network needs this.',
    profile_visits: 'Follow for more breakdowns like this.',
  };

  return [
    topic.angle.charAt(0).toUpperCase() + topic.angle.slice(1) + '.',
    '',
    'What actually moves the needle:',
    '',
    insights.map((i) => `→ ${i}`).join('\n'),
    '',
    goalLine[goal],
  ].join('\n');
}

function topicInsights(topic: TrendTopic): string[] {
  const t = topic.title.toLowerCase();
  if (t.includes('carousel')) {
    return [
      'One great carousel beats 5 text posts for reach',
      'Stack hook + stat + steps + CTA on each slide',
      'Export 1080×1080 slides as a PDF document post',
      'Repurpose the same slides to Instagram and TikTok',
    ];
  }
  if (t.includes('em dash') || t.includes('ai tell')) {
    return [
      'Readers spot template cadence in line one',
      'Kill em dashes, "leverage," and "delve" on sight',
      'Read your draft out loud before you publish',
      'Sound like you, not like a press release',
    ];
  }
  if (t.includes('hook') || t.includes('tiktok')) {
    return [
      'Your first line is 80% of the post',
      'Steal structures, not sentences, from viral posts',
      'Test 3 hooks, pick the one that stops the scroll',
      'What works on TikTok often works on LinkedIn',
    ];
  }
  if (t.includes('authentic')) {
    return [
      'Imperfect beats polished in 2026',
      'Personal stories outperform generic advice',
      'AI drafts are fine — generic publishing is not',
      'Your perspective is the moat',
    ];
  }
  return [
    `Focus on ${topic.keywords[0] ?? 'clarity'} over volume`,
    'Lead with a specific number or result',
    'One idea per post, not five',
    'End with a reason to engage',
  ];
}

function buildCta(goal: EngagementGoal, product: ProductContext): string {
  if (goal === 'comments') return product.cta;
  if (goal === 'saves') return 'Save this for your next draft. ' + product.cta;
  return 'Building in public. ' + product.cta;
}
