import { z } from 'zod';
import { ThingsService } from '../services/things.js';

export const getTodoSchema = z.object({
  id: z.string().min(1, 'ID is required').describe('Stable ID of the task'),
});

export async function handleGetTodo(service: ThingsService, args: unknown) {
  const result = await service.getTodo(getTodoSchema.parse(args));
  return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
}
