import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { CarouselSlide } from './types.js';

const SIZE = 1080;
const PAD = 80;
const DRAFTS_DIR = join(homedir(), '.linkedin-cli', 'drafts');
const FONT = 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';

interface Palette {
  primary: string;
  bright: string;
  light: string;
  navy: string;
  navyMid: string;
}

const PALETTES: Palette[] = [
  { primary: '#2563eb', bright: '#3b82f6', light: '#60a5fa', navy: '#0a1628', navyMid: '#132337' },
  { primary: '#7c3aed', bright: '#8b5cf6', light: '#a78bfa', navy: '#1a0a2e', navyMid: '#2d1b4e' },
  { primary: '#059669', bright: '#10b981', light: '#34d399', navy: '#052e1e', navyMid: '#0d3d2a' },
  { primary: '#d97706', bright: '#f59e0b', light: '#fbbf24', navy: '#2a1a05', navyMid: '#3d2808' },
  { primary: '#dc2626', bright: '#ef4444', light: '#f87171', navy: '#2a0a0a', navyMid: '#3d1010' },
  { primary: '#0891b2', bright: '#06b6d4', light: '#22d3ee', navy: '#042f3a', navyMid: '#0a4a5a' },
];

function paletteForKey(key: string): Palette {
  let hash = 0;
  for (const c of key) hash = (hash + c.charCodeAt(0)) % PALETTES.length;
  return PALETTES[hash]!;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) current = next;
    else {
      if (current) lines.push(current);
      current = word.length > maxChars ? `${word.slice(0, maxChars - 1)}…` : word;
    }
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

function tspans(lines: string[], x: number, lineHeight: number): string {
  return lines
    .map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join('\n      ');
}

function resolveKind(slide: CarouselSlide, total: number): string {
  if (slide.kind) return slide.kind;
  if (slide.slide === 1) return 'cover';
  if (slide.slide === total) return 'cta';
  if (slide.headline.toLowerCase().includes('problem')) return 'problem';
  return 'point';
}

function listItemRow(y: number, index: number, text: string, p: Palette): string {
  const label = escapeXml(text);
  return `
  <rect x="${PAD}" y="${y}" width="48" height="48" rx="12" fill="${p.primary}" opacity="0.15"/>
  <text x="${PAD + 24}" y="${y + 32}" text-anchor="middle" font-family="${FONT}" font-size="22" fill="${p.primary}" font-weight="700">${index + 1}</text>
  <text x="${PAD + 68}" y="${y + 32}" font-family="${FONT}" font-size="30" fill="#1e293b" font-weight="600">${label}</text>`;
}

function listSlide(slide: CarouselSlide, total: number, p: Palette): string {
  const items = slide.items ?? wrapText(slide.body, 28, 4);
  const headline = wrapText(slide.headline, 18, 2);
  const startY = 220;
  const rows = items.slice(0, 4).map((item, i) => listItemRow(startY + i * 88, i, item, p)).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${SIZE}" height="${SIZE}" fill="#ffffff"/>
  <rect x="0" y="0" width="${SIZE}" height="12" fill="${p.primary}"/>
  <text x="${PAD}" y="120" font-family="${FONT}" font-size="22" fill="${p.bright}" font-weight="600">${slide.slide} / ${total}</text>
  <text x="${PAD}" y="190" font-family="${FONT}" font-size="52" font-weight="800" fill="#1e293b" letter-spacing="-1">
    ${tspans(headline, PAD, 58)}
  </text>
  ${rows}
  ${progressBar(slide.slide, total, p.bright)}
</svg>`;
}

function stepsSlide(slide: CarouselSlide, total: number, p: Palette): string {
  const items = slide.items ?? [];
  const headline = wrapText(slide.headline, 18, 2);
  const body = slide.body ? wrapText(slide.body, 30, 2) : [];
  const stepW = Math.floor((SIZE - PAD * 2 - 40) / Math.max(items.length, 1));
  const steps = items.slice(0, 3).map((item, i) => {
    const x = PAD + i * (stepW + 20);
    const short = item.length > 22 ? `${item.slice(0, 20)}…` : item;
    return `
  <circle cx="${x + stepW / 2}" cy="380" r="36" fill="${p.primary}"/>
  <text x="${x + stepW / 2}" y="392" text-anchor="middle" font-family="${FONT}" font-size="28" fill="#ffffff" font-weight="700">${i + 1}</text>
  <text x="${x + stepW / 2}" y="460" text-anchor="middle" font-family="${FONT}" font-size="22" fill="#475569" font-weight="600">${escapeXml(short)}</text>
  ${i < items.length - 1 ? `<line x1="${x + stepW + 4}" y1="380" x2="${x + stepW + 16}" y2="380" stroke="${p.light}" stroke-width="3" stroke-dasharray="6 6"/>` : ''}`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="stepsBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#f8fafc"/>
      <stop offset="100%" style="stop-color:#ffffff"/>
    </linearGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#stepsBg)"/>
  <text x="${PAD}" y="120" font-family="${FONT}" font-size="22" fill="${p.bright}" font-weight="600">${slide.slide} / ${total}</text>
  <text x="${PAD}" y="200" font-family="${FONT}" font-size="48" font-weight="800" fill="#1e293b" letter-spacing="-1">
    ${tspans(headline, PAD, 54)}
  </text>
  ${body.length > 0 ? `<text x="${PAD}" y="270" font-family="${FONT}" font-size="28" fill="#64748b">${tspans(body, PAD, 36)}</text>` : ''}
  ${steps}
  ${progressBar(slide.slide, total, p.bright)}
</svg>`;
}

