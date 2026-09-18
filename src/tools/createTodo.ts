import { z } from 'zod';
import { ThingsService } from '../services/things.js';

export const createTodoSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').describe('Title of the task'),
  notes: z.string().optional().describe('Notes or description for the task'),
  when: z
    .string()
    .optional()
    .describe('Schedule target (e.g., today, tomorrow, evening, anytime, someday, or a date string)'),
  deadline: z.string().optional().describe('Due date / deadline for the task'),
  project: z.string().optional().describe('Name or ID of the project to add the task into'),
  area: z.string().optional().describe('Name or ID of the area to add the task into'),
  tags: z.array(z.string()).optional().describe('Tags to assign to the task'),
  checklist: z.array(z.string()).optional().describe('List of checklist items'),
});

export async function handleCreateTodo(service: ThingsService, args: unknown) {
  const parsed = createTodoSchema.parse(args);
  const result = await service.createTodo(parsed);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
