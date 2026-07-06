import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { output, outputError } from '../../core/output.js';
import type { GlobalOptions } from '../../core/types.js';
import { runPipeline } from '../../agent/pipeline.js';
import { scoutTrends } from '../../agent/trend-scout.js';
import { humanize } from '../../agent/humanizer.js';
import { auditPost } from '../../agent/post-audit.js';
import { extractHook } from '../../agent/hook-extractor.js';
import { listDrafts, loadDraft, saveDraft } from '../../agent/drafts.js';
import { HOOK_FORMULAS } from '../../agent/hook-formulas.js';
import { regenerateImagesForDraft, generateCoverOnly } from '../../agent/image-generator.js';
import { buildCarousel } from '../../agent/media-builder.js';
import { attachUserPhoto, buildImageIdea } from '../../agent/image-ideas.js';
import type { EngagementGoal, Platform, PostFormat } from '../../agent/types.js';

function liveClient(globalOpts: GlobalOptions, useLive: boolean) {
  if (!useLive) return Promise.resolve(undefined);
  return import('../../core/auth.js')
    .then(({ resolveAuth }) => resolveAuth({ liAt: globalOpts.liAt, jsessionid: globalOpts.jsessionid }))
    .then((auth) => import('../../core/client.js').then(({ createClient }) => createClient(auth)))
    .catch(() => undefined);
}