function statSlide(slide: CarouselSlide, total: number, p: Palette): string {
  const stat = slide.stat ?? '—';
  const statSize = stat.length > 5 ? 100 : 140;
  const body = wrapText(slide.body, 28, 3);
  const headline = wrapText(slide.headline, 16, 1);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${SIZE}" height="${SIZE}" fill="${p.navy}"/>
  <circle cx="900" cy="180" r="200" fill="${p.primary}" opacity="0.2"/>
  <text x="${PAD}" y="140" font-family="${FONT}" font-size="22" fill="${p.light}" font-weight="600">${slide.slide} / ${total}</text>
  <text x="${PAD}" y="200" font-family="${FONT}" font-size="24" fill="${p.light}" font-weight="700" letter-spacing="2">${tspans(headline, PAD, 30)}</text>
  <text x="${PAD}" y="480" font-family="${FONT}" font-size="${statSize}" font-weight="800" fill="#ffffff" letter-spacing="-3">${escapeXml(stat)}</text>
  <text x="${PAD}" y="580" font-family="${FONT}" font-size="34" fill="${p.light}" font-weight="400">
    ${tspans(body, PAD, 44)}
  </text>
  ${progressBar(slide.slide, total, p.bright)}
</svg>`;
}

function progressBar(current: number, total: number, color: string): string {
  const barW = SIZE - PAD * 2;
  const fillW = Math.round((current / total) * barW);
  return `
  <rect x="${PAD}" y="${SIZE - 48}" width="${barW}" height="6" rx="3" fill="#64748b" opacity="0.2"/>
  <rect x="${PAD}" y="${SIZE - 48}" width="${fillW}" height="6" rx="3" fill="${color}"/>`;
}

function coverSlide(slide: CarouselSlide, total: number, p: Palette): string {
  const headline = wrapText(slide.headline, 20, 4);
  const badge = slide.badge ?? 'LINKEDIN';
  const badgeW = Math.max(160, badge.length * 11 + 48);
  const statBadge = slide.stat
    ? `<rect x="${SIZE - PAD - 200}" y="${PAD}" width="200" height="72" rx="16" fill="${p.primary}" opacity="0.9"/>
  <text x="${SIZE - PAD - 100}" y="${PAD + 48}" text-anchor="middle" font-family="${FONT}" font-size="36" fill="#ffffff" font-weight="800">${escapeXml(slide.stat)}</text>`
    : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${p.navy}"/>
      <stop offset="100%" style="stop-color:${p.navyMid}"/>
    </linearGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
  <circle cx="920" cy="140" r="160" fill="${p.primary}" opacity="0.18"/>
  <circle cx="120" cy="920" r="100" fill="${p.light}" opacity="0.1"/>
  <rect x="${PAD}" y="${PAD}" width="${badgeW}" height="36" rx="18" fill="${p.primary}" opacity="0.35"/>
  <text x="${PAD + 20}" y="${PAD + 24}" font-family="${FONT}" font-size="17" fill="${p.light}" font-weight="600">${escapeXml(badge)}</text>
  ${statBadge}
  <text x="${PAD}" y="480" font-family="${FONT}" font-size="60" font-weight="800" fill="#ffffff" letter-spacing="-1">
    ${tspans(headline, PAD, 70)}
  </text>
  <g transform="translate(${PAD}, 860)">
    <text font-family="${FONT}" font-size="26" fill="${p.light}" font-weight="700">Swipe</text>
    <path d="M110 0 L150 0 L135 -12 M150 0 L135 12" stroke="${p.light}" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>
  ${progressBar(1, total, p.bright)}
</svg>`;
}

