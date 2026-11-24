import { Midi } from '@tonejs/midi';
import * as Tone from 'tone';

export type InstrumentVoice = 'piano' | 'organ';
export type MidiLoadStatus = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error';

export interface MidiPlaybackState {
  hymnNumber: number | null;
  status: MidiLoadStatus;
  isPlaying: boolean;
  samplesReady: boolean;
  progress: number; // 0..1
  currentTimeSec: number;
  totalDurationSec: number;
  baseBpm: number;
  effectiveBpm: number;
  speed: number; // 0.75..1.25
  voice: InstrumentVoice;
  errorMessage?: string;
}

export interface ParsedMidiNote {
  time: number;
  duration: number;
  name: string;
  velocity: number;
}

export interface PlayableMidiData {
  notes: ParsedMidiNote[];
  durationSec: number;
  baseBpm: number;
}

type StateListener = (state: MidiPlaybackState) => void;

const SALAMANDER_URLS: Record<string, string> = {
  A1: 'A1.mp3',
  C2: 'C2.mp3',
  'D#2': 'Ds2.mp3',
  'F#2': 'Fs2.mp3',
  A2: 'A2.mp3',
  C3: 'C3.mp3',
  'D#3': 'Ds3.mp3',
  'F#3': 'Fs3.mp3',
  A3: 'A3.mp3',
  C4: 'C4.mp3',
  'D#4': 'Ds4.mp3',
  'F#4': 'Fs4.mp3',
  A4: 'A4.mp3',
  C5: 'C5.mp3',
  'D#5': 'Ds5.mp3',
  'F#5': 'Fs5.mp3',
  A5: 'A5.mp3',
  C6: 'C6.mp3',
};

const ORGAN_URLS: Record<string, string> = {
  C2: 'C2.mp3',
  F2: 'F2.mp3',
  A2: 'A2.mp3',
  C3: 'C3.mp3',
  F3: 'F3.mp3',
  A3: 'A3.mp3',
  C4: 'C4.mp3',
  F4: 'F4.mp3',
  A4: 'A4.mp3',
  C5: 'C5.mp3',
  F5: 'F5.mp3',
  C6: 'C6.mp3',
};

export function formatMidiFilename(hymnNumber: number): string {
  return `${String(Math.max(0, Math.floor(hymnNumber))).padStart(3, '0')}.mid`;
}

/**
 * Checks Standard MIDI header bytes ("MThd") so HTML SPA 404 fallbacks never parse as MIDI.
 */
export function isValidMidiBuffer(buffer: ArrayBuffer): boolean {
  if (!buffer || buffer.byteLength < 14) return false;
  const bytes = new Uint8Array(buffer, 0, 4);
  return bytes[0] === 0x4d && bytes[1] === 0x54 && bytes[2] === 0x68 && bytes[3] === 0x64;
}

function clampVelocity(rawVelocity: number | undefined): number {
  return Math.min(0.85, Math.max(0.25, rawVelocity || 0.68));
}

function resolveBaseBpm(parsed: Midi, firstNoteTime: number, fallbackBpm: number): number {
  const validTempos = (parsed.header?.tempos || []).filter(
    (t) => typeof t.bpm === 'number' && t.bpm >= 35 && t.bpm <= 210,
  );

  let activeTempo: (typeof validTempos)[number] | undefined;
  for (const tempo of validTempos) {
    const tempoTime = typeof tempo.time === 'number' ? tempo.time : 0;
    if (tempoTime <= firstNoteTime + 0.05) {
      activeTempo = tempo;
    }
  }

  const chosen = activeTempo?.bpm ?? validTempos[0]?.bpm ?? fallbackBpm ?? 96;
  return Math.round(chosen);
}

/**
 * Extracts clean playable notes from multi-track GM hymn MIDIs:
 * strips percussion channels, deduplicates doubled SATB ensemble layers,
 * ignores brief lead-in tempo spikes, and trims excessive leading silence.
 */
