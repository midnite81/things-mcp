import { z } from 'zod';
import { ThingsService } from '../services/things.js';

export const listListsSchema = z.object({
  source: z.enum(['all', 'logbook', 'trash']).optional(),
  listGroup: z.string().min(1).optional(),
  tag: z.string().min(1).optional(),
  status: z.enum(['open', 'completed', 'canceled']).optional(),
}).refine(({ listGroup, tag }) => !(listGroup && tag), 'Use either listGroup or tag, not both.');

export const augmentListSchema = z.object({
  id: z.string().min(1),
  prependNotes: z.string().min(1).optional(),
  appendNotes: z.string().min(1).optional(),
  addTags: z.array(z.string()).min(1).optional(),
}).refine(({ prependNotes, appendNotes, addTags }) => Boolean(prependNotes || appendNotes || addTags), 'Provide notes or tags to add.');

export const revealItemSchema = z.object({ id: z.string().min(1) });
export const emptyTrashSchema = z.object({ confirm: z.literal('EMPTY_TRASH').describe('Required acknowledgement of permanent deletion') });

function text(result: unknown) { return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }; }
export async function handleListLists(service: ThingsService, args: unknown) { return text(await service.listLists(listListsSchema.parse(args || {}))); }
export async function handleAugmentList(service: ThingsService, args: unknown) { return text(await service.augmentList(augmentListSchema.parse(args))); }
export async function handleRevealItem(service: ThingsService, args: unknown) { return text(await service.revealItem(revealItemSchema.parse(args))); }
export async function handleEmptyTrash(service: ThingsService, args: unknown) { return text(await service.emptyTrash(emptyTrashSchema.parse(args).confirm)); }
