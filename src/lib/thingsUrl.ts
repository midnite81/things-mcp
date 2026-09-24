export interface ThingsUrlOptions {
  title?: string;
  notes?: string;
  when?: string;
  deadline?: string;
  list?: string;
  listId?: string;
  heading?: string;
  completed?: boolean;
  canceled?: boolean;
  tags?: string[];
  checklistItems?: string[];
  showQuickEntry?: boolean;
  reveal?: boolean;
}

export interface ThingsUpdateUrlOptions {
  id: string;
  authToken: string;
  checklistItems: string[];
  checklistMode: 'replace' | 'prepend' | 'append';
}

export interface ThingsItemUpdateUrlOptions {
  id: string;
  authToken: string;
  title?: string;
  when?: string;
  duplicate?: boolean;
  project?: boolean;
}

export function buildThingsJsonUrl(data: unknown, reveal = false): string {
  const params = new URLSearchParams();
  params.append('data', JSON.stringify(data));
  if (reveal) params.append('reveal', 'true');
  return `things:///json?${params.toString()}`;
}

export function buildThingsAddUrl(options: ThingsUrlOptions): string {
  const params = new URLSearchParams();

  if (options.title) params.append('title', options.title);
  if (options.notes) params.append('notes', options.notes);
  if (options.when) params.append('when', options.when);
  if (options.deadline) params.append('deadline', options.deadline);
  if (options.list) params.append('list', options.list);
  if (options.listId) params.append('list-id', options.listId);
  if (options.heading) params.append('heading', options.heading);
  if (options.completed !== undefined) params.append('completed', String(options.completed));
  if (options.canceled !== undefined) params.append('canceled', String(options.canceled));
  if (options.showQuickEntry !== undefined) params.append('show-quick-entry', String(options.showQuickEntry));
  if (options.reveal !== undefined) params.append('reveal', String(options.reveal));

  if (options.tags && options.tags.length > 0) {
    params.append('tags', options.tags.join(','));
  }

  if (options.checklistItems && options.checklistItems.length > 0) {
    params.append('checklist-items', options.checklistItems.join('\n'));
  }

  return `things:///add?${params.toString()}`;
}

/**
 * Build an authenticated Things URL-scheme request for checklist mutation.
 * The token is intentionally supplied per request and is never persisted.
 */
export function buildThingsUpdateUrl(options: ThingsUpdateUrlOptions): string {
  const params = new URLSearchParams();
  params.append('id', options.id);
  params.append('auth-token', options.authToken);

  const checklistParameter =
    options.checklistMode === 'prepend'
      ? 'prepend-checklist-items'
      : options.checklistMode === 'append'
        ? 'append-checklist-items'
        : 'checklist-items';
  params.append(checklistParameter, options.checklistItems.join('\n'));

  return `things:///update?${params.toString()}`;
}

export function buildThingsItemUpdateUrl(options: ThingsItemUpdateUrlOptions): string {
  const params = new URLSearchParams();
  params.append('id', options.id);
  params.append('auth-token', options.authToken);
  if (options.title !== undefined) params.append('title', options.title);
  if (options.when !== undefined) params.append('when', options.when);
  if (options.duplicate !== undefined) params.append('duplicate', String(options.duplicate));
  return `things:///${options.project ? 'update-project' : 'update'}?${params.toString()}`;
}
