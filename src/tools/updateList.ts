import { z } from 'zod';
import { ThingsService } from '../services/things.js';

export const updateListSchema = z.object({
  id: z.string().min(1, 'ID is required').describe('Stable ID of the list to update'),
  title: z.string().optional().describe('New name of the list'),
  notes: z.string().optional().describe('New notes or description for the list'),
  when: z
    .string()
    .optional()
    .describe('New schedule target (e.g. today, tomorrow, anytime, someday, or a date string)'),
  deadline: z.string().optional().describe('New due date / deadline (or "none" / empty to clear)'),
  listGroup: z
    .string()
    .optional()
    .describe('New List Group name or stable ID (or "none" / empty to remove the List Group)'),
  tags: z.array(z.string()).optional().describe('New tags for the list'),
});

export async function handleUpdateList(service: ThingsService, args: unknown) {
  const parsed = updateListSchema.parse(args);
  const result = await service.updateList(parsed);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
