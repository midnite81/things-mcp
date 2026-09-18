import { z } from 'zod';
import { ThingsService } from '../services/things.js';

const idSchema = z.object({ id: z.string().min(1, 'ID is required').describe('Stable Things ID') });

export const cancelTodoSchema = idSchema;
export const reopenTodoSchema = idSchema;
export const deleteTodoSchema = idSchema;
export const deleteListSchema = idSchema;

export const listTodosSchema = z
  .object({
    source: z.enum(['all', 'logbook', 'trash']).optional().describe('Task collection to inspect; defaults to all'),
    listGroup: z.string().min(1).optional().describe('Restrict to a List Group name or ID'),
    tag: z.string().min(1).optional().describe('Restrict to a tag name or ID'),
    status: z.enum(['open', 'completed', 'canceled']).optional().describe('Optional lifecycle status filter'),
  })
  .refine(({ listGroup, tag }) => !(listGroup && tag), 'Use either listGroup or tag, not both.');

export const moveTodoSchema = z
  .object({
    id: z.string().min(1, 'ID is required').describe('Stable task ID'),
    list: z.string().min(1).optional().describe('Destination list name or ID'),
    listGroup: z.string().min(1).optional().describe('Destination List Group name or ID'),
    builtInList: z.enum(['Inbox', 'Today', 'Anytime', 'Someday']).optional().describe('Destination built-in list'),
    detachFromParent: z.boolean().optional().describe('Detach the task from its current list or List Group'),
  })
  .refine(({ list, listGroup, builtInList, detachFromParent }) => Number(Boolean(list)) + Number(Boolean(listGroup)) + Number(Boolean(builtInList)) + Number(Boolean(detachFromParent)) === 1, 'Specify exactly one destination.');

export const bulkUpdateTodosSchema = z
  .object({
    ids: z.array(z.string().min(1)).min(1, 'Provide at least one task ID'),
    status: z.enum(['open', 'completed', 'canceled']).optional(),
    list: z.string().min(1).optional(),
    when: z.string().min(1).optional(),
    tags: z.array(z.string()).optional(),
  })
  .refine(({ status, list, when, tags }) => Boolean(status || list || when || tags), 'Provide at least one update operation.');

export const augmentTodoSchema = z
  .object({
    id: z.string().min(1, 'ID is required'),
    prependNotes: z.string().min(1).optional(),
    appendNotes: z.string().min(1).optional(),
    addTags: z.array(z.string()).min(1).optional(),
  })
  .refine(({ prependNotes, appendNotes, addTags }) => Boolean(prependNotes || appendNotes || addTags), 'Provide notes or tags to add.');

const authorisedItemSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  authToken: z.string().min(1, 'Things URL-scheme authorisation token is required'),
  title: z.string().min(1, 'New title is required'),
});
export const duplicateTodoSchema = authorisedItemSchema;
export const duplicateListSchema = authorisedItemSchema;
export const setTodoReminderSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  authToken: z.string().min(1, 'Things URL-scheme authorisation token is required'),
  when: z.string().min(1, 'Reminder date-time is required').describe('Date-time, for example 2026-09-20@14:00'),
});

function text(result: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
}

export async function handleCancelTodo(service: ThingsService, args: unknown) { const { id } = cancelTodoSchema.parse(args); return text(await service.setTodoStatus({ id, status: 'canceled' })); }
export async function handleReopenTodo(service: ThingsService, args: unknown) { const { id } = reopenTodoSchema.parse(args); return text(await service.setTodoStatus({ id, status: 'open' })); }
export async function handleDeleteTodo(service: ThingsService, args: unknown) { return text(await service.deleteTodo(deleteTodoSchema.parse(args))); }
export async function handleDeleteList(service: ThingsService, args: unknown) { return text(await service.deleteList(deleteListSchema.parse(args))); }
export async function handleListTodos(service: ThingsService, args: unknown) { return text(await service.listTodos(listTodosSchema.parse(args || {}))); }
export async function handleMoveTodoAdvanced(service: ThingsService, args: unknown) { return text(await service.moveTodo(moveTodoSchema.parse(args))); }
export async function handleBulkUpdateTodos(service: ThingsService, args: unknown) { return text(await service.bulkUpdateTodos(bulkUpdateTodosSchema.parse(args))); }
export async function handleAugmentTodo(service: ThingsService, args: unknown) { return text(await service.augmentTodo(augmentTodoSchema.parse(args))); }
export async function handleDuplicateTodo(service: ThingsService, args: unknown) { return text(await service.duplicateTodo(duplicateTodoSchema.parse(args))); }
export async function handleDuplicateList(service: ThingsService, args: unknown) { return text(await service.duplicateList(duplicateListSchema.parse(args))); }
export async function handleSetTodoReminder(service: ThingsService, args: unknown) { return text(await service.setTodoReminder(setTodoReminderSchema.parse(args))); }