export function extractPlayableMidiData(parsed: Midi, fallbackBpm = 96): PlayableMidiData {
  interface DedupEntry {
    note: ParsedMidiNote;
    isKeyboard: boolean;
  }

  const deduped = new Map<string, DedupEntry>();

  for (const track of parsed.tracks) {
    if (track.channel === 9 || Boolean(track.instrument?.percussion)) {
      continue;
    }

    const isKeyboard = track.channel <= 1;

    for (const note of track.notes) {
      if (!note.name) continue;

      const time = Math.max(0, note.time);
      const duration = Math.max(0.08, note.duration);
      const velocity = clampVelocity(note.velocity);
      const bucket = Math.round(time * 50);
      const pitchKey = note.midi !== undefined ? String(note.midi) : note.name;
      const key = `${bucket}_${pitchKey}`;
      const existing = deduped.get(key);

      if (!existing) {
        deduped.set(key, {
          note: { time, duration, name: note.name, velocity },
          isKeyboard,
        });
      } else {
        if (duration > existing.note.duration) {
          existing.note.duration = duration;
        }
        if (isKeyboard && !existing.isKeyboard) {
          existing.note.velocity = velocity;
          existing.isKeyboard = true;
        } else if (isKeyboard === existing.isKeyboard && velocity > existing.note.velocity) {
          existing.note.velocity = velocity;
        }
        if (time < existing.note.time) {
          existing.note.time = time;
        }
      }
    }
  }

  const notes = Array.from(deduped.values(), (entry) => entry.note).sort(
    (a, b) => a.time - b.time,
  );

  if (notes.length === 0) {
    return {
      notes: [],
      durationSec: 1,
      baseBpm: Math.round(fallbackBpm || 96),
    };
  }

  const firstNoteTime = notes[0].time;
  const baseBpm = resolveBaseBpm(parsed, firstNoteTime, fallbackBpm);
  const shifted = firstNoteTime > 1.2;

  if (shifted) {
    const offset = firstNoteTime - 0.15;
    for (const note of notes) {
      note.time = Math.max(0, note.time - offset);
    }
  }

  let maxEnd = 0;
  for (const note of notes) {
    const end = note.time + note.duration;
    if (end > maxEnd) maxEnd = end;
  }

  const durationSec = shifted
    ? Math.max(maxEnd, 1)
    : Math.max(parsed.duration || 0, maxEnd, 1);

  return { notes, durationSec, baseBpm };
}

class RealMidiPlayerEngine {
  private reverb: Tone.Reverb | null = null;
  private pianoSampler: Tone.Sampler | null = null;
  private pianoPromise: Promise<Tone.Sampler> | null = null;
  private organSampler: Tone.Sampler | null = null;
  private organPromise: Promise<Tone.Sampler> | null = null;
  private activePart: Tone.Part | null = null;
  private endEventId: number | null = null;
  private rafId: number | null = null;

  private hymnNumber: number | null = null;
  private status: MidiLoadStatus = 'idle';
  private isPlaying = false;
  private samplesReady = false;
  private notes: ParsedMidiNote[] = [];
  private midiDurationSec = 1;
  private baseBpm = 96;
  private speed = 1.0;
  private voice: InstrumentVoice = 'piano';
  private errorMessage: string | undefined;
  private loadSeq = 0;

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

  getState(): MidiPlaybackState {
    const ppq = this.getPpq();
    const ticks = this.getTransportTicks();
    const rawElapsed = Math.max(0, Math.min(this.midiDurationSec, ticks / ppq));
    const progress =
      this.midiDurationSec > 0 ? Math.min(1, rawElapsed / this.midiDurationSec) : 0;

    return {
      hymnNumber: this.hymnNumber,
      status: this.status,
      isPlaying: this.isPlaying,
      samplesReady: this.samplesReady,
      progress,
      currentTimeSec: rawElapsed / this.speed,
      totalDurationSec: this.midiDurationSec / this.speed,
      baseBpm: this.baseBpm,
      effectiveBpm: Math.round(this.baseBpm * this.speed),
      speed: this.speed,
      voice: this.voice,
      errorMessage: this.errorMessage,
    };
  }

