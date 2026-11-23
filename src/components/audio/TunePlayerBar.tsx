import { useEffect, useMemo, useState } from 'react';
import {
  ArrowCounterClockwise,
  Metronome,
  Pause,
  PianoKeys,
  Play,
  SlidersHorizontal,
} from '@phosphor-icons/react';
import type { HymnEntry } from '../../data/hymnalTypes';
import { getTuneSequenceForHymn } from '../../data/melodies';
import { hymnSynth, type SynthPlaybackState } from './hymnSynth';

interface TunePlayerBarProps {
  hymn: HymnEntry;
}

function formatTime(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function TunePlayerBar({ hymn }: TunePlayerBarProps) {
  const tune = useMemo(() => getTuneSequenceForHymn(hymn), [hymn]);
  const [playback, setPlayback] = useState<SynthPlaybackState>(() => hymnSynth.getState());
  const [showTempoPanel, setShowTempoPanel] = useState(false);

  useEffect(() => {
    hymnSynth.loadTune(tune);
    const unsub = hymnSynth.subscribe(setPlayback);
    return () => {
      unsub();
      hymnSynth.stop();
    };
  }, [tune]);

  const handlePlayPause = async () => {
    if (playback.isPlaying) {
      hymnSynth.pause();
    } else {
      await hymnSynth.play();
    }
  };

  return (
    <section
      aria-label="Hymn Tune Player"
      className="fixed bottom-[calc(5.15rem+env(safe-area-inset-bottom))] left-1/2 z-30 w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-3 shadow-[0_-4px_20px_rgba(19,6,3,0.12)]"
    >
      <div className="flex items-center gap-3">
        {/* Chunky Yoto-inspired Play/Pause */}
        <button
          type="button"
          onClick={handlePlayPause}
          aria-label={playback.isPlaying ? 'Pause hymn tune' : 'Play hymn tune'}
          className="tactile-btn flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)] text-[var(--ink-on-accent)] shadow-[var(--shadow-tactile)] hover:bg-[var(--accent-primary-hover)]"
        >
          {playback.isPlaying ? (
            <Pause size={22} weight="fill" />
          ) : (
            <Play size={22} weight="fill" className="translate-x-0.5" />
          )}
        </button>

        {/* Tune Info + Scrubber */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold uppercase tracking-wide text-[var(--ink-primary)]">
                {tune.tuneName}
              </p>
              <p className="truncate text-[11px] text-[var(--ink-muted)]">
                {tune.key} · {playback.bpm} BPM
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  hymnSynth.setVoice(playback.voice === 'organ' ? 'piano' : 'organ')
                }
                aria-label={`Switch instrument sound, currently ${playback.voice}`}
                className="tactile-btn inline-flex h-8 items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-recessed)] px-2.5 text-xs font-semibold text-[var(--ink-secondary)] hover:border-[var(--border-strong)]"
              >
                <PianoKeys size={14} weight="duotone" />
                <span>{playback.voice === 'organ' ? 'Organ' : 'Piano'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowTempoPanel((prev) => !prev)}
                aria-expanded={showTempoPanel}
                aria-label="Toggle tempo controls"
                className={`tactile-btn inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold ${
                  showTempoPanel
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-recessed)] text-[var(--ink-secondary)]'
                }`}
              >
                <SlidersHorizontal size={14} weight="bold" />
                <span>Tempo</span>
              </button>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2.5">
            <input
              type="range"
              min={0}
              max={1000}
              value={Math.round(playback.progress * 1000)}
              onChange={(e) => hymnSynth.seek(Number(e.target.value) / 1000)}
              aria-label="Seek hymn tune"
              className="tactile-range w-full"
            />
            <span className="shrink-0 font-[family-name:var(--font-mono)] text-[11px] font-medium tabular-nums text-[var(--ink-muted)]">
              {formatTime(playback.currentTimeSec)}/{formatTime(playback.totalDurationSec)}
            </span>
          </div>
        </div>
      </div>

      {showTempoPanel && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink-secondary)]">
            <Metronome size={16} weight="duotone" className="text-[var(--accent-primary)]" />
            <span>Tempo</span>
            <span className="rounded-md bg-[var(--bg-recessed)] px-2 py-0.5 font-[family-name:var(--font-mono)] text-xs font-bold tabular-nums text-[var(--ink-primary)]">
              {playback.bpm} BPM
            </span>
          </div>

          <div className="flex flex-1 items-center gap-2 min-w-[180px]">
            <button
              type="button"
              onClick={() => hymnSynth.setBpm(playback.bpm - 5)}
              aria-label="Decrease tempo"
              className="tactile-btn flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-recessed)] text-sm font-bold text-[var(--ink-primary)]"
            >
              -
            </button>
            <input
              type="range"
              min={55}
              max={145}
              step={1}
              value={playback.bpm}
              onChange={(e) => hymnSynth.setBpm(Number(e.target.value))}
              aria-label="Tempo BPM slider"
              className="tactile-range w-full"
            />
            <button
              type="button"
              onClick={() => hymnSynth.setBpm(playback.bpm + 5)}
              aria-label="Increase tempo"
              className="tactile-btn flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-recessed)] text-sm font-bold text-[var(--ink-primary)]"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={() => hymnSynth.setBpm(tune.defaultBpm)}
            aria-label="Reset tempo to default"
            className="tactile-btn inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2.5 text-xs font-semibold text-[var(--ink-secondary)] hover:bg-[var(--bg-recessed)]"
          >
            <ArrowCounterClockwise size={13} />
            <span>Reset ({tune.defaultBpm})</span>
          </button>
        </div>
      )}
    </section>
  );
}
