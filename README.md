# linkedincli

Full LinkedIn platform management from your terminal. 43 API commands plus a **content agent** that drafts posts, audits copy, and generates carousel images — no login required for drafting.

Works as a **CLI** and an **MCP server** (for Claude Code, Cursor, Windsurf, and other AI agents).

## Install

```bash
# Install globally
npm install -g @bcharleson/linkedincli

# This installs the `linkedin` command:
linkedin --help

# Or run from source
git clone https://github.com/bcharleson/linkedincli.git
cd linkedincli && npm install && npm run build
node dist/index.js --help
```

> **Note:** The npm package is `@bcharleson/linkedincli` but the CLI command is just **`linkedin`**.

## Content Agent (no login required)

The content agent scouts trends, writes posts, humanizes copy, audits against 2026 algorithm rules, and generates **1080×1080 carousel PNGs**. It never auto-publishes.

```bash
# Full pipeline: topic → draft → audit → 7 slide images + cover
linkedin agent run --topic "AI content" --goal saves --pretty

# Use your own post text
linkedin agent run --from-file ./my-post.txt --pretty

# Individual tools
linkedin agent scout --keywords "content creation" --pretty
linkedin agent humanize --text "I'm thrilled to delve into this robust landscape"
linkedin agent audit --text "Your draft here"
linkedin agent extract-hook --text "Nobody talks about hooks when..."
linkedin agent hooks --pretty

# Review saved drafts
linkedin agent drafts --pretty
linkedin agent show <draft-id> --pretty
linkedin agent images <draft-id>   # regenerate images
```

Drafts save to `~/.linkedin-cli/drafts/<id>/`:
- `draft.json` — post text, audit score, carousel copy, video script
- `images/slide-01.png` … `slide-07.png` — carousel slides
- `images/cover.png` — use for single-image posts

**Optional:** pass `--live` to pull live LinkedIn trend data (requires login). Without `--live`, scouting uses curated cross-platform trends and works fully offline.

```bash
linkedin agent scout --keywords "AI content" --live --pretty
```

## LinkedIn API (login required)

Cookie session auth for profiles, posts, messaging, connections, search, and more.

### 1. Get your cookies

Open LinkedIn in your browser → DevTools (`F12`) → Application → Cookies → `linkedin.com`

Copy:
- **`li_at`** — session token (starts with `AQED...`)
- **`JSESSIONID`** — session ID (starts with `ajax:`)

> **Note:** Using cookies in the CLI may log you out of your browser session. Copy fresh cookies when needed.

### 2. Login

```bash
linkedin login
# Paste li_at and JSESSIONID when prompted
```

Or non-interactively:

```bash
linkedin login --li-at "AQEDxxxxxxx" --jsessionid "ajax:1234567890"
```

### 3. Use it

```bash
linkedin profile me --pretty
linkedin posts create --text "Hello LinkedIn!" --image ./photo.jpg
linkedin search people --keywords "software engineer" --network F --pretty
linkedin messaging conversations --pretty
linkedin feed view --limit 20 --pretty
```

### Publish an agent draft

```bash
linkedin posts create \
  --text "Your post text here" \
  --image ~/.linkedin-cli/drafts/<draft-id>/images/cover.png
```

For carousels, combine the slide PNGs into a PDF (Preview, Canva, etc.) and upload as a LinkedIn document post.

## All Commands

### Agent (no login)

```bash
linkedin agent run [--goal saves] [--topic "..."] [--from-file path] [--no-images] [--live]
linkedin agent scout [--keywords "..."] [--platform linkedin|x|tiktok|all] [--live]
linkedin agent humanize --text "..."
linkedin agent audit [--text "..."] [--file path]
linkedin agent extract-hook --text "..."
linkedin agent hooks
linkedin agent drafts
linkedin agent show <draft-id>
linkedin agent images <draft-id>
```

### Profile (9 commands)

```bash
linkedin profile me
linkedin profile view <public-id>
linkedin profile contact-info <public-id>
linkedin profile skills <public-id> --limit 50
linkedin profile network <public-id>
linkedin profile badges <public-id>
linkedin profile privacy <public-id>
linkedin profile posts <urn-id> --limit 20
linkedin profile disconnect <public-id>
```

