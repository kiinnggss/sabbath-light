import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MusicNoteSimple,
  MusicNotes,
  PianoKeys,
} from '@phosphor-icons/react';
import type { HymnEntry } from '../../data/hymnalTypes';
import {
  alignLyricsToMelody,
  collectMelodyOnsets,
  countStanzaVerses,
  findOnsetAtTick,
  getStanzaLyrics,
} from '../../lib/lyricSync';
import {
  extractHymnScore,
  locateStanzaPosition,
  tickToRawSec,
  type ParsedHymnScore,
  type ScoreMeasure,
} from '../../lib/midiScore';
import {
  engraveScoreToSvg,
  type MeasureHitBox,
  type OnsetOverlay,
  type SheetLayoutMode,
} from '../../lib/vexflowRenderer';
import {
  loadParsedMidi,
  midiPlayer,
  type MidiPlaybackState,
} from '../audio/midiPlayer';

interface SheetMusicViewProps {
  hymn: HymnEntry;
}

export function SheetMusicView({ hymn }: SheetMusicViewProps) {
  const [score, setScore] = useState<ParsedHymnScore | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'unavailable' | 'error'>('loading');
  const [layoutMode, setLayoutMode] = useState<SheetLayoutMode>('hymnal');
  const [selectedVerse, setSelectedVerse] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(640);
  const [measureBoxes, setMeasureBoxes] = useState<MeasureHitBox[]>([]);
  const [onsetOverlays, setOnsetOverlays] = useState<OnsetOverlay[]>([]);
  const [svgHeight, setSvgHeight] = useState<number>(220);
  const [playback, setPlayback] = useState<MidiPlaybackState>(() => midiPlayer.getState());

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgHostRef = useRef<HTMLDivElement | null>(null);
  const lastScrolledSystemRef = useRef<number | null>(null);

  useEffect(() => midiPlayer.subscribe(setPlayback), []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const next = Math.max(280, Math.floor(el.clientWidth));
      setContainerWidth((prev) => (Math.abs(prev - next) >= 12 ? next : prev));
    };

    updateWidth();
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadState('loading');
    setScore(null);
    setMeasureBoxes([]);
    setOnsetOverlays([]);
    setSelectedVerse(0);
    lastScrolledSystemRef.current = null;

    loadParsedMidi(hymn.number)
      .then((parsed) => {
        if (cancelled) return;
        if (!parsed) {
          setLoadState('unavailable');
          return;
        }
        setScore(extractHymnScore(parsed, hymn.defaultBpm || 96, hymn.key));
        setLoadState('ready');
      })
      .catch(() => {
        if (!cancelled) setLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [hymn.number, hymn.defaultBpm, hymn.key]);

  const verseCount = useMemo(() => countStanzaVerses(hymn.verses), [hymn.verses]);

  const visibleMeasures: ScoreMeasure[] = useMemo(() => {
    if (!score) return [];
    const [start, end] = score.stanzaRange;
    return score.measures.slice(start, end);
  }, [score]);

  const melodyOnsets = useMemo(
    () => (score ? collectMelodyOnsets(score) : []),
    [score],
  );

  const onsetByMeasureStep = useMemo(() => {
    const map = new Map<string, number>();
    if (!score) return map;
    melodyOnsets.forEach((onset, idx) => {
      const m = score.measures[onset.measureIndex];
      const ev = m?.melody[onset.eventIndex];
      if (ev) map.set(`${onset.measureIndex}:${ev.startStep}`, idx);
    });
    return map;
  }, [score, melodyOnsets]);

  // 60fps direct RAM audio-clock sync
  const [liveSync, setLiveSync] = useState<{
    occurrence: number;
    onsetIndex: number | null;
    introRemainingSec: number;
    introProgress: number;
  } | null>(null);

  const firstVerseStartSec = useMemo(() => {
    if (!score || score.stanzaStarts.length === 0) return 0;
    const m = score.measures[score.stanzaStarts[0]];
    return m ? Math.max(0, m.startSec - score.audioLeadTrimSec) : 0;
  }, [score]);

  useEffect(() => {
    if (!score || playback.hymnNumber !== hymn.number) {
      setLiveSync(null);
      return;
    }

    const computeSync = () => {
      const exactRaw = midiPlayer.getExactRawTimeSec();
      if (!playback.isPlaying && exactRaw <= 0.01) {
        setLiveSync((prev) => (prev === null ? prev : null));
        return;
      }

      const rawMidiSec = exactRaw + score.audioLeadTrimSec + 0.045;
      const pos = locateStanzaPosition(score, rawMidiSec);
      if (!pos) {
        setLiveSync((prev) => (prev === null ? prev : null));
        return;
      }

      if (pos.occurrence === -1) {
        const remaining = Math.max(
          0,
          Math.ceil((firstVerseStartSec - exactRaw) / Math.max(0.5, playback.speed)),
        );
        const progress =
          firstVerseStartSec > 0.2 ? Math.min(1, Math.max(0, exactRaw / firstVerseStartSec)) : 1;
        const roundedProgress = Math.round(progress * 50) / 50;
        setLiveSync((prev) =>
          prev &&
          prev.occurrence === -1 &&
          prev.onsetIndex === null &&
          prev.introRemainingSec === remaining &&
          prev.introProgress === roundedProgress
            ? prev
            : {
                occurrence: -1,
                onsetIndex: null,
                introRemainingSec: remaining,
                introProgress: roundedProgress,
              },
        );
        return;
      }

      const onsetIdx = findOnsetAtTick(melodyOnsets, pos.stanzaTick);
      setLiveSync((prev) =>
        prev && prev.occurrence === pos.occurrence && prev.onsetIndex === onsetIdx
          ? prev
          : {
              occurrence: pos.occurrence,
              onsetIndex: onsetIdx,
              introRemainingSec: 0,
              introProgress: 1,
            },
      );
    };

    computeSync();
    if (!playback.isPlaying || typeof window === 'undefined') return;

    let rafId = 0;
    const tick = () => {
      computeSync();
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [
    score,
    melodyOnsets,
    firstVerseStartSec,
    playback.hymnNumber,
    playback.isPlaying,
    playback.currentTimeSec,
    playback.speed,
    hymn.number,
  ]);

  const isPlayingIntro = liveSync !== null && liveSync.occurrence === -1;

  const activeVerseIdx = useMemo(() => {
    if (liveSync && liveSync.occurrence >= 0) {
      return Math.min(verseCount - 1, liveSync.occurrence);
    }
    return Math.min(verseCount - 1, selectedVerse);
  }, [liveSync, verseCount, selectedVerse]);

  const activeStanzaLyrics = useMemo(
    () => getStanzaLyrics(hymn.verses, activeVerseIdx),
    [hymn.verses, activeVerseIdx],
  );

  const lyricAlignment = useMemo(
    () => alignLyricsToMelody(melodyOnsets, activeStanzaLyrics.lines),
    [melodyOnsets, activeStanzaLyrics.lines],
  );

  const activeOnsetIdx = liveSync && liveSync.occurrence >= 0 ? liveSync.onsetIndex : null;
  const activeWordPos =
    activeOnsetIdx !== null ? lyricAlignment.onsetWord[activeOnsetIdx] ?? null : null;

  useEffect(() => {
    if (loadState !== 'ready' || !score || visibleMeasures.length === 0) return;
    const host = svgHostRef.current;
    if (!host) return;

    let cancelled = false;
    void engraveScoreToSvg(host, {
      score,
      visibleMeasures,
      containerWidth,
      layoutMode,
      onsetByMeasureStep,
    }).then((result) => {
      if (cancelled) return;
      setSvgHeight(result.displayHeight);
      setMeasureBoxes(result.measureBoxes);
      setOnsetOverlays(result.onsetOverlays);
    });

    return () => {
      cancelled = true;
    };
  }, [loadState, score, visibleMeasures, containerWidth, layoutMode, onsetByMeasureStep]);

  useEffect(() => {
    if (!playback.isPlaying || activeOnsetIdx === null) return;
    const activeOverlay = onsetOverlays.find((o) => o.onsetIndex === activeOnsetIdx);
    if (!activeOverlay) return;
    const systemBucket = Math.floor(activeOverlay.topY / 100);
    if (lastScrolledSystemRef.current === systemBucket) return;
    lastScrolledSystemRef.current = systemBucket;

    const el = containerRef.current?.querySelector<HTMLElement>(
      `[data-onset-index="${activeOnsetIdx}"]`,
    );
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [playback.isPlaying, activeOnsetIdx, onsetOverlays]);

  const seekToStanzaTick = (stanzaTick: number, targetVerseIdx = activeVerseIdx) => {
    if (!score || playback.hymnNumber !== hymn.number || playback.status !== 'ready') return;
    const occurrence = Math.min(score.stanzaStarts.length - 1, Math.max(0, targetVerseIdx));
    const shift = (score.stanzaStarts[occurrence] - score.stanzaRange[0]) * score.barTicks;
    const targetSec = Math.max(0, tickToRawSec(score, stanzaTick + shift) - score.audioLeadTrimSec);
    midiPlayer.seekToRawSeconds(targetSec);
  };

  const handleSelectVerse = (verseIdx: number) => {
    setSelectedVerse(verseIdx);
    if (score && playback.hymnNumber === hymn.number && playback.status === 'ready') {
      const startMeasure = score.measures[score.stanzaRange[0]];
      if (startMeasure) seekToStanzaTick(startMeasure.startTick, verseIdx);
    }
  };

  if (loadState === 'unavailable') {
    return (
      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-center">
        <MusicNotes size={28} weight="duotone" className="mx-auto text-[var(--ink-muted)]" />
        <p className="mt-2 text-sm font-bold text-[var(--ink-primary)]">
          Sheet music is not available for this hymn
        </p>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          No MIDI score source was found for Hymn #{hymn.number}.
        </p>
      </section>
    );
  }

  if (loadState === 'error') {
    return (
      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-center">
        <p className="text-sm font-bold text-[var(--ink-primary)]">
          Could not render sheet music
        </p>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          Try switching hymns or reloading the page.
        </p>
      </section>
    );
  }

  const currentLineIdx = activeWordPos?.lineIndex ?? 0;
  const currentLine = lyricAlignment.lines[currentLineIdx];
  const nextLine = lyricAlignment.lines[currentLineIdx + 1];
  const activeOverlay =
    activeOnsetIdx !== null
      ? onsetOverlays.find((o) => o.onsetIndex === activeOnsetIdx) ?? null
      : null;

  return (
    <section
      aria-label={`Sheet music for ${hymn.title}`}
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 sm:p-4"
    >
      {/* Compact Header: Key/Time + Hymnal SATB / Melody switch */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-[var(--ink-secondary)]">
          {score ? (
            <>
              <span className="rounded-full bg-[var(--bg-recessed)] px-2.5 py-0.5 text-[var(--ink-primary)]">
                {score.keyLabel}
              </span>
              <span className="rounded-full bg-[var(--bg-recessed)] px-2 py-0.5">
                {score.timeSignatureLabel}
              </span>
              <span className="rounded-full bg-[var(--bg-recessed)] px-2 py-0.5">
                {score.bpm} BPM
              </span>
            </>
          ) : (
            <span className="text-[var(--ink-muted)]">Preparing score...</span>
          )}
        </div>

        <div
          role="group"
          aria-label="Notation layout"
          className="inline-flex rounded-lg bg-[var(--bg-recessed)] p-0.5 text-[11px] font-bold"
        >
          <button
            type="button"
            onClick={() => setLayoutMode('hymnal')}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors ${
              layoutMode === 'hymnal'
                ? 'bg-[var(--accent-primary)] text-[var(--ink-on-accent)] shadow-xs'
                : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <PianoKeys size={13} weight="bold" />
            <span>Hymnal (SATB)</span>
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode('melody')}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors ${
              layoutMode === 'melody'
                ? 'bg-[var(--accent-primary)] text-[var(--ink-on-accent)] shadow-xs'
                : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <MusicNoteSimple size={13} weight="bold" />
            <span>Melody</span>
          </button>
        </div>
      </div>

      {/* Compact Sticky Live Moving Lyrics Strip */}
      {currentLine && (
        <div className="sticky top-[57px] z-20 -mx-0.5 mb-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)]/95 px-3 py-2 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                {isPlayingIntro
                  ? `Intro · Verse 1 in ${liveSync?.introRemainingSec ?? 0}s`
                  : activeStanzaLyrics.label}
              </span>
              {isPlayingIntro && playback.status === 'ready' && (
                <button
                  type="button"
                  onClick={() => handleSelectVerse(0)}
                  className="rounded-md bg-[var(--accent-primary)] px-2 py-0.5 text-[10px] font-bold text-[var(--ink-on-accent)] transition-opacity hover:opacity-90"
                >
                  Skip Intro
                </button>
              )}
            </div>

            {verseCount > 1 && (
              <div className="flex items-center gap-1" aria-label="Select verse lyrics">
                {Array.from({ length: verseCount }, (_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectVerse(idx)}
                    className={`h-5 min-w-[22px] rounded-md px-1.5 text-[10px] font-bold transition-colors ${
                      activeVerseIdx === idx && !isPlayingIntro
                        ? 'bg-[var(--accent-primary)] text-[var(--ink-on-accent)]'
                        : 'bg-[var(--bg-surface)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                    }`}
                  >
                    V{idx + 1}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isPlayingIntro && (
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[var(--bg-surface)]">
              <div
                className="h-full rounded-full bg-[var(--accent-primary)] transition-[width] duration-150"
                style={{ width: `${Math.round((liveSync?.introProgress ?? 0) * 100)}%` }}
              />
            </div>
          )}

          <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-sm font-medium leading-snug text-[var(--ink-primary)]">
            {currentLine.words.map((word, wIdx) => {
              const isCurrentWord =
                !isPlayingIntro &&
                activeWordPos !== null &&
                activeWordPos.lineIndex === currentLineIdx &&
                activeWordPos.wordIndex === wIdx;
              const isSung =
                !isPlayingIntro &&
                activeWordPos !== null &&
                activeWordPos.lineIndex === currentLineIdx &&
                wIdx < activeWordPos.wordIndex;
              return (
                <span
                  key={`${currentLineIdx}-${wIdx}`}
                  className={`rounded px-0.5 transition-colors duration-150 ${
                    isCurrentWord
                      ? 'bg-[var(--accent-primary)]/18 font-bold text-[var(--accent-primary)]'
                      : isSung
                        ? 'text-[var(--ink-secondary)]'
                        : ''
                  }`}
                >
                  {word}
                </span>
              );
            })}
          </p>

          {nextLine && (
            <p className="mt-0.5 hidden truncate text-xs text-[var(--ink-muted)] sm:block">
              {nextLine.words.join(' ')}
            </p>
          )}
        </div>
      )}

      {/* Engraved Score + Moving Playhead & Centered Lyrics */}
      <div
        ref={containerRef}
        className="relative w-full overflow-x-hidden text-[var(--ink-primary)]"
        style={{ minHeight: loadState === 'loading' ? 200 : svgHeight }}
      >
        {loadState === 'loading' && (
          <div className="flex h-48 items-center justify-center gap-2 text-xs font-semibold text-[var(--ink-muted)]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>Engraving SATB grand staff and lyrics...</span>
          </div>
        )}

        <div
          ref={svgHostRef}
          className="sheet-music-svg w-full select-none"
          aria-hidden="true"
        />

        {measureBoxes.length > 0 && (
          <div className="pointer-events-none absolute inset-0">
            {measureBoxes.map((box) => (
              <button
                key={box.measureIndex}
                type="button"
                onClick={() => {
                  const m = score?.measures[box.measureIndex];
                  if (m) seekToStanzaTick(m.startTick);
                }}
                aria-label={`Jump to measure ${box.displayNumber}`}
                style={{
                  left: box.x,
                  top: box.y,
                  width: box.width,
                  height: box.height,
                }}
                className="pointer-events-auto absolute rounded-md transition-colors hover:bg-[var(--ink-primary)]/[0.03] focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
              />
            ))}
          </div>
        )}

        {activeOverlay && !isPlayingIntro && (
          <div
            aria-hidden="true"
            style={{
              left: activeOverlay.x,
              top: activeOverlay.topY,
              height: activeOverlay.staffHeight,
            }}
            className="pointer-events-none absolute -translate-x-1/2 w-[3px] rounded-full bg-[var(--accent-primary)]/70 shadow-[0_0_8px_var(--accent-primary)] transition-[left,top] duration-150 ease-out"
          />
        )}

        {onsetOverlays.length > 0 && (
          <div className="pointer-events-none absolute inset-0">
            {onsetOverlays.map((ov) => {
              const token = lyricAlignment.tokens[ov.onsetIndex];
              if (!token) return null;
              const isActive = !isPlayingIntro && activeOnsetIdx === ov.onsetIndex;
              return (
                <button
                  key={ov.onsetIndex}
                  type="button"
                  data-onset-index={ov.onsetIndex}
                  onClick={() => seekToStanzaTick(ov.tick)}
                  style={{
                    left: ov.x,
                    top: ov.lyricY,
                  }}
                  className={`pointer-events-auto absolute -translate-x-1/2 whitespace-nowrap rounded px-1 py-0.5 text-[11px] leading-none transition-colors duration-150 ${
                    isActive
                      ? 'bg-[var(--accent-primary)] font-bold text-[var(--ink-on-accent)] shadow-xs'
                      : 'bg-[var(--bg-surface)]/85 font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  {token.text}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] text-[var(--ink-muted)]">
        Four-part SATB hymnal score with live synced lyrics. Tap any syllable or measure to jump playback.
      </p>
    </section>
  );
}