  private getPpq(): number {
    try {
      return Tone.getTransport().PPQ || 192;
    } catch {
      return 192;
    }
  }

  private getTransportTicks(): number {
    try {
      return Tone.getTransport().ticks;
    } catch {
      return 0;
    }
  }

  private getBaseUrl(): string {
    const base = import.meta.env.BASE_URL || '/';
    return base.endsWith('/') ? base : `${base}/`;
  }

  private getOrCreateReverb(): Tone.Reverb {
    if (!this.reverb) {
      this.reverb = new Tone.Reverb({ decay: 1.7, wet: 0.18 }).toDestination();
    }
    return this.reverb;
  }

  private async ensureVoiceSampler(targetVoice: InstrumentVoice): Promise<Tone.Sampler> {
    const reverb = this.getOrCreateReverb();

    if (targetVoice === 'organ') {
      if (this.organSampler && this.organSampler.loaded) {
        return this.organSampler;
      }
      if (!this.organPromise) {
        this.organPromise = new Promise<Tone.Sampler>((resolve, reject) => {
          const sampler = new Tone.Sampler({
            urls: ORGAN_URLS,
            baseUrl: `${this.getBaseUrl()}samples/organ/`,
            release: 0.45,
            volume: -7,
            onload: () => resolve(sampler),
            onerror: (err) => reject(err),
          }).connect(reverb);
          this.organSampler = sampler;
        }).catch((err) => {
          this.organPromise = null;
          throw err;
        });
      }
      return this.organPromise;
    }

    if (this.pianoSampler && this.pianoSampler.loaded) {
      return this.pianoSampler;
    }
    if (!this.pianoPromise) {
      this.pianoPromise = new Promise<Tone.Sampler>((resolve, reject) => {
        const sampler = new Tone.Sampler({
          urls: SALAMANDER_URLS,
          baseUrl: `${this.getBaseUrl()}samples/piano/`,
          release: 1.2,
          volume: -4,
          onload: () => {
            this.samplesReady = true;
            this.emit();
            resolve(sampler);
          },
          onerror: (err) => reject(err),
        }).connect(reverb);
        this.pianoSampler = sampler;
      }).catch((err) => {
        this.pianoPromise = null;
        throw err;
      });
    }
    return this.pianoPromise;
  }

  private clearSchedule(): void {
    if (this.activePart) {
      this.activePart.dispose();
      this.activePart = null;
    }
    try {
      const transport = Tone.getTransport();
      if (this.endEventId !== null) {
        transport.clear(this.endEventId);
        this.endEventId = null;
      }
      transport.cancel(0);
    } catch {
      // Ignore transport not ready
    }
  }

  private scheduleNotes(): void {
    this.clearSchedule();
    if (this.notes.length === 0) return;

    const transport = Tone.getTransport();
    const ppq = this.getPpq();
    transport.bpm.value = 60 * this.speed;

    const tickEvents = this.notes.map((n) => ({
      time: `${Math.round(n.time * ppq)}i`,
      duration: n.duration,
      name: n.name,
      velocity: n.velocity,
    }));

    this.activePart = new Tone.Part((time, val) => {
      const sampler = this.voice === 'organ' ? this.organSampler : this.pianoSampler;
      if (!sampler || !sampler.loaded) return;
      const scaledDuration = Math.max(0.08, val.duration / this.speed);
      sampler.triggerAttackRelease(val.name, scaledDuration, time, val.velocity);
    }, tickEvents).start(0);

    const endTicks = Math.round((this.midiDurationSec + 0.35) * ppq);
    this.endEventId = transport.scheduleOnce(() => {
      this.stop();
    }, `${endTicks}i`);
  }

