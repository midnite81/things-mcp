import { z } from 'zod';
import { ThingsService } from '../services/things.js';

export const updateTodoChecklistSchema = z
  .object({
    id: z.string().min(1, 'ID is required').describe('Stable ID of the task'),
    authToken: z.string().min(1, 'Things URL-scheme authorisation token is required').describe('Things URL-scheme authorisation token'),
    mode: z.enum(['replace', 'prepend', 'append']).describe('Replace all items, or add items to the front or end'),
    items: z.array(z.string()).max(100, 'Things supports at most 100 checklist items').describe('Checklist item titles'),
  })
  .superRefine(({ mode, items }, context) => {
    if (mode !== 'replace' && items.length === 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide at least one item when prepending or appending.' });
    }
  });

export async function handleUpdateTodoChecklist(service: ThingsService, args: unknown) {
  const result = await service.updateTodoChecklist(updateTodoChecklistSchema.parse(args));
  return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
}
