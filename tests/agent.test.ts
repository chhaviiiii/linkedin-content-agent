import { describe, it, expect } from 'vitest';
import { humanize, detectAiFingerprints } from '../src/agent/humanizer.js';
import { auditPost } from '../src/agent/post-audit.js';
import { extractHook } from '../src/agent/hook-extractor.js';
import { scanVoiceFromFile, applyVoice, parsePostsFromActivityHtml, parsePublicVoiceFromHtml, parseLinkedInProfileId, parsePublicProfileMarkdown, type VoiceProfile } from '../src/agent/voice.js';

describe('humanizer', () => {
  it('removes em dashes and AI words', () => {
    const input = 'I want to delve into this robust landscape — it is a game-changer.';
    const { text, changes } = humanize(input);
    expect(text).not.toMatch(/[—–]/);
    expect(text.toLowerCase()).not.toContain('delve');
    expect(text.toLowerCase()).not.toContain('leverage');
    expect(changes.length).toBeGreaterThan(0);
  });

  it('detects fingerprints', () => {
    expect(detectAiFingerprints('We should leverage this — great')).toContain('em dash');
    expect(detectAiFingerprints('We should leverage this — great')).toContain('leverage');
  });
});

describe('post-audit', () => {
  it('scores a strong draft higher than a weak one', () => {
    const weak = 'How do you feel about AI?';
    const strong = `438,413 posts were analyzed in 2026.

The top 1% used sharper hooks and avoided AI filler words.

→ Post Writer picks hooks by goal
→ Humanizer strips template cadence

Swipe the carousel for the full workflow.`;

    expect(auditPost(strong).score).toBeGreaterThan(auditPost(weak).score);
  });
});

describe('hook-extractor', () => {
  it('identifies nobody-talks-about pattern', () => {
    const result = extractHook('Nobody talks about hooks when it comes to LinkedIn growth.');
    expect(result.formula_id).toBe(7);
    expect(result.formula_name).toBe('Nobody talks about');
  });
});
import { pickHookFormula, HOOK_FORMULAS } from '../src/agent/hook-formulas.js';
import { buildCarousel } from '../src/agent/media-builder.js';
import type { TrendTopic } from '../src/agent/types.js';

const sampleTopic: TrendTopic = {
  title: 'AI content gets 57% less engagement',
  angle: 'posts that sound like ChatGPT get ignored',
  platform: 'linkedin',
  keywords: ['ai', 'content'],
  score: 90,
  source: 'curated',
};

describe('media-builder', () => {
  it('builds short slide copy, not full post paragraphs', () => {
    const toolkitPost = `438,413 LinkedIn posts were analyzed in 2026.

The #1 killer wasn't bad ideas. It was posts that sounded like ChatGPT wrote them on a lunch break.

AI-sounding posts get 57% fewer likes. Em dashes. "Leverage." "Delve." Same hook every time.

I got tired of fixing this manually, so I built 4 tools:

→ Post Writer: 16 hook formulas, picked by your engagement goal (comments, saves, reach)
→ Post Audit: scores your draft against 2026 algorithm rules before you hit publish
→ Humanizer: strips AI fingerprints (em dashes, corporate filler words, template cadence)
→ Hook Extractor: paste any viral post, get the formula behind it

Swipe the carousel for the full workflow.`;

    const slides = buildCarousel(toolkitPost, sampleTopic, 'saves');
    expect(slides.length).toBeGreaterThanOrEqual(5);
    expect(slides[0]!.headline.split(/\s+/).length).toBeLessThanOrEqual(8);
    expect(slides[0]!.headline).not.toContain('438,413');
    const pointSlides = slides.filter((s) => s.kind === 'point');
    for (const s of pointSlides) {
      expect(s.headline.split(/\s+/).length).toBeLessThanOrEqual(6);
      expect(s.body.split(/\s+/).length).toBeLessThanOrEqual(12);
    }
    expect(slides.some((s) => s.kind === 'list' || s.kind === 'steps')).toBe(true);
  });

  it('uses topic insights for generic posts', () => {
    const topic: TrendTopic = {
      title: 'Carousels get 2.3x more reach',
      angle: 'document posts outperform text-only',
      platform: 'linkedin',
      keywords: ['carousel'],
      score: 85,
      source: 'curated',
    };
    const slides = buildCarousel('Short post about carousels.\n\nSave this.', topic, 'reach');
    const listSlide = slides.find((s) => s.kind === 'list');
    expect(listSlide?.items?.length).toBeGreaterThan(0);
    expect(listSlide!.items![0]!.split(/\s+/).length).toBeLessThanOrEqual(10);
  });
});

