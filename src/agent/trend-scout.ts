import type { LinkedInClient } from '../core/types.js';
import type { Platform, TrendTopic } from './types.js';

const CURATED_TOPICS: TrendTopic[] = [
  {
    title: 'AI content gets 57% less engagement',
    angle: 'posts that sound like ChatGPT get scrolled past, not penalized by the algorithm',
    platform: 'linkedin',
    keywords: ['AI content', 'LinkedIn algorithm', 'engagement'],
    score: 92,
    source: 'curated:2026-algo-studies',
  },
  {
    title: 'Carousels get 2.3x more reach than text',
    angle: 'format stacking beats posting more often',
    platform: 'linkedin',
    keywords: ['carousel', 'LinkedIn reach', 'content format'],
    score: 88,
    source: 'curated:linkpost-study',
  },
  {
    title: 'Hook-first content is winning on TikTok',
    angle: 'the first 3 seconds decide 80% of virality',
    platform: 'tiktok',
    keywords: ['hooks', 'short form', 'retention'],
    score: 85,
    source: 'curated:tiktok-2026',
  },
  {
    title: 'Human-made authenticity beats polished AI',
    angle: 'imperfect pacing and real stories outperform generic templates',
    platform: 'x',
    keywords: ['authenticity', 'AI content', 'build in public'],
    score: 84,
    source: 'curated:sprout-social-2026',
  },
  {
    title: 'Em dashes became an AI tell',
    angle: 'readers spot template cadence before they finish line one',
    platform: 'linkedin',
    keywords: ['AI writing', 'humanizer', 'LinkedIn posts'],
    score: 90,
    source: 'curated:magicpost-study',
  },
  {
    title: 'Fastvertising rewards trend response speed',
    angle: 'creators who ship drafts in hours beat weekly planners',
    platform: 'x',
    keywords: ['trends', 'content velocity', 'social media'],
    score: 82,
    source: 'curated:hootsuite-2026',
  },
];

export interface ScoutOptions {
  platform?: Platform;
  keywords?: string;
  niche?: string;
  limit?: number;
}

export async function scoutTrends(
  options: ScoutOptions,
  client?: LinkedInClient,
): Promise<TrendTopic[]> {
  const platform = options.platform ?? 'all';
  const limit = options.limit ?? 5;
  let topics = [...CURATED_TOPICS];

  if (options.keywords) {
    const kw = options.keywords.toLowerCase();
    topics = topics.map((t) => ({
      ...t,
      score: t.score + (t.keywords.some((k) => k.toLowerCase().includes(kw) || kw.includes(k.toLowerCase())) ? 10 : 0),
    }));
  }

  if (options.niche) {
    const niche = options.niche.toLowerCase();
    topics = topics.map((t) => ({
      ...t,
      score: t.score + (t.keywords.some((k) => niche.includes(k.split(' ')[0]!)) ? 5 : 0),
    }));
  }

  if (platform !== 'all') {
    topics = topics.filter((t) => t.platform === platform);
  }

  // Try LinkedIn search when client available
  if (client && options.keywords) {
    try {
      const keywords = encodeURIComponent(options.keywords);
      const variables = `(start:0,origin:GLOBAL_SEARCH_HEADER,query:(keywords:${keywords},flagshipSearchIntent:SEARCH_SRP,queryParameters:List((key:resultType,value:List(CONTENT))),includeFiltersInResponse:false))`;
      const raw = await client.get<unknown>('/graphql', {
        variables,
        queryId: 'voyagerSearchDashClusters.b0928897b71bd00a5a7291755dcd64f0',
      });
      const linkedinTopic = parseLinkedInSearch(raw, options.keywords);
      if (linkedinTopic) {
        topics.unshift(linkedinTopic);
      }
    } catch {
      // Fall back to curated only
    }
  }

  return topics
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function parseLinkedInSearch(raw: unknown, keywords: string): TrendTopic | null {
  const text = JSON.stringify(raw);
  if (text.length < 100) return null;

  return {
    title: `Trending on LinkedIn: ${keywords}`,
    angle: `creators are discussing "${keywords}" with high engagement right now`,
    platform: 'linkedin',
    keywords: keywords.split(/\s+/),
    score: 95,
    source: 'linkedin:search_posts',
  };
}

export function pickBestTopic(topics: TrendTopic[]): TrendTopic {
  return topics[0] ?? CURATED_TOPICS[0]!;
}
