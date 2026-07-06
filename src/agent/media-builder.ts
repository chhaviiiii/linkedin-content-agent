import type { CarouselSlide, EngagementGoal, PostFormat, TrendTopic, VideoScript } from './types.js';

const MAX_HEADLINE_WORDS = 6;
const MAX_BODY_WORDS = 10;
const MAX_LIST_ITEM_WORDS = 8;

const CTA_PATTERNS = /comment|🔥|save this|swipe|building in public|drop a|early access|your move/i;

function defaultCta(goal: EngagementGoal): string {
  const ctas: Record<EngagementGoal, string> = {
    comments: 'Drop your take below',
    saves: 'Save for your next draft',
    reach: 'Share with your network',
    profile_visits: 'Follow for more',
  };
  return ctas[goal];
}

function clipWords(text: string, max: number): string {
  const words = text.replace(/[→•—–]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (words.length <= max) return words.join(' ');
  return `${words.slice(0, max).join(' ')}…`;
}

function extractStat(text: string): string | undefined {
  const patterns = [
    /(\d+[\d,.]*x)/i,
    /(\d+[\d,.]*%)/,
    /(\d[\d,]+)\s+(posts|likes|views)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1];
  }
  return undefined;
}

function parseBullets(lines: string[]): Array<{ headline: string; body: string }> {
  const bullets: Array<{ headline: string; body: string }> = [];
  for (const line of lines) {
    if (!line.startsWith('→')) continue;
    const named = line.match(/^→\s*([^:]+):\s*(.+)$/);
    if (named) {
      bullets.push({
        headline: clipWords(named[1]!.trim(), MAX_HEADLINE_WORDS),
        body: clipWords(named[2]!.trim(), MAX_BODY_WORDS),
      });
      continue;
    }
    const simple = line.match(/^→\s*(.+)$/);
    if (simple) {
      const raw = simple[1]!.trim();
      const dot = raw.indexOf(':');
      if (dot > 0 && dot < 40) {
        bullets.push({
          headline: clipWords(raw.slice(0, dot), MAX_HEADLINE_WORDS),
          body: clipWords(raw.slice(dot + 1), MAX_BODY_WORDS),
        });
      } else {
        bullets.push({ headline: clipWords(raw, MAX_HEADLINE_WORDS), body: '' });
      }
    }
  }
  return bullets;
}

function topicInsights(topic: TrendTopic): string[] {
  const t = topic.title.toLowerCase();
  if (t.includes('carousel')) {
    return ['One carousel beats 5 text posts', 'Hook · stat · steps · CTA', '1080×1080 PDF upload', 'Repurpose to IG + TikTok'];
  }
  if (t.includes('em dash') || t.includes('ai tell') || t.includes('ai content')) {
    return ['Kill em dashes on sight', 'Drop leverage & delve', 'Read out loud first', 'Sound human, not corporate'];
  }
  if (t.includes('hook') || t.includes('tiktok')) {
    return ['First line = 80% of post', 'Steal structure, not sentences', 'Test 3 hooks, pick one', 'TikTok hooks work on LinkedIn'];
  }
  if (t.includes('authentic')) {
    return ['Imperfect beats polished', 'Stories beat generic advice', 'AI draft OK, generic publish not', 'Your angle is the moat'];
  }
  return [
    clipWords(`Lead with ${topic.keywords[0] ?? 'clarity'}`, MAX_LIST_ITEM_WORDS),
    'One specific number wins',
    'One idea per post',
    'End with a clear ask',
  ];
}

function isToolkitPost(text: string, topic: TrendTopic): boolean {
  return topic.title.toLowerCase().includes('ai content') || /438,?413/.test(text);
}