  async loadHymn(hymnNumber: number, fallbackBpm = 96): Promise<void> {
    if (
      this.hymnNumber === hymnNumber &&
      (this.status === 'ready' || this.status === 'unavailable')
    ) {
      return;
    }

    const token = ++this.loadSeq;
    this.stop();
    this.hymnNumber = hymnNumber;
    this.status = 'loading';
    this.notes = [];
    this.midiDurationSec = 1;
    this.baseBpm = fallbackBpm;
    this.errorMessage = undefined;
    this.emit();

    const midiPath = `${this.getBaseUrl()}midi/${formatMidiFilename(hymnNumber)}`;
    const midiUrl =
      typeof window !== 'undefined'
        ? new URL(midiPath, window.location.origin).href
        : midiPath;

    try {
      const res = await fetch(midiUrl);
      if (token !== this.loadSeq) return;

      if (!res.ok) {
        this.status = 'unavailable';
        this.emit();
        return;
      }

      const buf = await res.arrayBuffer();
      if (token !== this.loadSeq) return;

      if (!isValidMidiBuffer(buf)) {
        this.status = 'unavailable';
        this.emit();
        return;
      }

      const parsed = new Midi(buf);
      const { notes, durationSec, baseBpm } = extractPlayableMidiData(parsed, fallbackBpm);

      if (notes.length === 0) {
        this.status = 'unavailable';
        this.emit();
        return;
      }

      this.notes = notes;
      this.midiDurationSec = durationSec;
      this.baseBpm = baseBpm;
      this.status = 'ready';
      this.emit();
    } catch (err) {
      if (token !== this.loadSeq) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        this.status = 'unavailable';
      } else {
        this.status = 'error';
        this.errorMessage = err instanceof Error ? err.message : 'Unable to load MIDI track';
      }
      this.emit();
    }
  }

  async play(): Promise<void> {
    if (this.status !== 'ready' || this.notes.length === 0) return;
    await Tone.start();
    await this.ensureVoiceSampler(this.voice);
    this.samplesReady = true;

    const transport = Tone.getTransport();
    if (!this.activePart) {
      this.scheduleNotes();
    }

    transport.bpm.value = 60 * this.speed;
    transport.start();
    this.isPlaying = true;
    this.startProgressLoop();
    this.emit();
  }

  pause(): void {
    try {
      Tone.getTransport().pause();
      this.pianoSampler?.releaseAll();
      this.organSampler?.releaseAll();
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
      transport.ticks = 0;
      this.pianoSampler?.releaseAll();
      this.organSampler?.releaseAll();
    } catch {
      // Ignore
    }
    this.clearSchedule();
    this.isPlaying = false;
    this.stopProgressLoop();
    this.emit();
  }

  seek(progress01: number): void {
    if (this.status !== 'ready') return;
    const clamped = Math.max(0, Math.min(0.995, progress01));
    const ppq = this.getPpq();
    try {
      Tone.getTransport().ticks = Math.round(clamped * this.midiDurationSec * ppq);
    } catch {
      // Ignore
    }
    this.emit();
  }

  setSpeed(nextSpeed: number): void {
    const clamped = Math.max(0.75, Math.min(1.25, Math.round(nextSpeed * 100) / 100));
    this.speed = clamped;
    try {
      Tone.getTransport().bpm.value = 60 * clamped;
    } catch {
      // Ignore
    }
    this.emit();
  }

  async setVoice(voice: InstrumentVoice): Promise<void> {
    if (this.voice === voice) return;
    const previous = this.voice === 'organ' ? this.organSampler : this.pianoSampler;
    previous?.releaseAll();
    this.voice = voice;
    this.emit();
    if (this.isPlaying) {
      await this.ensureVoiceSampler(voice);
    }
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

export const midiPlayer = new RealMidiPlayerEngine();