export function registerAgentCommands(program: Command): void {
  const agent = program
    .command('agent')
    .description('Content agent — draft posts, images, audit (no login required; never auto-publishes)');

  agent
    .command('run')
    .description('Full pipeline: scout → write → humanize → audit → images → save draft')
    .option('-g, --goal <goal>', 'Engagement goal: comments, saves, reach, profile_visits', 'saves')
    .option('-t, --topic <topic>', 'Topic override (auto-picks from trends if omitted)')
    .option('--text <text>', 'Use your own post text instead of auto-generating')
    .option('-f, --from-file <path>', 'Read post text from a file')
    .option('-k, --keywords <keywords>', 'Keywords for trend scouting')
    .option('--niche <niche>', 'Your niche for topic scoring (e.g. "SWE intern ML")')
    .option('-p, --platform <platform>', 'Platform filter: linkedin, x, tiktok, all', 'all')
    .option('--hook-id <id>', 'Force a specific hook formula (1-16)', (v) => parseInt(v, 10))
    .option('--no-images', 'Skip PNG generation')
    .option('--format <format>', 'Post format: carousel, single, text, or auto (default: auto)')
    .option('--photo <path>', 'Attach your own photo (best for personal posts)')
    .option('--live', 'Opt in to live LinkedIn trend search (requires login)')
    .action(async function (this: Command) {
      const opts = this.opts() as Record<string, string | number | boolean | undefined>;
      const globalOpts = this.optsWithGlobals() as GlobalOptions;
      try {
        let text = opts.text as string | undefined;
        if (opts.fromFile) {
          text = await readFile(opts.fromFile as string, 'utf-8');
        }

        const formatOpt = opts.format as string | undefined;
        const format = formatOpt && formatOpt !== 'auto'
          ? formatOpt as PostFormat
          : undefined;

        const client = await liveClient(globalOpts, Boolean(opts.live));
        const result = await runPipeline({
          goal: (opts.goal as EngagementGoal) ?? 'saves',
          topic: opts.topic as string | undefined,
          keywords: opts.keywords as string | undefined,
          niche: opts.niche as string | undefined,
          platform: opts.platform as Platform,
          hook_id: opts.hookId as number | undefined,
          text,
          format,
          photo: opts.photo as string | undefined,
          client,
          skip_images: opts.noImages as boolean | undefined,
        });
        output({
          message: 'Draft created (not published)',
          id: result.draft.id,
          saved_to: result.saved_to,
          topic: result.draft.topic.title,
          goal: result.draft.goal,
          format: result.draft.format,
          image_idea: result.draft.image_idea,
          hook: result.draft.hook_formula.name,
          audit_score: result.draft.audit.score,
          audit_passed: result.draft.audit.passed,
          post: result.draft.humanized_text,
          carousel_slides: result.draft.format === 'carousel' ? result.draft.carousel.length : 0,
          images: result.draft.images,
          cover_image: result.draft.images.find((p) => p.endsWith('cover.png')),
          video_duration_sec: result.draft.video.duration_sec,
        }, globalOpts);
      } catch (error) {
        outputError(error, globalOpts);
      }
    });

  agent
    .command('scout')
    .description('Find trending topics (curated by default; no login required)')
    .option('-k, --keywords <keywords>', 'Search keywords')
    .option('-p, --platform <platform>', 'linkedin, x, tiktok, all', 'all')
    .option('--niche <niche>', 'Your niche for scoring')
    .option('-l, --limit <number>', 'Max topics', (v) => parseInt(v, 10), 5)
    .option('--live', 'Opt in to live LinkedIn search (requires login)')
    .action(async function (this: Command) {
      const opts = this.opts() as Record<string, string | number | boolean | undefined>;
      const globalOpts = this.optsWithGlobals() as GlobalOptions;
      try {
        const client = await liveClient(globalOpts, Boolean(opts.live));
        const topics = await scoutTrends(
          {
            keywords: opts.keywords as string | undefined,
            platform: opts.platform as Platform,
            niche: opts.niche as string | undefined,
            limit: (opts.limit as number) ?? 5,
          },
          client,
        );
        output({ topics }, globalOpts);
      } catch (error) {
        outputError(error, globalOpts);
      }
    });

  agent
    .command('humanize')
    .description('Strip AI fingerprints from draft text')
    .requiredOption('-t, --text <text>', 'Text to humanize')
    .action(async function (this: Command) {
      const opts = this.opts() as { text: string };
      const globalOpts = this.optsWithGlobals() as GlobalOptions;
      try {
        const result = humanize(opts.text);
        output(result, globalOpts);
      } catch (error) {
        outputError(error, globalOpts);
      }
    });

  agent
    .command('audit')
    .description('Score a draft against 2026 LinkedIn algorithm rules')
    .option('-t, --text <text>', 'Text to audit')
    .option('-f, --file <path>', 'Read text from file')
    .action(async function (this: Command) {
      const opts = this.opts() as { text?: string; file?: string };
      const globalOpts = this.optsWithGlobals() as GlobalOptions;
      try {
        let text = opts.text;
        if (opts.file) {
          text = await readFile(opts.file, 'utf-8');
        }
        if (!text) throw new Error('Provide --text or --file');
        output(auditPost(text), globalOpts);
      } catch (error) {
        outputError(error, globalOpts);
      }
    });

  agent
    .command('extract-hook')
    .description('Reverse-engineer the hook formula from a viral post')
    .requiredOption('-t, --text <text>', 'Viral post text')
    .action(async function (this: Command) {
      const opts = this.opts() as { text: string };
      const globalOpts = this.optsWithGlobals() as GlobalOptions;
      try {
        output(extractHook(opts.text), globalOpts);
      } catch (error) {
        outputError(error, globalOpts);
      }
    });

  agent
    .command('hooks')
    .description('List all 16 hook formulas')
    .action(async function (this: Command) {
      const globalOpts = this.optsWithGlobals() as GlobalOptions;
      output({ formulas: HOOK_FORMULAS }, globalOpts);
    });

  agent
    .command('drafts')
    .description('List saved drafts')
    .action(async function (this: Command) {
      const globalOpts = this.optsWithGlobals() as GlobalOptions;
      try {
        const drafts = await listDrafts();
        output({ drafts, dir: '~/.linkedin-cli/drafts/' }, globalOpts);
      } catch (error) {
        outputError(error, globalOpts);
      }
    });

  agent
    .command('show')
    .description('Show a saved draft by ID')
    .argument('<draft-id>', 'Draft ID')
    .action(async function (this: Command, draftId: string) {
      const globalOpts = this.optsWithGlobals() as GlobalOptions;
      try {
        const draft = await loadDraft(draftId);
        if (!draft) throw new Error(`Draft not found: ${draftId}`);
        output(draft, globalOpts);
      } catch (error) {
        outputError(error, globalOpts);
      }
    });

  agent
    .command('images')
    .description('Generate or regenerate carousel PNGs for saved draft(s)')
    .argument('[draft-id]', 'Draft ID (quote if it contains dashes)')
    .option('--id <draft-id>', 'Draft ID (safer than positional when ID has dashes)')
    .option('--all', 'Regenerate images for every saved draft')
    .option('--format <format>', 'Override format: carousel, single, or text')
    .option('--photo <path>', 'Attach your photo to draft(s)')
    .action(async function (this: Command, draftIdArg?: string) {
      const opts = this.opts() as { id?: string; all?: boolean; format?: PostFormat; photo?: string };
      const globalOpts = this.optsWithGlobals() as GlobalOptions;
      try {
        const ids: string[] = [];
        if (opts.all) {
          const drafts = await listDrafts();
          ids.push(...drafts.map((d) => d.id));
        } else {
          const id = opts.id ?? draftIdArg;
          if (!id) throw new Error('Provide a draft ID, --id <draft-id>, or --all');
          ids.push(id);
        }

        const results = [];
        for (const draftId of ids) {
          const draft = await loadDraft(draftId);
          if (!draft) {
            results.push({ id: draftId, error: 'Draft not found' });
            continue;
          }
          draft.carousel = buildCarousel(draft.humanized_text, draft.topic, draft.goal);

          const idea = buildImageIdea(
            draft.humanized_text,
            draft.topic,
            draft.goal,
            opts.format ?? draft.format,
            draft.id,
          );
          draft.format = idea.format;
          draft.image_idea = {
            why: idea.why,
            photo_suggestions: idea.photo_suggestions,
            fallback: idea.fallback,
            user_photo: draft.image_idea?.user_photo,
            publish_command: idea.publish_command,
          };

          if (opts.photo) {
            draft.image_idea.user_photo = await attachUserPhoto(draft.id, opts.photo);
          }

          if (draft.format === 'text') {
            draft.images = [];
          } else if (draft.format === 'single') {
            draft.images = await generateCoverOnly(draft.id, draft.carousel[0]!, draft.topic.title);
          } else {
            draft.images = await regenerateImagesForDraft(draft.id, draft.carousel, draft.topic.title);
          }

          await saveDraft(draft);
          results.push({
            id: draft.id,
            format: draft.format,
            image_idea: draft.image_idea,
            cover_image: draft.images.find((p) => p.endsWith('cover.png') || p.includes('your-photo')),
          });
        }

        output({
          message: opts.all ? `Updated ${results.length} draft(s)` : 'Images updated',
          results,
        }, globalOpts);
      } catch (error) {
        outputError(error, globalOpts);
      }
    });

  agent.addHelpText(
    'after',
    `
Examples:
  $ linkedin agent run --goal saves --topic "AI content"    # no login needed
  $ linkedin agent run --from-file ./my-post.txt
  $ linkedin agent scout --keywords "AI content"            # curated trends, offline
  $ linkedin agent scout --keywords "AI" --live             # live LinkedIn (needs login)
  $ linkedin agent images --all
  $ linkedin agent images --id "draft-2026-07-06T01-22-39-d2be"
  $ linkedin agent images -- draft-2026-07-06T01-22-39-d2be
  $ linkedin agent drafts
  $ linkedin agent show draft-2026-07-06T01-00-00-abc1

No login required for drafting, images, audit, or humanize.
Publishing is separate (optional): linkedin login && linkedin posts create ...
`,
  );
}
