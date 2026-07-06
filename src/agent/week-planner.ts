import type { EngagementGoal, PostFormat } from './types.js';
import { runPipeline, type PipelineOptions, type PipelineResult } from './pipeline.js';
import { scoutTrends } from './trend-scout.js';
import type { LinkedInClient } from '../core/types.js';

export interface WeekDayPlan {
  day: string;
  topic: string;
  goal: EngagementGoal;
  format: PostFormat;
  image_hint: string;
}

export interface WeekPlanResult {
  niche?: string;
  days: WeekDayPlan[];
  drafts?: PipelineResult[];
}

const DEFAULT_WEEK: WeekDayPlan[] = [
  { day: 'Mon', topic: 'AI content', goal: 'saves', format: 'carousel', image_hint: 'Tool carousel or UI screenshot' },
  { day: 'Tue', topic: 'Carousels reach', goal: 'saves', format: 'carousel', image_hint: 'Tips slides or analytics screenshot' },
  { day: 'Wed', topic: 'AI writing tells', goal: 'comments', format: 'single', image_hint: 'Before/after humanize screenshot' },
  { day: 'Thu', topic: 'Hook formulas', goal: 'reach', format: 'single', image_hint: 'Generated cover' },
  { day: 'Fri', topic: 'Career lesson', goal: 'comments', format: 'single', image_hint: 'Your real photo (team/desk)' },
  { day: 'Sat', topic: 'Industry opinion', goal: 'comments', format: 'text', image_hint: 'Text-only or casual laptop photo' },
  { day: 'Sun', topic: 'Build in public', goal: 'profile_visits', format: 'carousel', image_hint: 'Week recap slides' },
];

export async function planWeek(options: {
  niche?: string;
  keywords?: string;
  create?: boolean;
  client?: LinkedInClient;
  voice_username?: string;
}): Promise<WeekPlanResult> {
  const topics = await scoutTrends(
    { keywords: options.keywords ?? options.niche, niche: options.niche, limit: 7 },
    options.client,
  );

  const days: WeekDayPlan[] = DEFAULT_WEEK.map((slot, i) => {
    const topic = topics[i];
    return {
      ...slot,
      topic: topic?.title ?? slot.topic,
    };
  });

  const result: WeekPlanResult = { niche: options.niche, days };

  if (options.create) {
    result.drafts = [];
    for (const day of days) {
      const draft = await runPipeline({
        topic: day.topic,
        goal: day.goal,
        format: day.format,
        niche: options.niche,
        keywords: options.keywords,
        voice_username: options.voice_username,
        client: options.client,
      });
      result.drafts.push(draft);
    }
  }

  return result;
}
