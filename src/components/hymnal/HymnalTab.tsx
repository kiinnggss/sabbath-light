import { useEffect, useMemo, useState } from 'react';
import type { HymnalEntry } from '../../data/hymnalTypes';
import {
  extractJumpNumber,
  filterAndSearchHymnal,
  type HymnalFilterMode,
} from '../../lib/fuzzySearch';
import { makeHymnalNoteRef } from '../../lib/noteReferences';
import type { StudyNote } from '../../lib/offlineDb';
import type { NoteEditorRequest } from '../notes/NoteEditorSheet';
import { HymnList } from './HymnList';
import { HymnReader } from './HymnReader';
import { HymnSearchHeader } from './HymnSearchHeader';
import { WorshipAidReader } from './WorshipAidReader';

interface HymnalTabProps {
  entries: HymnalEntry[];
  loading: boolean;
  error: string | null;
  favorites: number[];
  onToggleFavorite: (number: number) => void;
  onOpenScripture: (reference: string) => void;
  notesByRefId: Map<string, StudyNote>;
  onOpenNoteEditor: (req: NoteEditorRequest) => void;
  jumpTarget: { number: number; seq: number } | null;
}

export function HymnalTab({
  entries,
  loading,
  error,
  favorites,
  onToggleFavorite,
  onOpenScripture,
  notesByRefId,
  onOpenNoteEditor,
  jumpTarget,
}: HymnalTabProps) {
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<HymnalFilterMode>('all');
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);

  useEffect(() => {
    if (jumpTarget) {
      setSelectedNumber(jumpTarget.number);
    }
  }, [jumpTarget]);

  const selectedEntry = useMemo(
    () => (selectedNumber ? entries.find((e) => e.number === selectedNumber) || null : null),
    [entries, selectedNumber],
  );

  const jumpNumber = useMemo(() => extractJumpNumber(query), [query]);
  const jumpEntry = useMemo(
    () => (jumpNumber ? entries.find((e) => e.number === jumpNumber) || null : null),
    [entries, jumpNumber],
  );

  const filteredEntries = useMemo(
    () => filterAndSearchHymnal(entries, query, filterMode, favorites),
    [entries, query, filterMode, favorites],
  );

  if (loading) {
    return (
      <div className="space-y-3 py-6">
        <div className="h-12 w-full animate-pulse rounded-xl bg-[var(--bg-recessed)]" />
        <div className="flex gap-2">
          <div className="h-9 w-24 animate-pulse rounded-full bg-[var(--bg-recessed)]" />
          <div className="h-9 w-28 animate-pulse rounded-full bg-[var(--bg-recessed)]" />
          <div className="h-9 w-36 animate-pulse rounded-full bg-[var(--bg-recessed)]" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-18 w-full animate-pulse rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-6 rounded-2xl border border-[var(--accent-primary)]/40 bg-[var(--bg-surface)] p-6 text-center">
        <p className="text-base font-bold text-[var(--ink-primary)]">
          Unable to load the Hymnal archive
        </p>
        <p className="mt-1 text-sm text-[var(--ink-secondary)]">{error}</p>
      </div>
    );
  }

  if (selectedEntry) {
    const noteRefId = makeHymnalNoteRef(selectedEntry.number);
    const existingNote = notesByRefId.get(noteRefId);
    const openNote = () =>
      onOpenNoteEditor({
        sourceType: 'hymnal',
        referenceId: noteRefId,
        referenceLabel: `Hymn #${selectedEntry.number} · ${selectedEntry.title}`,
        quoteSnippet: selectedEntry.firstLine,
        existingNote,
      });

    if (selectedEntry.kind === 'hymn') {
      return (
        <HymnReader
          hymn={selectedEntry}
          isFavorite={favorites.includes(selectedEntry.number)}
          note={existingNote}
          onToggleFavorite={onToggleFavorite}
          onOpenNoteEditor={openNote}
          onBack={() => setSelectedNumber(null)}
          onNavigateNumber={(num) => setSelectedNumber(num)}
        />
      );
    }

    return (
      <WorshipAidReader
        reading={selectedEntry}
        isFavorite={favorites.includes(selectedEntry.number)}
        note={existingNote}
        onToggleFavorite={onToggleFavorite}
        onOpenNoteEditor={openNote}
        onBack={() => setSelectedNumber(null)}
        onNavigateNumber={(num) => setSelectedNumber(num)}
        onOpenScripture={onOpenScripture}
      />
    );
  }

  return (
    <div className="pb-6">
      <HymnSearchHeader
        query={query}
        onQueryChange={setQuery}
        filterMode={filterMode}
        onFilterModeChange={setFilterMode}
        favoritesCount={favorites.length}
        totalFiltered={filteredEntries.length}
      />
      <HymnList
        entries={filteredEntries}
        jumpEntry={jumpEntry}
        favorites={favorites}
        onSelectEntry={(num) => setSelectedNumber(num)}
        onToggleFavorite={onToggleFavorite}
      />
    </div>
  );
}