function problemSlide(slide: CarouselSlide, total: number, p: Palette): string {
  const stat = slide.stat ?? slide.body.match(/(\d+[\d,.]*[%x]?)/i)?.[1] ?? '—';
  const bodyWithoutStat = slide.body.replace(stat, '').trim();
  const body = wrapText(bodyWithoutStat || slide.body, 36, 5);
  const statSize = stat.length > 4 ? 88 : 120;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${SIZE}" height="${SIZE}" fill="#ffffff"/>
  <rect x="${PAD}" y="${PAD}" width="56" height="8" rx="4" fill="${p.primary}"/>
  <text x="${PAD}" y="160" font-family="${FONT}" font-size="22" fill="${p.primary}" font-weight="700">THE PROBLEM</text>
  <text x="${PAD}" y="130" font-family="${FONT}" font-size="20" fill="${p.bright}" font-weight="600">2 / ${total}</text>
  <text x="${PAD}" y="360" font-family="${FONT}" font-size="${statSize}" font-weight="800" fill="${p.primary}" letter-spacing="-2">${escapeXml(stat)}</text>
  <text x="${PAD}" y="460" font-family="${FONT}" font-size="34" fill="#475569" font-weight="400">
    ${tspans(body, PAD, 46)}
  </text>
  ${progressBar(2, total, p.bright)}
</svg>`;
}

function pointSlide(slide: CarouselSlide, total: number, p: Palette): string {
  const hasBody = slide.body.trim().length > 0;
  const body = hasBody ? wrapText(slide.body, 24, 4) : [];
  const headlineSize = hasBody ? 48 : 56;
  const headlineLines = hasBody ? 3 : 4;
  const num = slide.slide;
  const toolNum = slide.stat;
  const bg = num % 2 === 0 ? '#f8fafc' : '#ffffff';
  const numLabel = toolNum
    ? `<text x="${PAD + 28}" y="130" text-anchor="middle" font-family="${FONT}" font-size="22" fill="#ffffff" font-weight="700">${escapeXml(toolNum)}</text>`
    : `<text x="${PAD + 28}" y="130" text-anchor="middle" font-family="${FONT}" font-size="28" fill="#ffffff" font-weight="700">${num}</text>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${SIZE}" height="${SIZE}" fill="${bg}"/>
  <rect x="0" y="0" width="${SIZE}" height="12" fill="${p.primary}"/>
  <circle cx="${PAD + 28}" cy="120" r="28" fill="${p.primary}"/>
  ${numLabel}
  <text x="${PAD}" y="200" font-family="${FONT}" font-size="22" fill="${p.bright}" font-weight="600">${num} / ${total}</text>
  <text x="${PAD}" y="${hasBody ? 300 : 360}" font-family="${FONT}" font-size="${headlineSize}" font-weight="800" fill="#1e293b" letter-spacing="-1">
    ${tspans(wrapText(slide.headline, hasBody ? 22 : 18, headlineLines), PAD, headlineSize + 6)}
  </text>
  ${hasBody ? `<text x="${PAD}" y="440" font-family="${FONT}" font-size="30" fill="#64748b" font-weight="400">
    ${tspans(body, PAD, 40)}
  </text>` : ''}
  <rect x="${SIZE - 120}" y="140" width="40" height="120" rx="8" fill="${p.primary}" opacity="0.1"/>
  <rect x="${SIZE - 100}" y="160" width="40" height="80" rx="8" fill="${p.primary}" opacity="0.18"/>
  ${progressBar(num, total, p.bright)}
</svg>`;
}

function ctaSlide(slide: CarouselSlide, total: number, p: Palette): string {
  const btnLabel = wrapText(slide.body, 20, 1)[0]?.slice(0, 28) ?? 'Save this';
  const btnW = Math.min(520, Math.max(280, btnLabel.length * 14 + 48));
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ctaBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${p.navyMid}"/>
      <stop offset="100%" style="stop-color:${p.primary}"/>
    </linearGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#ctaBg)"/>
  <text x="${PAD}" y="200" font-family="${FONT}" font-size="22" fill="${p.light}" font-weight="600">${total} / ${total}</text>
  <text x="${PAD}" y="380" font-family="${FONT}" font-size="60" font-weight="800" fill="#ffffff" letter-spacing="-1">
    ${tspans(wrapText(slide.headline, 18, 2), PAD, 70)}
  </text>
  <text x="${PAD}" y="520" font-family="${FONT}" font-size="30" fill="${p.light}" font-weight="400">
    ${tspans(wrapText(slide.body, 34, 3), PAD, 42)}
  </text>
  <rect x="${PAD}" y="700" width="${btnW}" height="72" rx="16" fill="#ffffff"/>
  <text x="${PAD + btnW / 2}" y="748" text-anchor="middle" font-family="${FONT}" font-size="24" fill="${p.primary}" font-weight="700">${escapeXml(btnLabel)}</text>
  ${progressBar(total, total, p.light)}
</svg>`;
}

