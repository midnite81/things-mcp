import { describe, it, expect } from 'vitest';
import { handleListToday, listTodaySchema } from '../../src/tools/listToday.js';
import { handleCreateTodo, createTodoSchema } from '../../src/tools/createTodo.js';
import { handleCreateProject, createProjectSchema } from '../../src/tools/createProject.js';
import { handleUpdateTodo, updateTodoSchema } from '../../src/tools/updateTodo.js';
import { handleCompleteTodo, completeTodoSchema } from '../../src/tools/completeTodo.js';
import { ThingsService } from '../../src/services/things.js';
import { AppleScriptRunner } from '../../src/lib/applescript.js';

class MockRunner implements AppleScriptRunner {
  constructor(private readonly mockJson: string) {}
  async execute(): Promise<string> {
    return this.mockJson;
  }
}

describe('MCP Tools handlers and Zod Schemas', () => {
  it('validates createTodo schema correctly', () => {
    expect(() => createTodoSchema.parse({ title: 'Valid task' })).not.toThrow();
    expect(() => createTodoSchema.parse({})).toThrow();
  });

  it('validates createProject schema correctly', () => {
    expect(() => createProjectSchema.parse({ title: 'Release 2026-09-18', area: 'Work' })).not.toThrow();
    expect(() => createProjectSchema.parse({})).toThrow();
  });

  it('validates updateTodo schema correctly', () => {
    expect(() => updateTodoSchema.parse({ id: 'some-id', title: 'New' })).not.toThrow();
    expect(() => updateTodoSchema.parse({ title: 'New' })).toThrow();
  });

  it('validates completeTodo schema correctly', () => {
    expect(() => completeTodoSchema.parse({ id: 'some-id' })).not.toThrow();
    expect(() => completeTodoSchema.parse({})).toThrow();
  });

  it('handleListToday formats tool response properly', async () => {
    const runner = new MockRunner(
      JSON.stringify([
        {
          id: '1',
          name: 'Task Today',
          notes: 'Notes',
          status: 'open',
          dueDate: '',
          startDate: '',
          project: '',
          area: '',
          tagNames: '',
        },
      ])
    );
    const service = new ThingsService(runner);
    const result = await handleListToday(service, {});

    expect(result.content[0].type).toBe('text');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].title).toBe('Task Today');
  });

  it('handleCreateTodo returns formatted tool response', async () => {
    const runner = new MockRunner(
      JSON.stringify({
        id: 'new-id',
        name: 'Buy milk',
        notes: '',
        status: 'open',
        dueDate: '',
        startDate: '',
        project: '',
        area: '',
        tagNames: '',
      })
    );
    const service = new ThingsService(runner);
    const result = await handleCreateTodo(service, { title: 'Buy milk' });

    expect(result.content[0].type).toBe('text');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe('new-id');
    expect(parsed.title).toBe('Buy milk');
  });

  it('handleCreateProject returns formatted tool response', async () => {
    const runner = new MockRunner(
      JSON.stringify({
        id: 'proj-id',
        name: 'Release 2026-09-18',
        area: 'Work',
        status: 'open',
      })
    );
    const service = new ThingsService(runner);
    const result = await handleCreateProject(service, { title: 'Release 2026-09-18', area: 'Work' });

    expect(result.content[0].type).toBe('text');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe('proj-id');
    expect(parsed.name).toBe('Release 2026-09-18');
    expect(parsed.area).toBe('Work');
  });
});
