import { detectAiFingerprints } from './humanizer.js';
import type { AuditIssue, AuditResult } from './types.js';

const BANNED_OPENERS = [
  /^\s*what\s+(do\s+you\s+think|are your thoughts)/i,
  /^\s*how\s+(do|does|can|would)/i,
  /^\s*have\s+you\s+ever/i,
  /^\s*did\s+you\s+know/i,
];

export function auditPost(text: string): AuditResult {
  const issues: AuditIssue[] = [];
  const lines = text.split('\n');
  const firstLine = lines[0] ?? '';
  const first200 = text.slice(0, 200);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const hashtagCount = (text.match(/#\w+/g) ?? []).length;
  const hasLink = /https?:\/\/\S+/i.test(text);

  // Hook in first 200 chars
  issues.push({
    rule: 'hook_first_200',
    passed: first200.trim().length >= 40,
    message: first200.trim().length >= 40
      ? 'Strong opener in first 200 characters'
      : 'First 200 characters are too weak — add a sharper hook',
    severity: first200.trim().length >= 40 ? 'info' : 'error',
  });

  // No question opener
  const questionOpener = BANNED_OPENERS.some((p) => p.test(firstLine));
  issues.push({
    rule: 'no_question_opener',
    passed: !questionOpener,
    message: questionOpener
      ? 'Question openers underperform in 2026 — use a statement hook'
      : 'No penalized question opener',
    severity: questionOpener ? 'error' : 'info',
  });

  // AI fingerprints
  const fingerprints = detectAiFingerprints(text);
  issues.push({
    rule: 'no_ai_fingerprints',
    passed: fingerprints.length === 0,
    message: fingerprints.length === 0
      ? 'No common AI fingerprints'
      : `AI tells found: ${fingerprints.join(', ')}`,
    severity: fingerprints.length === 0 ? 'info' : 'error',
  });

  // Quantified proof bonus
  const hasNumbers = /\d+[%kKmM]?/.test(first200);
  issues.push({
    rule: 'quantified_proof',
    passed: hasNumbers,
    message: hasNumbers
      ? 'Quantified proof in hook area'
      : 'Add a number or stat in the hook for +reach',
    severity: hasNumbers ? 'info' : 'warning',
  });

  // Length (LinkedIn sweet spot 150-400 words for text)
  const goodLength = wordCount >= 80 && wordCount <= 500;
  issues.push({
    rule: 'length',
    passed: goodLength,
    message: goodLength
      ? `Word count ${wordCount} is in range`
      : `Word count ${wordCount} — aim for 80-500 words`,
    severity: goodLength ? 'info' : 'warning',
  });

  // No link in body
  issues.push({
    rule: 'no_link_in_body',
    passed: !hasLink,
    message: hasLink
      ? 'Links in post body reduce reach — put link in first comment'
      : 'No external link in body',
    severity: hasLink ? 'warning' : 'info',
  });

  // Hashtag count
  issues.push({
    rule: 'hashtag_limit',
    passed: hashtagCount <= 3,
    message: hashtagCount <= 3
      ? `${hashtagCount} hashtag(s) — OK`
      : `${hashtagCount} hashtags — use 3 or fewer`,
    severity: hashtagCount <= 3 ? 'info' : 'warning',
  });

  // Open loop / carousel tease
  const hasOpenLoop = /→|swipe|carousel|part 2|more below|comment/i.test(text);
  issues.push({
    rule: 'open_loop',
    passed: hasOpenLoop,
    message: hasOpenLoop
      ? 'Open loop or CTA present'
      : 'Add a carousel tease or CTA for saves',
    severity: hasOpenLoop ? 'info' : 'warning',
  });

  const errors = issues.filter((i) => i.severity === 'error' && !i.passed).length;
  const warnings = issues.filter((i) => i.severity === 'warning' && !i.passed).length;
  const passedChecks = issues.filter((i) => i.passed).length;

  const score = Math.max(0, Math.min(100, Math.round((passedChecks / issues.length) * 100 - errors * 15 - warnings * 5)));

  return {
    score,
    passed: errors === 0 && score >= 70,
    issues,
  };
}
