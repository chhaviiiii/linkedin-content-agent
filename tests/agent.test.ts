import { describe, it, expect } from 'vitest';
import { humanize, detectAiFingerprints } from '../src/agent/humanizer.js';
import { auditPost } from '../src/agent/post-audit.js';
import { extractHook } from '../src/agent/hook-extractor.js';
import { pickHookFormula, HOOK_FORMULAS } from '../src/agent/hook-formulas.js';

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
