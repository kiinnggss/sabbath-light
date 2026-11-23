import * as Tone from 'tone';
import type { MelodyNote, TuneSequence } from '../../data/melodies';

export type SynthVoice = 'organ' | 'piano';

export interface SynthPlaybackState {
  isPlaying: boolean;
  progress: number; // 0..1
  currentTimeSec: number;
  totalDurationSec: number;
  bpm: number;
  voice: SynthVoice;
}

type StateListener = (state: SynthPlaybackState) => void;

class HymnSynthEngine {
  private synth: Tone.PolySynth | null = null;
  private bassSynth: Tone.PolySynth | null = null;
  private reverb: Tone.Reverb | null = null;
  private melodyPart: Tone.Part | null = null;
  private bassPart: Tone.Part | null = null;
  private rafId: number | null = null;

  private currentTune: TuneSequence | null = null;
  private totalBeats = 16;
  private bpm = 96;
  private voice: SynthVoice = 'organ';
  private isPlaying = false;
  private listeners = new Set<StateListener>();

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  getState(): SynthPlaybackState {
    const secondsPerBeat = 60 / this.bpm;
    const totalDurationSec = this.totalBeats * secondsPerBeat;
    const currentSeconds = this.getTransportSeconds();
    const clamped = Math.max(0, Math.min(totalDurationSec, currentSeconds));
    const progress = totalDurationSec > 0 ? Math.min(1, clamped / totalDurationSec) : 0;

    return {
      isPlaying: this.isPlaying,
      progress,
      currentTimeSec: clamped,
      totalDurationSec,
      bpm: this.bpm,
      voice: this.voice,
    };
  }

  private getTransportSeconds(): number {
    try {
      return Tone.getTransport().seconds;
    } catch {
      return 0;
    }
  }

