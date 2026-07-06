# AGENTS.md — Instructions for AI Coding Agents

This repo is a **LinkedIn content agent** + optional LinkedIn CLI. Your job as an agent: help the user **draft posts**, not auto-publish.

## Golden rules

1. **Never publish without explicit user approval**
2. **No login required** for `linkedin agent` commands
3. Drafts live in `~/.linkedin-cli/drafts/<draft-id>/`
4. Use `--format auto` unless the user specifies carousel/single/text
5. Personal posts → `--format single --photo <path>` when user has a photo

## Workflow

```
1. linkedin agent scout --keywords "..." --pretty     # pick topic
2. linkedin agent run --topic "..." --goal saves     # create draft
3. linkedin agent show <draft-id> --pretty           # review
4. linkedin agent audit --text "..."                 # optional re-check
5. User approves → linkedin posts create ...         # only if user asks
```

## Content agent commands

Run from repo root after `npm run build`:

```bash
node dist/index.js agent run [options]
node dist/index.js agent scout [options]
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
src/mcp/            # MCP server (LinkedIn API tools only)
```

Adding agent features: edit `src/agent/`, register CLI in `src/commands/agent/index.ts`.