function buildToolkitCarousel(goal: EngagementGoal, text: string): CarouselSlide[] {
  const ctaLine = text.split('\n').reverse().find((l) => CTA_PATTERNS.test(l));
  const tools = [
    { headline: 'Post Writer', body: '16 hooks · pick your goal', stat: '01' },
    { headline: 'Post Audit', body: 'Algo score before publish', stat: '02' },
    { headline: 'Humanizer', body: 'Strip AI filler words', stat: '03' },
    { headline: 'Hook Extractor', body: 'Reverse-engineer viral posts', stat: '04' },
  ];

  const slides: CarouselSlide[] = [
    {
      slide: 0,
      kind: 'cover',
      headline: 'AI posts get 57% fewer likes',
      body: 'Swipe for the fix →',
      badge: '2026 DATA',
      stat: '57%',
    },
    {
      slide: 0,
      kind: 'stat',
      headline: 'The problem',
      body: 'Readers spot AI in line one',
      stat: '57%',
    },
    {
      slide: 0,
      kind: 'steps',
      headline: '4-tool pipeline',
      body: 'Before every publish',
      items: tools.map((t) => t.headline),
    },
    ...tools.map((t) => ({
      slide: 0,
      kind: 'point' as const,
      headline: t.headline,
      body: t.body,
      stat: t.stat,
    })),
    {
      slide: 0,
      kind: 'cta',
      headline: 'Your move',
      body: ctaLine ? clipWords(ctaLine.replace(/🔥/g, '').trim(), MAX_BODY_WORDS) : defaultCta(goal),
    },
  ];

  return slides.map((s, i) => ({ ...s, slide: i + 1 }));
}

function buildTopicCarousel(topic: TrendTopic, goal: EngagementGoal, text: string): CarouselSlide[] {
  const insights = topicInsights(topic).map((i) => clipWords(i, MAX_LIST_ITEM_WORDS));
  const stat = extractStat(text) ?? extractStat(topic.title);
  const ctaLine = text.split('\n').reverse().find((l) => CTA_PATTERNS.test(l));

  const coverHook = stat
    ? `${stat} on ${clipWords(topic.title.toLowerCase(), 3)}`
    : clipWords(topic.title, MAX_HEADLINE_WORDS);

  const slides: CarouselSlide[] = [
    {
      slide: 0,
      kind: 'cover',
      headline: coverHook,
      body: 'Swipe →',
      badge: topic.platform === 'linkedin' ? 'LINKEDIN 2026' : topic.platform.toUpperCase(),
      stat,
    },
    {
      slide: 0,
      kind: stat ? 'stat' : 'problem',
      headline: stat ? 'The data' : 'The gap',
      body: clipWords(topic.angle, MAX_BODY_WORDS),
      stat: stat ?? '—',
    },
    {
      slide: 0,
      kind: 'list',
      headline: 'What works',
      body: '',
      items: insights.slice(0, 4),
    },
    {
      slide: 0,
      kind: 'steps',
      headline: 'The playbook',
      body: clipWords(topic.angle, MAX_BODY_WORDS),
      items: insights.slice(0, 3),
    },
    {
      slide: 0,
      kind: 'cta',
      headline: 'Your move',
      body: ctaLine ? clipWords(ctaLine.replace(/🔥/g, '').trim(), MAX_BODY_WORDS) : defaultCta(goal),
    },
  ];

  return slides.map((s, i) => ({ ...s, slide: i + 1 }));
}

