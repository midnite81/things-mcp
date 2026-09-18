import { z } from 'zod';
import { ThingsService } from '../services/things.js';

export const searchSchema = z.object({
  query: z.string().describe('Search text for finding to dos and projects'),
});

export async function handleSearch(service: ThingsService, args: unknown) {
  const parsed = searchSchema.parse(args);
  const result = await service.search(parsed);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
