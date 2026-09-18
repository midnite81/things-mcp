import { z } from 'zod';

export function zodToJsonSchema(schema: any): Record<string, any> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value);
      if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodDefault)) {
        required.push(key);
      }
    }

    const res: Record<string, any> = {
      type: 'object',
      properties,
    };
    if (required.length > 0) {
      res.required = required;
    }
    if (schema.description) {
      res.description = schema.description;
    }
    return res;
  }

  if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema((schema as any).unwrap());
  }

  if (schema instanceof z.ZodString) {
    const res: Record<string, any> = { type: 'string' };
    if (schema.description) res.description = schema.description;
    return res;
  }

  if (schema instanceof z.ZodNumber) {
    const res: Record<string, any> = { type: 'number' };
    if (schema.description) res.description = schema.description;
    return res;
  }

  if (schema instanceof z.ZodBoolean) {
    const res: Record<string, any> = { type: 'boolean' };
    if (schema.description) res.description = schema.description;
    return res;
  }

  if (schema instanceof z.ZodArray) {
    const res: Record<string, any> = {
      type: 'array',
      items: zodToJsonSchema((schema as any).element),
    };
    if (schema.description) res.description = schema.description;
    return res;
  }

  return { type: 'object' };
}
