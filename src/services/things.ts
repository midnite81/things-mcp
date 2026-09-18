import {
  ThingsTodo,
  ThingsProject,
  ThingsListGroup,
  ThingsTag,
  ThingsSearchResult,
  CreateTodoInput,
  CreateProjectInput,
  CreateListInput,
  ListGroupsInput,
  ListListItemsInput,
  UpdateListInput,
  IdInput,
  SetListStatusInput,
  CreateListGroupInput,
  UpdateListGroupInput,
  CreateTagInput,
  UpdateTagInput,
  MoveTodoInput,
  UpdateTodoChecklistInput,
  ListTodosInput,
  BulkUpdateTodosInput,
  AugmentTodoInput,
  DuplicateTodoInput,
  DuplicateListInput,
  SetTodoReminderInput,
  ListListsInput,
  AugmentListInput,
  UpdateTodoInput,
  CompleteTodoInput,
  ListUpcomingInput,
  SearchInput,
  ThingsStatus,
} from '../types/things.js';
import {
  AppleScriptRunner,
  defaultAppleScriptRunner,
  parseAppleScriptJson,
  JSON_ESCAPE_APPLESCRIPT,
} from '../lib/applescript.js';
import { buildThingsAddUrl, buildThingsUpdateUrl, buildThingsItemUpdateUrl } from '../lib/thingsUrl.js';
import { ThingsInvalidInputError, ThingsNotFoundError, ThingsUnsupportedError } from '../lib/errors.js';

export interface RawThingsTodo {
  id: string;
  name: string;
  notes: string;
  status: string;
  dueDate: string;
  startDate: string;
  project: string;
  area: string;
  tagNames: string;
}

export interface RawThingsProject {
  id: string;
  name: string;
  area: string;
  status: string;
}

export interface RawThingsListGroup {
  id: string;
  name: string;
}

export interface RawThingsTag {
  id: string;
  name: string;
  parentTag?: string;
}

export function parseRawTodo(raw: RawThingsTodo): ThingsTodo {
  const statusStr = (raw.status || '').toLowerCase().trim();
  let status: ThingsStatus = 'open';
  if (statusStr === 'completed') status = 'completed';
  else if (statusStr === 'canceled' || statusStr === 'cancelled') status = 'canceled';

  const tags = raw.tagNames
    ? raw.tagNames
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  return {
    id: raw.id,
    title: raw.name || '',
    notes: raw.notes && raw.notes.length > 0 ? raw.notes : null,
    status,
    dueDate: raw.dueDate && raw.dueDate.length > 0 ? raw.dueDate : null,
    startDate: raw.startDate && raw.startDate.length > 0 ? raw.startDate : null,
    project: raw.project && raw.project.length > 0 ? raw.project : null,
    area: raw.area && raw.area.length > 0 ? raw.area : null,
    tags,
  };
}

export function parseRawProject(raw: RawThingsProject): ThingsProject {
  const statusStr = (raw.status || '').toLowerCase().trim();
  let status: ThingsStatus = 'open';
  if (statusStr === 'completed') status = 'completed';
  else if (statusStr === 'canceled' || statusStr === 'cancelled') status = 'canceled';

  return {
    id: raw.id,
    name: raw.name || '',
    area: raw.area && raw.area.length > 0 ? raw.area : null,
    status,
  };
}

export function parseRawListGroup(raw: RawThingsListGroup): ThingsListGroup {
  return {
    id: raw.id,
    name: raw.name || '',
  };
}

export function parseRawTag(raw: RawThingsTag): ThingsTag {
  return {
    id: raw.id,
    name: raw.name || '',
    ...(raw.parentTag !== undefined ? { parentTag: raw.parentTag || null } : {}),
  };
}

const TODO_RESPONSE_APPLESCRIPT = `
    set tid to id of t
    set tName to name of t
    set tNotes to notes of t
    set tStatus to status of t as text
    set tDue to ""
    try
      set tDue to ((due date of t) as «class isot» as string)
    end try
    set tStart to ""
    try
      set tStart to ((activation date of t) as «class isot» as string)
    end try
    set tProj to ""
    try
      set tProj to name of project of t
    end try
    set tArea to ""
    try
      set tArea to name of area of t
    end try
    set tTagsOut to tag names of t

    return "{\\"id\\":" & my jsonEscape(tid) & ",\\"name\\":" & my jsonEscape(tName) & ",\\"notes\\":" & my jsonEscape(tNotes) & ",\\"status\\":" & my jsonEscape(tStatus) & ",\\"dueDate\\":" & my jsonEscape(tDue) & ",\\"startDate\\":" & my jsonEscape(tStart) & ",\\"project\\":" & my jsonEscape(tProj) & ",\\"area\\":" & my jsonEscape(tArea) & ",\\"tagNames\\":" & my jsonEscape(tTagsOut) & "}"
`;

const TODO_JSON_APPEND_APPLESCRIPT = `
        set tid to id of t
        set tName to name of t
        set tNotes to notes of t
        set tStatus to status of t as text
        set tDue to ""
        try
          set tDue to ((due date of t) as «class isot» as string)
        end try
        set tStart to ""
        try
          set tStart to ((activation date of t) as «class isot» as string)
        end try
        set tProj to ""
        try
          set tProj to name of project of t
        end try
        set tArea to ""
        try
          set tArea to name of area of t
        end try
        set tTags to tag names of t
        set tJson to "{\\"id\\":" & my jsonEscape(tid) & ",\\"name\\":" & my jsonEscape(tName) & ",\\"notes\\":" & my jsonEscape(tNotes) & ",\\"status\\":" & my jsonEscape(tStatus) & ",\\"dueDate\\":" & my jsonEscape(tDue) & ",\\"startDate\\":" & my jsonEscape(tStart) & ",\\"project\\":" & my jsonEscape(tProj) & ",\\"area\\":" & my jsonEscape(tArea) & ",\\"tagNames\\":" & my jsonEscape(tTags) & "}"
        set res to res & tJson
`;

const PROJECT_RESPONSE_APPLESCRIPT = `
    set pId to id of p
    set pName to name of p
    set pStatus to status of p as text
    set pAreaName to ""
    try
      set pAreaName to name of area of p
    end try

    return "{\\"id\\":" & my jsonEscape(pId) & ",\\"name\\":" & my jsonEscape(pName) & ",\\"status\\":" & my jsonEscape(pStatus) & ",\\"area\\":" & my jsonEscape(pAreaName) & "}"
`;

export class ThingsService {
  constructor(private readonly runner: AppleScriptRunner = defaultAppleScriptRunner) {}

