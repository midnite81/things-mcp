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
