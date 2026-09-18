import { z } from 'zod';
import { ThingsService } from '../services/things.js';

export const createProjectSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').describe('Title or name of the project'),
  notes: z.string().optional().describe('Notes or description for the project'),
  when: z
    .string()
    .optional()
    .describe('Schedule target (e.g., today, tomorrow, anytime, someday, or a date string)'),
  deadline: z.string().optional().describe('Due date / deadline for the project'),
  area: z.string().optional().describe('Name or ID of the area to place the project in'),
  tags: z.array(z.string()).optional().describe('Tags to assign to the project'),
});

export async function handleCreateProject(service: ThingsService, args: unknown) {
  const parsed = createProjectSchema.parse(args);
  const result = await service.createProject(parsed);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