describe('voice', () => {
  it('parses posts from activity page HTML', () => {
    const html = `
      "commentary":{"text":"I shipped my first feature at Mastercard this week.\\n\\nNot the flashy kind."}
      "commentary":{"text":"Unpopular opinion: CS students should spend more time writing than leetcoding."}
    `;
    const posts = parsePostsFromActivityHtml(html, 5);
    expect(posts.length).toBe(2);
    expect(posts[0]).toContain('Mastercard');
  });

  it('parses public profile text from HTML', () => {
    const html = `
      property="og:description" content="Fourth-year at UBC in Computer Science and Cognitive Systems, currently interning at Mastercard on payments infrastructure."
      "summary":"I build across the full stack and the ML pipeline."
    `;
    const samples = parsePublicVoiceFromHtml(html);
    expect(samples.length).toBeGreaterThan(0);
    expect(samples.some((s) => s.includes('UBC') || s.includes('full stack'))).toBe(true);
  });

  it('parses LinkedIn profile URL or username', () => {
    expect(parseLinkedInProfileId('cnayyar')).toBe('cnayyar');
    expect(parseLinkedInProfileId('@cnayyar')).toBe('cnayyar');
    expect(parseLinkedInProfileId('https://www.linkedin.com/in/cnayyar/')).toBe('cnayyar');
  });

  it('parses public profile markdown (about, bullets, projects)', () => {
    const md = `
# Chhavi Nayyar

SWE Intern @ Mastercard | HCAI + ML @ UBC

## About

Fourth-year at UBC in Computer Science and Cognitive Systems, currently interning at Mastercard on payments infrastructure. I build across the full stack and the ML pipeline.

## Experience

### Software Engineer Intern

- Building microservices in Java and Python with gRPC and RESTful APIs
- Deploying ML pipelines using Docker, Terraform, and AWS
- Collaborating with cross-functional engineering teams on secure systems

## Projects

### CourseInsights

CourseInsights is an automated analytics platform designed to streamline the processing of course evaluation data sourced from Qualtrics.
    `;
    const samples = parsePublicProfileMarkdown(md);
    expect(samples.some((s) => s.includes('Fourth-year at UBC'))).toBe(true);
    expect(samples.some((s) => s.includes('microservices'))).toBe(true);
    expect(samples.some((s) => s.includes('CourseInsights'))).toBe(true);
  });

  it('applies voice traits to text', () => {
    const profile: VoiceProfile = {
      username: 'test',
      scanned_at: new Date().toISOString(),
      source: 'file',
      samples: ['Short line.\n\n→ Bullet point here'],
      traits: {
        avg_words_per_line: 4,
        avg_post_length: 20,
        uses_bullets: true,
        uses_emoji: false,
        line_break_style: 'short',
      },
    };
    const result = applyVoice('Long paragraph that should get some formatting applied to match voice.', profile);
    expect(result).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});

describe('hook-formulas', () => {
  it('has 16 formulas', () => {
    expect(HOOK_FORMULAS).toHaveLength(16);
  });

  it('picks formula for goal', () => {
    const formula = pickHookFormula('saves');
    expect(formula.goals).toContain('saves');
  });
});

describe('image-generator', () => {
  it('generates carousel PNGs', async () => {
    const { generateCarouselImages } = await import('../src/agent/image-generator.js');
    const slides = [
      { slide: 1, headline: 'Test cover', body: 'Swipe →' },
      { slide: 2, headline: 'Slide two', body: 'Body text here' },
    ];
    const paths = await generateCarouselImages('test-draft-images', slides);
    expect(paths.length).toBe(3); // 2 slides + cover
    expect(paths[0]).toMatch(/slide-01\.png$/);
    expect(paths.find((p) => p.endsWith('cover.png'))).toBeTruthy();
  });
});
