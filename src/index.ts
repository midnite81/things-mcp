#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ThingsService } from './services/things.js';
import { handleListToday, listTodaySchema } from './tools/listToday.js';
import { handleListInbox, listInboxSchema } from './tools/listInbox.js';
import { handleListUpcoming, listUpcomingSchema } from './tools/listUpcoming.js';
import { handleListProjects, listProjectsSchema } from './tools/listProjects.js';
import { handleSearch, searchSchema } from './tools/search.js';
import { handleCreateTodo, createTodoSchema } from './tools/createTodo.js';
import { handleUpdateTodo, updateTodoSchema } from './tools/updateTodo.js';
import { handleCompleteTodo, completeTodoSchema } from './tools/completeTodo.js';
import { ThingsError } from './lib/errors.js';
import { zodToJsonSchema } from './lib/schemaHelper.js';

export function createServer(service: ThingsService = new ThingsService()) {
  const server = new Server(
    {
      name: 'things-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'things_list_today',
          description: 'Return incomplete Things tasks from the Today list.',
          inputSchema: zodToJsonSchema(listTodaySchema),
        },
        {
          name: 'things_list_inbox',
          description: 'Return incomplete Things tasks from the Inbox.',
          inputSchema: zodToJsonSchema(listInboxSchema),
        },
        {
          name: 'things_list_upcoming',
          description: 'Return upcoming scheduled Things tasks with an optional day limit.',
          inputSchema: zodToJsonSchema(listUpcomingSchema),
        },
        {
          name: 'things_list_projects',
          description: 'Return Things projects and their metadata (ID, name, area, status).',
          inputSchema: zodToJsonSchema(listProjectsSchema),
        },
        {
          name: 'things_search',
          description: 'Search Things items (tasks and projects) by text.',
          inputSchema: zodToJsonSchema(searchSchema),
        },
        {
          name: 'things_create_todo',
          description: 'Create a new Things task with title, notes, when, deadline, project/area, tags, and checklist.',
          inputSchema: zodToJsonSchema(createTodoSchema),
        },
        {
          name: 'things_update_todo',
          description: 'Update an existing Things task by its unique ID.',
          inputSchema: zodToJsonSchema(updateTodoSchema),
        },
        {
          name: 'things_complete_todo',
          description: 'Mark a Things task as completed by its unique ID.',
          inputSchema: zodToJsonSchema(completeTodoSchema),
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'things_list_today':
          return await handleListToday(service, args);
        case 'things_list_inbox':
          return await handleListInbox(service, args);
        case 'things_list_upcoming':
          return await handleListUpcoming(service, args);
        case 'things_list_projects':
          return await handleListProjects(service, args);
        case 'things_search':
          return await handleSearch(service, args);
        case 'things_create_todo':
          return await handleCreateTodo(service, args);
        case 'things_update_todo':
          return await handleUpdateTodo(service, args);
        case 'things_complete_todo':
          return await handleCompleteTodo(service, args);
        default:
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: `Unknown tool: ${name}` }),
              },
            ],
            isError: true,
          };
      }
    } catch (error: any) {
      console.error(`[things-mcp] Error in tool ${name}:`, error);

      const errorMessage =
        error instanceof ThingsError
          ? error.message
          : error?.message || 'An unexpected error occurred while communicating with Things.';

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: errorMessage,
              code: error?.code || 'ERROR',
            }),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

async function main() {
  const service = new ThingsService();
  const server = createServer(service);
  const transport = new StdioServerTransport();

  process.on('uncaughtException', (err) => {
    console.error('[things-mcp] Uncaught exception:', err);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[things-mcp] Unhandled rejection:', reason);
  });

  await server.connect(transport);
  console.error('[things-mcp] Things MCP server running on stdio');
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  main().catch((err) => {
    console.error('[things-mcp] Fatal error:', err);
    process.exit(1);
  });
}
