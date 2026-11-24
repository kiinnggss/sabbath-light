import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  bulkPutNotes,
  deleteNoteById,
  getAllNotes,
  putNote,
  type NoteSourceType,
  type StudyNote,
} from '../lib/offlineDb';
import { parseImportedNotesJson } from '../lib/noteReferences';

export interface SaveNoteInput {
  id?: string;
  sourceType: NoteSourceType;
  referenceId: string;
  referenceLabel: string;
  quoteSnippet: string;
  noteText: string;
}

export function useNotes() {
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const list = await getAllNotes();
      setNotes(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const notesByRefId = useMemo(() => {
    const map = new Map<string, StudyNote>();
    for (const note of notes) {
      const existing = map.get(note.referenceId);
      if (!existing || note.updatedAt > existing.updatedAt) {
        map.set(note.referenceId, note);
      }
    }
    return map;
  }, [notes]);

  const deleteNote = useCallback(
    async (id: string) => {
      await deleteNoteById(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    },
    [],
  );

  const saveNote = useCallback(
    async (input: SaveNoteInput): Promise<StudyNote | null> => {
      const trimmed = input.noteText.trim();
      const existing = notesByRefId.get(input.referenceId);

      if (!trimmed) {
        const targetId = input.id || existing?.id;
        if (targetId) {
          await deleteNote(targetId);
        }
        return null;
      }

      const now = Date.now();
      const next: StudyNote = {
        id: input.id || existing?.id || input.referenceId,
        sourceType: input.sourceType,
        referenceId: input.referenceId,
        referenceLabel: input.referenceLabel,
        quoteSnippet: input.quoteSnippet,
        noteText: trimmed,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      await putNote(next);
      setNotes((prev) => {
        const without = prev.filter((n) => n.id !== next.id && n.referenceId !== next.referenceId);
        return [next, ...without].sort((a, b) => b.updatedAt - a.updatedAt);
      });
      return next;
    },
    [deleteNote, notesByRefId],
  );

  const exportNotesJson = useCallback(() => {
    return JSON.stringify(
      {
        app: 'sabbath-light',
        version: 1,
        exportedAt: new Date().toISOString(),
        notes,
      },
      null,
      2,
    );
  }, [notes]);

  const importNotesJson = useCallback(
    async (rawJson: string): Promise<{ imported: number }> => {
      const parsed = parseImportedNotesJson(rawJson);
      await bulkPutNotes(parsed);
      await reload();
      return { imported: parsed.length };
    },
    [reload],
  );

  return {
    notes,
    notesByRefId,
    loading,
    saveNote,
    deleteNote,
    exportNotesJson,
    importNotesJson,
  };
}
