import {
  ThingsTodo,
  ThingsProject,
  ThingsSearchResult,
  CreateTodoInput,
  CreateProjectInput,
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
import { buildThingsAddUrl } from '../lib/thingsUrl.js';
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