### Posts (3 commands)

```bash
linkedin posts create --text "My post"
linkedin posts create --text "With image" --image ./pic.jpg
linkedin posts create --text "Inner circle" --visibility connections
linkedin posts edit <share-urn> --text "Updated text"
linkedin posts delete <share-urn>
```

### Feed (3 commands)

```bash
linkedin feed view
linkedin feed view --limit 50
linkedin feed user <profile-id> --limit 20
linkedin feed company <company-name> --limit 20
```

### Engagement (5 commands)

```bash
linkedin engage react <post-urn> --type LIKE
linkedin engage react <post-urn> --type PRAISE
linkedin engage react <post-urn> --type EMPATHY
linkedin engage react <post-urn> --type INTEREST
linkedin engage react <post-urn> --type ENTERTAINMENT
linkedin engage react <post-urn> --type APPRECIATION
linkedin engage comment <post-urn> --text "Great post!"
linkedin engage comments-list <post-urn> --limit 20
linkedin engage reactions <post-urn> --limit 20
linkedin engage share <share-urn> --text "Worth reading"
```

### Connections (7 commands)

```bash
linkedin connections send <profile-urn>
linkedin connections send <profile-urn> -m "Let's connect!"
linkedin connections received --limit 50
linkedin connections sent --limit 50
linkedin connections accept <id> --secret <secret>
linkedin connections reject <id> --secret <secret>
linkedin connections withdraw <id>
linkedin connections remove <public-id>
```

### Messaging (6 commands)

```bash
linkedin messaging conversations
linkedin messaging conversation-with <profile-urn>
linkedin messaging messages <conversation-id>
linkedin messaging send <conversation-id> -t "Hello!"
linkedin messaging send-new -r <urn1>,<urn2> -t "Hi!"
linkedin messaging mark-read <conversation-id>
```

### Search (4 commands)

```bash
linkedin search people --keywords "CTO" --network F
linkedin search people --keywords "engineer" --company 1035
linkedin search companies --keywords "AI startups" --limit 25
linkedin search jobs --keywords "engineer" --remote --experience 4
linkedin search posts --keywords "AI trends" --limit 25
```

### Companies (3 commands)

```bash
linkedin companies view <company-name>
linkedin companies follow <following-state-urn>
linkedin companies unfollow <entity-urn>
```

### Jobs (2 commands)

```bash
linkedin jobs view <job-id>
linkedin jobs skills <job-id>
```

### Analytics (1 command)

```bash
linkedin analytics profile-views
```

## Global Options

| Flag | Description |
|------|-------------|
| `--li-at <cookie>` | Override li_at cookie |
| `--jsessionid <cookie>` | Override JSESSIONID cookie |
| `--output pretty` | Pretty-printed JSON |
| `--pretty` | Shorthand for `--output pretty` |
| `--quiet` | No output, exit codes only |
| `--fields <list>` | Comma-separated fields to include |
| `--limit <n>` | Result count (replaces deprecated `--count`) |

## Environment Variables

```bash
export LINKEDIN_LI_AT="your_li_at_cookie"
export LINKEDIN_JSESSIONID="your_jsessionid_cookie"
```

Auth resolution order: `--li-at`/`--jsessionid` flags → env vars → `~/.linkedin-cli/config.json`

## MCP Server (AI Agents)

LinkedIn API commands are available as MCP tools. The content agent runs via CLI (`linkedin agent`).

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "linkedin",
      "args": ["mcp"],
      "env": {
        "LINKEDIN_LI_AT": "your_li_at_cookie",
        "LINKEDIN_JSESSIONID": "your_jsessionid_cookie"
      }
    }
  }
}
```

Or with `npx`:

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "npx",
      "args": ["-y", "@bcharleson/linkedincli", "mcp"]
    }
  }
}
```

## Cookie Expiration

LinkedIn `li_at` cookies expire periodically. When your session expires:

```bash
linkedin status --verify
linkedin login
```

## Disclaimer

This tool uses LinkedIn's internal Voyager API via cookie session authentication. It is not affiliated with or endorsed by LinkedIn. Use responsibly and in compliance with LinkedIn's terms of service. The authors are not responsible for any account restrictions that may result from automated usage.

## License

MIT