function buildBulletCarousel(
  bullets: Array<{ headline: string; body: string }>,
  topic: TrendTopic,
  goal: EngagementGoal,
  text: string,
): CarouselSlide[] {
  const stat = extractStat(text) ?? extractStat(topic.title);
  const ctaLine = text.split('\n').reverse().find((l) => CTA_PATTERNS.test(l));
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const hook = lines.find((l) => !l.startsWith('→') && !CTA_PATTERNS.test(l) && l.length >= 15);

  const slides: CarouselSlide[] = [
    {
      slide: 0,
      kind: 'cover',
      headline: stat ? `${stat} fewer likes` : clipWords(hook ?? topic.title, MAX_HEADLINE_WORDS),
      body: 'Swipe →',
      badge: 'BREAKDOWN',
      stat,
    },
    {
      slide: 0,
      kind: stat ? 'stat' : 'problem',
      headline: 'Why it matters',
      body: clipWords(topic.angle, MAX_BODY_WORDS),
      stat: stat ?? '—',
    },
    ...bullets.slice(0, 4).map((b) => ({
      slide: 0,
      kind: 'point' as const,
      headline: b.headline,
      body: b.body,
    })),
    {
      slide: 0,
      kind: 'cta',
      headline: 'Your move',
      body: ctaLine ? clipWords(ctaLine.replace(/🔥/g, '').trim(), MAX_BODY_WORDS) : defaultCta(goal),
    },
  ];

  while (slides.length < 5) {
    slides.splice(slides.length - 1, 0, {
      slide: 0,
      kind: 'point',
      headline: clipWords(topic.title, MAX_HEADLINE_WORDS),
      body: clipWords(topic.angle, MAX_BODY_WORDS),
    });
  }

  return slides.slice(0, 7).map((s, i) => ({ ...s, slide: i + 1 }));
}

/** Build slide-native carousel copy — visual summary, not the post pasted on slides. */
export function buildCarousel(
  humanizedText: string,
  topic: TrendTopic,
  goal: EngagementGoal = 'saves',
): CarouselSlide[] {
  const lines = humanizedText.split('\n').map((l) => l.trim()).filter(Boolean);
  const bullets = parseBullets(lines);

  if (isToolkitPost(humanizedText, topic)) {
    return buildToolkitCarousel(goal, humanizedText);
  }

  if (bullets.length >= 3) {
    return buildBulletCarousel(bullets, topic, goal, humanizedText);
  }

  return buildTopicCarousel(topic, goal, humanizedText);
}

/** @deprecated use buildCarousel */
export function buildCarouselFromText(
  text: string,
  topic: TrendTopic,
  goal: EngagementGoal = 'saves',
): CarouselSlide[] {
  return buildCarousel(text, topic, goal);
}

export function buildVideoScript(topic: TrendTopic, humanizedText: string): VideoScript {
  const firstSentence = humanizedText.split(/[.!?\n]/)[0]?.trim() ?? topic.title;
  const bullets = parseBullets(humanizedText.split('\n').map((l) => l.trim()).filter(Boolean));

  return {
    duration_sec: 30,
    hook: clipWords(firstSentence, 12),
    scenes: [
      { start: 0, end: 3, text: clipWords(firstSentence, 8), visual: 'Bold hook on screen' },
      { start: 3, end: 12, text: clipWords(topic.angle, 10), visual: 'B-roll or screen recording' },
      {
        start: 12,
        end: 22,
        text: bullets.map((b) => b.headline).slice(0, 4).join(' · ') || clipWords(topic.title, 6),
        visual: 'Quick-cut text cards',
      },
      { start: 22, end: 27, text: 'Save this before you post', visual: 'CTA card' },
      { start: 27, end: 30, text: 'Follow for more', visual: 'End card' },
    ],
    cta: 'Save this',
  };
}

export function mediaNotes(format: PostFormat = 'carousel'): string[] {
  const base = [
    'No links in post body — add link in first comment if needed',
  ];
  if (format === 'text') {
    return ['Text-only post — no image needed', 'Strong hook in first 2 lines is critical', ...base];
  }
  if (format === 'single') {
    return [
      'Use YOUR photo when possible (team, desk, candid) — beats generated graphics',
      'Generated cover.png is fallback if you have no photo',
      'linkedin posts create --text "..." --image path/to/photo.jpg',
      ...base,
    ];
  }
  return [
    'Carousel slides are a visual summary — post body has the full story',
    'Combine slide PNGs into a PDF (1080×1080) for LinkedIn document posts',
    'Or post text + cover.png for a lighter version',
    'Regenerate: linkedin agent images --id <draft-id>',
    ...base,
  ];
}
