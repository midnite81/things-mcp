import { z } from 'zod';
import { ThingsService } from '../services/things.js';

export const listTodaySchema = z.object({});

export async function handleListToday(service: ThingsService, args: unknown) {
  listTodaySchema.parse(args || {});
  const result = await service.listToday();
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
