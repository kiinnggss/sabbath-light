import { useEffect, useState } from 'react';
import {
  ArrowCounterClockwise,
  Metronome,
  Pause,
  PianoKeys,
  Play,
  SlidersHorizontal,
} from '@phosphor-icons/react';
import type { HymnEntry } from '../../data/hymnalTypes';
import {
  formatMidiFilename,
  midiPlayer,
  type MidiPlaybackState,
} from './midiPlayer';

interface TunePlayerBarProps {
  hymn: HymnEntry;
  /** Docks the player directly above the safe area when BottomNav is hidden (e.g. Sheet mode) */
  dockBottom?: boolean;
}

const SPEED_PRESETS = [0.75, 0.9, 1.0, 1.1, 1.25] as const;

function formatTime(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function TunePlayerBar({ hymn, dockBottom = false }: TunePlayerBarProps) {
  const bottomPosClass = dockBottom
    ? 'bottom-[calc(0.75rem+env(safe-area-inset-bottom))]'
    : 'bottom-[calc(5.15rem+env(safe-area-inset-bottom))]';
  const [playback, setPlayback] = useState<MidiPlaybackState>(() => midiPlayer.getState());
  const [showTempoPanel, setShowTempoPanel] = useState(false);
  const [startingAudio, setStartingAudio] = useState(false);

  useEffect(() => {
    const unsub = midiPlayer.subscribe(setPlayback);
    void midiPlayer.loadHymn(
      hymn.number,
      hymn.defaultBpm || 96,
      hymn.tuneName || hymn.title,
    );
    return () => {
      unsub();
      midiPlayer.stop();
    };
  }, [hymn.number, hymn.defaultBpm, hymn.tuneName, hymn.title]);

  const handlePlayPause = async () => {
    if (playback.status !== 'ready' && playback.status !== 'preparing') return;
    if (playback.isPlaying) {
      midiPlayer.pause();
    } else {
      setStartingAudio(true);
      try {
        await midiPlayer.play();
      } finally {
        setStartingAudio(false);
      }
    }
  };

  if (playback.status === 'unavailable' || playback.status === 'error') {
    return (
      <section
        aria-label="Hymn Tune Player"
        className={`fixed ${bottomPosClass} left-1/2 z-30 w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 shadow-[0_-4px_20px_rgba(19,6,3,0.10)]`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)] text-[var(--ink-muted)]">
              <PianoKeys size={20} weight="duotone" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-[var(--ink-primary)]">
                Piano track not yet added for this hymn
              </p>
              <p className="truncate text-[11px] text-[var(--ink-muted)]">
                {hymn.tuneName || `Hymn #${hymn.number}`} · Expected{' '}
                <code className="font-[family-name:var(--font-mono)]">
                  midi/{formatMidiFilename(hymn.number)}
                </code>
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const isLoadingTrack =
    playback.status === 'loading' ||
    playback.status === 'preparing' ||
    startingAudio;
  const canTapPlay =
    playback.status === 'ready' || playback.status === 'preparing';

  return (
    <section
      aria-label="Hymn Tune Player"
      className={`fixed ${bottomPosClass} left-1/2 z-30 w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-3 shadow-[0_-4px_20px_rgba(19,6,3,0.12)]`}
    >
      <div className="flex items-center gap-3">
        {/* Chunky Yoto-inspired Play/Pause */}
        <button
          type="button"
          disabled={!canTapPlay}
          onClick={handlePlayPause}
          aria-label={
            playback.status === 'preparing'
              ? `Preparing ${playback.voice} audio`
              : playback.status === 'loading'
                ? 'Loading hymn track'
                : playback.isPlaying
                  ? 'Pause hymn tune'
                  : 'Play hymn tune'
          }
          className="tactile-btn flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)] text-[var(--ink-on-accent)] shadow-[var(--shadow-tactile)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-55"
        >
          {isLoadingTrack ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : playback.isPlaying ? (
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
                {hymn.tuneName || `Hymn #${hymn.number}`}
              </p>
              <p className="truncate text-[11px] text-[var(--ink-muted)]">
                {playback.status === 'preparing'
                  ? `Preparing ${playback.voice} audio...`
                  : playback.status === 'loading'
                    ? 'Loading hymn track...'
                    : `${hymn.key || 'Grand Piano'} · ${playback.effectiveBpm} BPM (${playback.speed.toFixed(2)}x)`}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  void midiPlayer.setVoice(playback.voice === 'piano' ? 'organ' : 'piano')
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
                <span>{playback.speed.toFixed(2)}x</span>
              </button>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2.5">
            <input
              type="range"
              min={0}
              max={1000}
              value={Math.round(playback.progress * 1000)}
              onChange={(e) => midiPlayer.seek(Number(e.target.value) / 1000)}
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
        <div className="mt-3 space-y-2.5 border-t border-[var(--border-subtle)] pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink-secondary)]">
              <Metronome size={16} weight="duotone" className="text-[var(--accent-primary)]" />
              <span>Tempo Speed</span>
              <span className="rounded-md bg-[var(--bg-recessed)] px-2 py-0.5 font-[family-name:var(--font-mono)] text-xs font-bold tabular-nums text-[var(--ink-primary)]">
                {playback.speed.toFixed(2)}x · {playback.effectiveBpm} BPM
              </span>
            </div>

            <button
              type="button"
              onClick={() => midiPlayer.setSpeed(1.0)}
              aria-label="Reset tempo to normal speed"
              className="tactile-btn inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2.5 text-xs font-semibold text-[var(--ink-secondary)] hover:bg-[var(--bg-recessed)]"
            >
              <ArrowCounterClockwise size={13} />
              <span>Reset (1.0x)</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              {SPEED_PRESETS.map((preset) => {
                const active = Math.abs(playback.speed - preset) < 0.015;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => midiPlayer.setSpeed(preset)}
                    className={`tactile-btn h-8 rounded-lg border px-2 font-[family-name:var(--font-mono)] text-[11px] font-bold ${
                      active
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--ink-on-accent)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-recessed)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {preset}x
                  </button>
                );
              })}
            </div>

            <input
              type="range"
              min={0.75}
              max={1.25}
              step={0.05}
              value={playback.speed}
              onChange={(e) => midiPlayer.setSpeed(Number(e.target.value))}
              aria-label="Tempo speed slider"
              className="tactile-range min-w-[140px] flex-1"
            />
          </div>
        </div>
      )}
    </section>
  );
}