  /**
   * Return incomplete Things items from Today.
   */
  async listToday(): Promise<{ items: ThingsTodo[] }> {
    const script = `
on run argv
  tell application "Things3"
    set res to "["
    set tList to to dos of list "Today"
    set isFirst to true
    repeat with t in tList
      if status of t is open then
        if not isFirst then
          set res to res & ","
        end if
        set isFirst to false

        set tid to id of t
        set tName to name of t
        set tNotes to notes of t
        set tStatus to status of t as text
        set tDue to ""
        try
          set tDue to ((due date of t) as «class isot» as string)
        end try
        set tStart to ""
        try
          set tStart to ((activation date of t) as «class isot» as string)
        end try
        set tProj to ""
        try
          set tProj to name of project of t
        end try
        set tArea to ""
        try
          set tArea to name of area of t
        end try
        set tTags to tag names of t

        set tJson to "{\\"id\\":" & my jsonEscape(tid) & ",\\"name\\":" & my jsonEscape(tName) & ",\\"notes\\":" & my jsonEscape(tNotes) & ",\\"status\\":" & my jsonEscape(tStatus) & ",\\"dueDate\\":" & my jsonEscape(tDue) & ",\\"startDate\\":" & my jsonEscape(tStart) & ",\\"project\\":" & my jsonEscape(tProj) & ",\\"area\\":" & my jsonEscape(tArea) & ",\\"tagNames\\":" & my jsonEscape(tTags) & "}"
        set res to res & tJson
      end if
    end repeat
    set res to res & "]"
    return res
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const output = await this.runner.execute(script, []);
    const rawList = parseAppleScriptJson<RawThingsTodo[]>(output) || [];
    return { items: rawList.map(parseRawTodo) };
  }

  /**
   * Return incomplete items from the Things Inbox.
   */
  async listInbox(): Promise<{ items: ThingsTodo[] }> {
    const script = `
on run argv
  tell application "Things3"
    set res to "["
    set tList to to dos of list "Inbox"
    set isFirst to true
    repeat with t in tList
      if status of t is open then
        if not isFirst then
          set res to res & ","
        end if
        set isFirst to false

        set tid to id of t
        set tName to name of t
        set tNotes to notes of t
        set tStatus to status of t as text
        set tDue to ""
        try
          set tDue to ((due date of t) as «class isot» as string)
        end try
        set tStart to ""
        try
          set tStart to ((activation date of t) as «class isot» as string)
        end try
        set tProj to ""
        try
          set tProj to name of project of t
        end try
        set tArea to ""
        try
          set tArea to name of area of t
        end try
        set tTags to tag names of t

        set tJson to "{\\"id\\":" & my jsonEscape(tid) & ",\\"name\\":" & my jsonEscape(tName) & ",\\"notes\\":" & my jsonEscape(tNotes) & ",\\"status\\":" & my jsonEscape(tStatus) & ",\\"dueDate\\":" & my jsonEscape(tDue) & ",\\"startDate\\":" & my jsonEscape(tStart) & ",\\"project\\":" & my jsonEscape(tProj) & ",\\"area\\":" & my jsonEscape(tArea) & ",\\"tagNames\\":" & my jsonEscape(tTags) & "}"
        set res to res & tJson
      end if
    end repeat
    set res to res & "]"
    return res
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const output = await this.runner.execute(script, []);
    const rawList = parseAppleScriptJson<RawThingsTodo[]>(output) || [];
    return { items: rawList.map(parseRawTodo) };
  }

  /**
   * Return upcoming scheduled items. Support an optional number of days to inspect.
   */
  async listUpcoming(input: ListUpcomingInput = {}): Promise<{ items: ThingsTodo[] }> {
    const daysArg = input.days !== undefined && input.days > 0 ? String(input.days) : '';
    const script = `
on run argv
  set daysLimit to -1
  if (count of argv) > 0 and (item 1 of argv) is not "" then
    set daysLimit to (item 1 of argv) as integer
  end if

  tell application "Things3"
    set res to "["
    set tList to to dos of list "Upcoming"
    set isFirst to true

    set nowSecs to (current date)

    repeat with t in tList
      if status of t is open then
        set includeItem to true
        set tDue to ""
        try
          set tDue to ((due date of t) as «class isot» as string)
        end try
        set tStart to ""
        try
          set tStart to ((activation date of t) as «class isot» as string)
        end try

        if daysLimit > 0 then
          set targetDate to missing value
          try
            set targetDate to activation date of t
          end try
          if targetDate is missing value then
            try
              set targetDate to due date of t
            end try
          end if

          if targetDate is not missing value then
            set diffDays to (targetDate - nowSecs) / 86400
            if diffDays > daysLimit then
              set includeItem to false
            end if
          end if
        end if

        if includeItem then
          if not isFirst then
            set res to res & ","
          end if
          set isFirst to false

          set tid to id of t
          set tName to name of t
          set tNotes to notes of t
          set tStatus to status of t as text
          set tProj to ""
          try
            set tProj to name of project of t
          end try
          set tArea to ""
          try
            set tArea to name of area of t
          end try
          set tTags to tag names of t

          set tJson to "{\\"id\\":" & my jsonEscape(tid) & ",\\"name\\":" & my jsonEscape(tName) & ",\\"notes\\":" & my jsonEscape(tNotes) & ",\\"status\\":" & my jsonEscape(tStatus) & ",\\"dueDate\\":" & my jsonEscape(tDue) & ",\\"startDate\\":" & my jsonEscape(tStart) & ",\\"project\\":" & my jsonEscape(tProj) & ",\\"area\\":" & my jsonEscape(tArea) & ",\\"tagNames\\":" & my jsonEscape(tTags) & "}"
          set res to res & tJson
        end if
      end if
    end repeat
    set res to res & "]"
    return res
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const output = await this.runner.execute(script, [daysArg]);
    const rawList = parseAppleScriptJson<RawThingsTodo[]>(output) || [];
    return { items: rawList.map(parseRawTodo) };
  }

  /**
   * Return projects and metadata such as ID, name, area, status.
   */
  async listProjects(): Promise<{ projects: ThingsProject[] }> {
    const script = `
on run argv
  tell application "Things3"
    set res to "["
    set pList to projects
    set isFirst to true
    repeat with p in pList
      if not isFirst then
        set res to res & ","
      end if
      set isFirst to false

      set pId to id of p
      set pName to name of p
      set pStatus to status of p as text
      set pArea to ""
      try
        set pArea to name of area of p
      end try

      set pJson to "{\\"id\\":" & my jsonEscape(pId) & ",\\"name\\":" & my jsonEscape(pName) & ",\\"status\\":" & my jsonEscape(pStatus) & ",\\"area\\":" & my jsonEscape(pArea) & "}"
      set res to res & pJson
    end repeat
    set res to res & "]"
    return res
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const output = await this.runner.execute(script, []);
    const rawList = parseAppleScriptJson<RawThingsProject[]>(output) || [];
    return { projects: rawList.map(parseRawProject) };
  }

  /**
   * Return Things List Groups. Things calls these "areas" in its AppleScript API.
   */
  async listGroups(input: ListGroupsInput = {}): Promise<{ listGroups: ThingsListGroup[] }> {
    const query = input.query?.trim().toLowerCase() || '';
    const script = `
on run argv
  set queryText to item 1 of argv

  tell application "Things3"
    set res to "["
    set isFirst to true
    repeat with a in areas
      set aName to name of a
      set includeGroup to true
      if queryText is not "" then
        ignoring case
          if aName does not contain queryText then
            set includeGroup to false
          end if
        end ignoring
      end if

      if includeGroup then
        if not isFirst then
          set res to res & ","
        end if
        set isFirst to false

        set aId to id of a
        set aJson to "{\\"id\\":" & my jsonEscape(aId) & ",\\"name\\":" & my jsonEscape(aName) & "}"
        set res to res & aJson
      end if
    end repeat
    set res to res & "]"
    return res
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const output = await this.runner.execute(script, [query]);
    const rawList = parseAppleScriptJson<RawThingsListGroup[]>(output) || [];
    return { listGroups: rawList.map(parseRawListGroup) };
  }

  /**
   * Search Things items by text.
   */
  async search(input: SearchInput): Promise<ThingsSearchResult> {
    const query = input.query.trim();
    if (!query) {
      return { todos: [], projects: [] };
    }

    const script = `
on run argv
  set q to item 1 of argv
  tell application "Things3"
    set tRes to "["
    set isFirst to true
    set matchingTasks to (to dos whose name contains q or notes contains q)
    repeat with t in matchingTasks
      if not isFirst then
        set tRes to tRes & ","
      end if
      set isFirst to false

      set tid to id of t
      set tName to name of t
      set tNotes to notes of t
      set tStatus to status of t as text
      set tDue to ""
      try
        set tDue to ((due date of t) as «class isot» as string)
      end try
      set tStart to ""
      try
        set tStart to ((activation date of t) as «class isot» as string)
      end try
      set tProj to ""
      try
        set tProj to name of project of t
      end try
      set tArea to ""
      try
        set tArea to name of area of t
      end try
      set tTags to tag names of t

      set tJson to "{\\"id\\":" & my jsonEscape(tid) & ",\\"name\\":" & my jsonEscape(tName) & ",\\"notes\\":" & my jsonEscape(tNotes) & ",\\"status\\":" & my jsonEscape(tStatus) & ",\\"dueDate\\":" & my jsonEscape(tDue) & ",\\"startDate\\":" & my jsonEscape(tStart) & ",\\"project\\":" & my jsonEscape(tProj) & ",\\"area\\":" & my jsonEscape(tArea) & ",\\"tagNames\\":" & my jsonEscape(tTags) & "}"
      set tRes to tRes & tJson
    end repeat
    set tRes to tRes & "]"

    set pRes to "["
    set isFirstP to true
    set matchingProjects to (projects whose name contains q or notes contains q)
    repeat with p in matchingProjects
      if not isFirstP then
        set pRes to pRes & ","
      end if
      set isFirstP to false

      set pId to id of p
      set pName to name of p
      set pStatus to status of p as text
      set pArea to ""
      try
        set pArea to name of area of p
      end try

      set pJson to "{\\"id\\":" & my jsonEscape(pId) & ",\\"name\\":" & my jsonEscape(pName) & ",\\"status\\":" & my jsonEscape(pStatus) & ",\\"area\\":" & my jsonEscape(pArea) & "}"
      set pRes to pRes & pJson
    end repeat
    set pRes to pRes & "]"

    return "{\\"todos\\":" & tRes & ",\\"projects\\":" & pRes & "}"
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const output = await this.runner.execute(script, [query]);
    const rawResult = parseAppleScriptJson<{ todos: RawThingsTodo[]; projects: RawThingsProject[] }>(output) || {
      todos: [],
      projects: [],
    };

    return {
      todos: (rawResult.todos || []).map(parseRawTodo),
      projects: (rawResult.projects || []).map(parseRawProject),
    };
  }

