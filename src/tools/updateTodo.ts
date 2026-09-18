import { z } from 'zod';
import { ThingsService } from '../services/things.js';

export const updateTodoSchema = z.object({
  id: z.string().min(1, 'ID is required').describe('ID of the task to update'),
  title: z.string().optional().describe('New title of the task'),
  notes: z.string().optional().describe('New notes or description for the task'),
  when: z
    .string()
    .optional()
    .describe('New schedule target (e.g. today, tomorrow, anytime, someday, or a date string)'),
  deadline: z.string().optional().describe('New due date / deadline (or "none" / empty to clear)'),
  project: z.string().optional().describe('New project name or ID (or "none" / empty to remove from project)'),
  tags: z.array(z.string()).optional().describe('New tags for the task'),
});

export async function handleUpdateTodo(service: ThingsService, args: unknown) {
  const parsed = updateTodoSchema.parse(args);
  const result = await service.updateTodo(parsed);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
