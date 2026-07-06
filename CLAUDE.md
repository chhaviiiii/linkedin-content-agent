# linkedin-content-agent

LinkedIn content agent + optional LinkedIn CLI. See [README.md](README.md) and [AGENTS.md](AGENTS.md).

## Content agent

```
src/agent/          # Pipeline: scout → write → humanize → audit → images
src/commands/agent/ # CLI: linkedin agent run|scout|audit|...
```

## LinkedIn API

```
src/commands/       # profile, posts, feed, messaging, etc.
src/mcp/            # MCP server (agent tools + optional LinkedIn API tools)
src/core/           # HTTP client, auth, config
```

## Commands

```bash
npm run build && npm test
node dist/index.js agent run --topic "AI content" --pretty
```

Agent drafts: `~/.linkedin-cli/drafts/`
