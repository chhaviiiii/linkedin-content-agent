import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { LinkedInClient } from '../core/types.js';

const VOICE_DIR = join(homedir(), '.linkedin-cli', 'voice');
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** `cnayyar`, `@cnayyar`, or `https://www.linkedin.com/in/cnayyar/` */
export function parseLinkedInProfileId(input: string): string {
  const trimmed = input.trim().replace(/^@/, '');
  const urlMatch = trimmed.match(/linkedin\.com\/in\/([^/?#]+)/i);
  if (urlMatch?.[1]) return decodeURIComponent(urlMatch[1]);
  if (/^https?:\/\//i.test(trimmed)) {
    throw new Error(`Not a LinkedIn profile URL: ${trimmed}`);
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    throw new Error(`Invalid LinkedIn username: ${trimmed}`);
  }
  return trimmed;
}

export function linkedInProfileUrl(username: string): string {
  return `https://www.linkedin.com/in/${encodeURIComponent(username)}/`;
}

export interface VoiceTraits {
  avg_words_per_line: number;
  avg_post_length: number;
  uses_bullets: boolean;
  uses_emoji: boolean;
  line_break_style: 'short' | 'medium' | 'long';
}

export interface VoiceProfile {
  username: string;
  scanned_at: string;
  source: 'activity' | 'api' | 'file' | 'public';
  samples: string[];
  traits: VoiceTraits;
}

export async function loadVoiceProfile(username?: string): Promise<VoiceProfile | null> {
  if (!username) {
    try {
      const active = await readFile(join(VOICE_DIR, 'active.json'), 'utf-8');
      username = (JSON.parse(active) as { username: string }).username;
    } catch {
      return null;
    }
  }
  try {
    const raw = await readFile(join(VOICE_DIR, `${username}.json`), 'utf-8');
    return JSON.parse(raw) as VoiceProfile;
  } catch {
    return null;
  }
}

export async function saveVoiceProfile(profile: VoiceProfile): Promise<string> {
  await mkdir(VOICE_DIR, { recursive: true });
  const path = join(VOICE_DIR, `${profile.username}.json`);
  await writeFile(path, JSON.stringify(profile, null, 2), 'utf-8');
  await writeFile(join(VOICE_DIR, 'active.json'), JSON.stringify({ username: profile.username }), 'utf-8');
  return path;
}

/** Parse post commentary embedded in activity page HTML. */
export function parsePostsFromActivityHtml(html: string, limit = 10): string[] {
  if (html.includes('authwall') || html.includes('Join LinkedIn')) return [];

  const texts: string[] = [];
  const patterns = [
    /"commentary":\s*\{\s*"text":\s*"((?:\\.|[^"\\])*)"/g,
    /"shareCommentary":\s*\{\s*"text":\s*"((?:\\.|[^"\\])*)"/g,
    /"commentaryV2":\s*\{\s*"text":\s*"((?:\\.|[^"\\])*)"/g,
  ];

  for (const pattern of patterns) {
    for (const m of html.matchAll(pattern)) {
      try {
        const t = decodeJsonString(m[1]!);
        if (isLikelyVoiceSample(t)) texts.push(t);
      } catch {
        // skip malformed embed
      }
    }
  }

  return dedupeSamples(texts).slice(0, limit);
}

