import type { SabbathSchoolEdition } from '../hooks/usePreferences';
import type { NoteSourceType, StudyNote } from './offlineDb';

export function makeBibleNoteRef(bookId: number, chapter: number, verse: number): string {
  return `bible:${bookId}:${chapter}:${verse}`;
}

export function makeHymnalNoteRef(hymnNumber: number): string {
  return `hymnal:${hymnNumber}`;
}

export function makeSSReflectionRef(
  edition: SabbathSchoolEdition,
  quarterlyId: string,
  lessonId: string,
  dayId: string,
): string {
  return `ss:${edition}:${quarterlyId}:${lessonId}:${dayId}:reflection`;
}

export function makeSSBlockRef(
  edition: SabbathSchoolEdition,
  quarterlyId: string,
  lessonId: string,
  dayId: string,
  blockIdx: number,
): string {
  return `ss:${edition}:${quarterlyId}:${lessonId}:${dayId}:p${blockIdx}`;
}

export type NoteJumpTarget =
  | { type: 'bible'; bookId: number; chapter: number; verse: number }
  | { type: 'hymnal'; number: number }
  | {
      type: 'sabbath-school';
      edition: SabbathSchoolEdition;
      quarterlyId: string;
      lessonId: string;
      dayId: string;
      blockIdx?: number;
      isReflection?: boolean;
    };

export function parseNoteJumpTarget(note: Pick<StudyNote, 'sourceType' | 'referenceId'>): NoteJumpTarget | null {
  const parts = (note.referenceId || '').split(':');

  if (note.sourceType === 'bible' || parts[0] === 'bible') {
    const bookId = Number(parts[1]);
    const chapter = Number(parts[2]);
    const verse = Number(parts[3]);
    if (bookId >= 1 && chapter >= 1 && verse >= 1) {
      return { type: 'bible', bookId, chapter, verse };
    }
    return null;
  }

  if (note.sourceType === 'hymnal' || parts[0] === 'hymnal') {
    const number = Number(parts[1]);
    if (number >= 1 && number <= 920) {
      return { type: 'hymnal', number };
    }
    return null;
  }

  if (note.sourceType === 'sabbath-school' || parts[0] === 'ss') {
    const editionRaw = parts[1];
    const edition: SabbathSchoolEdition =
      editionRaw === 'inverse' || editionRaw === 'cornerstone' ? editionRaw : 'adult';
    const quarterlyId = parts[2] || '';
    const lessonId = parts[3] || '';
    const dayId = parts[4] || '01';
    const tail = parts[5] || '';
    if (!quarterlyId || !lessonId) return null;

    if (tail === 'reflection') {
      return {
        type: 'sabbath-school',
        edition,
        quarterlyId,
        lessonId,
        dayId,
        isReflection: true,
      };
    }

    const blockMatch = /^p(\d+)$/.exec(tail);
    return {
      type: 'sabbath-school',
      edition,
      quarterlyId,
      lessonId,
      dayId,
      blockIdx: blockMatch ? Number(blockMatch[1]) : undefined,
    };
  }

  return null;
}

function isValidSourceType(raw: unknown): raw is NoteSourceType {
  return raw === 'bible' || raw === 'sabbath-school' || raw === 'hymnal';
}

export function parseImportedNotesJson(rawJson: string): StudyNote[] {
  const parsed = JSON.parse(rawJson) as unknown;
  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { notes?: unknown }).notes)
      ? (parsed as { notes: unknown[] }).notes
      : null;

  if (!list) {
    throw new Error('Invalid notes backup file: expected an array or { notes: [...] } object.');
  }

  const now = Date.now();
  const normalized: StudyNote[] = [];

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Partial<StudyNote>;
    if (!isValidSourceType(obj.sourceType)) continue;
    if (typeof obj.referenceId !== 'string' || !obj.referenceId.trim()) continue;
    if (typeof obj.noteText !== 'string' || !obj.noteText.trim()) continue;

    normalized.push({
      id: typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : obj.referenceId.trim(),
      sourceType: obj.sourceType,
      referenceId: obj.referenceId.trim(),
      referenceLabel:
        typeof obj.referenceLabel === 'string' && obj.referenceLabel.trim()
          ? obj.referenceLabel.trim()
          : obj.referenceId.trim(),
      quoteSnippet: typeof obj.quoteSnippet === 'string' ? obj.quoteSnippet : '',
      noteText: obj.noteText.trim(),
      createdAt: typeof obj.createdAt === 'number' && obj.createdAt > 0 ? obj.createdAt : now,
      updatedAt: typeof obj.updatedAt === 'number' && obj.updatedAt > 0 ? obj.updatedAt : now,
    });
  }

  return normalized;
}
