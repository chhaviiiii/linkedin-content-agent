import { copyFile, mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { homedir } from 'node:os';
import type { EngagementGoal, PostFormat, TrendTopic } from './types.js';

export interface ImageIdea {
  format: PostFormat;
  why: string;
  photo_suggestions: string[];
  fallback: string;
  publish_command?: string;
}

const DRAFTS_DIR = join(homedir(), '.linkedin-cli', 'drafts');

export function suggestFormat(
  text: string,
  topic: TrendTopic,
  goal: EngagementGoal,
): PostFormat {
  const lower = text.toLowerCase();
  const t = topic.title.toLowerCase();

  // Personal stories → single real photo beats carousel
  if (
    /intern|mastercard|ubc|shipped my first|grateful for a team|wish you knew/i.test(text) ||
    topic.source === 'manual' && /internship|career|cs student/i.test(topic.title)
  ) {
    return 'single';
  }

  // Hot takes / opinion → text or single quote card
  if (
    /unpopular opinion|agree or am i wrong|prove me wrong|drop your take/i.test(lower) ||
    goal === 'comments' && !/→/.test(text)
  ) {
    return lower.length < 600 ? 'text' : 'single';
  }

  // Toolkit launch + build recap → carousel
  if (
    t.includes('ai content') ||
    /4 tools|post writer|hook extractor|content toolkit/i.test(lower) ||
    /building in public.*week \d/i.test(lower)
  ) {
    return 'carousel';
  }

  // Data / tips with bullets → carousel
  if ((text.match(/^→/gm) ?? []).length >= 3) {
    return 'carousel';
  }

  // Format tips, how-to → carousel for saves
  if (t.includes('carousel') || t.includes('2.3x') || goal === 'saves') {
    return 'carousel';
  }

  // Default: single image + text
  return 'single';
}

export function buildImageIdea(
  text: string,
  topic: TrendTopic,
  goal: EngagementGoal,
  format?: PostFormat,
  draftId?: string,
  userPhotoPath?: string,
): ImageIdea {
  const resolved = format ?? suggestFormat(text, topic, goal);
  const lower = text.toLowerCase();

  let photo_suggestions: string[] = [];
  let why = '';
  let fallback = 'Use generated cover.png as a bold text card';

  if (/intern|mastercard|shipped|first feature/i.test(lower)) {
    why = 'Personal stories perform best with a real photo of you — not a designed carousel.';
    photo_suggestions = [
      'You at your desk or with your team (candid, not posed)',
      'Screenshot of the feature or PR you shipped (blur sensitive info)',
      'Campus or office backdrop that matches the story',
    ];
    fallback = 'A warm photo of you > any graphic. No carousel.';
  } else if (/unpopular opinion|cs student|leetcode|writing/i.test(lower)) {
    why = 'Opinion posts get more comments as text-only or one simple image.';
    photo_suggestions = [
      'Optional: you studying / at laptop (authentic, not stock)',
      'Or skip the image — let the hook carry the post',
      'If using an image: notebook or whiteboard with one line from the post',
    ];
    fallback = 'Text-only is fine. Or one casual photo + short caption in post body.';
  } else if (/4 tools|post writer|humanizer|toolkit/i.test(lower)) {
    why = 'Product posts need a carousel to explain each tool — highest save rate.';
    photo_suggestions = [
      'Slide 1: generated cover OR screenshot of your tool UI',
      'Slides 2–6: generated tool breakdown slides',
      'Optional: add a photo of you on the final CTA slide for trust',
    ];
    fallback = 'Full 7-slide carousel PDF. Best format for this post.';
  } else if (/carousel|2\.3x|format|reach/i.test(lower)) {
    why = 'Educational tips → carousel drives saves.';
    photo_suggestions = [
      'Generated slides work well for stats and bullet tips',
      'Or: photo of your actual LinkedIn analytics (blur names)',
      'Mix: slide 1 = your face, slides 2–6 = tips',
    ];
    fallback = 'Carousel PDF from generated slides.';
  } else if (/build in public|week \d/i.test(lower)) {
    why = 'Build-in-public recap works as carousel or single screenshot.';
    photo_suggestions = [
      'Screenshot of your draft folder or agent output',
      'Photo of you coding + generated cover as slide 1',
      'Before/after of a post you humanized',
    ];
    fallback = 'Carousel if showing 4+ updates; single screenshot if one milestone.';
  } else if (/em dash|ai tell|leverage|delve/i.test(lower)) {
    why = 'Hot take → single bold image or text-only sparks debate.';
    photo_suggestions = [
      'Screenshot of a post with em dashes circled in red',
      'Side-by-side: AI draft vs humanized draft',
      'Or text-only — the take is strong enough alone',
    ];
    fallback = 'Single comparison image or no image.';
  } else {
    why = 'Single image + text is the safest default for reach without over-designing.';
    photo_suggestions = [
      'A photo related to your headline (work, campus, screen)',
      'Generated cover.png if you have no photo handy',
      'Avoid carousel unless you have 4+ distinct points',
    ];
    fallback = 'Generated cover.png or your own photo.';
  }

  const coverPath = draftId
    ? join(DRAFTS_DIR, draftId, 'images', 'cover.png')
    : undefined;

  const publishParts = ['linkedin posts create --text "..."'];
  if (resolved === 'carousel') {
    publishParts.push('# Upload slide PNGs as PDF document post, or use cover for text+image');
  } else if (resolved === 'single') {
    const img = userPhotoPath ?? coverPath ?? './your-photo.jpg';
    publishParts[0] = `linkedin posts create --text "..." --image ${img}`;
  } else {
    publishParts[0] = 'linkedin posts create --text "..."  # no --image';
  }

  return {
    format: resolved,
    why,
    photo_suggestions,
    fallback,
    publish_command: publishParts.join('\n'),
  };
}

export async function attachUserPhoto(draftId: string, photoPath: string): Promise<string> {
  const ext = extname(photoPath) || '.jpg';
  const destDir = join(DRAFTS_DIR, draftId, 'images');
  await mkdir(destDir, { recursive: true });
  const dest = join(destDir, `your-photo${ext}`);
  await copyFile(photoPath, dest);
  return dest;
}
