# LinkedIn Content Agent

Plan, write, audit, and image-gen LinkedIn posts from your terminal. **No login required** for drafting.

```
Voice scan → Scout trends → Write → Humanize → Audit → Images → Draft → You approve → Publish
```

## Browser logout (important)

**LinkedIn logs your browser out when the same cookies are used in this CLI.** There is no reliable fix — it's how LinkedIn treats shared sessions.

**Recommended workflow:**

| Task | Login needed? |
|------|----------------|
| Draft posts, images, audit, plan week | No |
| Voice from profile URL (`--url`) | No |
| Voice from pasted text (`--from-file`) | No |
| Publish a post | Yes — login right before, expect browser logout |

```bash
# Daily content work — never login
linkedin agent run --topic "..." --pretty
linkedin agent voice --url https://linkedin.com/in/YOUR_USERNAME
```

`linkedin login` skips the verification API call by default (safer). Use `linkedin login --verify` only if you need to confirm cookies work.

## Install

```bash
git clone https://github.com/chhaviiiii/linkedin-content-agent.git
cd linkedin-content-agent
npm install && npm run build
npm link   # optional
```

## Quick start

```bash
# Profile URL is enough — no login
linkedin agent voice --url https://linkedin.com/in/YOUR_USERNAME

# If LinkedIn blocks the fetch (common):
cp my-posts.example.txt my-posts.txt
# paste your About section, then:
linkedin agent voice --url https://linkedin.com/in/YOUR_USERNAME --from-file ./my-posts.txt

# Plan your week
linkedin agent plan --niche "your niche" --pretty

# Create one draft
linkedin agent run --topic "AI content" --voice YOUR_USERNAME --pretty

# Generate the full week
linkedin agent plan --niche "your niche" --create --voice YOUR_USERNAME --pretty
```

## Agent commands

| Command | Login? | What it does |
|---------|--------|--------------|
| `agent voice` | No | Learn voice from profile URL: About, bullets, projects |
| `agent plan` | No | 7-day plan (`--create` to draft all) |
| `agent run` | No | Full pipeline → draft + images |
| `agent scout` | No | Trend topics |
| `agent humanize` | No | Strip AI fingerprints |
| `agent audit` | No | 2026 algo score |
| `agent drafts` / `show` | No | Review saved drafts (`post.md` = copy-paste + hashtags) |
| `agent images` | No | Regenerate images |

\* LinkedIn often blocks automated fetches (authwall). `--from-file` with your About section always works offline.

### What the profile URL gives you (no login)

| From URL | Not from URL |
|----------|----------------|
| About section | Post feed / activity |
| Headline | Comments |
| Experience bullets | DMs |
| Project descriptions | |

### Flags

```bash
linkedin agent voice --url https://linkedin.com/in/YOUR_USERNAME
linkedin agent run --topic "..." --goal saves --format carousel --voice YOUR_USERNAME
linkedin agent run --from-file ./my-post.txt --goal comments --format single
linkedin agent export --all
```

## MCP (for coding agents)

```json
{
  "mcpServers": {
    "linkedin-agent": {
      "command": "linkedin",
      "args": ["mcp"]
    }
  }
}
```

**Agent tools (no login):** `agent_run`, `agent_plan_week`, `agent_voice_scan`, `agent_drafts`, `agent_show`, `agent_audit`, `agent_humanize`, `agent_scout`

Read **[AGENTS.md](AGENTS.md)** for the full agent workflow.

## Publish (optional)

```bash
linkedin login
linkedin posts create --text "..." --image ~/.linkedin-cli/drafts/<id>/images/cover.png
```

See [docs/publish.md](docs/publish.md). LinkedIn API reference: [docs/LINKEDIN-API.md](docs/LINKEDIN-API.md).

MIT License.
