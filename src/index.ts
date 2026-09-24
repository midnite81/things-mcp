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
import { handleListGroups, listGroupsSchema } from './tools/listGroups.js';
import { handleSearch, searchSchema } from './tools/search.js';
import { handleCreateTodo, createTodoSchema } from './tools/createTodo.js';
import { handleCreateProject, createProjectSchema } from './tools/createProject.js';
import { handleCreateList, createListSchema } from './tools/createList.js';
import { handleListListItems, listListItemsSchema } from './tools/listListItems.js';
import { handleUpdateList, updateListSchema } from './tools/updateList.js';
import { handleGetTodo, getTodoSchema } from './tools/getTodo.js';
import { handleGetList, getListSchema } from './tools/getList.js';
import {
  handleCompleteList,
  completeListSchema,
  handleCancelList,
  cancelListSchema,
  handleReopenList,
  reopenListSchema,
} from './tools/listLifecycle.js';
import {
  handleCreateListGroup,
  createListGroupSchema,
  handleUpdateListGroup,
  updateListGroupSchema,
  handleDeleteListGroup,
  deleteListGroupSchema,
} from './tools/manageListGroups.js';
import {
  handleListTags,
  listTagsSchema,
  handleCreateTag,
  createTagSchema,
  handleUpdateTag,
  updateTagSchema,
  handleDeleteTag,
  deleteTagSchema,
} from './tools/manageTags.js';
import {
  handleCancelTodo, cancelTodoSchema, handleReopenTodo, reopenTodoSchema, handleDeleteTodo, deleteTodoSchema,
  handleDeleteList, deleteListSchema, handleListTodos, listTodosSchema, handleMoveTodoAdvanced, moveTodoSchema,
  handleBulkUpdateTodos, bulkUpdateTodosSchema, handleAugmentTodo, augmentTodoSchema, handleDuplicateTodo,
  duplicateTodoSchema, handleDuplicateList, duplicateListSchema, handleSetTodoReminder, setTodoReminderSchema,
} from './tools/advancedTodo.js';
import { handleListLists, listListsSchema, handleAugmentList, augmentListSchema, handleRevealItem, revealItemSchema, handleEmptyTrash, emptyTrashSchema } from './tools/additionalManagement.js';
import { handleUpdateTodoChecklist, updateTodoChecklistSchema } from './tools/updateTodoChecklist.js';
import { handleUpdateTodo, updateTodoSchema } from './tools/updateTodo.js';
import { handleCompleteTodo, completeTodoSchema } from './tools/completeTodo.js';
import { ThingsError } from './lib/errors.js';
import { zodToJsonSchema } from './lib/schemaHelper.js';
import { isMainModule } from './lib/isMainModule.js';

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
        { name: 'things_list_lists', description: 'Return lists filtered by source, List Group, tag, or status.', inputSchema: zodToJsonSchema(listListsSchema) },
        {
          name: 'things_list_groups',
          description: 'Look up Things List Groups (called areas by Things) and return their stable IDs.',
          inputSchema: zodToJsonSchema(listGroupsSchema),
        },
        {
          name: 'things_create_list_group',
          description: 'Create a Things List Group (called an area by Things).',
          inputSchema: zodToJsonSchema(createListGroupSchema),
        },
        {
          name: 'things_update_list_group',
          description: 'Rename a Things List Group or replace its tags by stable ID.',
          inputSchema: zodToJsonSchema(updateListGroupSchema),
        },
        {
          name: 'things_delete_list_group',
          description: 'Delete a Things List Group by stable ID. Its child lists are moved to the Trash.',
          inputSchema: zodToJsonSchema(deleteListGroupSchema),
        },
        {
          name: 'things_list_tags',
          description: 'Return all Things tags and their stable IDs.',
          inputSchema: zodToJsonSchema(listTagsSchema),
        },
        {
          name: 'things_create_tag',
          description: 'Create a Things tag.',
          inputSchema: zodToJsonSchema(createTagSchema),
        },
        {
          name: 'things_update_tag',
          description: 'Rename a Things tag by stable ID.',
          inputSchema: zodToJsonSchema(updateTagSchema),
        },
        {
          name: 'things_delete_tag',
          description: 'Move a Things tag to the Trash by stable ID.',
          inputSchema: zodToJsonSchema(deleteTagSchema),
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
          name: 'things_create_project',
          description: 'Create a new Things project with title, notes, when, deadline, area, and tags.',
          inputSchema: zodToJsonSchema(createProjectSchema),
        },
        {
          name: 'things_create_list',
          description: 'Create a Things list under a List Group by name or stable ID, optionally with ordered headings and tasks.',
          inputSchema: zodToJsonSchema(createListSchema),
        },
        {
          name: 'things_list_list_items',
          description: 'Return tasks in a Things list by name or stable ID. Completed and cancelled tasks are excluded by default.',
          inputSchema: zodToJsonSchema(listListItemsSchema),
        },
        {
          name: 'things_update_list',
          description: 'Update an existing Things list by its stable ID, including its List Group, schedule, deadline, notes, or tags.',
          inputSchema: zodToJsonSchema(updateListSchema),
        },
        { name: 'things_augment_list', description: 'Prepend or append list notes, or add tags without replacing existing tags.', inputSchema: zodToJsonSchema(augmentListSchema) },
        {
          name: 'things_get_list',
          description: 'Return a Things list by stable ID.',
          inputSchema: zodToJsonSchema(getListSchema),
        },
        {
          name: 'things_complete_list',
          description: 'Mark a Things list as completed by stable ID.',
          inputSchema: zodToJsonSchema(completeListSchema),
        },
        {
          name: 'things_cancel_list',
          description: 'Mark a Things list as cancelled by stable ID.',
          inputSchema: zodToJsonSchema(cancelListSchema),
        },
        {
          name: 'things_reopen_list',
          description: 'Reopen a completed or cancelled Things list by stable ID.',
          inputSchema: zodToJsonSchema(reopenListSchema),
        },
        { name: 'things_delete_list', description: 'Move a Things list to the Trash by stable ID.', inputSchema: zodToJsonSchema(deleteListSchema) },
        { name: 'things_duplicate_list', description: 'Duplicate a list through Things URLs with an authorisation token and new title.', inputSchema: zodToJsonSchema(duplicateListSchema) },
        {
          name: 'things_update_todo',
          description: 'Update an existing Things task by its unique ID.',
          inputSchema: zodToJsonSchema(updateTodoSchema),
        },
        { name: 'things_cancel_todo', description: 'Mark a Things task as cancelled by stable ID.', inputSchema: zodToJsonSchema(cancelTodoSchema) },
        { name: 'things_reopen_todo', description: 'Reopen a completed or cancelled Things task by stable ID.', inputSchema: zodToJsonSchema(reopenTodoSchema) },
        { name: 'things_delete_todo', description: 'Move a Things task to the Trash by stable ID.', inputSchema: zodToJsonSchema(deleteTodoSchema) },
        { name: 'things_list_todos', description: 'Return tasks from all work, the Logbook, Trash, a List Group, or a tag, with an optional status filter.', inputSchema: zodToJsonSchema(listTodosSchema) },
        {
          name: 'things_get_todo',
          description: 'Return a Things task by stable ID.',
          inputSchema: zodToJsonSchema(getTodoSchema),
        },
        { name: 'things_reveal_item', description: 'Reveal a task or list in the Things app by stable ID.', inputSchema: zodToJsonSchema(revealItemSchema) },
        {
          name: 'things_move_todo',
          description: 'Move a Things task to a list, List Group, built-in list, or detach it from its parent.',
          inputSchema: zodToJsonSchema(moveTodoSchema),
        },
        { name: 'things_bulk_update_todos', description: 'Apply the same status, list, schedule, or replacement tags to multiple Things tasks.', inputSchema: zodToJsonSchema(bulkUpdateTodosSchema) },
        { name: 'things_augment_todo', description: 'Prepend or append task notes, or add tags without replacing existing tags.', inputSchema: zodToJsonSchema(augmentTodoSchema) },
        { name: 'things_duplicate_todo', description: 'Duplicate a task through Things URLs with an authorisation token and new title.', inputSchema: zodToJsonSchema(duplicateTodoSchema) },
        { name: 'things_set_todo_reminder', description: 'Set a date-and-time task reminder through Things URLs with an authorisation token.', inputSchema: zodToJsonSchema(setTodoReminderSchema) },
        {
          name: 'things_update_todo_checklist',
          description: 'Replace, prepend, or append checklist items using a caller-supplied Things URL-scheme authorisation token.',
          inputSchema: zodToJsonSchema(updateTodoChecklistSchema),
        },
        {
          name: 'things_complete_todo',
          description: 'Mark a Things task as completed by its unique ID.',
          inputSchema: zodToJsonSchema(completeTodoSchema),
        },
        { name: 'things_empty_trash', description: 'Permanently empty the Things Trash. Requires confirm: EMPTY_TRASH.', inputSchema: zodToJsonSchema(emptyTrashSchema) },
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
        case 'things_list_lists':
          return await handleListLists(service, args);
        case 'things_list_groups':
          return await handleListGroups(service, args);
        case 'things_create_list_group':
          return await handleCreateListGroup(service, args);
        case 'things_update_list_group':
          return await handleUpdateListGroup(service, args);
        case 'things_delete_list_group':
          return await handleDeleteListGroup(service, args);
        case 'things_list_tags':
          return await handleListTags(service, args);
        case 'things_create_tag':
          return await handleCreateTag(service, args);
        case 'things_update_tag':
          return await handleUpdateTag(service, args);
        case 'things_delete_tag':
          return await handleDeleteTag(service, args);
        case 'things_search':
          return await handleSearch(service, args);
        case 'things_create_todo':
          return await handleCreateTodo(service, args);
        case 'things_create_project':
          return await handleCreateProject(service, args);
        case 'things_create_list':
          return await handleCreateList(service, args);
        case 'things_list_list_items':
          return await handleListListItems(service, args);
        case 'things_update_list':
          return await handleUpdateList(service, args);
        case 'things_augment_list':
          return await handleAugmentList(service, args);
        case 'things_get_list':
          return await handleGetList(service, args);
        case 'things_complete_list':
          return await handleCompleteList(service, args);
        case 'things_cancel_list':
          return await handleCancelList(service, args);
        case 'things_reopen_list':
          return await handleReopenList(service, args);
        case 'things_delete_list':
          return await handleDeleteList(service, args);
        case 'things_duplicate_list':
          return await handleDuplicateList(service, args);
        case 'things_update_todo':
          return await handleUpdateTodo(service, args);
        case 'things_cancel_todo':
          return await handleCancelTodo(service, args);
        case 'things_reopen_todo':
          return await handleReopenTodo(service, args);
        case 'things_delete_todo':
          return await handleDeleteTodo(service, args);
        case 'things_list_todos':
          return await handleListTodos(service, args);
        case 'things_get_todo':
          return await handleGetTodo(service, args);
        case 'things_reveal_item':
          return await handleRevealItem(service, args);
        case 'things_move_todo':
          return await handleMoveTodoAdvanced(service, args);
        case 'things_bulk_update_todos':
          return await handleBulkUpdateTodos(service, args);
        case 'things_augment_todo':
          return await handleAugmentTodo(service, args);
        case 'things_duplicate_todo':
          return await handleDuplicateTodo(service, args);
        case 'things_set_todo_reminder':
          return await handleSetTodoReminder(service, args);
        case 'things_update_todo_checklist':
          return await handleUpdateTodoChecklist(service, args);
        case 'things_complete_todo':
          return await handleCompleteTodo(service, args);
        case 'things_empty_trash':
          return await handleEmptyTrash(service, args);
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

if (isMainModule(import.meta.url)) {
  main().catch((err) => {
    console.error('[things-mcp] Fatal error:', err);
    process.exit(1);
  });
}
