import type { CarouselSlide, EngagementGoal, PostFormat, TrendTopic, VideoScript } from './types.js';

const CTA_PATTERNS = /comment|🔥|save this|swipe|building in public|drop a|early access|your move/i;

function defaultCta(goal: EngagementGoal): string {
  const ctas: Record<EngagementGoal, string> = {
    comments: 'Drop your take in the comments.',
    saves: 'Save this for your next draft.',
    reach: 'Share with someone who needs this.',
    profile_visits: 'Follow for more breakdowns.',
  };
  return ctas[goal];
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
      bullets.push({ headline: named[1]!.trim(), body: named[2]!.trim() });
      continue;
    }
    const simple = line.match(/^→\s*(.+)$/);
    if (simple) bullets.push({ headline: simple[1]!.trim(), body: '' });
  }
  return bullets;
}

function contentParagraphs(lines: string[], skip: Set<string>): string[] {
  return lines.filter((l) => !skip.has(l) && !l.startsWith('→') && l.length > 30);
}

export function buildCarousel(
  humanizedText: string,
  topic: TrendTopic,
  goal: EngagementGoal = 'saves',
): CarouselSlide[] {
  const lines = humanizedText.split('\n').map((l) => l.trim()).filter(Boolean);
  const bullets = parseBullets(lines);
  const ctaLine = [...lines].reverse().find((l) => CTA_PATTERNS.test(l));

  const hookCandidates = lines.filter(
    (l) => !l.startsWith('→') && !CTA_PATTERNS.test(l) && l.length >= 15,
  );
  const hook = hookCandidates[0] ?? topic.title;
  const coverHeadline = hook.length > 65 ? topic.title : hook;

  const problemLine =
    lines.find((l) => /%|killer|myth|unpopular|nobody|fewer|behind/i.test(l)) ??
    lines[1] ??
    topic.angle;
  const problemStat = extractStat(problemLine) ?? extractStat(topic.title) ?? extractStat(lines.join(' '));

  const skip = new Set([hookCandidates[0], problemLine, ctaLine].filter(Boolean) as string[]);
  const paragraphs = contentParagraphs(lines, skip);

  const slides: CarouselSlide[] = [
    {
      slide: 0,
      kind: 'cover',
      headline: coverHeadline,
      body: 'Swipe →',
      badge: topic.platform === 'linkedin' ? 'LINKEDIN 2026' : topic.platform.toUpperCase(),
    },
    {
      slide: 0,
      kind: 'problem',
      headline: 'The problem',
      body: problemLine,
      stat: problemStat,
    },
  ];

  if (bullets.length > 0) {
    for (const b of bullets.slice(0, 4)) {
      slides.push({
        slide: 0,
        kind: 'point',
        headline: b.headline,
        body: b.body || topic.angle,
      });
    }
  } else {
    for (const para of paragraphs.slice(0, 4)) {
      const dot = para.indexOf('. ');
      const headline = dot > 10 && dot < 80 ? para.slice(0, dot + 1) : para.slice(0, 60);
      const body = dot > 10 ? para.slice(dot + 2) : '';
      slides.push({
        slide: 0,
        kind: 'point',
        headline,
        body: body || topic.angle,
      });
    }
  }

  // Pad to at least 5 content slides before CTA (cover + problem + 3 points minimum)
  while (slides.length < 5) {
    slides.push({
      slide: 0,
      kind: 'point',
      headline: topic.title,
      body: topic.angle,
    });
  }

  slides.push({
    slide: 0,
    kind: 'cta',
    headline: 'Your move',
    body: ctaLine ?? defaultCta(goal),
  });

  // Cap at 7 slides total
  const trimmed = [slides[0]!, slides[1]!, ...slides.slice(2, -1).slice(0, 4), slides.at(-1)!];

  return trimmed.map((s, i) => ({ ...s, slide: i + 1 }));
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
    hook: firstSentence,
    scenes: [
      { start: 0, end: 3, text: firstSentence, visual: 'Bold hook on screen' },
      { start: 3, end: 12, text: topic.angle, visual: 'B-roll or screen recording' },
      {
        start: 12,
        end: 22,
        text: bullets.map((b) => b.headline).slice(0, 4).join(' · ') || topic.title,
        visual: 'Quick-cut text cards',
      },
      { start: 22, end: 27, text: 'Save this before you post next.', visual: 'CTA card' },
      { start: 27, end: 30, text: 'Follow for more.', visual: 'End card' },
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
    'Combine slide PNGs into a PDF (1080×1080) for LinkedIn document posts',
    'Or post text + cover.png for a lighter version',
    'Regenerate: linkedin agent images --id <draft-id>',
    ...base,
  ];
}
