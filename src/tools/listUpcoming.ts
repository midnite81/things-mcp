import { z } from 'zod';
import { ThingsService } from '../services/things.js';

export const listUpcomingSchema = z.object({
  days: z.number().int().positive().optional().describe('Optional number of days ahead to inspect'),
});

export async function handleListUpcoming(service: ThingsService, args: unknown) {
  const parsed = listUpcomingSchema.parse(args || {});
  const result = await service.listUpcoming(parsed);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
