export type ThingsStatus = 'open' | 'completed' | 'canceled';

export interface ThingsTodo {
  id: string;
  title: string;
  notes: string | null;
  status: ThingsStatus;
  dueDate: string | null;
  startDate: string | null;
  project: string | null;
  area: string | null;
  tags: string[];
}

export interface ThingsProject {
  id: string;
  name: string;
  area: string | null;
  status: ThingsStatus;
}

export interface ThingsSearchResult {
  todos: ThingsTodo[];
  projects: ThingsProject[];
}

export interface CreateTodoInput {
  title: string;
  notes?: string;
  when?: string;
  deadline?: string;
  project?: string;
  area?: string;
  tags?: string[];
  checklist?: string[];
}

export interface UpdateTodoInput {
  id: string;
  title?: string;
  notes?: string;
  when?: string;
  deadline?: string;
  project?: string;
  tags?: string[];
}

export interface CompleteTodoInput {
  id: string;
}

export interface ListUpcomingInput {
  days?: number;
}

export interface SearchInput {
  query: string;
}
