import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { runPipeline } from '../agent/pipeline.js';
import { planWeek } from '../agent/week-planner.js';
import { auditPost } from '../agent/post-audit.js';
import { humanize } from '../agent/humanizer.js';
import { scoutTrends } from '../agent/trend-scout.js';
import { listDrafts, loadDraft } from '../agent/drafts.js';
import { scanVoiceFromUsername, scanVoiceFromFile, saveVoiceProfile, loadVoiceProfile } from '../agent/voice.js';
import type { LinkedInClient } from '../core/types.js';
import type { EngagementGoal, PostFormat } from '../agent/types.js';

function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function err(message: string) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
    isError: true as const,
  };
}

export function registerAgentMcpTools(server: McpServer, client?: LinkedInClient): void {
  server.registerTool(
    'agent_run',
    {
      description: 'Create a LinkedIn post draft (text + audit + images). Never publishes.',
      inputSchema: z.object({
        topic: z.string().optional().describe('Topic override'),
        goal: z.enum(['comments', 'saves', 'reach', 'profile_visits']).default('saves'),
        format: z.enum(['carousel', 'single', 'text', 'auto']).default('auto'),
        niche: z.string().optional(),
        text: z.string().optional().describe('Use your own post text'),
        voice_username: z.string().optional().describe('Apply saved voice profile'),
        skip_images: z.boolean().default(false),
      }).shape,
    },
    async (args) => {
      try {
        const result = await runPipeline({
          topic: args.topic as string | undefined,
          goal: (args.goal as EngagementGoal) ?? 'saves',
          format: args.format === 'auto' ? undefined : (args.format as PostFormat),
          niche: args.niche as string | undefined,
          text: args.text as string | undefined,
          voice_username: args.voice_username as string | undefined,
          skip_images: args.skip_images as boolean,
          client,
        });
        return ok({
          id: result.draft.id,
          format: result.draft.format,
          audit_score: result.draft.audit.score,
          post: result.draft.humanized_text,
          image_idea: result.draft.image_idea,
          images: result.draft.images,
        });
      } catch (e: any) {
        return err(e.message ?? String(e));
      }
    },
  );

  server.registerTool(
    'agent_plan_week',
    {
      description: 'Plan 7 days of LinkedIn posts. Pass create=true to generate all drafts.',
      inputSchema: z.object({
        niche: z.string().optional(),
        keywords: z.string().optional(),
        create: z.boolean().default(false),
        voice_username: z.string().optional(),
      }).shape,
    },
    async (args) => {
      try {
        const plan = await planWeek({
          niche: args.niche as string | undefined,
          keywords: args.keywords as string | undefined,
          create: args.create as boolean,
          voice_username: args.voice_username as string | undefined,
          client,
        });
        return ok(plan);
      } catch (e: any) {
        return err(e.message ?? String(e));
      }
    },
  );

  server.registerTool(
    'agent_voice_scan',
    {
      description: 'Learn voice from LinkedIn profile URL (no login). Reads About, bullets, projects — not post feed.',
      inputSchema: z.object({
        username: z.string().describe('Profile URL or public ID (e.g. https://linkedin.com/in/cnayyar)'),
        from_file: z.string().optional().describe('Path to pasted profile text'),
        with_posts: z.boolean().default(false).describe('Optional post feed (needs login — rarely works)'),
      }).shape,
    },
    async (args) => {
      try {
        if (args.from_file) {
          const profile = await scanVoiceFromFile(args.username as string, args.from_file as string);
          const path = await saveVoiceProfile(profile);
          return ok({ message: 'Voice profile saved', path, profile });
        }
        const profile = await scanVoiceFromUsername(
          args.username as string,
          client,
          { withPosts: args.with_posts as boolean },
        );
        const path = await saveVoiceProfile(profile);
        return ok({ message: 'Voice profile saved', path, profile });
      } catch (e: any) {
        return err(e.message ?? String(e));
      }
    },
  );

  server.registerTool(
    'agent_drafts',
    { description: 'List saved post drafts', inputSchema: z.object({}).shape },
    async () => ok({ drafts: await listDrafts(), dir: '~/.linkedin-cli/drafts/' }),
  );

  server.registerTool(
    'agent_show',
    {
      description: 'Show a saved draft by ID',
      inputSchema: z.object({ draft_id: z.string() }).shape,
    },
    async (args) => {
      const draft = await loadDraft(args.draft_id as string);
      if (!draft) return err(`Draft not found: ${args.draft_id}`);
      return ok(draft);
    },
  );

  server.registerTool(
    'agent_audit',
    {
      description: 'Score post text against 2026 LinkedIn algorithm rules',
      inputSchema: z.object({ text: z.string() }).shape,
    },
    async (args) => ok(auditPost(args.text as string)),
  );

  server.registerTool(
    'agent_humanize',
    {
      description: 'Strip AI fingerprints from post text',
      inputSchema: z.object({ text: z.string() }).shape,
    },
    async (args) => ok(humanize(args.text as string)),
  );

  server.registerTool(
    'agent_scout',
    {
      description: 'Find trending topics (offline curated; live needs login)',
      inputSchema: z.object({
        keywords: z.string().optional(),
        niche: z.string().optional(),
        limit: z.number().default(5),
      }).shape,
    },
    async (args) => ok({
      topics: await scoutTrends(
        {
          keywords: args.keywords as string | undefined,
          niche: args.niche as string | undefined,
          limit: (args.limit as number) ?? 5,
        },
        client,
      ),
    }),
  );

  server.registerTool(
    'agent_voice_active',
    {
      description: 'Get the currently active voice profile',
      inputSchema: z.object({ username: z.string().optional() }).shape,
    },
    async (args) => {
      const profile = await loadVoiceProfile(args.username as string | undefined);
      if (!profile) return err('No voice profile. Run agent_voice_scan first.');
      return ok(profile);
    },
  );
}