function slideSvg(slide: CarouselSlide, total: number, p: Palette): string {
  const kind = resolveKind(slide, total);
  switch (kind) {
    case 'cover': return coverSlide(slide, total, p);
    case 'problem': return problemSlide(slide, total, p);
    case 'stat': return statSlide(slide, total, p);
    case 'list': return listSlide(slide, total, p);
    case 'steps': return stepsSlide(slide, total, p);
    case 'cta': return ctaSlide(slide, total, p);
    default: return pointSlide(slide, total, p);
  }
}

export async function generateCarouselImages(
  draftId: string,
  slides: CarouselSlide[],
  themeKey?: string,
): Promise<string[]> {
  const p = paletteForKey(themeKey ?? slides[0]?.headline ?? draftId);
  const imageDir = join(DRAFTS_DIR, draftId, 'images');
  await mkdir(imageDir, { recursive: true });

  const paths: string[] = [];
  for (const slide of slides) {
    const svg = slideSvg(slide, slides.length, p);
    const filePath = join(imageDir, `slide-${String(slide.slide).padStart(2, '0')}.png`);
    await sharp(Buffer.from(svg), { density: 144 })
      .resize(SIZE, SIZE)
      .png({ quality: 100, compressionLevel: 6 })
      .toFile(filePath);
    paths.push(filePath);
  }

  const coverPath = join(imageDir, 'cover.png');
  await sharp(paths[0]!).png({ quality: 100 }).toFile(coverPath);
  paths.push(coverPath);
  return paths;
}

export async function generateCoverOnly(
  draftId: string,
  slide: CarouselSlide,
  themeKey?: string,
): Promise<string[]> {
  const p = paletteForKey(themeKey ?? slide.headline ?? draftId);
  const imageDir = join(DRAFTS_DIR, draftId, 'images');
  await mkdir(imageDir, { recursive: true });

  const coverSlide = { ...slide, kind: 'cover' as const, body: slide.body || 'Read more ↓' };
  const svg = slideSvg(coverSlide, 1, p);
  const coverPath = join(imageDir, 'cover.png');
  await sharp(Buffer.from(svg), { density: 144 })
    .resize(SIZE, SIZE)
    .png({ quality: 100 })
    .toFile(coverPath);

  return [coverPath];
}

export async function regenerateImagesForDraft(
  draftId: string,
  slides: CarouselSlide[],
  themeKey?: string,
): Promise<string[]> {
  return generateCarouselImages(draftId, slides, themeKey);
}
