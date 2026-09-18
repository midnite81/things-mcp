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

/**
 * A Things List Group. Things exposes these as "areas" in its AppleScript API.
 */
export interface ThingsListGroup {
  id: string;
  name: string;
}

export interface ThingsTag {
  id: string;
  name: string;
  parentTag?: string | null;
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

export interface CreateProjectInput {
  title: string;
  notes?: string;
  when?: string;
  deadline?: string;
  area?: string;
  tags?: string[];
}

export interface CreateListInput {
  title: string;
  listGroup: string;
  notes?: string;
  when?: string;
  deadline?: string;
  tags?: string[];
}

export interface ListGroupsInput {
  query?: string;
}

export interface ListListItemsInput {
  list: string;
  includeCompleted?: boolean;
}

export interface UpdateListInput {
  id: string;
  title?: string;
  notes?: string;
  when?: string;
  deadline?: string;
  listGroup?: string;
  tags?: string[];
}

export interface IdInput {
  id: string;
}

export interface SetListStatusInput extends IdInput {
  status: ThingsStatus;
}

export interface CreateListGroupInput {
  name: string;
  tags?: string[];
}

export interface UpdateListGroupInput extends IdInput {
  name?: string;
  tags?: string[];
}

export interface CreateTagInput {
  name: string;
  parentTag?: string;
}

export interface UpdateTagInput extends IdInput {
  name?: string;
  parentTag?: string;
}

export interface MoveTodoInput extends IdInput {
  list?: string;
  listGroup?: string;
  builtInList?: 'Inbox' | 'Today' | 'Anytime' | 'Someday';
  detachFromParent?: boolean;
}

export type ChecklistUpdateMode = 'replace' | 'prepend' | 'append';

export interface UpdateTodoChecklistInput extends IdInput {
  authToken: string;
  mode: ChecklistUpdateMode;
  items: string[];
}

export interface ListTodosInput {
  source?: 'all' | 'logbook' | 'trash';
  listGroup?: string;
  tag?: string;
  status?: ThingsStatus;
}

export interface BulkUpdateTodosInput {
  ids: string[];
  status?: ThingsStatus;
  list?: string;
  when?: string;
  tags?: string[];
  dryRun?: boolean;
}

export interface ListListsInput {
  source?: 'all' | 'logbook' | 'trash';
  listGroup?: string;
  tag?: string;
  status?: ThingsStatus;
}

export interface AugmentListInput extends IdInput {
  prependNotes?: string;
  appendNotes?: string;
  addTags?: string[];
}

export interface AugmentTodoInput extends IdInput {
  prependNotes?: string;
  appendNotes?: string;
  addTags?: string[];
}

export interface DuplicateTodoInput extends IdInput {
  authToken: string;
  title: string;
}

export interface DuplicateListInput extends IdInput {
  authToken: string;
  title: string;
}

export interface SetTodoReminderInput extends IdInput {
  authToken: string;
  when: string;
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
