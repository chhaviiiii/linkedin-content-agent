import { HOOK_FORMULAS } from './hook-formulas.js';
import type { ExtractedHook } from './types.js';

const PATTERNS: Array<{ formulaId: number; regex: RegExp; pattern: string }> = [
  { formulaId: 1, regex: /not because .+ because /i, pattern: '{claim}. Not because {X}. Because {Y}.' },
  { formulaId: 2, regex: /unpopular opinion/i, pattern: 'Unpopular opinion: {claim}' },
  { formulaId: 3, regex: /\d[\d,.]*(%|k|m)?\s+\w+.*(analyzed|studied|reviewed)/i, pattern: '{number} {things} analyzed...' },
  { formulaId: 4, regex: /almost quit|then i (found|discovered)/i, pattern: 'I almost quit {X}. Then I discovered {Y}.' },
  { formulaId: 5, regex: /everyone is (talking|saying).+nobody/i, pattern: 'Everyone talks about {X}. Nobody mentions {Y}.' },
  { formulaId: 6, regex: /months ago:.+today:/i, pattern: '6 months ago: {before}. Today: {after}.' },
  { formulaId: 7, regex: /nobody (talks|talking) about/i, pattern: 'Nobody talks about {X}.' },
  { formulaId: 8, regex: /(last (week|month|year)|i (failed|lost|messed up))/i, pattern: 'Personal story + lesson' },
  { formulaId: 9, regex: /myth:.+reality:/i, pattern: 'Myth: {X}. Reality: {Y}.' },
  { formulaId: 10, regex: /^\s*\d+\s+\w+.*:/m, pattern: '{n} things that {outcome}:' },
  { formulaId: 11, regex: /embarrassed to admit|hard to admit/i, pattern: 'I was embarrassed to admit {X}.' },
  { formulaId: 12, regex: /\d+\s+(creators|people|founders).+(are doing|use)/i, pattern: '{n} creators are doing {X}.' },
  { formulaId: 13, regex: /if you still .+ you are (already )?behind/i, pattern: 'If you still {X}, you are behind.' },
  { formulaId: 14, regex: /one (line|change|thing) changed/i, pattern: 'One line changed {metric}.' },
  { formulaId: 15, regex: /^["'"']/m, pattern: '"{quote}" — explains {topic}' },
  { formulaId: 16, regex: /prove me wrong|i bet you/i, pattern: 'I bet you cannot {X}. Prove me wrong.' },
];

export function extractHook(text: string): ExtractedHook {
  const firstLine = text.split('\n')[0] ?? text.slice(0, 200);

  for (const { formulaId, regex, pattern } of PATTERNS) {
    if (regex.test(firstLine) || regex.test(text.slice(0, 300))) {
      const formula = HOOK_FORMULAS.find((f) => f.id === formulaId)!;
      return {
        formula_id: formulaId,
        formula_name: formula.name,
        pattern,
        confidence: 0.85,
      };
    }
  }

  // Fallback heuristics
  if (/\d/.test(firstLine)) {
    const formula = HOOK_FORMULAS.find((f) => f.id === 3)!;
    return { formula_id: 3, formula_name: formula.name, pattern: formula.template, confidence: 0.5 };
  }

  const formula = HOOK_FORMULAS.find((f) => f.id === 1)!;
  return { formula_id: 1, formula_name: formula.name, pattern: formula.template, confidence: 0.3 };
}
