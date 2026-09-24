import { describe, it, expect } from 'vitest';
import { ThingsService, parseRawTodo, parseRawProject, parseRawListGroup, parseRawTag } from '../../src/services/things.js';
import { AppleScriptRunner } from '../../src/lib/applescript.js';

class MockAppleScriptRunner implements AppleScriptRunner {
  public lastScript: string = '';
  public lastArgs: string[] = [];
  public mockResponse: string = '[]';

  async execute(script: string, args: string[] = []): Promise<string> {
    this.lastScript = script;
    this.lastArgs = args;
    return this.mockResponse;
  }
}

describe('ThingsService', () => {
  it('parses raw todo correctly', () => {
    const raw = {
      id: 'task-1',
      name: 'Test task',
      notes: 'Some notes',
      status: 'open',
      dueDate: '2026-10-01T00:00:00Z',
      startDate: '2026-09-18T00:00:00Z',
      project: 'Project Alpha',
      area: 'Work',
      tagNames: 'urgent, feature',
    };

    const todo = parseRawTodo(raw);
    expect(todo).toEqual({
      id: 'task-1',
      title: 'Test task',
      notes: 'Some notes',
      status: 'open',
      dueDate: '2026-10-01T00:00:00Z',
      startDate: '2026-09-18T00:00:00Z',
      project: 'Project Alpha',
      area: 'Work',
      tags: ['urgent', 'feature'],
    });
  });

  it('parses raw project correctly', () => {
    const raw = {
      id: 'proj-1',
      name: 'Launch Site',
      area: 'Marketing',
      status: 'open',
    };

    const project = parseRawProject(raw);
    expect(project).toEqual({
      id: 'proj-1',
      name: 'Launch Site',
      area: 'Marketing',
      status: 'open',
    });
  });

  it('parses raw List Group correctly', () => {
    expect(parseRawListGroup({ id: 'area-1', name: 'Work' })).toEqual({
      id: 'area-1',
      name: 'Work',
    });
  });

  it('parses raw tags correctly', () => {
    expect(parseRawTag({ id: 'tag-1', name: 'Urgent' })).toEqual({ id: 'tag-1', name: 'Urgent' });
  });

  it('lists List Groups, optionally filtered by name', async () => {
    const mock = new MockAppleScriptRunner();
    mock.mockResponse = JSON.stringify([{ id: 'area-1', name: 'Work' }]);

    const service = new ThingsService(mock);
    const result = await service.listGroups({ query: 'work' });

    expect(result).toEqual({ listGroups: [{ id: 'area-1', name: 'Work' }] });
    expect(mock.lastArgs).toEqual(['work']);
  });

  it('listToday returns formatted items', async () => {
    const mock = new MockAppleScriptRunner();
    mock.mockResponse = JSON.stringify([
      {
        id: 't1',
        name: 'Check emails',
        notes: '',
        status: 'open',
        dueDate: '',
        startDate: '',
        project: 'Work',
        area: '',
        tagNames: 'mail',
      },
    ]);

    const service = new ThingsService(mock);
    const res = await service.listToday();

    expect(res.items).toHaveLength(1);
    expect(res.items[0].id).toBe('t1');
    expect(res.items[0].title).toBe('Check emails');
    expect(res.items[0].notes).toBeNull();
    expect(res.items[0].tags).toEqual(['mail']);
  });

  it('createTodo creates item and returns it', async () => {
    const mock = new MockAppleScriptRunner();
    mock.mockResponse = JSON.stringify({
      id: 'new-id',
      name: 'New MCP task',
      notes: 'Notes here',
      status: 'open',
      dueDate: '',
      startDate: '',
      project: '',
      area: '',
      tagNames: 'ai',
    });

    const service = new ThingsService(mock);
    const created = await service.createTodo({
      title: 'New MCP task',
      notes: 'Notes here',
      tags: ['ai'],
    });

    expect(created.id).toBe('new-id');
    expect(created.title).toBe('New MCP task');
    expect(created.tags).toEqual(['ai']);
  });

  it('createProject creates project and returns it', async () => {
    const mock = new MockAppleScriptRunner();
    mock.mockResponse = JSON.stringify({
      id: 'proj-new-id',
      name: 'Release 2026-09-18',
      area: 'Work',
      status: 'open',
    });

    const service = new ThingsService(mock);
    const created = await service.createProject({
      title: 'Release 2026-09-18',
      area: 'Work',
    });

    expect(created.id).toBe('proj-new-id');
    expect(created.name).toBe('Release 2026-09-18');
    expect(created.area).toBe('Work');
    expect(created.status).toBe('open');
    expect(mock.lastArgs[0]).toBe('Release 2026-09-18');
    expect(mock.lastArgs[4]).toBe('Work');
  });

  it('createList creates a list in the requested List Group', async () => {
    const mock = new MockAppleScriptRunner();
    mock.mockResponse = JSON.stringify({
      id: 'list-new-id',
      name: 'Sprint 269',
      area: 'Work',
      status: 'open',
    });

    const service = new ThingsService(mock);
    const created = await service.createList({ title: 'Sprint 269', listGroup: 'Work' });

    expect(created).toMatchObject({ id: 'list-new-id', name: 'Sprint 269', area: 'Work' });
    expect(mock.lastArgs[0]).toBe('Sprint 269');
    expect(mock.lastArgs[4]).toBe('Work');
  });

  it('createList preserves the requested heading and task order', async () => {
    const mock = new MockAppleScriptRunner();
    mock.mockResponse = JSON.stringify({
      id: 'list-new-id',
      name: 'Release',
      area: 'Work',
      status: 'open',
    });

    const service = new ThingsService(mock);
    await service.createList({
      title: 'Release',
      listGroup: 'Work',
      items: [
        { type: 'heading', title: 'RFQA' },
        { type: 'to-do', title: 'Check ticket', completed: true },
        { type: 'heading', title: 'Failed' },
      ],
    });

    const data = new URL(mock.lastArgs[0]).searchParams.get('data');
    expect(JSON.parse(data!).at(0).attributes.items.map((item: { attributes: { title: string } }) => item.attributes.title)).toEqual([
      'RFQA',
      'Check ticket',
      'Failed',
    ]);
    expect(mock.lastArgs[1]).toBe('Release');
    expect(mock.lastScript).toContain('open location targetUrl');
  });

  it('lists open tasks in a selected list', async () => {
    const mock = new MockAppleScriptRunner();
    mock.mockResponse = JSON.stringify([
      {
        id: 'todo-1',
        name: 'Prepare demo',
        notes: '',
        status: 'open',
        dueDate: '',
        startDate: '',
        project: 'Sprint 269',
        area: 'Work',
        tagNames: '',
      },
    ]);

    const service = new ThingsService(mock);
    const result = await service.listListItems({ list: 'Sprint 269' });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Prepare demo');
    expect(mock.lastArgs).toEqual(['Sprint 269', 'false']);
  });

  it('updateList passes list properties and returns the updated list', async () => {
    const mock = new MockAppleScriptRunner();
    mock.mockResponse = JSON.stringify({
      id: 'list-id',
      name: 'Sprint 269',
      area: 'Work',
      status: 'open',
    });

    const service = new ThingsService(mock);
    const updated = await service.updateList({ id: 'list-id', title: 'Sprint 269', listGroup: 'Work' });

    expect(updated).toMatchObject({ id: 'list-id', name: 'Sprint 269', area: 'Work' });
    expect(mock.lastArgs).toEqual([
      'list-id',
      'Sprint 269',
      '__UNSET__',
      '__UNSET__',
      '__UNSET__',
      'Work',
      '__UNSET__',
    ]);
  });

  it('gets tasks and lists by stable ID', async () => {
    const mock = new MockAppleScriptRunner();
    const service = new ThingsService(mock);

    mock.mockResponse = JSON.stringify({
      id: 'todo-id', name: 'Prepare demo', notes: '', status: 'open', dueDate: '', startDate: '', project: 'Sprint 269', area: 'Work', tagNames: '',
    });
    expect((await service.getTodo({ id: 'todo-id' })).title).toBe('Prepare demo');
    expect(mock.lastArgs).toEqual(['todo-id']);

    mock.mockResponse = JSON.stringify({ id: 'list-id', name: 'Sprint 269', area: 'Work', status: 'open' });
    expect((await service.getList({ id: 'list-id' })).name).toBe('Sprint 269');
    expect(mock.lastArgs).toEqual(['list-id']);
  });

  it('changes a list lifecycle status by stable ID', async () => {
    const mock = new MockAppleScriptRunner();
    mock.mockResponse = JSON.stringify({ id: 'list-id', name: 'Sprint 269', area: 'Work', status: 'completed' });
    const updated = await new ThingsService(mock).setListStatus({ id: 'list-id', status: 'completed' });

    expect(updated.status).toBe('completed');
    expect(mock.lastArgs).toEqual(['list-id', 'completed']);
  });

  it('manages List Groups and tags by stable ID', async () => {
    const mock = new MockAppleScriptRunner();
    const service = new ThingsService(mock);

    mock.mockResponse = JSON.stringify({ id: 'area-id', name: 'Work' });
    expect((await service.createListGroup({ name: 'Work' })).name).toBe('Work');
    expect(mock.lastArgs).toEqual(['Work', '']);

    mock.mockResponse = JSON.stringify({ id: 'area-id', name: 'Work 2' });
    expect((await service.updateListGroup({ id: 'area-id', name: 'Work 2' })).name).toBe('Work 2');
    expect(mock.lastArgs).toEqual(['area-id', 'Work 2', '__UNSET__']);

    mock.mockResponse = JSON.stringify({ id: 'area-id', deleted: true });
    expect(await service.deleteListGroup({ id: 'area-id' })).toEqual({ id: 'area-id', deleted: true });

    mock.mockResponse = JSON.stringify([{ id: 'tag-id', name: 'Urgent' }]);
    expect(await service.listTags()).toEqual({ tags: [{ id: 'tag-id', name: 'Urgent' }] });

    mock.mockResponse = JSON.stringify({ id: 'tag-id', name: 'Urgent' });
    expect((await service.createTag({ name: 'Urgent' })).name).toBe('Urgent');
    expect(mock.lastArgs).toEqual(['Urgent', '']);

    mock.mockResponse = JSON.stringify({ id: 'tag-id', name: 'Important' });
    expect((await service.updateTag({ id: 'tag-id', name: 'Important' })).name).toBe('Important');
    expect(mock.lastArgs).toEqual(['tag-id', 'Important', '__UNSET__']);

    mock.mockResponse = JSON.stringify({ id: 'tag-id', deleted: true });
    expect(await service.deleteTag({ id: 'tag-id' })).toEqual({ id: 'tag-id', deleted: true });
  });

  it('moves a task and updates its checklist', async () => {
    const mock = new MockAppleScriptRunner();
    const service = new ThingsService(mock);
    const todo = JSON.stringify({
      id: 'todo-id', name: 'Prepare demo', notes: '', status: 'open', dueDate: '', startDate: '', project: 'Sprint 269', area: 'Work', tagNames: '',
    });

    mock.mockResponse = todo;
    expect((await service.moveTodo({ id: 'todo-id', list: 'Sprint 269' })).project).toBe('Sprint 269');
    expect(mock.lastArgs[0]).toBe('todo-id');
    expect(mock.lastArgs[5]).toBe('Sprint 269');

    mock.mockResponse = todo;
    expect((await service.updateTodoChecklist({
      id: 'todo-id', authToken: 'test-token', mode: 'append', items: ['Book venue'],
    })).title).toBe('Prepare demo');
    expect(mock.lastArgs[1]).toBe('todo-id');
    expect(mock.lastArgs[0]).toContain('append-checklist-items=Book+venue');
  });

  it('updateTodo passes correct fields', async () => {
    const mock = new MockAppleScriptRunner();
    mock.mockResponse = JSON.stringify({
      id: 'id-123',
      name: 'Updated Title',
      notes: 'Updated Notes',
      status: 'open',
      dueDate: '',
      startDate: '',
      project: '',
      area: '',
      tagNames: '',
    });

    const service = new ThingsService(mock);
    const updated = await service.updateTodo({
      id: 'id-123',
      title: 'Updated Title',
      notes: 'Updated Notes',
    });

    expect(mock.lastArgs[0]).toBe('id-123');
    expect(mock.lastArgs[1]).toBe('Updated Title');
    expect(mock.lastArgs[2]).toBe('Updated Notes');
    expect(updated.title).toBe('Updated Title');
  });

  it('completeTodo marks item completed', async () => {
    const mock = new MockAppleScriptRunner();
    mock.mockResponse = JSON.stringify({
      id: 'id-123',
      name: 'Task to complete',
      notes: '',
      status: 'completed',
      dueDate: '',
      startDate: '',
      project: '',
      area: '',
      tagNames: '',
    });

    const service = new ThingsService(mock);
    const res = await service.completeTodo({ id: 'id-123' });

    expect(mock.lastArgs[0]).toBe('id-123');
    expect(res.status).toBe('completed');
  });

  it('search returns todos and projects', async () => {
    const mock = new MockAppleScriptRunner();
    mock.mockResponse = JSON.stringify({
      todos: [
        {
          id: 't-search',
          name: 'Search matched todo',
          notes: '',
          status: 'open',
          dueDate: '',
          startDate: '',
          project: '',
          area: '',
          tagNames: '',
        },
      ],
      projects: [
        {
          id: 'p-search',
          name: 'Search matched project',
          area: '',
          status: 'open',
        },
      ],
    });

    const service = new ThingsService(mock);
    const res = await service.search({ query: 'Search matched' });

    expect(res.todos).toHaveLength(1);
    expect(res.todos[0].name || res.todos[0].title).toBe('Search matched todo');
    expect(res.projects).toHaveLength(1);
    expect(res.projects[0].name).toBe('Search matched project');
  });

  it('ThingsService scripts have the expected AppleScript handler structure', async () => {
    const runner = new MockAppleScriptRunner();

    const methods: Array<() => Promise<any>> = [
      () => new ThingsService(runner).listToday(),
      () => new ThingsService(runner).listInbox(),
      () => new ThingsService(runner).listUpcoming({ days: 7 }),
      () => new ThingsService(runner).listProjects(),
      () => new ThingsService(runner).listGroups(),
      () => new ThingsService(runner).search({ query: 'test' }),
      () => new ThingsService(runner).createTodo({ title: 'test', checklist: ['a'] }),
      () => new ThingsService(runner).createTodo({ title: 'test' }),
      () => new ThingsService(runner).createProject({ title: 'test' }),
      () => new ThingsService(runner).createList({ title: 'test', listGroup: 'Work' }),
      () => new ThingsService(runner).listListItems({ list: 'test' }),
      () => new ThingsService(runner).updateList({ id: 'test', title: 'Updated test' }),
      () => new ThingsService(runner).getTodo({ id: 'test' }),
      () => new ThingsService(runner).getList({ id: 'test' }),
      () => new ThingsService(runner).setListStatus({ id: 'test', status: 'completed' }),
      () => new ThingsService(runner).createListGroup({ name: 'test' }),
      () => new ThingsService(runner).updateListGroup({ id: 'test', name: 'Updated test' }),
      () => new ThingsService(runner).deleteListGroup({ id: 'test' }),
      () => new ThingsService(runner).listTags(),
      () => new ThingsService(runner).createTag({ name: 'test' }),
      () => new ThingsService(runner).updateTag({ id: 'test', name: 'Updated test' }),
      () => new ThingsService(runner).deleteTag({ id: 'test' }),
      () => new ThingsService(runner).moveTodo({ id: 'test', list: 'Destination' }),
      () => new ThingsService(runner).updateTodoChecklist({ id: 'test', authToken: 'test-token', mode: 'replace', items: [] }),
      () => new ThingsService(runner).listTodos({ source: 'logbook', status: 'completed' }),
      () => new ThingsService(runner).setTodoStatus({ id: 'test', status: 'canceled' }),
      () => new ThingsService(runner).moveTodo({ id: 'test', listGroup: 'Work' }),
      () => new ThingsService(runner).deleteTodo({ id: 'test' }),
      () => new ThingsService(runner).deleteList({ id: 'test' }),
      () => new ThingsService(runner).duplicateTodo({ id: 'test', authToken: 'test-token', title: 'Copy' }),
      () => new ThingsService(runner).duplicateList({ id: 'test', authToken: 'test-token', title: 'Copy' }),
      () => new ThingsService(runner).setTodoReminder({ id: 'test', authToken: 'test-token', when: '2026-09-20@14:00' }),
      () => new ThingsService(runner).listLists({ source: 'logbook', status: 'completed' }),
      () => new ThingsService(runner).augmentList({ id: 'test', addTags: ['Important'] }),
      () => new ThingsService(runner).revealItem({ id: 'test' }),
      () => new ThingsService(runner).emptyTrash('EMPTY_TRASH'),
      () => new ThingsService(runner).updateTodo({ id: 'test' }),
      () => new ThingsService(runner).completeTodo({ id: 'test' }),
    ];

    for (const fn of methods) {
      runner.mockResponse = '[]';
      await fn();
      expect(runner.lastScript).not.toBe('');
      // Things-specific scripting terms require the Things application dictionary,
      // which osacompile cannot resolve in an isolated test process.
      expect(runner.lastScript).toContain('on run argv');
      expect(runner.lastScript).toContain('end run');
    }
  });
});
