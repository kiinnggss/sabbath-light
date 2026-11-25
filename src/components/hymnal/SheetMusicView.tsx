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
  type ScoreNoteEvent,
} from '../../lib/midiScore';
import {
  loadParsedMidi,
  midiPlayer,
  type MidiPlaybackState,
} from '../audio/midiPlayer';

interface SheetMusicViewProps {
  hymn: HymnEntry;
}

type SheetLayoutMode = 'lead' | 'piano';

interface MeasureHitBox {
  measureIndex: number;
  displayNumber: number;
  startSec: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OnsetOverlay {
  onsetIndex: number;
  tick: number;
  x: number;
  topY: number;
  staffHeight: number;
  lyricY: number;
  maxWidth: number;
}

const LEAD_SCALE = 0.78;
const PIANO_SCALE = 0.72;
const LEAD_SYSTEM_HEIGHT = 164;
const PIANO_SYSTEM_HEIGHT = 236;
const TOP_PADDING = 6;
const TREBLE_OFFSET_Y = 8;
const BASS_OFFSET_Y = 104;
const HORIZONTAL_PADDING = 10;

function chooseMeasuresPerSystem(logicalWidth: number): number {
  if (logicalWidth < 540) return 2;
  if (logicalWidth < 800) return 3;
  return 4;
}

export function SheetMusicView({ hymn }: SheetMusicViewProps) {
  const [score, setScore] = useState<ParsedHymnScore | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'unavailable' | 'error'>('loading');
  const [layoutMode, setLayoutMode] = useState<SheetLayoutMode>('lead');
  const [selectedVerse, setSelectedVerse] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(640);
  const [measureBoxes, setMeasureBoxes] = useState<MeasureHitBox[]>([]);
  const [onsetOverlays, setOnsetOverlays] = useState<OnsetOverlay[]>([]);
  const [svgHeight, setSvgHeight] = useState<number>(180);
  const [playback, setPlayback] = useState<MidiPlaybackState>(() => midiPlayer.getState());

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgHostRef = useRef<HTMLDivElement | null>(null);
  const lastScrolledSystemRef = useRef<number | null>(null);

  useEffect(() => {
    const unsub = midiPlayer.subscribe(setPlayback);
    return unsub;
  }, []);

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
        const extracted = extractHymnScore(parsed, hymn.defaultBpm || 96, hymn.key);
        setScore(extracted);
        setLoadState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [hymn.number, hymn.defaultBpm, hymn.key]);

  const verseCount = useMemo(() => countStanzaVerses(hymn.verses), [hymn.verses]);

  // Always engrave one clean canonical stanza so the score stays compact and readable
  const visibleMeasures: ScoreMeasure[] = useMemo(() => {
    if (!score) return [];
    const [start, end] = score.stanzaRange;
    return score.measures.slice(start, end);
  }, [score]);

  const melodyOnsets = useMemo(
    () => (score ? collectMelodyOnsets(score) : []),
    [score],
  );

  // Map (measureIndex, eventIndex) -> onsetIndex for positioning lyrics under notes
  const onsetLookup = useMemo(() => {
    const map = new Map<string, number>();
    melodyOnsets.forEach((onset, idx) => {
      map.set(`${onset.measureIndex}:${onset.eventIndex}`, idx);
    });
    return map;
  }, [melodyOnsets]);

  // 60fps direct RAM audio-clock sync (reads HTMLAudioElement.currentTime with zero 100ms timer lag)
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

      // +45ms lookahead compensates for audio output buffer latency so highlights land right on the beat
      const rawMidiSec = exactRaw + score.audioLeadTrimSec + 0.045;
      const pos = locateStanzaPosition(score, rawMidiSec);
      if (!pos) {
        setLiveSync((prev) => (prev === null ? prev : null));
        return;
      }

