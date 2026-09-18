import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { ThingsService, parseRawTodo, parseRawProject } from '../../src/services/things.js';
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

  it('all AppleScript scripts in ThingsService are syntactically valid', async () => {
    const runner = new MockAppleScriptRunner();

    const methods: Array<() => Promise<any>> = [
      () => new ThingsService(runner).listToday(),
      () => new ThingsService(runner).listInbox(),
      () => new ThingsService(runner).listUpcoming({ days: 7 }),
      () => new ThingsService(runner).listProjects(),
      () => new ThingsService(runner).search({ query: 'test' }),
      () => new ThingsService(runner).createTodo({ title: 'test', checklist: ['a'] }),
      () => new ThingsService(runner).createTodo({ title: 'test' }),
      () => new ThingsService(runner).createProject({ title: 'test' }),
      () => new ThingsService(runner).updateTodo({ id: 'test' }),
      () => new ThingsService(runner).completeTodo({ id: 'test' }),
    ];

    for (const fn of methods) {
      runner.mockResponse = '[]';
      await fn();
      expect(runner.lastScript).not.toBe('');
      // Test compilation using osacompile
      const res = spawnSync('osacompile', ['-e', runner.lastScript]);
      expect(res.status).toBe(0);
      expect(res.stderr.toString()).toBe('');
    }
  });
});
