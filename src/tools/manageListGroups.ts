import { z } from 'zod';
import { ThingsService } from '../services/things.js';

export const createListGroupSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').describe('Name of the new List Group'),
  tags: z.array(z.string()).optional().describe('Tags to assign to the List Group'),
});

export const updateListGroupSchema = z.object({
  id: z.string().min(1, 'ID is required').describe('Stable ID of the List Group'),
  name: z.string().optional().describe('New List Group name'),
  tags: z.array(z.string()).optional().describe('Replacement tags for the List Group'),
});

export const deleteListGroupSchema = z.object({
  id: z.string().min(1, 'ID is required').describe('Stable ID of the List Group to delete'),
});

function asText(result: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
}

export async function handleCreateListGroup(service: ThingsService, args: unknown) {
  return asText(await service.createListGroup(createListGroupSchema.parse(args)));
}

export async function handleUpdateListGroup(service: ThingsService, args: unknown) {
  return asText(await service.updateListGroup(updateListGroupSchema.parse(args)));
}

export async function handleDeleteListGroup(service: ThingsService, args: unknown) {
  return asText(await service.deleteListGroup(deleteListGroupSchema.parse(args)));
}
