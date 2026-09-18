import { z } from 'zod';
import { ThingsService } from '../services/things.js';

const listStatusSchema = z.object({
  id: z.string().min(1, 'ID is required').describe('Stable ID of the list'),
});

export const completeListSchema = listStatusSchema;
export const cancelListSchema = listStatusSchema;
export const reopenListSchema = listStatusSchema;

async function setListStatus(service: ThingsService, args: unknown, status: 'completed' | 'canceled' | 'open') {
  const { id } = listStatusSchema.parse(args);
  const result = await service.setListStatus({ id, status });
  return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
}

export function handleCompleteList(service: ThingsService, args: unknown) {
  return setListStatus(service, args, 'completed');
}

export function handleCancelList(service: ThingsService, args: unknown) {
  return setListStatus(service, args, 'canceled');
}

export function handleReopenList(service: ThingsService, args: unknown) {
  return setListStatus(service, args, 'open');
}
