import { z } from 'zod';
import { ThingsService } from '../services/things.js';

export const completeTodoSchema = z.object({
  id: z.string().min(1, 'ID is required').describe('ID of the task to complete'),
});

export async function handleCompleteTodo(service: ThingsService, args: unknown) {
  const parsed = completeTodoSchema.parse(args);
  const result = await service.completeTodo(parsed);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
