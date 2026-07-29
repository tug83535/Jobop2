import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';

export function readTracker(filePath) {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function upsertApplication(filePath, entry) {
  mkdirSync(dirname(filePath), { recursive: true });
  const existing = readTracker(filePath);
  const key = applicationKey(entry);
  const now = new Date().toISOString();
  const nextEntry = {
    ...entry,
    updated_at: now,
    created_at: entry.created_at || now,
    history: [...(entry.history || []), { at: now, status: entry.status || 'discovered' }],
  };

  const index = existing.findIndex((item) => applicationKey(item) === key);
  if (index >= 0) {
    nextEntry.created_at = existing[index].created_at;
    nextEntry.history = [...(existing[index].history || []), ...(entry.history || []), { at: now, status: entry.status || existing[index].status }];
    existing[index] = { ...existing[index], ...nextEntry };
  } else {
    existing.push(nextEntry);
  }

  writeFileSync(filePath, `${existing.map((item) => JSON.stringify(item)).join('\n')}\n`, 'utf8');
  return nextEntry;
}

export function applicationKey(entry) {
  return (entry.job?.url || entry.job?.apply_url || entry.job?.id || `${entry.job?.company}:${entry.job?.title}`).toLowerCase();
}