  /**
   * Create a new Things task.
   */
  async createTodo(input: CreateTodoInput): Promise<ThingsTodo> {
    if (!input.title || input.title.trim() === '') {
      throw new ThingsInvalidInputError('Task title cannot be empty.');
    }

    const title = input.title.trim();
    const notes = input.notes || '';
    const when = input.when?.trim() || '';
    const deadline = input.deadline?.trim() || '';
    const project = input.project?.trim() || '';
    const area = input.area?.trim() || '';
    const tags = input.tags ? input.tags.join(', ') : '';

    if (input.checklist && input.checklist.length > 0) {
      // Use URL scheme for rich creation with checklist
      const url = buildThingsAddUrl({
        title,
        notes,
        when: when || undefined,
        deadline: deadline || undefined,
        list: project || area || undefined,
        tags: input.tags,
        checklistItems: input.checklist,
      });

      const script = `
on run argv
  set targetUrl to item 1 of argv
  tell application "Things3"
    open location targetUrl
    delay 0.3
    -- find the most recently created to do matching the title
    set matchToDos to (to dos whose name is ${JSON.stringify(title)})
    if (count of matchToDos) > 0 then
      set t to last item of matchToDos
      set tid to id of t
      set tName to name of t
      set tNotes to notes of t
      set tStatus to status of t as text
      set tDue to ""
      try
        set tDue to ((due date of t) as «class isot» as string)
      end try
      set tStart to ""
      try
        set tStart to ((activation date of t) as «class isot» as string)
      end try
      set tProj to ""
      try
        set tProj to name of project of t
      end try
      set tArea to ""
      try
        set tArea to name of area of t
      end try
      set tTags to tag names of t
      return "{\\"id\\":" & my jsonEscape(tid) & ",\\"name\\":" & my jsonEscape(tName) & ",\\"notes\\":" & my jsonEscape(tNotes) & ",\\"status\\":" & my jsonEscape(tStatus) & ",\\"dueDate\\":" & my jsonEscape(tDue) & ",\\"startDate\\":" & my jsonEscape(tStart) & ",\\"project\\":" & my jsonEscape(tProj) & ",\\"area\\":" & my jsonEscape(tArea) & ",\\"tagNames\\":" & my jsonEscape(tTags) & "}"
    else
      return "{}"
    end if
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
      const output = await this.runner.execute(script, [url]);
      const raw = parseAppleScriptJson<RawThingsTodo>(output);
      if (raw && raw.id) {
        return parseRawTodo(raw);
      }
      return {
        id: 'created',
        title,
        notes: notes || null,
        status: 'open',
        dueDate: deadline || null,
        startDate: when || null,
        project: project || null,
        area: area || null,
        tags: input.tags || [],
      };
    }

    const script = `
on run argv
  set tTitle to item 1 of argv
  set tNotes to item 2 of argv
  set tWhen to item 3 of argv
  set tDeadline to item 4 of argv
  set tProject to item 5 of argv
  set tArea to item 6 of argv
  set tTags to item 7 of argv

  tell application "Things3"
    set targetProject to missing value
    if tProject is not "" then
      try
        set targetProject to project tProject
      on error
        try
          set targetProject to (first project whose id is tProject)
        on error
          try
            set targetProject to (first project whose name is tProject)
          on error
            try
              set targetProject to (first project whose name contains tProject)
            on error
              error "Project not found: " & tProject
            end try
          end try
        end try
      end try
    end if

    set targetArea to missing value
    if targetProject is missing value and tArea is not "" then
      try
        set targetArea to area tArea
      on error
        try
          set targetArea to (first area whose id is tArea)
        on error
          try
            set targetArea to (first area whose name is tArea)
          on error
            try
              set targetArea to (first area whose name contains tArea)
            on error
              error "Area not found: " & tArea
            end try
          end try
        end try
      end try
    end if

    set newProps to {name:tTitle}
    if tNotes is not "" then
      set newProps to newProps & {notes:tNotes}
    end if
    if tTags is not "" then
      set newProps to newProps & {tag names:tTags}
    end if
    if targetProject is not missing value then
      set newProps to newProps & {project:targetProject}
    else if targetArea is not missing value then
      set newProps to newProps & {area:targetArea}
    end if

    if tDeadline is not "" then
      try
        set dDate to (date tDeadline)
        set newProps to newProps & {due date:dDate}
      on error
        -- try ISO parsing or fallback
      end try
    end if

    set t to make new to do with properties newProps

    -- Handle when: today, tomorrow, evening, anytime, someday, or date string
    if tWhen is not "" then
      set lowerWhen to tWhen
      if lowerWhen is "today" then
        move t to list "Today"
      else if lowerWhen is "tomorrow" then
        move t to list "Tomorrow"
      else if lowerWhen is "someday" then
        move t to list "Someday"
      else if lowerWhen is "anytime" then
        move t to list "Anytime"
      else
        try
          set sDate to (date tWhen)
          set activation date of t to sDate
        on error
          -- schedule using Things URL scheme if needed
        end try
      end if
    end if

    set tid to id of t
    set tName to name of t
    set tNotes to notes of t
    set tStatus to status of t as text
    set tDue to ""
    try
      set tDue to ((due date of t) as «class isot» as string)
    end try
    set tStart to ""
    try
      set tStart to ((activation date of t) as «class isot» as string)
    end try
    set tProj to ""
    try
      set tProj to name of project of t
    end try
    set tArea to ""
    try
      set tArea to name of area of t
    end try
    set tTagsOut to tag names of t

    return "{\\"id\\":" & my jsonEscape(tid) & ",\\"name\\":" & my jsonEscape(tName) & ",\\"notes\\":" & my jsonEscape(tNotes) & ",\\"status\\":" & my jsonEscape(tStatus) & ",\\"dueDate\\":" & my jsonEscape(tDue) & ",\\"startDate\\":" & my jsonEscape(tStart) & ",\\"project\\":" & my jsonEscape(tProj) & ",\\"area\\":" & my jsonEscape(tArea) & ",\\"tagNames\\":" & my jsonEscape(tTagsOut) & "}"
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const output = await this.runner.execute(script, [
      title,
      notes,
      when,
      deadline,
      project,
      area,
      tags,
    ]);
    const raw = parseAppleScriptJson<RawThingsTodo>(output);
    if (!raw) {
      throw new ThingsNotFoundError('Failed to create to do item.');
    }
    return parseRawTodo(raw);
  }

  /**
   * Create a new Things project.
   */
  async createProject(input: CreateProjectInput): Promise<ThingsProject> {
    if (!input.title || input.title.trim() === '') {
      throw new ThingsInvalidInputError('Project title cannot be empty.');
    }

    const title = input.title.trim();
    const notes = input.notes || '';
    const when = input.when?.trim() || '';
    const deadline = input.deadline?.trim() || '';
    const area = input.area?.trim() || '';
    const tags = input.tags ? input.tags.join(', ') : '';

    const script = `
on run argv
  set pTitle to item 1 of argv
  set pNotes to item 2 of argv
  set pWhen to item 3 of argv
  set pDeadline to item 4 of argv
  set pArea to item 5 of argv
  set pTags to item 6 of argv

  tell application "Things3"
    set targetArea to missing value
    if pArea is not "" then
      try
        set targetArea to area pArea
      on error
        try
          set targetArea to (first area whose id is pArea)
        on error
          try
            set targetArea to (first area whose name is pArea)
          on error
            try
              set targetArea to (first area whose name contains pArea)
            on error
              error "Area not found: " & pArea
            end try
          end try
        end try
      end try
    end if

    set newProps to {name:pTitle}
    if pNotes is not "" then
      set newProps to newProps & {notes:pNotes}
    end if
    if pTags is not "" then
      set newProps to newProps & {tag names:pTags}
    end if
    if targetArea is not missing value then
      set newProps to newProps & {area:targetArea}
    end if

    if pDeadline is not "" then
      try
        set dDate to (date pDeadline)
        set newProps to newProps & {due date:dDate}
      on error
        -- try ISO parsing or fallback
      end try
    end if

    set p to make new project with properties newProps

    if pWhen is not "" then
      set lowerWhen to pWhen
      if lowerWhen is "today" then
        move p to list "Today"
      else if lowerWhen is "tomorrow" then
        move p to list "Tomorrow"
      else if lowerWhen is "someday" then
        move p to list "Someday"
      else if lowerWhen is "anytime" then
        move p to list "Anytime"
      else
        try
          set sDate to (date pWhen)
          set activation date of p to sDate
        on error
          -- schedule fallback
        end try
      end if
    end if

    set pId to id of p
    set pName to name of p
    set pStatus to status of p as text
    set pAreaName to ""
    try
      set pAreaName to name of area of p
    end try

    return "{\\"id\\":" & my jsonEscape(pId) & ",\\"name\\":" & my jsonEscape(pName) & ",\\"status\\":" & my jsonEscape(pStatus) & ",\\"area\\":" & my jsonEscape(pAreaName) & "}"
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;

    const output = await this.runner.execute(script, [
      title,
      notes,
      when,
      deadline,
      area,
      tags,
    ]);
    const raw = parseAppleScriptJson<RawThingsProject>(output);
    if (!raw) {
      throw new ThingsNotFoundError('Failed to create project.');
    }
    return parseRawProject(raw);
  }

  /**
   * Create a Things list (a project) under a List Group (an AppleScript area).
   */
  async createList(input: CreateListInput): Promise<ThingsProject> {
    return this.createProject({
      title: input.title,
      notes: input.notes,
      when: input.when,
      deadline: input.deadline,
      area: input.listGroup,
      tags: input.tags,
    });
  }

  /**
   * Return tasks in a Things list. Things exposes lists as projects in AppleScript.
   */
  async listListItems(input: ListListItemsInput): Promise<{ items: ThingsTodo[] }> {
    if (!input.list || input.list.trim() === '') {
      throw new ThingsInvalidInputError('List name or ID is required.');
    }

    const list = input.list.trim();
    const includeCompleted = input.includeCompleted ? 'true' : 'false';
    const script = `
on run argv
  set requestedList to item 1 of argv
  set includeCompleted to item 2 of argv

  tell application "Things3"
    set p to missing value
    try
      set p to project requestedList
    on error
      try
        set p to (first project whose id is requestedList)
      on error
        try
          set p to (first project whose name is requestedList)
        on error
          try
            set p to (first project whose name contains requestedList)
          on error
            error "List not found: " & requestedList
          end try
        end try
      end try
    end try

    set res to "["
    set isFirst to true
    repeat with t in to dos of p
      set includeItem to true
      if includeCompleted is "false" and status of t is not open then
        set includeItem to false
      end if

      if includeItem then
        if not isFirst then
          set res to res & ","
        end if
        set isFirst to false

        set tid to id of t
        set tName to name of t
        set tNotes to notes of t
        set tStatus to status of t as text
        set tDue to ""
        try
          set tDue to ((due date of t) as «class isot» as string)
        end try
        set tStart to ""
        try
          set tStart to ((activation date of t) as «class isot» as string)
        end try
        set tProj to ""
        try
          set tProj to name of project of t
        end try
        set tArea to ""
        try
          set tArea to name of area of t
        end try
        set tTags to tag names of t

        set tJson to "{\\"id\\":" & my jsonEscape(tid) & ",\\"name\\":" & my jsonEscape(tName) & ",\\"notes\\":" & my jsonEscape(tNotes) & ",\\"status\\":" & my jsonEscape(tStatus) & ",\\"dueDate\\":" & my jsonEscape(tDue) & ",\\"startDate\\":" & my jsonEscape(tStart) & ",\\"project\\":" & my jsonEscape(tProj) & ",\\"area\\":" & my jsonEscape(tArea) & ",\\"tagNames\\":" & my jsonEscape(tTags) & "}"
        set res to res & tJson
      end if
    end repeat
    set res to res & "]"
    return res
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const output = await this.runner.execute(script, [list, includeCompleted]);
    const rawList = parseAppleScriptJson<RawThingsTodo[]>(output) || [];
    return { items: rawList.map(parseRawTodo) };
  }

  /**
   * Update an existing Things list (a project) by its stable ID.
   */
  async updateList(input: UpdateListInput): Promise<ThingsProject> {
    if (!input.id || input.id.trim() === '') {
      throw new ThingsInvalidInputError('List ID is required.');
    }

    const id = input.id.trim();
    const title = input.title !== undefined ? input.title : '__UNSET__';
    const notes = input.notes !== undefined ? input.notes : '__UNSET__';
    const when = input.when !== undefined ? input.when : '__UNSET__';
    const deadline = input.deadline !== undefined ? input.deadline : '__UNSET__';
    const listGroup = input.listGroup !== undefined ? input.listGroup : '__UNSET__';
    const tags = input.tags !== undefined ? input.tags.join(', ') : '__UNSET__';

    const script = `
on run argv
  set targetId to item 1 of argv
  set newTitle to item 2 of argv
  set newNotes to item 3 of argv
  set newWhen to item 4 of argv
  set newDeadline to item 5 of argv
  set newListGroup to item 6 of argv
  set newTags to item 7 of argv

  tell application "Things3"
    set p to missing value
    try
      set p to (first project whose id is targetId)
    on error
      error "List not found with id: " & targetId
    end try

    if newTitle is not "__UNSET__" then
      set name of p to newTitle
    end if

    if newNotes is not "__UNSET__" then
      set notes of p to newNotes
    end if

    if newTags is not "__UNSET__" then
      set tag names of p to newTags
    end if

    if newDeadline is not "__UNSET__" then
      if newDeadline is "" or newDeadline is "null" or newDeadline is "none" then
        set due date of p to missing value
      else
        try
          set dDate to (date newDeadline)
          set due date of p to dDate
        on error
          -- Leave the deadline unchanged when Things cannot parse the value.
        end try
      end if
    end if

    if newListGroup is not "__UNSET__" then
      if newListGroup is "" or newListGroup is "null" or newListGroup is "none" then
        set area of p to missing value
      else
        set targetArea to missing value
        try
          set targetArea to area newListGroup
        on error
          try
            set targetArea to (first area whose id is newListGroup)
          on error
            try
              set targetArea to (first area whose name is newListGroup)
            on error
              try
                set targetArea to (first area whose name contains newListGroup)
              on error
                error "List Group not found: " & newListGroup
              end try
            end try
          end try
        end try
        set area of p to targetArea
      end if
    end if

    if newWhen is not "__UNSET__" then
      if newWhen is "" or newWhen is "anytime" then
        move p to list "Anytime"
      else if newWhen is "today" then
        move p to list "Today"
      else if newWhen is "tomorrow" then
        move p to list "Tomorrow"
      else if newWhen is "someday" then
        move p to list "Someday"
      else
        try
          set sDate to (date newWhen)
          set activation date of p to sDate
        on error
          -- Leave the schedule unchanged when Things cannot parse the value.
        end try
      end if
    end if

    set pId to id of p
    set pName to name of p
    set pStatus to status of p as text
    set pAreaName to ""
    try
      set pAreaName to name of area of p
    end try

    return "{\\"id\\":" & my jsonEscape(pId) & ",\\"name\\":" & my jsonEscape(pName) & ",\\"status\\":" & my jsonEscape(pStatus) & ",\\"area\\":" & my jsonEscape(pAreaName) & "}"
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const output = await this.runner.execute(script, [id, title, notes, when, deadline, listGroup, tags]);
    const raw = parseAppleScriptJson<RawThingsProject>(output);
    if (!raw) {
      throw new ThingsNotFoundError(`List with id '${id}' not found.`);
    }
    return parseRawProject(raw);
  }

  /** Return a Things task by its stable ID. */
  async getTodo(input: IdInput): Promise<ThingsTodo> {
    if (!input.id || input.id.trim() === '') {
      throw new ThingsInvalidInputError('Task ID is required.');
    }

    const id = input.id.trim();
    const script = `
on run argv
  set targetId to item 1 of argv
  tell application "Things3"
    set t to missing value
    try
      set t to (first to do whose id is targetId)
    on error
      error "Task not found with id: " & targetId
    end try
${TODO_RESPONSE_APPLESCRIPT}  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const raw = parseAppleScriptJson<RawThingsTodo>(await this.runner.execute(script, [id]));
    if (!raw) {
      throw new ThingsNotFoundError(`Task with id '${id}' not found.`);
    }
    return parseRawTodo(raw);
  }

  /** Return a Things list (a project) by its stable ID. */
  async getList(input: IdInput): Promise<ThingsProject> {
    if (!input.id || input.id.trim() === '') {
      throw new ThingsInvalidInputError('List ID is required.');
    }

    const id = input.id.trim();
    const script = `
on run argv
  set targetId to item 1 of argv
  tell application "Things3"
    set p to missing value
    try
      set p to (first project whose id is targetId)
    on error
      error "List not found with id: " & targetId
    end try
${PROJECT_RESPONSE_APPLESCRIPT}  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const raw = parseAppleScriptJson<RawThingsProject>(await this.runner.execute(script, [id]));
    if (!raw) {
      throw new ThingsNotFoundError(`List with id '${id}' not found.`);
    }
    return parseRawProject(raw);
  }

  /** Change a Things list's lifecycle status. */
  async setListStatus(input: SetListStatusInput): Promise<ThingsProject> {
    if (!input.id || input.id.trim() === '') {
      throw new ThingsInvalidInputError('List ID is required.');
    }

    const id = input.id.trim();
    const script = `
on run argv
  set targetId to item 1 of argv
  set targetStatus to item 2 of argv
  tell application "Things3"
    set p to missing value
    try
      set p to (first project whose id is targetId)
    on error
      error "List not found with id: " & targetId
    end try

    if targetStatus is "completed" then
      set status of p to completed
    else if targetStatus is "canceled" then
      set status of p to canceled
    else if targetStatus is "open" then
      set status of p to open
    else
      error "Unsupported list status: " & targetStatus
    end if
${PROJECT_RESPONSE_APPLESCRIPT}  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const raw = parseAppleScriptJson<RawThingsProject>(await this.runner.execute(script, [id, input.status]));
    if (!raw) {
      throw new ThingsNotFoundError(`List with id '${id}' not found.`);
    }
    return parseRawProject(raw);
  }

  /** Create a Things List Group (an AppleScript area). */
  async createListGroup(input: CreateListGroupInput): Promise<ThingsListGroup> {
    if (!input.name || input.name.trim() === '') {
      throw new ThingsInvalidInputError('List Group name cannot be empty.');
    }

    const name = input.name.trim();
    const tags = input.tags ? input.tags.join(', ') : '';
    const script = `
on run argv
  set groupName to item 1 of argv
  set groupTags to item 2 of argv
  tell application "Things3"
    set props to {name:groupName}
    if groupTags is not "" then
      set props to props & {tag names:groupTags}
    end if
    set a to make new area with properties props
    return "{\\"id\\":" & my jsonEscape(id of a) & ",\\"name\\":" & my jsonEscape(name of a) & "}"
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const raw = parseAppleScriptJson<RawThingsListGroup>(await this.runner.execute(script, [name, tags]));
    if (!raw) {
      throw new ThingsNotFoundError('Failed to create List Group.');
    }
    return parseRawListGroup(raw);
  }

  /** Rename a Things List Group or replace its tags. */
  async updateListGroup(input: UpdateListGroupInput): Promise<ThingsListGroup> {
    if (!input.id || input.id.trim() === '') {
      throw new ThingsInvalidInputError('List Group ID is required.');
    }

    const id = input.id.trim();
    const name = input.name !== undefined ? input.name : '__UNSET__';
    const tags = input.tags !== undefined ? input.tags.join(', ') : '__UNSET__';
    const script = `
on run argv
  set targetId to item 1 of argv
  set newName to item 2 of argv
  set newTags to item 3 of argv
  tell application "Things3"
    set a to missing value
    try
      set a to (first area whose id is targetId)
    on error
      error "List Group not found with id: " & targetId
    end try
    if newName is not "__UNSET__" then
      set name of a to newName
    end if
    if newTags is not "__UNSET__" then
      set tag names of a to newTags
    end if
    return "{\\"id\\":" & my jsonEscape(id of a) & ",\\"name\\":" & my jsonEscape(name of a) & "}"
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const raw = parseAppleScriptJson<RawThingsListGroup>(await this.runner.execute(script, [id, name, tags]));
    if (!raw) {
      throw new ThingsNotFoundError(`List Group with id '${id}' not found.`);
    }
    return parseRawListGroup(raw);
  }

  /** Permanently delete a Things List Group and move its children to the Trash. */
  async deleteListGroup(input: IdInput): Promise<{ id: string; deleted: true }> {
    if (!input.id || input.id.trim() === '') {
      throw new ThingsInvalidInputError('List Group ID is required.');
    }

    const id = input.id.trim();
    const script = `
on run argv
  set targetId to item 1 of argv
  tell application "Things3"
    set a to missing value
    try
      set a to (first area whose id is targetId)
    on error
      error "List Group not found with id: " & targetId
    end try
    delete a
    return "{\\"id\\":" & my jsonEscape(targetId) & ",\\"deleted\\":true}"
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    return parseAppleScriptJson<{ id: string; deleted: true }>(await this.runner.execute(script, [id]));
  }

  /** Return all Things tags. */
  async listTags(): Promise<{ tags: ThingsTag[] }> {
    const script = `
on run argv
  tell application "Things3"
    set res to "["
    set isFirst to true
    repeat with t in tags
      if not isFirst then
        set res to res & ","
      end if
      set isFirst to false
      set parentNameOut to ""
      try
        set parentNameOut to name of parent tag of t
      end try
      set res to res & "{\\"id\\":" & my jsonEscape(id of t) & ",\\"name\\":" & my jsonEscape(name of t) & ",\\"parentTag\\":" & my jsonEscape(parentNameOut) & "}"
    end repeat
    set res to res & "]"
    return res
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const rawTags = parseAppleScriptJson<RawThingsTag[]>(await this.runner.execute(script, [])) || [];
    return { tags: rawTags.map(parseRawTag) };
  }

  /** Create a Things tag. */
  async createTag(input: CreateTagInput): Promise<ThingsTag> {
    if (!input.name || input.name.trim() === '') {
      throw new ThingsInvalidInputError('Tag name cannot be empty.');
    }

    const name = input.name.trim();
    const parentTag = input.parentTag?.trim() || '';
    const script = `
on run argv
  set tagName to item 1 of argv
  set parentName to item 2 of argv
  tell application "Things3"
    set t to make new tag with properties {name:tagName}
    if parentName is not "" then
      set parent tag of t to tag parentName
    end if
    set parentNameOut to ""
    try
      set parentNameOut to name of parent tag of t
    end try
    return "{\\"id\\":" & my jsonEscape(id of t) & ",\\"name\\":" & my jsonEscape(name of t) & ",\\"parentTag\\":" & my jsonEscape(parentNameOut) & "}"
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const raw = parseAppleScriptJson<RawThingsTag>(await this.runner.execute(script, [name, parentTag]));
    if (!raw) {
      throw new ThingsNotFoundError('Failed to create tag.');
    }
    return parseRawTag(raw);
  }

  /** Rename a Things tag. */
  async updateTag(input: UpdateTagInput): Promise<ThingsTag> {
    if (!input.id || input.id.trim() === '' || (!input.name?.trim() && input.parentTag === undefined)) {
      throw new ThingsInvalidInputError('Tag ID and a name or parent tag are required.');
    }

    const id = input.id.trim();
    const name = input.name?.trim() || '__UNSET__';
    const parentTag = input.parentTag !== undefined ? input.parentTag.trim() : '__UNSET__';
    const script = `
on run argv
  set targetId to item 1 of argv
  set newName to item 2 of argv
  set newParent to item 3 of argv
  tell application "Things3"
    set t to missing value
    try
      set t to (first tag whose id is targetId)
    on error
      error "Tag not found with id: " & targetId
    end try
    if newName is not "__UNSET__" then set name of t to newName
    if newParent is not "__UNSET__" then
      if newParent is "" or newParent is "none" then
        set parent tag of t to missing value
      else
        set parent tag of t to tag newParent
      end if
    end if
    set parentNameOut to ""
    try
      set parentNameOut to name of parent tag of t
    end try
    return "{\\"id\\":" & my jsonEscape(id of t) & ",\\"name\\":" & my jsonEscape(name of t) & ",\\"parentTag\\":" & my jsonEscape(parentNameOut) & "}"
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const raw = parseAppleScriptJson<RawThingsTag>(await this.runner.execute(script, [id, name, parentTag]));
    if (!raw) {
      throw new ThingsNotFoundError(`Tag with id '${id}' not found.`);
    }
    return parseRawTag(raw);
  }

  /** Move a Things tag to the Trash. */
  async deleteTag(input: IdInput): Promise<{ id: string; deleted: true }> {
    if (!input.id || input.id.trim() === '') {
      throw new ThingsInvalidInputError('Tag ID is required.');
    }

    const id = input.id.trim();
    const script = `
on run argv
  set targetId to item 1 of argv
  tell application "Things3"
    set t to missing value
    try
      set t to (first tag whose id is targetId)
    on error
      error "Tag not found with id: " & targetId
    end try
    delete t
    return "{\\"id\\":" & my jsonEscape(targetId) & ",\\"deleted\\":true}"
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    return parseAppleScriptJson<{ id: string; deleted: true }>(await this.runner.execute(script, [id]));
  }

  /** Return tasks from all work, Logbook, Trash, a List Group, or a tag. */
  async listTodos(input: ListTodosInput = {}): Promise<{ items: ThingsTodo[] }> {
    const source = input.source || 'all';
    const listGroup = input.listGroup?.trim() || '';
    const tag = input.tag?.trim() || '';
    const status = input.status || '__ALL__';
    const script = `
on run argv
  set sourceName to item 1 of argv
  set groupName to item 2 of argv
  set tagName to item 3 of argv
  set statusName to item 4 of argv
  tell application "Things3"
    set tList to to dos
    if sourceName is "logbook" then
      set tList to to dos of list "Logbook"
    else if sourceName is "trash" then
      set tList to to dos of list "Trash"
    else if groupName is not "" then
      set a to missing value
      try
        set a to area groupName
      on error
        try
          set a to (first area whose id is groupName)
        on error
          set a to (first area whose name is groupName)
        end try
      end try
      set tList to to dos of a
    else if tagName is not "" then
      set tg to missing value
      try
        set tg to tag tagName
      on error
        try
          set tg to (first tag whose id is tagName)
        on error
          set tg to (first tag whose name is tagName)
        end try
      end try
      set tList to to dos of tg
    end if

    set res to "["
    set isFirst to true
    repeat with t in tList
      set includeItem to true
      if statusName is not "__ALL__" then
        if (status of t as text) is not statusName then set includeItem to false
      end if
      if includeItem then
        if not isFirst then set res to res & ","
        set isFirst to false
${TODO_JSON_APPEND_APPLESCRIPT}      end if
    end repeat
    set res to res & "]"
    return res
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const raw = parseAppleScriptJson<RawThingsTodo[]>(await this.runner.execute(script, [source, listGroup, tag, status])) || [];
    return { items: raw.map(parseRawTodo) };
  }

  /** Change a task's lifecycle status. */
  async setTodoStatus(input: SetListStatusInput): Promise<ThingsTodo> {
    if (!input.id || input.id.trim() === '') {
      throw new ThingsInvalidInputError('Task ID is required.');
    }
    const id = input.id.trim();
    const status = input.status;
    const script = `
on run argv
  set targetId to item 1 of argv
  set targetStatus to item 2 of argv
  tell application "Things3"
    set t to (first to do whose id is targetId)
    if targetStatus is "completed" then
      set status of t to completed
    else if targetStatus is "canceled" then
      set status of t to canceled
    else
      set status of t to open
    end if
${TODO_RESPONSE_APPLESCRIPT}  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const raw = parseAppleScriptJson<RawThingsTodo>(await this.runner.execute(script, [id, status]));
    if (!raw) throw new ThingsNotFoundError(`Task with id '${id}' not found.`);
    return parseRawTodo(raw);
  }

  /** Move a task into a selected Things list, List Group, built-in list, or detach it. */
  async moveTodo(input: MoveTodoInput): Promise<ThingsTodo> {
    if (input.list) {
      return this.updateTodo({ id: input.id, project: input.list.trim() });
    }
    if (!input.id || input.id.trim() === '') {
      throw new ThingsInvalidInputError('Task ID is required.');
    }
    if (!input.listGroup && !input.builtInList && !input.detachFromParent) {
      throw new ThingsInvalidInputError('Specify a destination list, List Group, built-in list, or detachFromParent.');
    }
    const id = input.id.trim();
    const listGroup = input.listGroup?.trim() || '';
    const builtInList = input.builtInList || '';
    const detach = input.detachFromParent ? 'true' : 'false';
    const script = `
on run argv
  set targetId to item 1 of argv
  set groupName to item 2 of argv
  set builtInName to item 3 of argv
  set detachItem to item 4 of argv
  tell application "Things3"
    set t to (first to do whose id is targetId)
    if groupName is not "" then
      set a to missing value
      try
        set a to area groupName
      on error
        try
          set a to (first area whose id is groupName)
        on error
          set a to (first area whose name is groupName)
        end try
      end try
      set area of t to a
    else if builtInName is not "" then
      move t to list builtInName
    else if detachItem is "true" then
      try
        delete project of t
      end try
      try
        delete area of t
      end try
    end if
${TODO_RESPONSE_APPLESCRIPT}  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const raw = parseAppleScriptJson<RawThingsTodo>(await this.runner.execute(script, [id, listGroup, builtInList, detach]));
    return parseRawTodo(raw);
  }

  /** Send a task to the Things Trash. */
  async deleteTodo(input: IdInput): Promise<{ id: string; deleted: true }> {
    const id = input.id.trim();
    if (!id) throw new ThingsInvalidInputError('Task ID is required.');
    const script = `
on run argv
  tell application "Things3"
    set t to (first to do whose id is item 1 of argv)
    delete t
    return "{\\"id\\":" & my jsonEscape(item 1 of argv) & ",\\"deleted\\":true}"
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    return parseAppleScriptJson(await this.runner.execute(script, [id]));
  }

  /** Send a list (project) to the Things Trash. */
  async deleteList(input: IdInput): Promise<{ id: string; deleted: true }> {
    const id = input.id.trim();
    if (!id) throw new ThingsInvalidInputError('List ID is required.');
    const script = `
on run argv
  tell application "Things3"
    set p to (first project whose id is item 1 of argv)
    delete p
    return "{\\"id\\":" & my jsonEscape(item 1 of argv) & ",\\"deleted\\":true}"
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    return parseAppleScriptJson(await this.runner.execute(script, [id]));
  }

  /** Apply the same status, list, schedule, or tags to multiple tasks. */
  async bulkUpdateTodos(input: BulkUpdateTodosInput): Promise<{ items: ThingsTodo[]; errors: Array<{ id: string; error: string }>; dryRun: boolean }> {
    if (input.ids.length === 0) throw new ThingsInvalidInputError('Provide at least one task ID.');
    if (!input.status && !input.list && !input.when && input.tags === undefined) {
      throw new ThingsInvalidInputError('Provide at least one bulk update operation.');
    }
    const items: ThingsTodo[] = [];
    const errors: Array<{ id: string; error: string }> = [];
    for (const id of input.ids) {
      try {
        if (input.dryRun) {
          items.push(await this.getTodo({ id }));
          continue;
        }
        if (input.status) await this.setTodoStatus({ id, status: input.status });
        let item = await this.updateTodo({ id, project: input.list, when: input.when, tags: input.tags });
        if (input.status) item = await this.getTodo({ id });
        items.push(item);
      } catch (error) {
        errors.push({ id, error: error instanceof Error ? error.message : String(error) });
      }
    }
    return { items, errors, dryRun: Boolean(input.dryRun) };
  }

  /** Add notes or tags without replacing the task's existing metadata. */
  async augmentTodo(input: AugmentTodoInput): Promise<ThingsTodo> {
    if (!input.prependNotes && !input.appendNotes && (!input.addTags || input.addTags.length === 0)) {
      throw new ThingsInvalidInputError('Provide notes or tags to add.');
    }
    const existing = await this.getTodo({ id: input.id });
    const notes = `${input.prependNotes || ''}${input.prependNotes && existing.notes ? '\n' : ''}${existing.notes || ''}${input.appendNotes && existing.notes ? '\n' : ''}${input.appendNotes || ''}`;
    const tags = [...new Set([...existing.tags, ...(input.addTags || [])])];
    return this.updateTodo({ id: input.id, notes: input.prependNotes || input.appendNotes ? notes : undefined, tags: input.addTags ? tags : undefined });
  }

  /**
   * Replace, prepend, or append checklist items through Things' authorised URL scheme.
   * Things does not expose checklist entries as AppleScript objects.
   */
  async updateTodoChecklist(input: UpdateTodoChecklistInput): Promise<ThingsTodo> {
    if (!input.id || input.id.trim() === '' || !input.authToken.trim()) {
      throw new ThingsInvalidInputError('Task ID and Things URL-scheme authorisation token are required.');
    }
    if (input.mode !== 'replace' && input.items.length === 0) {
      throw new ThingsInvalidInputError('Provide at least one checklist item when prepending or appending.');
    }

    const id = input.id.trim();
    const url = buildThingsUpdateUrl({
      id,
      authToken: input.authToken,
      checklistMode: input.mode,
      checklistItems: input.items,
    });
    const script = `
on run argv
  set targetUrl to item 1 of argv
  set targetId to item 2 of argv
  tell application "Things3"
    open location targetUrl
    delay 0.3
    set t to missing value
    try
      set t to (first to do whose id is targetId)
    on error
      error "Task not found with id: " & targetId
    end try
${TODO_RESPONSE_APPLESCRIPT}  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const raw = parseAppleScriptJson<RawThingsTodo>(await this.runner.execute(script, [url, id]));
    if (!raw) {
      throw new ThingsNotFoundError(`Task with id '${id}' not found.`);
    }
    return parseRawTodo(raw);
  }

  /** Duplicate a task through Things' authorised URL scheme and give the copy a new title. */
  async duplicateTodo(input: DuplicateTodoInput): Promise<ThingsTodo> {
    if (!input.id.trim() || !input.authToken.trim() || !input.title.trim()) {
      throw new ThingsInvalidInputError('Task ID, authorisation token, and new title are required.');
    }
    const id = input.id.trim();
    const title = input.title.trim();
    const url = buildThingsItemUpdateUrl({ id, authToken: input.authToken, title, duplicate: true });
    const script = `
on run argv
  set targetUrl to item 1 of argv
  set targetTitle to item 2 of argv
  tell application "Things3"
    open location targetUrl
    delay 0.3
    set t to last item of (to dos whose name is targetTitle)
${TODO_RESPONSE_APPLESCRIPT}  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const raw = parseAppleScriptJson<RawThingsTodo>(await this.runner.execute(script, [url, title]));
    if (!raw) throw new ThingsNotFoundError('Things did not return the duplicated task.');
    return parseRawTodo(raw);
  }

  /** Duplicate a list through Things' authorised URL scheme and give the copy a new title. */
  async duplicateList(input: DuplicateListInput): Promise<ThingsProject> {
    if (!input.id.trim() || !input.authToken.trim() || !input.title.trim()) {
      throw new ThingsInvalidInputError('List ID, authorisation token, and new title are required.');
    }
    const id = input.id.trim();
    const title = input.title.trim();
    const url = buildThingsItemUpdateUrl({ id, authToken: input.authToken, title, duplicate: true, project: true });
    const script = `
on run argv
  set targetUrl to item 1 of argv
  set targetTitle to item 2 of argv
  tell application "Things3"
    open location targetUrl
    delay 0.3
    set p to last item of (projects whose name is targetTitle)
${PROJECT_RESPONSE_APPLESCRIPT}  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const raw = parseAppleScriptJson<RawThingsProject>(await this.runner.execute(script, [url, title]));
    if (!raw) throw new ThingsNotFoundError('Things did not return the duplicated list.');
    return parseRawProject(raw);
  }

  /** Set a date-and-time schedule through Things' authorised URL scheme, creating a reminder. */
  async setTodoReminder(input: SetTodoReminderInput): Promise<ThingsTodo> {
    if (!input.id.trim() || !input.authToken.trim() || !input.when.trim()) {
      throw new ThingsInvalidInputError('Task ID, authorisation token, and reminder date-time are required.');
    }
    const id = input.id.trim();
    const url = buildThingsItemUpdateUrl({ id, authToken: input.authToken, when: input.when.trim() });
    const script = `
on run argv
  set targetUrl to item 1 of argv
  set targetId to item 2 of argv
  tell application "Things3"
    open location targetUrl
    delay 0.3
    set t to (first to do whose id is targetId)
${TODO_RESPONSE_APPLESCRIPT}  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const raw = parseAppleScriptJson<RawThingsTodo>(await this.runner.execute(script, [url, id]));
    if (!raw) throw new ThingsNotFoundError(`Task with id '${id}' not found.`);
    return parseRawTodo(raw);
  }

  /** Return lists filtered by lifecycle source, List Group, tag, or status. */
  async listLists(input: ListListsInput = {}): Promise<{ lists: ThingsProject[] }> {
    const source = input.source || 'all';
    const group = input.listGroup?.trim() || '';
    const tag = input.tag?.trim() || '';
    const status = input.status || '__ALL__';
    const script = `
on run argv
  set sourceName to item 1 of argv
  set groupName to item 2 of argv
  set tagName to item 3 of argv
  set statusName to item 4 of argv
  tell application "Things3"
    set pList to projects
    if sourceName is "logbook" then set pList to projects of list "Logbook"
    if sourceName is "trash" then set pList to projects of list "Trash"
    if groupName is not "" then set pList to projects of area groupName
    if tagName is not "" then set pList to projects of tag tagName
    set res to "["
    set isFirst to true
    repeat with p in pList
      if statusName is "__ALL__" or (status of p as text) is statusName then
        if not isFirst then set res to res & ","
        set isFirst to false
        set pId to id of p
        set pName to name of p
        set pStatus to status of p as text
        set pAreaName to ""
        try
          set pAreaName to name of area of p
        end try
        set res to res & "{\\"id\\":" & my jsonEscape(pId) & ",\\"name\\":" & my jsonEscape(pName) & ",\\"status\\":" & my jsonEscape(pStatus) & ",\\"area\\":" & my jsonEscape(pAreaName) & "}"
      end if
    end repeat
    set res to res & "]"
    return res
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const raw = parseAppleScriptJson<RawThingsProject[]>(await this.runner.execute(script, [source, group, tag, status])) || [];
    return { lists: raw.map(parseRawProject) };
  }

  /** Add list notes or tags without replacing current values. */
  async augmentList(input: AugmentListInput): Promise<ThingsProject> {
    if (!input.id?.trim() || (!input.prependNotes && !input.appendNotes && (!input.addTags || input.addTags.length === 0))) {
      throw new ThingsInvalidInputError('List ID and notes or tags to add are required.');
    }
    const id = input.id.trim();
    const prepend = input.prependNotes || '';
    const append = input.appendNotes || '';
    const tags = input.addTags?.join(', ') || '';
    const script = `
on run argv
  set targetId to item 1 of argv
  set prependText to item 2 of argv
  set appendText to item 3 of argv
  set addTagNames to item 4 of argv
  tell application "Things3"
    set p to (first project whose id is targetId)
    if prependText is not "" then set notes of p to prependText & linefeed & notes of p
    if appendText is not "" then set notes of p to notes of p & linefeed & appendText
    if addTagNames is not "" then
      set currentTags to tag names of p
      if currentTags is "" then set tag names of p to addTagNames
      if currentTags is not "" then set tag names of p to currentTags & ", " & addTagNames
    end if
${PROJECT_RESPONSE_APPLESCRIPT}  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const raw = parseAppleScriptJson<RawThingsProject>(await this.runner.execute(script, [id, prepend, append, tags]));
    if (!raw) throw new ThingsNotFoundError(`List with id '${id}' not found.`);
    return parseRawProject(raw);
  }

  /** Reveal an item in the Things user interface. */
  async revealItem(input: IdInput): Promise<{ id: string; revealed: true }> {
    const id = input.id.trim();
    if (!id) throw new ThingsInvalidInputError('Item ID is required.');
    const script = `
on run argv
  tell application "Things3"
    open location ("things:///show?id=" & item 1 of argv)
    return "{\\"id\\":" & my jsonEscape(item 1 of argv) & ",\\"revealed\\":true}"
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    return parseAppleScriptJson(await this.runner.execute(script, [id]));
  }

  /** Permanently empty the Things Trash after an explicit confirmation value. */
  async emptyTrash(confirm: string): Promise<{ emptied: true }> {
    if (confirm !== 'EMPTY_TRASH') throw new ThingsInvalidInputError('Set confirm to EMPTY_TRASH to permanently empty the Things Trash.');
    const script = `
on run argv
  tell application "Things3"
    empty trash
    return "{\\"emptied\\":true}"
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    return parseAppleScriptJson(await this.runner.execute(script, []));
  }

  /**
   * Update an existing Things task by Things ID.
   */
  async updateTodo(input: UpdateTodoInput): Promise<ThingsTodo> {
    if (!input.id || input.id.trim() === '') {
      throw new ThingsInvalidInputError('Task ID is required.');
    }

    const id = input.id.trim();
    const title = input.title !== undefined ? input.title : '__UNSET__';
    const notes = input.notes !== undefined ? input.notes : '__UNSET__';
    const when = input.when !== undefined ? input.when : '__UNSET__';
    const deadline = input.deadline !== undefined ? input.deadline : '__UNSET__';
    const project = input.project !== undefined ? input.project : '__UNSET__';
    const tags = input.tags !== undefined ? input.tags.join(', ') : '__UNSET__';

    const script = `
on run argv
  set targetId to item 1 of argv
  set newTitle to item 2 of argv
  set newNotes to item 3 of argv
  set newWhen to item 4 of argv
  set newDeadline to item 5 of argv
  set newProject to item 6 of argv
  set newTags to item 7 of argv

  tell application "Things3"
    set t to missing value
    try
      set t to (first to do whose id is targetId)
    on error
      error "Item not found with id: " & targetId
    end try

    if t is missing value then
      error "Item not found with id: " & targetId
    end if

    if newTitle is not "__UNSET__" then
      set name of t to newTitle
    end if

    if newNotes is not "__UNSET__" then
      set notes of t to newNotes
    end if

    if newTags is not "__UNSET__" then
      set tag names of t to newTags
    end if

    if newDeadline is not "__UNSET__" then
      if newDeadline is "" or newDeadline is "null" or newDeadline is "none" then
        set due date of t to missing value
      else
        try
          set dDate to (date newDeadline)
          set due date of t to dDate
        on error
          -- fallback
        end try
      end if
    end if

    if newProject is not "__UNSET__" then
      if newProject is "" or newProject is "null" or newProject is "none" then
        set project of t to missing value
      else
        try
          set p to project newProject
          set project of t to p
        on error
          try
            set p to (first project whose id is newProject)
            set project of t to p
          on error
            try
              set p to (first project whose name is newProject)
              set project of t to p
            on error
              try
                set p to (first project whose name contains newProject)
                set project of t to p
              on error
                error "Project not found: " & newProject
              end try
            end try
          end try
        end try
      end if
    end if

    if newWhen is not "__UNSET__" then
      if newWhen is "" or newWhen is "anytime" then
        move t to list "Anytime"
      else if newWhen is "today" then
        move t to list "Today"
      else if newWhen is "tomorrow" then
        move t to list "Tomorrow"
      else if newWhen is "someday" then
        move t to list "Someday"
      else
        try
          set sDate to (date newWhen)
          set activation date of t to sDate
        on error
          -- ignore
        end try
      end if
    end if

    set tid to id of t
    set tName to name of t
    set tNotes to notes of t
    set tStatus to status of t as text
    set tDue to ""
    try
      set tDue to ((due date of t) as «class isot» as string)
    end try
    set tStart to ""
    try
      set tStart to ((activation date of t) as «class isot» as string)
    end try
    set tProj to ""
    try
      set tProj to name of project of t
    end try
    set tArea to ""
    try
      set tArea to name of area of t
    end try
    set tTagsOut to tag names of t

    return "{\\"id\\":" & my jsonEscape(tid) & ",\\"name\\":" & my jsonEscape(tName) & ",\\"notes\\":" & my jsonEscape(tNotes) & ",\\"status\\":" & my jsonEscape(tStatus) & ",\\"dueDate\\":" & my jsonEscape(tDue) & ",\\"startDate\\":" & my jsonEscape(tStart) & ",\\"project\\":" & my jsonEscape(tProj) & ",\\"area\\":" & my jsonEscape(tArea) & ",\\"tagNames\\":" & my jsonEscape(tTagsOut) & "}"
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const output = await this.runner.execute(script, [
      id,
      title,
      notes,
      when,
      deadline,
      project,
      tags,
    ]);
    const raw = parseAppleScriptJson<RawThingsTodo>(output);
    if (!raw) {
      throw new ThingsNotFoundError(`Item with id '${id}' not found.`);
    }
    return parseRawTodo(raw);
  }

  /**
   * Mark a task complete by Things ID.
   */
  async completeTodo(input: CompleteTodoInput): Promise<ThingsTodo> {
    if (!input.id || input.id.trim() === '') {
      throw new ThingsInvalidInputError('Task ID is required.');
    }

    const id = input.id.trim();
    const script = `
on run argv
  set targetId to item 1 of argv
  tell application "Things3"
    set t to missing value
    try
      set t to (first to do whose id is targetId)
    on error
      error "Item not found with id: " & targetId
    end try

    if t is missing value then
      error "Item not found with id: " & targetId
    end if

    set status of t to completed

    set tid to id of t
    set tName to name of t
    set tNotes to notes of t
    set tStatus to status of t as text
    set tDue to ""
    try
      set tDue to ((due date of t) as «class isot» as string)
    end try
    set tStart to ""
    try
      set tStart to ((activation date of t) as «class isot» as string)
    end try
    set tProj to ""
    try
      set tProj to name of project of t
    end try
    set tArea to ""
    try
      set tArea to name of area of t
    end try
    set tTagsOut to tag names of t

    return "{\\"id\\":" & my jsonEscape(tid) & ",\\"name\\":" & my jsonEscape(tName) & ",\\"notes\\":" & my jsonEscape(tNotes) & ",\\"status\\":" & my jsonEscape(tStatus) & ",\\"dueDate\\":" & my jsonEscape(tDue) & ",\\"startDate\\":" & my jsonEscape(tStart) & ",\\"project\\":" & my jsonEscape(tProj) & ",\\"area\\":" & my jsonEscape(tArea) & ",\\"tagNames\\":" & my jsonEscape(tTagsOut) & "}"
  end tell
end run
` + JSON_ESCAPE_APPLESCRIPT;
    const output = await this.runner.execute(script, [id]);
    const raw = parseAppleScriptJson<RawThingsTodo>(output);
    if (!raw) {
      throw new ThingsNotFoundError(`Item with id '${id}' not found.`);
    }
    return parseRawTodo(raw);
  }
}
