import { z } from 'zod';
import { ThingsService } from '../services/things.js';

export const listGroupsSchema = z.object({
  query: z
    .string()
    .min(1, 'Query cannot be empty')
    .optional()
    .describe('Optional case-insensitive text to match against List Group names'),
});

export async function handleListGroups(service: ThingsService, args: unknown) {
  const parsed = listGroupsSchema.parse(args || {});
  const result = await service.listGroups(parsed);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
