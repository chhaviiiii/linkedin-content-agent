# LinkedIn Content Agent

Plan, write, audit, and image-gen LinkedIn posts from your terminal. **No login required** for drafting.

Optional: publish to LinkedIn via cookie auth when you're ready.

```
Scout trends → Write post → Humanize → Audit → Generate images → Save draft → You approve → Publish
```

## Install

```bash
git clone https://github.com/chhaviiiii/linkedin-content-agent.git
cd linkedin-content-agent
npm install && npm run build
npm link   # optional: use `linkedin` globally
```

## Quick start

```bash
# Create a full draft (text + audit + images). Never auto-publishes.
linkedin agent run --topic "AI content" --goal saves --pretty

# Your own post text
linkedin agent run --from-file ./post.txt --format single --photo ./me.jpg --pretty

# List drafts
linkedin agent drafts --pretty
linkedin agent show <draft-id> --pretty
open ~/.linkedin-cli/drafts/<draft-id>/images/
```

## Agent commands

| Command | Login? | What it does |
|---------|--------|--------------|
| `agent run` | No | Full pipeline: topic → draft → audit → images |
| `agent scout` | No* | Trend topics (curated; `--live` needs login) |
| `agent humanize` | No | Strip AI fingerprints |
| `agent audit` | No | Score against 2026 algo rules |
| `agent extract-hook` | No | Reverse-engineer viral hooks |
| `agent hooks` | No | List 16 hook formulas |
| `agent drafts` | No | List saved drafts |
| `agent show <id>` | No | View a draft |
| `agent images` | No | Regenerate images (`--all`, `--format`, `--photo`) |

### Useful flags

```bash
--goal saves|comments|reach|profile_visits
--format carousel|single|text|auto      # auto picks best format
--photo ./your-photo.jpg                # attach your photo (best for personal posts)
--from-file ./post.txt
--no-images
```

### Draft output

```
~/.linkedin-cli/drafts/<draft-id>/
  draft.json          # post text, audit, format, image ideas
  images/
    cover.png         # single-image posts
    slide-01.png …    # carousel posts
    your-photo.jpg    # if you passed --photo
```

## Publish (optional)

Requires `linkedin login` with browser cookies. See [docs/publish.md](docs/publish.md).

```bash
linkedin login
linkedin posts create --text "..." --image ~/.linkedin-cli/drafts/<id>/images/cover.png
```

## For AI agents

Read **[AGENTS.md](AGENTS.md)** — workflow, commands, and conventions for coding agents.

LinkedIn API reference (43 commands): **[docs/LINKEDIN-API.md](docs/LINKEDIN-API.md)**

## MCP server

LinkedIn API tools via MCP (requires cookies). Content agent uses CLI.

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "linkedin",
      "args": ["mcp"]
    }
  }
}
```

## Disclaimer

Not affiliated with LinkedIn. Cookie auth uses LinkedIn's internal API. Use responsibly.

MIT License.
