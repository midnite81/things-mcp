import { describe, it, expect } from 'vitest';
import { handleListToday, listTodaySchema } from '../../src/tools/listToday.js';
import { handleCreateTodo, createTodoSchema } from '../../src/tools/createTodo.js';
import { handleCreateProject, createProjectSchema } from '../../src/tools/createProject.js';
import { handleListGroups, listGroupsSchema } from '../../src/tools/listGroups.js';
import { handleCreateList, createListSchema } from '../../src/tools/createList.js';
import { handleListListItems, listListItemsSchema } from '../../src/tools/listListItems.js';
import { handleUpdateList, updateListSchema } from '../../src/tools/updateList.js';
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

  it('validates List Group tool schemas correctly', () => {
    expect(() => listGroupsSchema.parse({ query: 'Work' })).not.toThrow();
    expect(() => listGroupsSchema.parse({ query: '' })).toThrow();
    expect(() => createListSchema.parse({ title: 'Sprint 269', listGroup: 'Work' })).not.toThrow();
    expect(() => createListSchema.parse({ title: 'Sprint 269' })).toThrow();
  });

  it('validates list task and list update tool schemas correctly', () => {
    expect(() => listListItemsSchema.parse({ list: 'Sprint 269' })).not.toThrow();
    expect(() => listListItemsSchema.parse({})).toThrow();
    expect(() => updateListSchema.parse({ id: 'list-id', title: 'Sprint 269' })).not.toThrow();
    expect(() => updateListSchema.parse({ title: 'Sprint 269' })).toThrow();
  });

  it('handleListGroups formats tool response properly', async () => {
    const service = new ThingsService(new MockRunner(JSON.stringify([{ id: 'area-1', name: 'Work' }])));
    const result = await handleListGroups(service, { query: 'Work' });

    expect(JSON.parse(result.content[0].text)).toEqual({ listGroups: [{ id: 'area-1', name: 'Work' }] });
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

  it('handleCreateList returns formatted tool response', async () => {
    const service = new ThingsService(
      new MockRunner(JSON.stringify({ id: 'list-id', name: 'Sprint 269', area: 'Work', status: 'open' }))
    );
    const result = await handleCreateList(service, { title: 'Sprint 269', listGroup: 'Work' });

    expect(JSON.parse(result.content[0].text)).toMatchObject({
      id: 'list-id',
      name: 'Sprint 269',
      area: 'Work',
    });
  });

  it('list task and list update handlers return formatted tool responses', async () => {
    const itemsService = new ThingsService(
      new MockRunner(
        JSON.stringify([
          {
            id: 'todo-id',
            name: 'Prepare demo',
            notes: '',
            status: 'open',
            dueDate: '',
            startDate: '',
            project: 'Sprint 269',
            area: 'Work',
            tagNames: '',
          },
        ])
      )
    );
    const itemsResult = await handleListListItems(itemsService, { list: 'Sprint 269' });
    expect(JSON.parse(itemsResult.content[0].text).items[0].title).toBe('Prepare demo');

    const updateService = new ThingsService(
      new MockRunner(JSON.stringify({ id: 'list-id', name: 'Sprint 269', area: 'Work', status: 'open' }))
    );
    const updateResult = await handleUpdateList(updateService, { id: 'list-id', listGroup: 'Work' });
    expect(JSON.parse(updateResult.content[0].text)).toMatchObject({ id: 'list-id', area: 'Work' });
  });
});
