export type EngagementGoal = 'comments' | 'saves' | 'reach' | 'profile_visits';
export type PostFormat = 'carousel' | 'single' | 'text';
export type Platform = 'linkedin' | 'x' | 'tiktok' | 'all';

export interface HookFormula {
  id: number;
  name: string;
  template: string;
  goals: EngagementGoal[];
  description: string;
}

export interface TrendTopic {
  title: string;
  angle: string;
  platform: Platform;
  keywords: string[];
  score: number;
  source: string;
}

export interface AuditIssue {
  rule: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface AuditResult {
  score: number;
  passed: boolean;
  issues: AuditIssue[];
}

export interface CarouselSlide {
  slide: number;
  headline: string;
  body: string;
  kind?: 'cover' | 'problem' | 'point' | 'cta' | 'list' | 'steps' | 'stat';
  stat?: string;
  badge?: string;
  items?: string[];
}

export interface VideoScript {
  duration_sec: number;
  hook: string;
  scenes: Array<{ start: number; end: number; text: string; visual: string }>;
  cta: string;
}

export interface ContentDraft {
  id: string;
  created_at: string;
  topic: TrendTopic;
  goal: EngagementGoal;
  hook_formula: HookFormula;
  raw_text: string;
  humanized_text: string;
  audit: AuditResult;
  carousel: CarouselSlide[];
  video: VideoScript;
  media_notes: string[];
  images: string[];
  format: PostFormat;
  image_idea: {
    why: string;
    photo_suggestions: string[];
    fallback: string;
    user_photo?: string;
    publish_command?: string;
  };
  status: 'draft';
}

export interface ExtractedHook {
  formula_id: number;
  formula_name: string;
  pattern: string;
  confidence: number;
}
