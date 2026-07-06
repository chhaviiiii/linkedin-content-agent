# AGENTS.md — Instructions for AI Coding Agents

This repo is a **LinkedIn content agent** + optional LinkedIn CLI. Your job as an agent: help the user **draft posts**, not auto-publish.

## Golden rules

1. **Never publish without explicit user approval**
2. **No login required** for `linkedin agent` commands
3. Drafts save to `~/.linkedin-cli/drafts/<draft-id>/` as **`post.md`** (copy-paste post + hashtags) and `draft.json` (metadata).
4. Use `--format auto` unless the user specifies carousel/single/text
5. Personal posts → `--format single --photo <path>` when user has a photo

## Workflow

```
1. linkedin agent scout --keywords "..." --pretty     # pick topic
2. linkedin agent run --topic "..." --goal saves     # create draft
3. open ~/.linkedin-cli/drafts/<draft-id>/post.md   # copy-paste into LinkedIn
4. linkedin agent audit --text "..."                 # optional re-check
5. User approves → linkedin posts create ...         # only if user asks
```

## MCP tools (no login required)

When running `linkedin mcp`, these tools are always available:

| Tool | Description |
|------|-------------|
| `agent_run` | Create a draft (never publishes) |
| `agent_plan_week` | Plan 7 days (`create: true` to generate all) |
| `agent_voice_scan` | Learn voice from username or file |
| `agent_voice_active` | Get active voice profile |
| `agent_drafts` | List drafts |
| `agent_show` | Show draft by ID |
| `agent_audit` | Score post text |
| `agent_humanize` | Strip AI tells |
| `agent_scout` | Trend topics |

LinkedIn API tools (`profile_*`, `posts_*`, etc.) load only if `linkedin login` cookies are set.

## Voice workflow

```bash
# Try profile URL (no login)
linkedin agent voice --url https://linkedin.com/in/YOUR_USERNAME

# If LinkedIn blocks the fetch (authwall), paste About into my-posts.txt:
cp my-posts.example.txt my-posts.txt
# edit my-posts.txt, then:
linkedin agent voice --url https://linkedin.com/in/YOUR_USERNAME --from-file ./my-posts.txt
```

For personal posts, write your own text in a file and use `--from-file` (skips auto-generation and voice reshaping).

## Content agent commands

Run from repo root after `npm run build`:

```bash
node dist/index.js agent plan --niche "SWE intern" --create --pretty
node dist/index.js agent voice --url https://linkedin.com/in/YOUR_USERNAME --from-file ./my-posts.txt
node dist/index.js agent run --topic "test" --pretty
node dist/index.js agent humanize --text "..."
node dist/index.js agent audit --text "..." | --file path
node dist/index.js agent extract-hook --text "..."
node dist/index.js agent hooks
node dist/index.js agent drafts
node dist/index.js agent show <draft-id>
node dist/index.js agent images --all | --id <draft-id> [--format carousel|single|text] [--photo path]
```

### `agent run` options

| Flag | Values | Default |
|------|--------|---------|
| `--goal` | comments, saves, reach, profile_visits | saves |
| `--topic` | string | auto from scout |
| `--from-file` | path | — |
| `--format` | carousel, single, text, auto | auto |
| `--photo` | path to user's photo | — |
| `--no-images` | flag | false |
| `--live` | flag (LinkedIn trend search, needs login) | false |

### Format guide

| Post type | Format | Image |
|-----------|--------|-------|
| Product / toolkit / tips | carousel | Generated slides → PDF |
| Personal story / internship | single | User's real photo |
| Hot take / opinion | text or single | Optional candid photo |
| Data / listicle | carousel | Generated slides |

### Draft JSON fields

```json
{
  "id": "draft_20260706012708_abc1",
  "humanized_text": "...",
  "format": "carousel | single | text",
  "audit": { "score": 100, "passed": true },
  "image_idea": {
    "why": "...",
    "photo_suggestions": ["..."],
    "fallback": "..."
  },
  "images": ["/path/to/cover.png"],
  "carousel": [{ "slide": 1, "headline": "...", "body": "..." }]
}
```

## Built-in tools (in pipeline)

| Tool | File | Purpose |
|------|------|---------|
| Trend Scout | `src/agent/trend-scout.ts` | Curated + optional live trends |
| Post Writer | `src/agent/post-writer.ts` | 16 hook formulas |
| Humanizer | `src/agent/humanizer.ts` | Strip AI tells |
| Post Audit | `src/agent/post-audit.ts` | 2026 algo checklist |
| Hook Extractor | `src/agent/hook-extractor.ts` | Reverse-engineer hooks |
| Image Generator | `src/agent/image-generator.ts` | 1080×1080 PNG slides |
| Image Ideas | `src/agent/image-ideas.ts` | Format + photo recommendations |

## Publishing (user-initiated only)

Requires cookies in `~/.linkedin-cli/config.json` via `linkedin login`.

```bash
linkedin posts create --text "..." --image ~/.linkedin-cli/drafts/<id>/images/cover.png
```

See `docs/publish.md`.

## LinkedIn API (secondary)

43 LinkedIn API commands + MCP server. Full reference: `docs/LINKEDIN-API.md`.

Auth: `LINKEDIN_LI_AT` + `LINKEDIN_JSESSIONID` env vars or `linkedin login`.

## Development

```bash
npm install
npm run build
npm test
npm run dev -- agent run --topic "test" --pretty
```

## Architecture

```
src/agent/          # Content agent (single source of truth for drafting)
src/commands/agent/ # CLI registration
src/commands/       # LinkedIn API command groups
src/mcp/            # MCP server (agent tools + optional LinkedIn API tools)
```

Adding agent features: edit `src/agent/`, register CLI in `src/commands/agent/index.ts`.
