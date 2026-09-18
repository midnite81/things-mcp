import { z } from 'zod';
import { ThingsService } from '../services/things.js';

export const listTagsSchema = z.object({});
export const createTagSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').describe('Name of the new tag'),
  parentTag: z.string().min(1).optional().describe('Optional parent tag name'),
});
export const updateTagSchema = z.object({
  id: z.string().min(1, 'ID is required').describe('Stable ID of the tag'),
  name: z.string().min(1, 'Name cannot be empty').optional().describe('New tag name'),
  parentTag: z.string().optional().describe('Parent tag name, or "none" to make this a top-level tag'),
}).refine(({ name, parentTag }) => Boolean(name || parentTag !== undefined), 'Provide a name or parentTag.');
export const deleteTagSchema = z.object({
  id: z.string().min(1, 'ID is required').describe('Stable ID of the tag to delete'),
});

function asText(result: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
}

export async function handleListTags(service: ThingsService, args: unknown) {
  listTagsSchema.parse(args || {});
  return asText(await service.listTags());
}

export async function handleCreateTag(service: ThingsService, args: unknown) {
  return asText(await service.createTag(createTagSchema.parse(args)));
}

export async function handleUpdateTag(service: ThingsService, args: unknown) {
  return asText(await service.updateTag(updateTagSchema.parse(args)));
}

export async function handleDeleteTag(service: ThingsService, args: unknown) {
  return asText(await service.deleteTag(deleteTagSchema.parse(args)));
}