      if (pos.occurrence === -1) {
        const remaining = Math.max(0, Math.ceil((firstVerseStartSec - exactRaw) / Math.max(0.5, playback.speed)));
        const progress = firstVerseStartSec > 0.2 ? Math.min(1, Math.max(0, exactRaw / firstVerseStartSec)) : 1;
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

  // Automatically follow the verse being sung during playback, or use user's manual selection
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

  // Lazy-load VexFlow (Bravura) and engrave scaled, compact SVG systems
  useEffect(() => {
    if (loadState !== 'ready' || !score || visibleMeasures.length === 0) return;
    const host = svgHostRef.current;
    if (!host) return;

    let cancelled = false;

    void import('vexflow/bravura').then((vf) => {
      if (cancelled || !svgHostRef.current) return;

      const target = svgHostRef.current;
      target.innerHTML = '';

      const scale = layoutMode === 'lead' ? LEAD_SCALE : PIANO_SCALE;
      const systemHeight = layoutMode === 'lead' ? LEAD_SYSTEM_HEIGHT : PIANO_SYSTEM_HEIGHT;
      const logicalWidth = Math.round(containerWidth / scale);
      const measuresPerSystem = chooseMeasuresPerSystem(logicalWidth);
      const totalSystems = Math.ceil(visibleMeasures.length / measuresPerSystem);
      const logicalHeight = TOP_PADDING * 2 + totalSystems * systemHeight;
      const displayHeight = Math.round(logicalHeight * scale);
      const usableWidth = Math.max(280, logicalWidth - HORIZONTAL_PADDING * 2);

      const renderer = new vf.Renderer(target, vf.Renderer.Backends.SVG);
      renderer.resize(containerWidth, displayHeight);
      const context = renderer.getContext() as InstanceType<typeof vf.SVGContext>;
      context.setViewBox(0, 0, logicalWidth, logicalHeight);
      context.setFillStyle('currentColor');
      context.setStrokeStyle('currentColor');

      const [tsNum, tsDen] = score.timeSignature;
      const nextBoxes: MeasureHitBox[] = [];
      const nextOnsets: OnsetOverlay[] = [];

      const buildVexNotes = (
        events: ScoreNoteEvent[],
        clef: 'treble' | 'bass',
      ) => {
        const notes = events.map((ev) => {
          const duration = `${ev.baseDuration}${ev.dots > 0 ? 'd' : ''}${ev.isRest ? 'r' : ''}`;
          const staveNote = new vf.StaveNote({
            keys: ev.keys,
            duration,
            clef,
            autoStem: !ev.isRest,
          });

          if (ev.dots > 0) {
            vf.Dot.buildAndAttach([staveNote], { all: true });
          }

          if (!ev.isRest) {
            ev.accidentals.forEach((acc, idx) => {
              if (acc) {
                staveNote.addModifier(new vf.Accidental(acc), idx);
              }
            });
          }

          return staveNote;
        });

        const ties: InstanceType<typeof vf.StaveTie>[] = [];
        for (let i = 1; i < events.length; i++) {
          if (events[i].tieFromPrevious && !events[i].isRest && !events[i - 1].isRest) {
            ties.push(
              new vf.StaveTie({
                firstNote: notes[i - 1],
                lastNote: notes[i],
                firstIndexes: [0],
                lastIndexes: [0],
              }),
            );
          }
        }

        const beamable = notes.filter((_, i) => !events[i].isRest);
        const beams = beamable.length >= 2 ? vf.Beam.generateBeams(beamable) : [];
        return { notes, beams, ties };
      };

      for (let sysIdx = 0; sysIdx < totalSystems; sysIdx++) {
        const sliceStart = sysIdx * measuresPerSystem;
        const rowMeasures = visibleMeasures.slice(sliceStart, sliceStart + measuresPerSystem);
        const systemY = TOP_PADDING + sysIdx * systemHeight;
        const trebleY = systemY + TREBLE_OFFSET_Y;
        const bassY = systemY + BASS_OFFSET_Y;

        const firstMeasureBonus = sysIdx === 0 ? 80 : 52;
        const baseMeasureWidth = Math.floor(
          (usableWidth - firstMeasureBonus) / measuresPerSystem,
        );

        let x = HORIZONTAL_PADDING;

        rowMeasures.forEach((measure, colIdx) => {
          const isFirstInSystem = colIdx === 0;
          const isLastInSystem = colIdx === rowMeasures.length - 1;
          const isVeryLast = sliceStart + colIdx === visibleMeasures.length - 1;
          const measureWidth = isFirstInSystem
            ? baseMeasureWidth + firstMeasureBonus
            : baseMeasureWidth;

          const trebleStave = new vf.Stave(x, trebleY, measureWidth);
          if (isFirstInSystem) {
            trebleStave.addClef('treble').addKeySignature(score.keySignature);
            if (sysIdx === 0) {
              trebleStave.addTimeSignature(score.timeSignatureLabel);
            }
            trebleStave.setMeasure(sliceStart + colIdx + 1);
          }
          if (isVeryLast) {
            trebleStave.setEndBarType(vf.Barline.type.END);
          }
          trebleStave.setContext(context).draw();

          if (layoutMode === 'lead') {
            const { notes, beams, ties } = buildVexNotes(measure.melody, 'treble');
            const voice = new vf.Voice({ numBeats: tsNum, beatValue: tsDen })
              .setStrict(false)
              .addTickables(notes);

            const formatWidth = Math.max(40, x + measureWidth - trebleStave.getNoteStartX() - 14);
            new vf.Formatter().joinVoices([voice]).format([voice], formatWidth);

            voice.draw(context, trebleStave);
            beams.forEach((b) => b.setContext(context).draw());
            ties.forEach((t) => t.setContext(context).draw());

            // Collect scaled X positions of each melody onset for lyrics + playhead
            const measureOnsetXs: { onsetIdx: number; cx: number; tick: number }[] = [];
            measure.melody.forEach((ev, evIdx) => {
              const onsetIdx = onsetLookup.get(`${measure.index}:${evIdx}`);
              if (onsetIdx === undefined) return;
              const note = notes[evIdx];
              const cx = (note.getNoteHeadBeginX() + note.getNoteHeadEndX()) / 2;
              measureOnsetXs.push({
                onsetIdx,
                cx,
                tick: measure.startTick + ev.startStep * score.stepTicks,
              });
            });

            measureOnsetXs.forEach((item, idx) => {
              const nextCx =
                idx + 1 < measureOnsetXs.length
                  ? measureOnsetXs[idx + 1].cx
                  : x + measureWidth - 6;
              const gap = Math.max(26, nextCx - item.cx);
              nextOnsets.push({
                onsetIndex: item.onsetIdx,
                tick: item.tick,
                x: item.cx * scale,
                topY: (trebleY + 18) * scale,
                staffHeight: 74 * scale,
                lyricY: (trebleY + 122) * scale,
                maxWidth: Math.min(96, gap * scale * 1.35),
              });
            });
          } else {
            const bassStave = new vf.Stave(x, bassY, measureWidth);
            if (isFirstInSystem) {
              bassStave.addClef('bass').addKeySignature(score.keySignature);
              if (sysIdx === 0) {
                bassStave.addTimeSignature(score.timeSignatureLabel);
              }
            }
            if (isVeryLast) {
              bassStave.setEndBarType(vf.Barline.type.END);
            }
            bassStave.setContext(context).draw();

            if (isFirstInSystem) {
              new vf.StaveConnector(trebleStave, bassStave)
                .setType(vf.StaveConnector.type.BRACE)
                .setContext(context)
                .draw();
              new vf.StaveConnector(trebleStave, bassStave)
                .setType(vf.StaveConnector.type.SINGLE_LEFT)
                .setContext(context)
                .draw();
            }
            if (isLastInSystem) {
              new vf.StaveConnector(trebleStave, bassStave)
                .setType(
                  isVeryLast
                    ? vf.StaveConnector.type.BOLD_DOUBLE_RIGHT
                    : vf.StaveConnector.type.SINGLE_RIGHT,
                )
                .setContext(context)
                .draw();
            }

            const { notes: trebleNotes, beams: trebleBeams, ties: trebleTies } = buildVexNotes(
              measure.treble,
              'treble',
            );
            const { notes: bassNotes, beams: bassBeams, ties: bassTies } = buildVexNotes(
              measure.bass,
              'bass',
            );

            const trebleVoice = new vf.Voice({ numBeats: tsNum, beatValue: tsDen })
              .setStrict(false)
              .addTickables(trebleNotes);
            const bassVoice = new vf.Voice({ numBeats: tsNum, beatValue: tsDen })
              .setStrict(false)
              .addTickables(bassNotes);

            const noteStartX = Math.max(
              trebleStave.getNoteStartX(),
              bassStave.getNoteStartX(),
            );
            trebleStave.setNoteStartX(noteStartX);
            bassStave.setNoteStartX(noteStartX);

            const formatWidth = Math.max(40, x + measureWidth - noteStartX - 12);
            new vf.Formatter()
              .joinVoices([trebleVoice])
              .joinVoices([bassVoice])
              .format([trebleVoice, bassVoice], formatWidth);

            trebleVoice.draw(context, trebleStave);
            bassVoice.draw(context, bassStave);
            trebleBeams.forEach((b) => b.setContext(context).draw());
            bassBeams.forEach((b) => b.setContext(context).draw());
            trebleTies.forEach((t) => t.setContext(context).draw());
            bassTies.forEach((t) => t.setContext(context).draw());

            // Position playhead markers along the treble notes in piano mode
            measure.melody.forEach((ev, evIdx) => {
              const onsetIdx = onsetLookup.get(`${measure.index}:${evIdx}`);
              if (onsetIdx === undefined) return;
              const matchNote = trebleNotes[Math.min(evIdx, trebleNotes.length - 1)];
              if (!matchNote) return;
              const cx = (matchNote.getNoteHeadBeginX() + matchNote.getNoteHeadEndX()) / 2;
              nextOnsets.push({
                onsetIndex: onsetIdx,
                tick: measure.startTick + ev.startStep * score.stepTicks,
                x: cx * scale,
                topY: (trebleY + 18) * scale,
                staffHeight: 168 * scale,
                lyricY: (bassY + 104) * scale,
                maxWidth: 64,
              });
            });
          }

          nextBoxes.push({
            measureIndex: measure.index,
            displayNumber: sliceStart + colIdx + 1,
            startSec: measure.startSec,
            x: x * scale,
            y: (systemY + 6) * scale,
            width: measureWidth * scale,
            height: (systemHeight - 12) * scale,
          });

          x += measureWidth;
        });
      }

      setSvgHeight(displayHeight);
      setMeasureBoxes(nextBoxes);
      setOnsetOverlays(nextOnsets);
    });

    return () => {
      cancelled = true;
    };
  }, [loadState, score, visibleMeasures, containerWidth, layoutMode, onsetLookup]);

  // Smoothly keep the active system centered while playing
  useEffect(() => {
    if (!playback.isPlaying || activeOnsetIdx === null) return;
    const activeOverlay = onsetOverlays.find((o) => o.onsetIndex === activeOnsetIdx);
    if (!activeOverlay) return;
    const systemBucket = Math.floor(activeOverlay.topY / 80);
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
      if (startMeasure) {
        seekToStanzaTick(startMeasure.startTick, verseIdx);
      }
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
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 sm:p-5"
    >
      {/* Compact Header: Key/Time + Lead Sheet / Piano switch */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
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
          aria-label="Notation density"
          className="inline-flex rounded-lg bg-[var(--bg-recessed)] p-0.5 text-[11px] font-bold"
        >
          <button
            type="button"
            onClick={() => setLayoutMode('lead')}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors ${
              layoutMode === 'lead'
                ? 'bg-[var(--accent-primary)] text-[var(--ink-on-accent)] shadow-xs'
                : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <MusicNoteSimple size={13} weight="bold" />
            <span>Melody + Lyrics</span>
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode('piano')}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors ${
              layoutMode === 'piano'
                ? 'bg-[var(--accent-primary)] text-[var(--ink-on-accent)] shadow-xs'
                : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <PianoKeys size={13} weight="bold" />
            <span>Piano</span>
          </button>
        </div>
      </div>

      {/* Sticky Live Moving Lyrics Strip */}
      {currentLine && (
        <div className="sticky top-[57px] z-20 -mx-1 mb-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)]/95 px-3.5 py-2.5 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                {isPlayingIntro
                  ? `Introduction · Verse 1 in ${liveSync?.introRemainingSec ?? 0}s`
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
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[var(--bg-surface)]">
              <div
                className="h-full rounded-full bg-[var(--accent-primary)] transition-[width] duration-150"
                style={{ width: `${Math.round((liveSync?.introProgress ?? 0) * 100)}%` }}
              />
            </div>
          )}

          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-sm font-medium leading-snug text-[var(--ink-primary)]">
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
            <p className="mt-1 truncate text-xs text-[var(--ink-muted)]">
              {nextLine.words.join(' ')}
            </p>
          )}
        </div>
      )}

      {/* Engraved Score + Moving Playhead & Under-Note Lyrics */}
      <div
        ref={containerRef}
        className="relative w-full overflow-x-hidden text-[var(--ink-primary)]"
        style={{ minHeight: loadState === 'loading' ? 180 : svgHeight }}
      >
        {loadState === 'loading' && (
          <div className="flex h-44 items-center justify-center gap-2 text-xs font-semibold text-[var(--ink-muted)]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>Engraving melody and lyrics...</span>
          </div>
        )}

        <div
          ref={svgHostRef}
          className="sheet-music-svg w-full select-none"
          aria-hidden="true"
        />

        {/* Clickable measure hit zones (subtle hover only, no loud full-bar boxes) */}
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

        {/* Smooth Moving Playhead Hairline */}
        {activeOverlay && !isPlayingIntro && (
          <div
            aria-hidden="true"
            style={{
              left: activeOverlay.x,
              top: activeOverlay.topY,
              height: activeOverlay.staffHeight,
            }}
            className="pointer-events-none absolute -translate-x-1/2 w-[3px] rounded-full bg-[var(--accent-primary)]/75 shadow-[0_0_8px_var(--accent-primary)] transition-[left,top] duration-150 ease-out"
          />
        )}

        {/* Under-Note Syllables (Lead Sheet mode) */}
        {layoutMode === 'lead' && onsetOverlays.length > 0 && (
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
                      : 'font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
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
        Tap any syllable or measure to jump playback.
      </p>
    </section>
  );
}
