import { z } from 'zod';
import { ThingsService } from '../services/things.js';

export const listListItemsSchema = z.object({
  list: z.string().min(1, 'List name or ID is required').describe('List name or stable ID'),
  includeCompleted: z.boolean().optional().describe('Include completed and cancelled tasks; defaults to false'),
});

export async function handleListListItems(service: ThingsService, args: unknown) {
  const parsed = listListItemsSchema.parse(args);
  const result = await service.listListItems(parsed);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
