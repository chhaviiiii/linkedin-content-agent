import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { allCommands } from '../commands/index.js';
import { resolveAuth } from '../core/auth.js';
import { createClient } from '../core/client.js';
import { registerAgentMcpTools } from './agent-tools.js';

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({
    name: 'linkedin-content-agent',
    version: '0.2.0',
  });

  // Agent tools — no login required
  let client;
  try {
    const auth = await resolveAuth();
    client = createClient(auth);
    console.error('LinkedIn session found — voice scan + live scout available.');
  } catch {
    console.error('No LinkedIn session — agent tools work offline. Run `linkedin login` for voice scan by username.');
  }

  registerAgentMcpTools(server, client);

  // LinkedIn API tools — only if authenticated
  if (client) {
    for (const cmdDef of allCommands) {
      const shape = cmdDef.inputSchema.shape;

      server.registerTool(
        cmdDef.name,
        {
          description: `[LinkedIn API] ${cmdDef.description}`,
          inputSchema: shape,
        },
        async (args: Record<string, unknown>) => {
          try {
            const result = await cmdDef.handler(args as any, client);
            return {
              content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
            };
          } catch (error: any) {
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({ error: error.message ?? String(error), code: error.code ?? 'UNKNOWN_ERROR' }),
              }],
              isError: true,
            };
          }
        },
      );
    }
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  const apiCount = client ? allCommands.length : 0;
  console.error(`MCP server ready. Agent tools: 9. LinkedIn API tools: ${apiCount}.`);
}
