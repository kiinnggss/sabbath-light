import { useEffect, useState } from 'react';
import { midiPlayer } from './components/audio/midiPlayer';
import { BibleTab } from './components/bible/BibleTab';
import { ScripturePreviewSheet } from './components/bible/ScripturePreviewSheet';
import { HymnalTab } from './components/hymnal/HymnalTab';
import { BottomNav } from './components/layout/BottomNav';
import { TopBar } from './components/layout/TopBar';
import { NoteEditorSheet, type NoteEditorRequest } from './components/notes/NoteEditorSheet';
import {
  SabbathSchoolTab,
  type SabbathSchoolJumpTarget,
} from './components/sabbath-school/SabbathSchoolTab';
import { useHymnalData } from './hooks/useHymnalData';
import { useNotes } from './hooks/useNotes';
import { useOfflineSync } from './hooks/useOfflineSync';
import { usePreferences } from './hooks/usePreferences';
import { parseNoteJumpTarget } from './lib/noteReferences';
import type { StudyNote } from './lib/offlineDb';

export function App() {
  const {
    prefs,
    setThemeId,
    setCustomAccent,
    setFontPreset,
    stepReadingScale,
    setReadingScale,
    resetReadingScale,
    canDecreaseFont,
    canIncreaseFont,
    setActiveTab,
    toggleHymnalFavorite,
    setSsEdition,
    setBibleVersion,
    setCompareVersion,
    setBibleLocation,
    toggleBibleBookmark,
    setVerseHighlight,
  } = usePreferences();

  const hymnal = useHymnalData();
  const notesApi = useNotes();
  const offlineSync = useOfflineSync(prefs.bibleVersion);

  const [scripturePreview, setScripturePreview] = useState<{
    reference: string;
    verseAttr?: string;
  } | null>(null);
  const [noteEditorReq, setNoteEditorReq] = useState<NoteEditorRequest | null>(null);
  const [hymnalJump, setHymnalJump] = useState<{ number: number; seq: number } | null>(null);
  const [ssJump, setSsJump] = useState<SabbathSchoolJumpTarget | null>(null);

  // Cleanly stop MIDI playback whenever switching away from the Hymnal tab
  useEffect(() => {
    if (prefs.activeTab !== 'hymnal') {
      midiPlayer.stop();
    }
  }, [prefs.activeTab]);

  const handleJumpToNote = (note: StudyNote) => {
    const target = parseNoteJumpTarget(note);
    if (!target) return;

    if (target.type === 'bible') {
      setBibleLocation({
        bookId: target.bookId,
        chapter: target.chapter,
        verse: target.verse,
      });
      setActiveTab('bible');
      return;
    }

    if (target.type === 'hymnal') {
      setHymnalJump({ number: target.number, seq: Date.now() });
      setActiveTab('hymnal');
      return;
    }

    setSsEdition(target.edition);
    setSsJump({
      edition: target.edition,
      quarterlyId: target.quarterlyId,
      lessonId: target.lessonId,
      dayId: target.dayId,
      blockIdx: target.blockIdx,
      isReflection: target.isReflection,
      seq: Date.now(),
    });
    setActiveTab('sabbath-school');
  };

  return (
    <div className="min-h-dvh text-[var(--ink-primary)]">
      <TopBar
        themeId={prefs.themeId}
        customAccent={prefs.customAccent}
        onSelectTheme={setThemeId}
        onSelectCustomAccent={setCustomAccent}
        readingScale={prefs.readingScale}
        fontPreset={prefs.fontPreset}
        onStepFont={stepReadingScale}
        onSetScale={setReadingScale}
        onResetScale={resetReadingScale}
        onSelectFontPreset={setFontPreset}
        canDecreaseFont={canDecreaseFont}
        canIncreaseFont={canIncreaseFont}
        notes={notesApi.notes}
        onJumpToNote={handleJumpToNote}
        onEditNote={(note) =>
          setNoteEditorReq({
            sourceType: note.sourceType,
            referenceId: note.referenceId,
            referenceLabel: note.referenceLabel,
            quoteSnippet: note.quoteSnippet,
            existingNote: note,
          })
        }
        onDeleteNote={(id) => void notesApi.deleteNote(id)}
        onExportNotesJson={notesApi.exportNotesJson}
        onImportNotesJson={notesApi.importNotesJson}
        isOnline={offlineSync.isOnline}
        storagePersisted={offlineSync.storagePersisted}
        usageBytes={offlineSync.usageBytes}
        quotaBytes={offlineSync.quotaBytes}
        downloadedVersions={offlineSync.downloadedVersions}
        activeDownloads={offlineSync.activeDownloads}
        ssSyncMeta={offlineSync.ssSyncMeta}
        ssSyncing={offlineSync.ssSyncing}
        ssSyncDetail={offlineSync.ssSyncDetail}
        anyDownloading={offlineSync.anyDownloading}
        isReadyForOffline={offlineSync.isReadyForOffline}
        syncError={offlineSync.syncError}
        onSyncNow={offlineSync.syncNow}
        onDownloadBibleVersion={(v) => void offlineSync.downloadBibleVersion(v)}
        onRemoveBibleVersion={(v) => void offlineSync.removeBibleVersion(v)}
      />

      <main className="mx-auto w-full max-w-4xl px-4 pb-28">
        {prefs.activeTab === 'hymnal' && (
          <HymnalTab
            entries={hymnal.entries}
            loading={hymnal.loading}
            error={hymnal.error}
            favorites={prefs.hymnalFavorites}
            onToggleFavorite={toggleHymnalFavorite}
            onOpenScripture={(reference) => setScripturePreview({ reference })}
            notesByRefId={notesApi.notesByRefId}
            onOpenNoteEditor={setNoteEditorReq}
            jumpTarget={hymnalJump}
          />
        )}

        {prefs.activeTab === 'sabbath-school' && (
          <SabbathSchoolTab
            edition={prefs.ssEdition}
            onEditionChange={setSsEdition}
            onOpenScripture={(reference, verseAttr) =>
              setScripturePreview({ reference, verseAttr })
            }
            notesByRefId={notesApi.notesByRefId}
            onOpenNoteEditor={setNoteEditorReq}
            onSaveNote={notesApi.saveNote}
            onDeleteNote={notesApi.deleteNote}
            jumpTarget={ssJump}
          />
        )}

        {prefs.activeTab === 'bible' && (
          <BibleTab
            location={prefs.bibleLocation}
            onLocationChange={setBibleLocation}
            version={prefs.bibleVersion}
            onVersionChange={setBibleVersion}
            compareVersion={prefs.compareVersion}
            onCompareVersionChange={setCompareVersion}
            bookmarks={prefs.bibleBookmarks}
            highlights={prefs.bibleHighlights}
            onToggleBookmark={toggleBibleBookmark}
            onSetHighlight={setVerseHighlight}
            notesByRefId={notesApi.notesByRefId}
            onOpenNoteEditor={setNoteEditorReq}
            downloadedVersions={offlineSync.downloadedVersions}
            activeDownloads={offlineSync.activeDownloads}
            isOnline={offlineSync.isOnline}
            onDownloadBibleVersion={(v) => void offlineSync.downloadBibleVersion(v)}
            onRemoveBibleVersion={(v) => void offlineSync.removeBibleVersion(v)}
          />
        )}
      </main>

      <BottomNav activeTab={prefs.activeTab} onSelectTab={setActiveTab} />

      <ScripturePreviewSheet
        request={scripturePreview}
        version={prefs.bibleVersion}
        onVersionChange={setBibleVersion}
        onClose={() => setScripturePreview(null)}
        onOpenInBible={(loc) => {
          setBibleLocation(loc);
          setActiveTab('bible');
        }}
      />

      <NoteEditorSheet
        request={noteEditorReq}
        onSave={async (noteText) => {
          if (!noteEditorReq) return;
          await notesApi.saveNote({
            id: noteEditorReq.existingNote?.id,
            sourceType: noteEditorReq.sourceType,
            referenceId: noteEditorReq.referenceId,
            referenceLabel: noteEditorReq.referenceLabel,
            quoteSnippet: noteEditorReq.quoteSnippet,
            noteText,
          });
        }}
        onDelete={async (noteId) => {
          await notesApi.deleteNote(noteId);
        }}
        onClose={() => setNoteEditorReq(null)}
      />
    </div>
  );
}

export default App;