  private ensureInstruments(): void {
    if (this.synth && this.bassSynth) return;

    this.reverb = new Tone.Reverb({ decay: 1.8, wet: 0.22 }).toDestination();

    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsine', count: 3, spread: 8 },
      envelope: { attack: 0.05, decay: 0.15, sustain: 0.72, release: 0.35 },
      volume: -8,
    }).connect(this.reverb);

    this.bassSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.04, decay: 0.2, sustain: 0.65, release: 0.3 },
      volume: -12,
    }).connect(this.reverb);

    this.applyVoiceSettings();
  }

  private applyVoiceSettings(): void {
    if (!this.synth || !this.bassSynth) return;
    if (this.voice === 'organ') {
      this.synth.set({
        oscillator: { type: 'fatsine', count: 3, spread: 8 },
        envelope: { attack: 0.045, decay: 0.12, sustain: 0.78, release: 0.32 },
        volume: -8,
      });
      this.bassSynth.set({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.04, decay: 0.15, sustain: 0.72, release: 0.28 },
        volume: -12,
      });
      if (this.reverb) this.reverb.wet.value = 0.24;
    } else {
      this.synth.set({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.012, decay: 0.45, sustain: 0.22, release: 0.55 },
        volume: -6,
      });
      this.bassSynth.set({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.015, decay: 0.5, sustain: 0.25, release: 0.5 },
        volume: -10,
      });
      if (this.reverb) this.reverb.wet.value = 0.14;
    }
  }

  private clearParts(): void {
    if (this.melodyPart) {
      this.melodyPart.dispose();
      this.melodyPart = null;
    }
    if (this.bassPart) {
      this.bassPart.dispose();
      this.bassPart = null;
    }
    try {
      Tone.getTransport().cancel(0);
    } catch {
      // Ignore if transport not initialized
    }
  }

  private scheduleTune(tune: TuneSequence): void {
    this.clearParts();
    const transport = Tone.getTransport();
    transport.bpm.value = this.bpm;

    const toEvents = (notes: MelodyNote[]) => {
      let beatCursor = 0;
      const events: Array<{ time: number; note: string; duration: number }> = [];
      for (const item of notes) {
        const startSec = beatCursor * (60 / this.bpm);
        const durSec = Math.max(0.05, item.beats * (60 / this.bpm) * 0.92);
        if (item.note && item.note.toLowerCase() !== 'rest') {
          events.push({ time: startSec, note: item.note, duration: durSec });
        }
        beatCursor += item.beats;
      }
      return { events, totalBeats: beatCursor };
    };

    const melodyScheduled = toEvents(tune.melody);
    const bassScheduled = toEvents(tune.bass);
    this.totalBeats = Math.max(melodyScheduled.totalBeats, bassScheduled.totalBeats, 4);

    // Use Tone.Transport beat-based notation ("0:0:0" or Tone.Time via '4n' ticks) so live BPM changes scale tempo automatically!
    const toBeatEvents = (notes: MelodyNote[]) => {
      let beatCursor = 0;
      const events: Array<{ time: string; note: string; beats: number }> = [];
      for (const item of notes) {
        if (item.note && item.note.toLowerCase() !== 'rest') {
          const bars = Math.floor(beatCursor / 4);
          const remBeats = beatCursor % 4;
          const wholeBeats = Math.floor(remBeats);
          const sixteenths = (remBeats - wholeBeats) * 4;
          events.push({
            time: `${bars}:${wholeBeats}:${sixteenths}`,
            note: item.note,
            beats: item.beats,
          });
        }
        beatCursor += item.beats;
      }
      return events;
    };

    const mBeatEvents = toBeatEvents(tune.melody);
    const bBeatEvents = toBeatEvents(tune.bass);

    this.melodyPart = new Tone.Part((time, val) => {
      const durSec = Math.max(0.06, val.beats * (60 / Tone.getTransport().bpm.value) * 0.9);
      this.synth?.triggerAttackRelease(val.note, durSec, time);
    }, mBeatEvents).start(0);

    if (bBeatEvents.length > 0) {
      this.bassPart = new Tone.Part((time, val) => {
        const durSec = Math.max(0.06, val.beats * (60 / Tone.getTransport().bpm.value) * 0.92);
        this.bassSynth?.triggerAttackRelease(val.note, durSec, time);
      }, bBeatEvents).start(0);
    }

    const totalBars = Math.floor(this.totalBeats / 4);
    const remBeats = this.totalBeats % 4;
    const whole = Math.floor(remBeats);
    const sixteenths = (remBeats - whole) * 4;
    transport.scheduleOnce(() => {
      this.stop();
    }, `${totalBars}:${whole}:${sixteenths}`);
  }

  loadTune(tune: TuneSequence): void {
    if (this.currentTune?.id === tune.id) return;
    this.stop();
    this.currentTune = tune;
    this.bpm = tune.defaultBpm;
    this.totalBeats = Math.max(
      tune.melody.reduce((acc, n) => acc + n.beats, 0),
      4,
    );
    this.emit();
  }

  async play(): Promise<void> {
    if (!this.currentTune) return;
    await Tone.start();
    this.ensureInstruments();

    const transport = Tone.getTransport();
    if (!this.melodyPart) {
      this.scheduleTune(this.currentTune);
    }

    transport.bpm.value = this.bpm;
    transport.start();
    this.isPlaying = true;
    this.startProgressLoop();
    this.emit();
  }

  pause(): void {
    try {
      Tone.getTransport().pause();
    } catch {
      // Ignore
    }
    this.isPlaying = false;
    this.stopProgressLoop();
    this.emit();
  }

  stop(): void {
    try {
      const transport = Tone.getTransport();
      transport.stop();
      transport.seconds = 0;
    } catch {
      // Ignore
    }
    this.clearParts();
    this.isPlaying = false;
    this.stopProgressLoop();
    this.emit();
  }

  seek(progress01: number): void {
    const clamped = Math.max(0, Math.min(0.995, progress01));
    const totalDuration = this.totalBeats * (60 / this.bpm);
    const targetSec = clamped * totalDuration;
    try {
      Tone.getTransport().seconds = targetSec;
    } catch {
      // Ignore
    }
    this.emit();
  }

  setBpm(nextBpm: number): void {
    const clamped = Math.max(55, Math.min(145, Math.round(nextBpm)));
    this.bpm = clamped;
    try {
      Tone.getTransport().bpm.value = clamped;
    } catch {
      // Ignore
    }
    this.emit();
  }

  setVoice(voice: SynthVoice): void {
    this.voice = voice;
    this.applyVoiceSettings();
    this.emit();
  }

  private startProgressLoop(): void {
    this.stopProgressLoop();
    const tick = () => {
      if (!this.isPlaying) return;
      this.emit();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopProgressLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

export const hymnSynth = new HymnSynthEngine();
