import { Command } from 'commander';

export function registerMcpCommand(program: Command): void {
  program
    .command('mcp')
    .description('Start MCP server — agent tools (no login) + LinkedIn API (optional login)')
    .addHelpText(
      'after',
      `
Agent tools work WITHOUT login: agent_run, agent_plan_week, agent_drafts, agent_audit, etc.

Add to your MCP config (Claude Code, Copilot, Windsurf, etc.):

  {
    "mcpServers": {
      "linkedin-agent": {
        "command": "linkedin",
        "args": ["mcp"]
      }
    }
  }

From repo:

  {
    "mcpServers": {
      "linkedin-agent": {
        "command": "node",
        "args": ["/path/to/linkedin-content-agent/dist/index.js", "mcp"]
      }
    }
  }

Optional — enables voice scan by username + LinkedIn API tools:

  "env": {
    "LINKEDIN_LI_AT": "your_li_at_cookie",
    "LINKEDIN_JSESSIONID": "your_jsessionid_cookie"
  }
`,
    )
    .action(async () => {
      const { startMcpServer } = await import('../../mcp/server.js');
      await startMcpServer();
    });
}
