import { z } from 'zod';
import { ThingsService } from '../services/things.js';

export const listInboxSchema = z.object({});

export async function handleListInbox(service: ThingsService, args: unknown) {
  listInboxSchema.parse(args || {});
  const result = await service.listInbox();
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
