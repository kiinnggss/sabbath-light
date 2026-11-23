import { useState } from 'react';
import { BottomNav } from './components/layout/BottomNav';
import { TopBar } from './components/layout/TopBar';
import { HymnalTab } from './components/hymnal/HymnalTab';
import { SabbathSchoolTab } from './components/sabbath-school/SabbathSchoolTab';
import { BibleTab } from './components/bible/BibleTab';
import { ScripturePreviewSheet } from './components/bible/ScripturePreviewSheet';
import { useHymnalData } from './hooks/useHymnalData';
import { usePreferences } from './hooks/usePreferences';

export function App() {
  const {
    prefs,
    toggleTheme,
    stepReadingScale,
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
  const [scripturePreview, setScripturePreview] = useState<{
    reference: string;
    verseAttr?: string;
  } | null>(null);

  return (
    <div className="min-h-dvh bg-[var(--bg-canvas)] text-[var(--ink-primary)]">
      <TopBar
        theme={prefs.theme}
        onToggleTheme={toggleTheme}
        readingScale={prefs.readingScale}
        onStepFont={stepReadingScale}
        canDecreaseFont={canDecreaseFont}
        canIncreaseFont={canIncreaseFont}
      />

      <main className="mx-auto w-full max-w-4xl px-4 pb-24">
        {prefs.activeTab === 'hymnal' && (
          <HymnalTab
            entries={hymnal.entries}
            loading={hymnal.loading}
            error={hymnal.error}
            favorites={prefs.hymnalFavorites}
            onToggleFavorite={toggleHymnalFavorite}
            onOpenScripture={(reference) => setScripturePreview({ reference })}
          />
        )}

        {prefs.activeTab === 'sabbath-school' && (
          <SabbathSchoolTab
            edition={prefs.ssEdition}
            onEditionChange={setSsEdition}
            onOpenScripture={(reference, verseAttr) =>
              setScripturePreview({ reference, verseAttr })
            }
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
    </div>
  );
}

export default App;
