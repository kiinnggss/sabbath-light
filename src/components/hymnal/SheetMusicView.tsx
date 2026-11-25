import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MusicNotes,
  Rows,
  StackSimple,
} from '@phosphor-icons/react';
import type { HymnEntry } from '../../data/hymnalTypes';
import {
  extractHymnScore,
  findActiveMeasureIndex,
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

interface MeasureHitBox {
  measureIndex: number;
  displayNumber: number;
  startSec: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

type ScoreScope = 'stanza' | 'full';

const SYSTEM_HEIGHT = 220;
const TOP_PADDING = 4;
const TREBLE_OFFSET_Y = 10;
const BASS_OFFSET_Y = 106;
const HORIZONTAL_PADDING = 10;

function chooseMeasuresPerSystem(containerWidth: number): number {
  if (containerWidth < 460) return 2;
  if (containerWidth < 720) return 3;
  return 4;
}

export function SheetMusicView({ hymn }: SheetMusicViewProps) {
  const [score, setScore] = useState<ParsedHymnScore | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'unavailable' | 'error'>('loading');
  const [scope, setScope] = useState<ScoreScope>('stanza');
  const [containerWidth, setContainerWidth] = useState<number>(640);
  const [measureBoxes, setMeasureBoxes] = useState<MeasureHitBox[]>([]);
  const [svgHeight, setSvgHeight] = useState<number>(SYSTEM_HEIGHT);
  const [playback, setPlayback] = useState<MidiPlaybackState>(() => midiPlayer.getState());

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgHostRef = useRef<HTMLDivElement | null>(null);
  const lastScrolledMeasureRef = useRef<number | null>(null);

  // Subscribe to playback state for live measure highlighting
  useEffect(() => {
    const unsub = midiPlayer.subscribe(setPlayback);
    return unsub;
  }, []);

  // Track responsive container width
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

  // Load and parse the hymn MIDI into a score model
  useEffect(() => {
    let cancelled = false;
    setLoadState('loading');
    setScore(null);
    setMeasureBoxes([]);
    setScope('stanza');
    lastScrolledMeasureRef.current = null;

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

  const hasDistinctStanza = useMemo(() => {
    if (!score) return false;
    const [start, end] = score.stanzaRange;
    return end - start < score.measures.length;
  }, [score]);

  const visibleMeasures: ScoreMeasure[] = useMemo(() => {
    if (!score) return [];
    if (scope === 'stanza' && hasDistinctStanza) {
      const [start, end] = score.stanzaRange;
      return score.measures.slice(start, end);
    }
    return score.measures;
  }, [score, scope, hasDistinctStanza]);

  // Lazy-load VexFlow (Bravura font bundle) and engrave SVG systems
  useEffect(() => {
    if (loadState !== 'ready' || !score || visibleMeasures.length === 0) return;
    const host = svgHostRef.current;
    if (!host) return;

    let cancelled = false;

    void import('vexflow/bravura').then((vf) => {
      if (cancelled || !svgHostRef.current) return;

      const target = svgHostRef.current;
      target.innerHTML = '';

      const measuresPerSystem = chooseMeasuresPerSystem(containerWidth);
      const totalSystems = Math.ceil(visibleMeasures.length / measuresPerSystem);
      const totalHeight = TOP_PADDING * 2 + totalSystems * SYSTEM_HEIGHT;
      const usableWidth = Math.max(260, containerWidth - HORIZONTAL_PADDING * 2);

      const renderer = new vf.Renderer(target, vf.Renderer.Backends.SVG);
      renderer.resize(containerWidth, totalHeight);
      const context = renderer.getContext();

      // Style ink via currentColor so Light/Sepia/Dark themes switch instantaneously
      context.setFillStyle('currentColor');
      context.setStrokeStyle('currentColor');

      const [tsNum, tsDen] = score.timeSignature;
      const nextBoxes: MeasureHitBox[] = [];

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

        const beamable = notes.filter((_, i) => !events[i].isRest);
        const beams = beamable.length >= 2 ? vf.Beam.generateBeams(beamable) : [];
        return { notes, beams };
      };

      for (let sysIdx = 0; sysIdx < totalSystems; sysIdx++) {
        const sliceStart = sysIdx * measuresPerSystem;
        const rowMeasures = visibleMeasures.slice(sliceStart, sliceStart + measuresPerSystem);
        const systemY = TOP_PADDING + sysIdx * SYSTEM_HEIGHT;
        const trebleY = systemY + TREBLE_OFFSET_Y;
        const bassY = systemY + BASS_OFFSET_Y;

        // Give the first measure in each system extra horizontal space for clef/key/time
        const firstMeasureBonus = sysIdx === 0 ? 78 : 52;
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
          const bassStave = new vf.Stave(x, bassY, measureWidth);

          if (isFirstInSystem) {
            trebleStave.addClef('treble').addKeySignature(score.keySignature);
            bassStave.addClef('bass').addKeySignature(score.keySignature);
            if (sysIdx === 0) {
              trebleStave.addTimeSignature(score.timeSignatureLabel);
              bassStave.addTimeSignature(score.timeSignatureLabel);
            }
          }

          if (isVeryLast) {
            trebleStave.setEndBarType(vf.Barline.type.END);
            bassStave.setEndBarType(vf.Barline.type.END);
          }

          // Subtle bar number at the start of each system (1-based within visible view)
          if (isFirstInSystem) {
            trebleStave.setMeasure(sliceStart + colIdx + 1);
          }

          trebleStave.setContext(context).draw();
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

          const { notes: trebleNotes, beams: trebleBeams } = buildVexNotes(
            measure.treble,
            'treble',
          );
          const { notes: bassNotes, beams: bassBeams } = buildVexNotes(
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

          nextBoxes.push({
            measureIndex: measure.index,
            displayNumber: measure.displayNumber,
            startSec: measure.startSec,
            x,
            y: systemY + 8,
            width: measureWidth,
            height: SYSTEM_HEIGHT - 16,
          });

          x += measureWidth;
        });
      }

      setSvgHeight(totalHeight);
      setMeasureBoxes(nextBoxes);
    });

    return () => {
      cancelled = true;
    };
  }, [loadState, score, visibleMeasures, containerWidth]);

  // Compute active measure during playback
  const activeMeasureIndex = useMemo(() => {
    if (!score || playback.hymnNumber !== hymn.number) return null;
    if (!playback.isPlaying && playback.currentTimeSec <= 0.01) return null;
    const rawMidiSec = playback.currentTimeSec * playback.speed;
    return findActiveMeasureIndex(
      score,
      rawMidiSec,
      scope === 'stanza' && hasDistinctStanza ? 'stanza' : 'full',
    );
  }, [score, playback.hymnNumber, playback.isPlaying, playback.currentTimeSec, playback.speed, hymn.number, scope, hasDistinctStanza]);

  // Gently keep active measure in view while playing
  useEffect(() => {
    if (!playback.isPlaying || activeMeasureIndex === null) return;
    if (lastScrolledMeasureRef.current === activeMeasureIndex) return;
    lastScrolledMeasureRef.current = activeMeasureIndex;

    const el = containerRef.current?.querySelector<HTMLElement>(
      `[data-measure-index="${activeMeasureIndex}"]`,
    );
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [playback.isPlaying, activeMeasureIndex]);

  const handleMeasureClick = (box: MeasureHitBox) => {
    if (playback.hymnNumber !== hymn.number || playback.status !== 'ready') return;
    midiPlayer.seekToRawSeconds(box.startSec);
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

  return (
    <section
      aria-label={`Sheet music for ${hymn.title}`}
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5"
    >
      {/* Score Metadata & Scope Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[var(--ink-secondary)]">
          {score ? (
            <>
              <span className="rounded-full bg-[var(--bg-recessed)] px-2.5 py-0.5 text-[var(--ink-primary)]">
                Key of {score.keyLabel}
              </span>
              <span className="rounded-full bg-[var(--bg-recessed)] px-2.5 py-0.5">
                {score.timeSignatureLabel}
              </span>
              <span className="rounded-full bg-[var(--bg-recessed)] px-2.5 py-0.5">
                {score.bpm} BPM
              </span>
              <span className="text-[11px] text-[var(--ink-muted)]">
                {visibleMeasures.length} bars
              </span>
            </>
          ) : (
            <span className="text-[var(--ink-muted)]">Engraving grand staff...</span>
          )}
        </div>

        {hasDistinctStanza && (
          <div
            role="group"
            aria-label="Score length"
            className="inline-flex rounded-lg bg-[var(--bg-recessed)] p-0.5 text-[11px] font-bold"
          >
            <button
              type="button"
              onClick={() => setScope('stanza')}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors ${
                scope === 'stanza'
                  ? 'bg-[var(--accent-primary)] text-[var(--ink-on-accent)] shadow-xs'
                  : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
              }`}
            >
              <StackSimple size={13} weight="bold" />
              <span>1 Stanza</span>
            </button>
            <button
              type="button"
              onClick={() => setScope('full')}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors ${
                scope === 'full'
                  ? 'bg-[var(--accent-primary)] text-[var(--ink-on-accent)] shadow-xs'
                  : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
              }`}
            >
              <Rows size={13} weight="bold" />
              <span>Full Track</span>
            </button>
          </div>
        )}
      </div>

      {/* Engraved Grand-Staff Container */}
      <div
        ref={containerRef}
        className="relative mt-3 w-full overflow-x-hidden text-[var(--ink-primary)]"
        style={{ minHeight: loadState === 'loading' ? 240 : svgHeight }}
      >
        {loadState === 'loading' && (
          <div className="flex h-60 items-center justify-center gap-2.5 text-xs font-semibold text-[var(--ink-muted)]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>Preparing sheet music...</span>
          </div>
        )}

        {/* VexFlow SVG output */}
        <div
          ref={svgHostRef}
          className="sheet-music-svg w-full select-none"
          aria-hidden="true"
        />

        {/* Interactive Measure Overlay for Playback Highlight & Click-to-Seek */}
        {measureBoxes.length > 0 && (
          <div className="pointer-events-none absolute inset-0">
            {measureBoxes.map((box) => {
              const isActive = activeMeasureIndex === box.measureIndex;
              return (
                <button
                  key={box.measureIndex}
                  type="button"
                  data-measure-index={box.measureIndex}
                  onClick={() => handleMeasureClick(box)}
                  aria-label={`Jump to measure ${box.displayNumber}`}
                  title={`Measure ${box.displayNumber} — click to jump`}
                  style={{
                    left: box.x,
                    top: box.y,
                    width: box.width,
                    height: box.height,
                  }}
                  className={`pointer-events-auto absolute rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)] ${
                    isActive
                      ? 'bg-[var(--accent-primary)]/14 ring-2 ring-[var(--accent-primary)]/55'
                      : 'hover:bg-[var(--ink-primary)]/5'
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] text-[var(--ink-muted)]">
        Auto-engraved from the bundled four-part MIDI track. Tap any measure to jump playback.
      </p>
    </section>
  );
}