/** Parse public profile + activity HTML — about, experience, projects, any visible posts. */
export function parsePublicVoiceFromHtml(html: string): string[] {
  if (html.includes('authwall') || html.includes('Join LinkedIn')) return [];

  const samples: string[] = [];

  const ogDesc = html.match(/property="og:description"\s+content="([^"]+)"/);
  if (ogDesc?.[1]) {
    const t = decodeHtml(ogDesc[1]);
    if (isLikelyVoiceSample(t)) samples.push(t);
  }

  samples.push(...parsePostsFromActivityHtml(html, 10));

  const embedPatterns = [
    /"summary":\s*"((?:\\.|[^"\\])*)"/g,
    /"description":\s*\{[^}]*"text":\s*"((?:\\.|[^"\\])*)"/g,
    /"title":\s*"((?:\\.|[^"\\])*)"\s*,\s*"description":\s*\{[^}]*"text":\s*"((?:\\.|[^"\\])*)"/g,
  ];

  for (const pattern of embedPatterns) {
    for (const m of html.matchAll(pattern)) {
      try {
        const raw = m.length > 2 ? m[m.length - 1]! : m[1]!;
        const t = decodeJsonString(raw);
        if (isLikelyVoiceSample(t)) samples.push(t);
      } catch {
        // skip
      }
    }
  }

  return dedupeSamples(samples);
}

/** Reader-style markdown (About, experience bullets, projects) — not post feed. */
export function parsePublicProfileMarkdown(markdown: string): string[] {
  const samples: string[] = [];

  const aboutMatch = markdown.match(/## About\s*\n+([\s\S]*?)(?=\n## |\n# |$)/);
  if (aboutMatch?.[1]) {
    const about = aboutMatch[1]
      .split('\n')
      .filter((line) => line.trim() && !/^Total Experience:/i.test(line.trim()))
      .join(' ')
      .trim();
    if (isLikelyVoiceSample(about)) samples.push(about);
  }

  const headline = markdown.match(/^# [^\n]+\n\n([^\n#][^\n]+)/)?.[1]?.trim();
  if (headline && isLikelyVoiceSample(headline)) samples.push(headline);

  const bulletLines = [...markdown.matchAll(/^- (.+)$/gm)]
    .map((m) => m[1]!.trim())
    .filter((line) => !isCompanyBoilerplate(line));
  for (let i = 0; i < bulletLines.length; i += 3) {
    const block = bulletLines
      .slice(i, i + 3)
      .map((b) => `→ ${b}`)
      .join('\n');
    if (isLikelyVoiceSample(block)) samples.push(block);
  }

  const projectsSection = markdown.match(/## Projects([\s\S]*?)(?=\n## |$)/)?.[1] ?? '';
  for (const block of projectsSection.split(/\n### /).slice(1)) {
    const desc = block
      .split('\n')
      .slice(1)
      .filter((line) => line.trim() && !line.startsWith('#'))
      .join(' ')
      .replace(/\s+Show less$/i, '')
      .trim();
    if (isLikelyVoiceSample(desc)) samples.push(desc);
  }

  return dedupeSamples(samples);
}

function isCompanyBoilerplate(line: string): boolean {
  return /employs \d+ people|annual revenue|Market cap|IPO \d{4}|Headquartered in/i.test(line);
}

function isLikelyVoiceSample(text: string): boolean {
  if (text.length < 50 || text.length > 5000) return false;
  if (/Total Experience:|connections • \d+ followers/i.test(text)) return false;
  if (/employs \d+ people|annual revenue|Market cap|IPO \d{4}/i.test(text)) return false;
  if (/^Department:|^Level:|Headquartered in/i.test(text)) return false;
  return true;
}

function dedupeSamples(texts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of texts) {
    const key = t.slice(0, 100);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

async function fetchPublicPage(path: string): Promise<string> {
  try {
    const res = await fetch(`https://www.linkedin.com${path}`, {
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.9',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-dest': 'document',
      },
      redirect: 'follow',
    });
    const html = await res.text();
    if (html.includes('authwall') || html.includes('Join LinkedIn') || res.status === 999) return '';
    return html;
  } catch {
    return '';
  }
}

export interface PublicVoiceFetchResult {
  username: string;
  url: string;
  samples: string[];
  /** What we tried to read from the URL (not your post feed). */
  fields: string[];
  blocked: boolean;
}

/** No login — About, headline, experience bullets, projects from profile URL. Not post feed. */
export async function fetchPublicVoiceSamples(username: string, limit = 12): Promise<PublicVoiceFetchResult> {
  const id = parseLinkedInProfileId(username);
  const url = linkedInProfileUrl(id);
  const fields = ['about', 'headline', 'experience bullets', 'projects'];
  const paths = [`/in/${encodeURIComponent(id)}/`];
  const samples: string[] = [];
  let blocked = true;

  for (const path of paths) {
    const html = await fetchPublicPage(path);
    if (html) {
      blocked = false;
      samples.push(...parsePublicVoiceFromHtml(html));
    }
  }

  return {
    username: id,
    url,
    samples: dedupeSamples(samples).slice(0, limit),
    fields,
    blocked,
  };
}

/** Login required — one authenticated activity page fetch (minimizes browser logout risk). */
export async function fetchPersonalPosts(
  username: string,
  client: LinkedInClient,
  limit = 10,
): Promise<{ posts: string[]; source: 'activity' }> {
  const html = await client.fetchPage(`/in/${encodeURIComponent(username)}/recent-activity/all/`);
  const activityPosts = parsePostsFromActivityHtml(html, limit);
  if (activityPosts.length > 0) {
    return { posts: activityPosts, source: 'activity' };
  }
  const profileSamples = parsePublicVoiceFromHtml(html);
  if (profileSamples.length > 0) {
    return { posts: profileSamples.slice(0, limit), source: 'activity' };
  }
  return { posts: [], source: 'activity' };
}

export async function exportVoiceSamplesToFile(
  username: string,
  samples: string[],
  filePath: string,
  source: VoiceProfile['source'],
): Promise<void> {
  const sourceLabel =
    source === 'public'
      ? 'public profile + activity page (no login)'
      : source === 'activity'
        ? 'activity page (logged in)'
        : source === 'api'
          ? 'LinkedIn API (logged in)'
          : 'file';
  const body = [
    '# Voice samples (not agent drafts)',
    `# Profile: ${username}`,
    `# Source: ${sourceLabel}`,
    `# Fetched: ${new Date().toISOString().slice(0, 10)}`,
    '',
    samples.join('\n\n---\n\n'),
    '',
  ].join('\n');
  await writeFile(filePath, body, 'utf-8');
}

export async function scanVoiceFromFile(username: string, filePath: string): Promise<VoiceProfile> {
  const raw = await readFile(filePath, 'utf-8');
  const stripped = raw
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n');
  const chunks = stripped.includes('\n---')
    ? stripped.split(/\n---+\n/)
    : stripped.split(/\n\n+/);
  const samples = chunks
    .map((s) => s.trim())
    .filter((s) => s.length > 40)
    .slice(0, 12);

  if (samples.length === 0) {
    throw new Error('No samples found in file (separate with ---)');
  }

  return buildProfile(username, samples, 'file');
}

/**
 * Default: public profile info (no login).
 * Pass withPosts + client to also pull personal posts.
 */
export async function scanVoiceFromUsername(
  profileInput: string,
  client?: LinkedInClient,
  options?: { withPosts?: boolean },
): Promise<VoiceProfile> {
  const username = parseLinkedInProfileId(profileInput);

  if (options?.withPosts) {
    if (!client) {
      throw new Error(
        '`--with-posts` needs login. Run `linkedin login` first.\n' +
          'For voice without login, omit `--with-posts` — your profile URL is enough.',
      );
    }
    const { posts, source } = await fetchPersonalPosts(username, client);
    if (posts.length > 0) {
      return buildProfile(username, posts, source);
    }
    throw new Error(
      `Could not extract posts for @${username} after login.\n` +
        'Login is optional for voice. Use your profile URL instead (no login):\n' +
        `  linkedin agent voice --url ${linkedInProfileUrl(username)}`,
    );
  }

  const { samples, url, fields, blocked } = await fetchPublicVoiceSamples(username);
  if (samples.length > 0) {
    return buildProfile(username, samples, 'public');
  }

  const fieldList = fields.map((f) => `  • ${f}`).join('\n');
  throw new Error(
    blocked
      ? `LinkedIn blocked the fetch for ${url} (authwall — common from CLI).\n\n` +
          `No login needed. From that URL we read profile text only (not your post feed):\n${fieldList}\n\n` +
          'Copy your About section from the browser into my-posts.txt, then:\n' +
          `  linkedin agent voice --url ${url} --from-file ./my-posts.txt`
      : `No voice samples found at ${url}.\n\n` +
          `We look for (no login, not post feed):\n${fieldList}\n\n` +
          'Paste your About section into my-posts.txt:\n' +
          `  linkedin agent voice --url ${url} --from-file ./my-posts.txt`,
  );
}

function buildProfile(username: string, samples: string[], source: VoiceProfile['source']): VoiceProfile {
  return {
    username,
    scanned_at: new Date().toISOString(),
    source,
    samples,
    traits: analyzeTraits(samples),
  };
}

function analyzeTraits(samples: string[]): VoiceTraits {
  const lines = samples.flatMap((s) => s.split('\n').filter((l) => l.trim().length > 0));
  const wordCounts = lines.map((l) => l.split(/\s+/).length);
  const avgWords = wordCounts.reduce((a, b) => a + b, 0) / Math.max(wordCounts.length, 1);
  const postLengths = samples.map((s) => s.split(/\s+/).length);
  const avgPost = postLengths.reduce((a, b) => a + b, 0) / Math.max(postLengths.length, 1);

  return {
    avg_words_per_line: Math.round(avgWords),
    avg_post_length: Math.round(avgPost),
    uses_bullets: samples.some((s) => /^→/m.test(s) || /^[-•]/m.test(s)),
    uses_emoji: /[\u{1F300}-\u{1FAFF}]/u.test(samples.join('')),
    line_break_style: avgWords < 12 ? 'short' : avgWords < 20 ? 'medium' : 'long',
  };
}

/** Light touch: reshape generated text toward scanned voice patterns. */
export function applyVoice(text: string, voice: VoiceProfile): string {
  let result = text;
  const { traits } = voice;

  if (traits.uses_bullets && !result.includes('→')) {
    result = result.replace(/^([A-Z][^\n]+)$/gm, (line) =>
      line.length > 60 && !line.endsWith(':') ? `→ ${line}` : line,
    );
  }

  if (traits.line_break_style === 'short') {
    result = result
      .split('\n\n')
      .map((para) => {
        if (para.startsWith('→') || para.length < 80) return para;
        return para.replace(/([.!?])\s+/g, '$1\n\n');
      })
      .join('\n\n');
  }

  if (!traits.uses_emoji) {
    result = result.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').replace(/🔥/g, '');
  }

  return result.replace(/\n{3,}/g, '\n\n').trim();
}

function decodeJsonString(raw: string): string {
  return decodeHtml(JSON.parse(`"${raw}"`));
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
