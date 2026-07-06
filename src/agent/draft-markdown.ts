import type { ContentDraft, EngagementGoal, TrendTopic } from './types.js';

const GOAL_HASHTAGS: Record<EngagementGoal, string> = {
  comments: '#LinkedIn',
  saves: '#LinkedInTips',
  reach: '#Tech',
  profile_visits: '#BuildInPublic',
};

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'your', 'about', 'into', 'what',
  'how', 'are', 'was', 'get', 'gets', 'than', 'more', 'less', 'been', 'have', 'has',
]);

function toHashtag(raw: string): string | null {
  const words = raw
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()));
  if (words.length === 0) return null;
  const tag = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
  return tag ? `#${tag}` : null;
}

export function generateHashtags(topic: TrendTopic, goal: EngagementGoal, limit = 3): string[] {
  const candidates = [
    ...topic.keywords,
    ...topic.title.split(/\s+/),
    GOAL_HASHTAGS[goal],
  ];

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const raw of candidates) {
    const tag = toHashtag(raw);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
    if (tags.length >= limit) break;
  }

  while (tags.length < limit) {
    const fallback = ['#LinkedIn', '#SoftwareEngineering', '#Career'][tags.length]!;
    if (!seen.has(fallback.toLowerCase())) {
      seen.add(fallback.toLowerCase());
      tags.push(fallback);
    } else break;
  }

  return tags.slice(0, limit);
}

function countLinkedInHashtags(text: string): number {
  return (text.match(/(?:^|\s)(#[A-Za-z][\w]*)/g) ?? []).length;
}

export function buildCopyPastePost(draft: ContentDraft): string {
  const body = draft.humanized_text.trim();
  if (countLinkedInHashtags(body) >= 1) return body;

  const tags = generateHashtags(draft.topic, draft.goal);
  return `${body}\n\n${tags.join(' ')}`;
}

export function formatDraftMarkdown(draft: ContentDraft): string {
  const copyPost = buildCopyPastePost(draft);
  const relImages =
    draft.images.length > 0
      ? draft.images.map((p) => p.replace(/.*\/drafts\/[^/]+\//, '')).join(', ')
      : 'none';

  return [
    `<!-- ${draft.id} · ${draft.format} · ${draft.goal} · audit ${draft.audit.score}/100 · images: ${relImages} -->`,
    '',
    copyPost,
    '',
  ].join('\n');
}
