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

### 6. `things_create_todo`
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

### 7. `things_update_todo`
Updates an existing task by Things ID.

**Arguments:**
- `id` *(string, required)*: Unique Things task ID.
- `title` *(string, optional)*: New title.
- `notes` *(string, optional)*: New notes.
- `when` *(string, optional)*: Schedule target (`today`, `tomorrow`, `anytime`, `someday`, or date string).
- `deadline` *(string, optional)*: New deadline (or `"none"` / `""` to clear).
- `project` *(string, optional)*: Target project name or ID.
- `tags` *(string[], optional)*: New tags.

### 8. `things_complete_todo`
Marks a task complete by its Things ID.

**Arguments:**
- `id` *(string, required)*: Unique Things task ID.

---

## Scripts

- `npm run build`: Compile TypeScript into `dist/`.
- `npm run dev`: Run server directly with `tsx`.
- `npm run start`: Run compiled server from `dist/index.js`.
- `npm run typecheck`: Run TypeScript type checking without emitting files.
- `npm test`: Run automated Vitest test suite.

---

## Known Things 3 Scripting Limitations

- **Checklists**: Things 3 AppleScript does not expose an AppleScript object model for checklist items on existing tasks; checklists are created via the official Things URL scheme (`things:///add`).
- **Areas**: Things AppleScript allows querying and setting areas for tasks and projects; tasks nested in projects inherit the project's area.
- **Headings within Projects**: Supported via URL scheme creation; AppleScript focuses on task-level hierarchy.
