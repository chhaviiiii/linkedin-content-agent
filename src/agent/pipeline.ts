import type { LinkedInClient } from '../core/types.js';
import { pickHookFormula, getHookFormulaById } from './hook-formulas.js';
import { humanize } from './humanizer.js';
import { auditPost } from './post-audit.js';
import { writePost, writeToolkitPost, writePersonalPost, isPersonalTopic } from './post-writer.js';
import { scoutTrends, pickBestTopic, type ScoutOptions } from './trend-scout.js';
import { buildCarousel, buildVideoScript, mediaNotes } from './media-builder.js';
import { saveDraft, generateDraftId } from './drafts.js';
import { generateCarouselImages, generateCoverOnly } from './image-generator.js';
import { attachUserPhoto, buildImageIdea } from './image-ideas.js';
import { loadVoiceProfile, applyVoice } from './voice.js';
import type { ContentDraft, EngagementGoal, PostFormat } from './types.js';

export interface PipelineOptions {
  goal?: EngagementGoal;
  topic?: string;
  keywords?: string;
  niche?: string;
  platform?: ScoutOptions['platform'];
  hook_id?: number;
  text?: string;
  format?: PostFormat;
  photo?: string;
  voice_username?: string;
  client?: LinkedInClient;
  skip_images?: boolean;
}

export interface PipelineResult {
  draft: ContentDraft;
  saved_to: string;
}

async function generateImagesForFormat(
  draftId: string,
  format: PostFormat,
  carousel: ContentDraft['carousel'],
  themeKey: string,
  skip: boolean,
): Promise<string[]> {
  if (skip || format === 'text') return [];
  if (format === 'single') {
    return generateCoverOnly(draftId, carousel[0]!, themeKey);
  }
  return generateCarouselImages(draftId, carousel, themeKey);
}

export async function runPipeline(options: PipelineOptions = {}): Promise<PipelineResult> {
  const goal = options.goal ?? 'saves';

  const topics = await scoutTrends(
    {
      platform: options.platform ?? 'all',
      keywords: options.keywords ?? options.topic,
      niche: options.niche,
      limit: 5,
    },
    options.client,
  );

  let topic = pickBestTopic(topics);
  if (options.topic) {
    const match = topics.find((t) =>
      t.title.toLowerCase().includes(options.topic!.toLowerCase()) ||
      t.keywords.some((k) => k.toLowerCase().includes(options.topic!.toLowerCase())),
    );
    if (match) topic = match;
    else {
      topic = {
        title: options.topic,
        angle: options.topic,
        platform: 'linkedin',
        keywords: options.topic.split(/\s+/).filter((w) => w.length > 2),
        score: 80,
        source: 'manual',
      };
    }
  }

  const userProvidedText = Boolean(options.text?.trim());
  const formula = userProvidedText
    ? getHookFormulaById(1) ?? pickHookFormula(goal)
    : options.hook_id
      ? getHookFormulaById(options.hook_id) ?? pickHookFormula(goal)
      : pickHookFormula(goal);

  let rawText: string;
  if (options.text) {
    rawText = options.text.trim();
  } else if (topic.title.toLowerCase().includes('ai content')) {
    rawText = writeToolkitPost(goal);
  } else if (isPersonalTopic(topic)) {
    rawText = writePersonalPost(topic, goal);
  } else {
    rawText = writePost({ topic, formula, goal });
  }

  const isToolkitTemplate = !userProvidedText && topic.title.toLowerCase().includes('ai content');
  let humanizedText = userProvidedText
    ? rawText
    : isToolkitTemplate
      ? rawText
      : humanize(rawText).text;

  const voice = options.voice_username
    ? await loadVoiceProfile(options.voice_username)
    : await loadVoiceProfile();
  if (voice && !userProvidedText) {
    humanizedText = applyVoice(humanizedText, voice);
  }

  const audit = auditPost(humanizedText);

  const carousel = buildCarousel(humanizedText, topic, goal);
  const video = buildVideoScript(topic, humanizedText);

  const draftId = generateDraftId();
  const idea = buildImageIdea(humanizedText, topic, goal, options.format, draftId);

  let userPhoto: string | undefined;
  if (options.photo) {
    userPhoto = await attachUserPhoto(draftId, options.photo);
    idea.photo_suggestions.unshift(`Your photo attached: ${userPhoto}`);
  }

  const images = await generateImagesForFormat(
    draftId,
    idea.format,
    carousel,
    topic.title,
    options.skip_images ?? false,
  );

  const draft: ContentDraft = {
    id: draftId,
    created_at: new Date().toISOString(),
    topic,
    goal,
    hook_formula: formula,
    raw_text: rawText,
    humanized_text: humanizedText,
    audit,
    carousel,
    video,
    media_notes: mediaNotes(idea.format),
    images,
    format: idea.format,
    image_idea: {
      why: idea.why,
      photo_suggestions: idea.photo_suggestions,
      fallback: idea.fallback,
      user_photo: userPhoto,
      publish_command: idea.publish_command,
    },
    status: 'draft',
  };

  const saved = await saveDraft(draft);
  return { draft, saved_to: saved.markdown };
}
