import { z } from 'zod';
import { ThingsService } from '../services/things.js';

export const listProjectsSchema = z.object({});

export async function handleListProjects(service: ThingsService, args: unknown) {
  listProjectsSchema.parse(args || {});
  const result = await service.listProjects();
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
