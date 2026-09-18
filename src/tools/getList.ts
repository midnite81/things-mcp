import { z } from 'zod';
import { ThingsService } from '../services/things.js';

export const getListSchema = z.object({
  id: z.string().min(1, 'ID is required').describe('Stable ID of the list'),
});

export async function handleGetList(service: ThingsService, args: unknown) {
  const result = await service.getList(getListSchema.parse(args));
  return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
}
