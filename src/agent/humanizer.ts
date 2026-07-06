const AI_WORD_REPLACEMENTS: Record<string, string> = {
  leverage: 'use',
  delve: 'look',
  'delve into': 'look at',
  landscape: 'space',
  robust: 'solid',
  synergy: 'fit',
  'game-changer': 'big shift',
  'thrilled to announce': 'sharing',
  'excited to announce': 'sharing',
  'here\'s how': 'this is how',
  'it\'s worth noting': '',
  'in today\'s world': 'right now',
  'in today\'s fast-paced': 'right now',
  utilize: 'use',
  facilitate: 'help',
  paradigm: 'model',
  holistic: 'full',
  seamless: 'smooth',
  'cutting-edge': 'new',
  'at the end of the day': '',
  'moving forward': 'next',
  navigate: 'handle',
  unpack: 'break down',
  'deep dive': 'close look',
  'circle back': 'follow up',
  'touch base': 'check in',
  'low-hanging fruit': 'easy wins',
  'best practices': 'what works',
  'thought leader': 'builder',
};

const AI_PHRASE_PATTERNS = [
  /\bI'm thrilled to\b/gi,
  /\bI'm excited to share that\b/gi,
  /\bIn conclusion,\b/gi,
  /\bTo summarize,\b/gi,
  /\bLet's dive in\.?\b/gi,
  /\bWithout further ado\.?\b/gi,
  /\bIt's important to note that\b/gi,
];

export interface HumanizeResult {
  text: string;
  changes: string[];
}

export function humanize(text: string): HumanizeResult {
  let result = text;
  const changes: string[] = [];

  // Em dashes and en dashes → period or comma
  const dashCount = (result.match(/[—–]/g) ?? []).length;
  if (dashCount > 0) {
    result = result.replace(/\s*[—–]\s*/g, '. ');
    changes.push(`Replaced ${dashCount} em/en dash(es)`);
  }

  // Curly quotes → straight
  result = result.replace(/[""]/g, '"').replace(/['']/g, "'");

  // Word replacements outside quoted examples (e.g. keep "Leverage." as a cited AI tell)
  const entries = Object.entries(AI_WORD_REPLACEMENTS).sort((a, b) => b[0].length - a[0].length);
  for (const [word, replacement] of entries) {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const parts = result.split(/("[^"]*")/g);
    let replaced = false;
    const updated = parts.map((part) => {
      if (part.startsWith('"')) return part;
      if (regex.test(part)) {
        replaced = true;
        return part.replace(regex, replacement);
      }
      return part;
    });
    if (replaced) {
      result = updated.join('');
      changes.push(`Replaced "${word}"`);
    }
  }

  for (const pattern of AI_PHRASE_PATTERNS) {
    if (pattern.test(result)) {
      result = result.replace(pattern, '');
      changes.push(`Removed AI phrase: ${pattern.source}`);
    }
  }

  // Collapse extra spaces per line, preserve paragraph breaks
  result = result
    .replace(/\.\s*\./g, '.')
    .split('\n')
    .map((line) => line.replace(/[^\S\n]{2,}/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (changes.length === 0) {
    changes.push('No AI fingerprints detected');
  }

  return { text: result, changes };
}

export function detectAiFingerprints(text: string): string[] {
  const found: string[] = [];
  // Only scan unquoted text (quoted words may be intentional examples)
  const unquoted = text.split(/("[^"]*")/g).filter((p) => !p.startsWith('"')).join('');
  if (/[—–]/.test(unquoted)) found.push('em dash');
  for (const word of Object.keys(AI_WORD_REPLACEMENTS)) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(unquoted)) found.push(word);
  }
  return found;
}
