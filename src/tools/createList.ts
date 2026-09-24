import { z } from 'zod';
import { ThingsService } from '../services/things.js';

export const createListSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').describe('Name of the new Things list'),
  listGroup: z
    .string()
    .min(1, 'List Group cannot be empty')
    .describe('List Group name or ID. In Things AppleScript this is called an area.'),
  notes: z.string().optional().describe('Notes or description for the list'),
  when: z
    .string()
    .optional()
    .describe('Schedule target (e.g., today, tomorrow, anytime, someday, or a date string)'),
  deadline: z.string().optional().describe('Due date / deadline for the list'),
  tags: z.array(z.string()).optional().describe('Tags to assign to the list'),
  items: z
    .array(
      z.discriminatedUnion('type', [
        z.object({
          type: z.literal('heading'),
          title: z.string().min(1, 'Heading title cannot be empty'),
          archived: z.boolean().optional(),
        }),
        z.object({
          type: z.literal('to-do'),
          title: z.string().min(1, 'Task title cannot be empty'),
          notes: z.string().optional(),
          when: z.string().optional(),
          deadline: z.string().optional(),
          tags: z.array(z.string()).optional(),
          checklist: z.array(z.string()).optional(),
          completed: z.boolean().optional(),
          canceled: z.boolean().optional(),
        }),
      ])
    )
    .optional()
    .describe('Ordered headings and tasks to create inside the new list'),
});

export async function handleCreateList(service: ThingsService, args: unknown) {
  const parsed = createListSchema.parse(args);
  const result = await service.createList(parsed);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
