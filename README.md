# things-mcp

A safe, local Model Context Protocol (MCP) server written in Node.js and TypeScript that integrates with Things 3 on macOS.

This server lets MCP clients (such as Codex, Claude Desktop, ChatGPT desktop app, Cursor, etc.) interact safely with your local Things 3 database without directly touching SQLite database files or exposing raw shell/AppleScript execution tools.

---

## Features & Safety Guarantees

- **Supported APIs Only**: Operates via Things 3 AppleScript scripting interface (`/usr/bin/osascript` using Node's `execFile`) and official Things URL scheme (`things:///add`).
- **No Direct Database Access**: Never accesses Things 3 SQLite or file storage directly.
- **No Cloud Credentials Required**: Uses only local macOS inter-process communication.
- **Safe Execution**: No raw `run_applescript` or `execute_shell` tools are exposed. All inputs are validated with **Zod** schemas and arguments are strictly escaped and passed via `argv`.
- **Stdio Transport**: Runs over standard input/output with diagnostic logging redirected strictly to `stderr`.
- **Structured JSON Output**: All tools return structured JSON payloads with normalized data structures and `null` for empty fields.

---

## Things Identifiers & Design Decision

Things 3 assigns unique, persistent internal alphanumeric IDs to every task and project (e.g. `TyfyvfSRdg1DoMRNPHrhVD` or `5UFZfzcWv7qLj8vFvFFPCs`).

In this MCP server:
- All returned tasks (`ThingsTodo`) and projects (`ThingsProject`) expose their internal scripting `id` property.
- Subsequent updates (`things_update_todo`) and completions (`things_complete_todo`) use this stable `id` rather than task titles, ensuring reliable targeting even if task titles are changed or duplicated.

---

## Installation & Setup

### Requirements
- macOS with [Things 3](https://culturedcode.com/things/) installed
- Node.js (v18+ recommended, tested with v20+)
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Project
```bash
npm run build
```

### 3. Running the Server Locally
```bash
npm start
```
Or for development with automatic TypeScript compilation:
```bash
npm run dev
```

---

## macOS Automation Permissions

When an MCP client launches `things-mcp` for the first time, macOS will display an Automation permission prompt:

> **"[Your Terminal / Claude / Codex / Node]" wants access to control "Things3".**

1. Click **Allow** / **OK**.
2. If access was previously denied or missed, grant it manually:
   - Open **System Settings** > **Privacy & Security** > **Automation**.
   - Under your client app (e.g., Terminal, iTerm, Claude, or Codex), ensure **Things3** is checked / enabled.

---

## MCP Client Configuration

### Claude Desktop Configuration
Add the server configuration to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "things": {
      "command": "node",
      "args": [
        "/Users/midnite/code/things-mcp/dist/index.js"
      ]
    }
  }
}
```

### TOML Configuration (e.g., Codex / config.toml)
For clients using TOML configuration (such as Codex CLI or IDE plugins):

```toml
[mcp_servers.things]
command = "node"
args = ["/Users/midnite/code/things-mcp/dist/index.js"]
```

### Generic JSON Configuration
For clients accepting stdio server commands in JSON:

```json
{
  "command": "node",
  "args": ["/Users/midnite/code/things-mcp/dist/index.js"],
  "env": {}
}
```

---

## Available MCP Tools

### 1. `things_list_today`
Returns open (incomplete) tasks from the **Today** list.

**Output Example:**
```json
{
  "items": [
    {
      "id": "TyfyvfSRdg1DoMRNPHrhVD",
      "title": "Review SSO changes",
      "notes": "Ensure SAML assertions are verified",
      "status": "open",
      "dueDate": "2026-10-01T00:00:00Z",
      "startDate": "2026-09-18T00:00:00Z",
      "project": "Work",
      "area": null,
      "tags": ["security", "review"]
    }
  ]
}
```

### 2. `things_list_inbox`
Returns open items from the Things **Inbox**.

### 3. `things_list_upcoming`
Returns upcoming scheduled tasks.

**Arguments:**
- `days` *(optional, number)*: Number of days ahead to inspect.

### 4. `things_list_projects`
Returns all projects and metadata.

**Output Example:**
```json
{
  "projects": [
    {
      "id": "5UFZfzcWv7qLj8vFvFFPCs",
      "name": "General Bugs",
      "area": "Work",
      "status": "open"
    }
  ]
}
```

### 5. `things_search`
Searches tasks and projects by text query.

**Arguments:**
- `query` *(string, required)*: Query text to match in titles or notes.

### 6. `things_list_groups`
Returns Things **List Groups** (called **areas** by Things' AppleScript API), including each group's stable ID. Use `query` to look up a group by name, for example `{"query":"Work"}`.

### 7. `things_create_list`
Creates a Things list under a List Group. In Things' data model, a list is a project and a List Group is an area.

**Arguments:**
- `title` *(string, required)*: Name of the new list.
- `listGroup` *(string, required)*: List Group name or stable ID, for example `Work`.
- `notes`, `when`, `deadline`, `tags` *(optional)*: Project/list metadata.
- `items` *(optional)*: An ordered array of `heading` and `to-do` objects. A heading has `title` and optional `archived`; a task has `title` plus optional `notes`, `when`, `deadline`, `tags`, `checklist`, `completed`, and `canceled`.

### 8. `things_list_list_items`
Returns the tasks in a selected list, using its name or stable ID. Completed and cancelled tasks are omitted unless `includeCompleted` is `true`.

**Arguments:**
- `list` *(string, required)*: List name or stable ID.
- `includeCompleted` *(boolean, optional)*: Include completed and cancelled tasks.

### 9. `things_update_list`
Updates a list by stable ID. Its `listGroup` accepts a group name or ID; use `"none"` or an empty string to remove the group.

**Arguments:**
- `id` *(string, required)*: Stable ID of the list to update.
- `title`, `notes`, `when`, `deadline`, `listGroup`, `tags` *(optional)*: List properties to change.

### 10. `things_create_todo`
Creates a new task in Things 3.

**Arguments:**
- `title` *(string, required)*: Task title.
- `notes` *(string, optional)*: Notes or markdown description.
- `when` *(string, optional)*: Schedule target (`today`, `tomorrow`, `evening`, `anytime`, `someday`, or date string).
- `deadline` *(string, optional)*: Due date / deadline.
- `project` *(string, optional)*: Project name or ID.
- `area` *(string, optional)*: Area name or ID.
- `tags` *(string[], optional)*: Tags to apply.
- `checklist` *(string[], optional)*: List of checklist items.

### 11. `things_create_project`
Creates a new project in Things 3.

**Arguments:**
- `title` *(string, required)*: Project title / name.
- `notes` *(string, optional)*: Notes or markdown description.
- `when` *(string, optional)*: Schedule target (`today`, `tomorrow`, `anytime`, `someday`, or date string).
- `deadline` *(string, optional)*: Due date / deadline.
- `area` *(string, optional)*: Area name or ID to place the project under.
- `tags` *(string[], optional)*: Tags to apply.

### 12. `things_update_todo`
Updates an existing task by Things ID.

**Arguments:**
- `id` *(string, required)*: Unique Things task ID.
- `title` *(string, optional)*: New title.
- `notes` *(string, optional)*: New notes.
- `when` *(string, optional)*: Schedule target (`today`, `tomorrow`, `anytime`, `someday`, or date string).
- `deadline` *(string, optional)*: New deadline (or `"none"` / `""` to clear).
- `project` *(string, optional)*: Target project name or ID.
- `tags` *(string[], optional)*: New tags.

### 13. `things_complete_todo`
Marks a task complete by its Things ID.

**Arguments:**
- `id` *(string, required)*: Unique Things task ID.

### 14. List lifecycle and lookup

- `things_get_list`: Return a list by stable ID.
- `things_complete_list`: Mark a list completed.
- `things_cancel_list`: Mark a list cancelled.
- `things_reopen_list`: Reopen a completed or cancelled list.

Each tool accepts `id` *(string, required)*, the list's stable ID from `things_list_projects` or `things_create_list`.

### 15. Task lookup and movement

- `things_get_todo`: Return a task by stable ID.
- `things_move_todo`: Move a task to a destination list.

`things_move_todo` accepts `id` *(string, required)* and `list` *(string, required)*, which can be the destination list's name or stable ID.

### 16. List Group management

- `things_create_list_group`: Create a List Group with `name` and optional `tags`.
- `things_update_list_group`: Rename a List Group or replace its `tags` using `id`.
- `things_delete_list_group`: Delete a List Group by `id`.

Deleting a List Group moves its child lists to the Trash. Use `things_list_groups` first to obtain stable IDs.

### 17. Tag management

- `things_list_tags`: Return all tags and their stable IDs.
- `things_create_tag`: Create a tag with `name`.
- `things_update_tag`: Rename a tag using `id` and `name`.
- `things_delete_tag`: Move a tag to the Trash by `id`.

### 18. `things_update_todo_checklist`

Replaces, prepends, or appends checklist items on an existing task.

**Arguments:**
- `id` *(string, required)*: Stable task ID.
- `authToken` *(string, required)*: Things URL-scheme authorisation token, supplied for this call only and never stored by the MCP.
- `mode` *(required)*: `replace`, `prepend`, or `append`.
- `items` *(string[], required)*: Checklist items. `replace` accepts an empty array to clear the checklist; the other modes require at least one item.

### 19. Task lifecycle, filtering, and placement

- `things_cancel_todo`, `things_reopen_todo`, and `things_delete_todo`: Manage task status or move a task to the Trash by `id`.
- `things_list_todos`: Return tasks from `all` work, `logbook`, or `trash`; optionally restrict with `listGroup`, `tag`, or `status`.
- `things_move_todo`: Move a task by `id` to `list`, `listGroup`, a `builtInList` (`Inbox`, `Today`, `Anytime`, or `Someday`), or set `detachFromParent: true`. Specify exactly one destination.
- `things_bulk_update_todos`: Apply `status`, `list`, `when`, or replacement `tags` to multiple task IDs.

### 20. Non-destructive task enrichment

`things_augment_todo` preserves existing metadata while it prepends or appends notes, or adds tags.

**Arguments:**
- `id` *(string, required)*: Stable task ID.
- `prependNotes`, `appendNotes` *(string, optional)*: Text to add around the existing notes.
- `addTags` *(string[], optional)*: Tags to add without replacing the task's existing tags.

### 21. Duplicates and reminders

- `things_duplicate_todo` and `things_duplicate_list`: Duplicate an item and assign the required new `title`.
- `things_set_todo_reminder`: Set a date-and-time schedule such as `2026-09-20@14:00`.

All three require an `id` and caller-supplied `authToken`; the token is not persisted. `things_delete_list` moves a list to the Trash by its stable ID.

### 22. Hierarchies, rich views, and navigation

- `things_create_tag` accepts an optional `parentTag`; `things_update_tag` can rename a tag or move it below a parent tag (use `parentTag: "none"` for a top-level tag). `things_list_tags` includes each tag's parent name.
- `things_list_lists` filters lists by `source` (`all`, `logbook`, or `trash`), `listGroup`, `tag`, or `status`.
- `things_augment_list` preserves existing list notes/tags while prepending/appending notes or adding tags.
- `things_reveal_item` opens a task or list in Things by stable ID.

### 23. Safer bulk and destructive maintenance

`things_bulk_update_todos` accepts `dryRun: true` to return the selected tasks without changing them, and returns per-item errors for a real bulk update.

`things_empty_trash` is intentionally guarded: it only runs when passed the exact argument `{"confirm":"EMPTY_TRASH"}` and permanently removes Trash contents.

---

## Scripts

- `npm run build`: Compile TypeScript into `dist/`.
- `npm run dev`: Run server directly with `tsx`.
- `npm run start`: Run compiled server from `dist/index.js`.
- `npm run typecheck`: Run TypeScript type checking without emitting files.
- `npm test`: Run automated Vitest test suite.

---

## Known Things 3 Scripting Limitations

- **Checklists**: Things 3 AppleScript does not expose individual checklist items. This MCP supports replacing or adding checklist text through the authorised Things URL scheme, but cannot read, complete, remove, or edit a single checklist row in place.
- **Areas**: Things AppleScript allows querying and setting areas for tasks and projects; tasks nested in projects inherit the project's area.
- **Headings within Projects**: Things' JSON URL command can create headings, and their order is the order of the `items` array passed to `things_create_list`. The documented APIs can target an existing heading but cannot create, list, rename, or delete headings in an existing project; this MCP therefore supports headings when creating a new list, not adding them to an existing list.
- **Restoring from Trash**: Things documents moving items to Trash but does not document a supported AppleScript or URL-scheme restore operation. The MCP can list Trash items but deliberately cannot claim to restore them.
