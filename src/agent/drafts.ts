import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { ContentDraft } from './types.js';
import { formatDraftMarkdown } from './draft-markdown.js';

const DRAFTS_DIR = join(homedir(), '.linkedin-cli', 'drafts');

export async function ensureDraftsDir(): Promise<string> {
  await mkdir(DRAFTS_DIR, { recursive: true });
  return DRAFTS_DIR;
}

export function getDraftDir(draftId: string): string {
  return join(DRAFTS_DIR, draftId);
}

export interface SavedDraftPaths {
  dir: string;
  json: string;
  markdown: string;
}

export async function saveDraft(draft: ContentDraft): Promise<SavedDraftPaths> {
  const dir = getDraftDir(draft.id);
  await mkdir(dir, { recursive: true });
  const json = join(dir, 'draft.json');
  const markdown = join(dir, 'post.md');
  await writeFile(json, JSON.stringify(draft, null, 2), 'utf-8');
  await writeFile(markdown, formatDraftMarkdown(draft), 'utf-8');
  return { dir, json, markdown };
}

export async function exportDraftMarkdown(id: string): Promise<string | null> {
  const draft = await loadDraft(id);
  if (!draft) return null;
  const { markdown } = await saveDraft(draft);
  return markdown;
}

export async function exportAllDraftMarkdown(): Promise<Array<{ id: string; markdown: string }>> {
  const drafts = await listDrafts();
  const results: Array<{ id: string; markdown: string }> = [];
  for (const { id } of drafts) {
    const path = await exportDraftMarkdown(id);
    if (path) results.push({ id, markdown: path });
  }
  return results;
}

export async function listDrafts(): Promise<Array<{ id: string; created_at: string; topic: string }>> {
  const dir = await ensureDraftsDir();
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const ids = new Set<string>();
  for (const entry of entries) {
    if (entry.isDirectory()) ids.add(entry.name);
    else if (entry.name.endsWith('.json')) ids.add(entry.name.replace(/\.json$/, ''));
  }

  const drafts = [];
  for (const id of ids) {
    const draft = await loadDraft(id);
    if (draft) {
      drafts.push({
        id: draft.id,
        created_at: draft.created_at,
        topic: draft.topic.title,
      });
    }
  }

  return drafts.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function loadDraft(id: string): Promise<ContentDraft | null> {
  const candidates = [
    join(DRAFTS_DIR, id, 'draft.json'),
    join(DRAFTS_DIR, `${id}.json`),
  ];

  for (const filePath of candidates) {
    try {
      const raw = await readFile(filePath, 'utf-8');
      const draft = JSON.parse(raw) as ContentDraft;
      if (!draft.images) draft.images = [];
      if (!draft.format) draft.format = 'carousel';
      if (!draft.image_idea) {
        draft.image_idea = {
          why: 'Legacy draft — run: linkedin agent images --id <id> to refresh',
          photo_suggestions: [],
          fallback: 'See images/ folder',
        };
      }
      return draft;
    } catch {
      continue;
    }
  }
  return null;
}

export function generateDraftId(): string {
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6);
  return `draft_${ts}_${rand}`;
}
