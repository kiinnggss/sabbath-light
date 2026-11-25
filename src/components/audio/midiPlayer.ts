import { Midi } from '@tonejs/midi';

export type InstrumentVoice = 'piano' | 'organ';
export type MidiLoadStatus =
  | 'idle'
  | 'loading'
  | 'preparing'
  | 'ready'
  | 'unavailable'
  | 'error';

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
  midi: number;
  velocity: number;
}

export interface PlayableMidiData {
  notes: ParsedMidiNote[];
  durationSec: number;
  baseBpm: number;
}

type StateListener = (state: MidiPlaybackState) => void;

const SALAMANDER_SAMPLES: Record<number, string> = {
  33: 'A1.mp3',
  36: 'C2.mp3',
  39: 'Ds2.mp3',
  42: 'Fs2.mp3',
  45: 'A2.mp3',
  48: 'C3.mp3',
  51: 'Ds3.mp3',
  54: 'Fs3.mp3',
  57: 'A3.mp3',
  60: 'C4.mp3',
  63: 'Ds4.mp3',
  66: 'Fs4.mp3',
  69: 'A4.mp3',
  72: 'C5.mp3',
  75: 'Ds5.mp3',
  78: 'Fs5.mp3',
  81: 'A5.mp3',
  84: 'C6.mp3',
};

const ORGAN_SAMPLES: Record<number, string> = {
  36: 'C2.mp3',
  41: 'F2.mp3',
  45: 'A2.mp3',
  48: 'C3.mp3',
  53: 'F3.mp3',
  57: 'A3.mp3',
  60: 'C4.mp3',
  65: 'F4.mp3',
  69: 'A4.mp3',
  72: 'C5.mp3',
  77: 'F5.mp3',
  84: 'C6.mp3',
};

// Minimal valid WAV header + silence used synchronously to unlock mobile HTMLAudioElement
const SILENT_WAV_DATA_URL =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

const MAX_RENDERED_CACHE = 3;
const MAX_PARSED_MIDI_CACHE = 6;
const UI_PROGRESS_INTERVAL_MS = 100;

const parsedMidiCache = new Map<number, Promise<Midi | null>>();

function resolveMidiBaseUrl(): string {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

/**
 * Fetches and parses a bundled hymnal MIDI file, caching the result so
 * audio rendering and sheet music rendering share a single network fetch.
 */
export function loadParsedMidi(hymnNumber: number): Promise<Midi | null> {
  const existing = parsedMidiCache.get(hymnNumber);
  if (existing) {
    // Refresh LRU order
    parsedMidiCache.delete(hymnNumber);
    parsedMidiCache.set(hymnNumber, existing);
    return existing;
  }

  const promise = (async (): Promise<Midi | null> => {
    const midiPath = `${resolveMidiBaseUrl()}midi/${formatMidiFilename(hymnNumber)}`;
    const midiUrl =
      typeof window !== 'undefined'
        ? new URL(midiPath, window.location.origin).href
        : midiPath;

    const res = await fetch(midiUrl);
    if (!res.ok) return null;

    const buf = await res.arrayBuffer();
    if (!isValidMidiBuffer(buf)) return null;

    return new Midi(buf);
  })().catch((err) => {
    // Do not poison the cache on transient network errors
    parsedMidiCache.delete(hymnNumber);
    throw err;
  });

  parsedMidiCache.set(hymnNumber, promise);
  while (parsedMidiCache.size > MAX_PARSED_MIDI_CACHE) {
    const oldestKey = parsedMidiCache.keys().next().value;
    if (oldestKey === undefined) break;
    parsedMidiCache.delete(oldestKey);
  }

  return promise;
}

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

function isBassTrack(track: Midi['tracks'][number]): boolean {
  const family = track.instrument?.family?.toLowerCase();
  const num = track.instrument?.number;
  return family === 'bass' || (typeof num === 'number' && num >= 32 && num <= 39);
}

function isKeyboardTrack(track: Midi['tracks'][number]): boolean {
  const family = track.instrument?.family?.toLowerCase();
  const num = track.instrument?.number;
  return (
    family === 'piano' ||
    (typeof num === 'number' && num >= 0 && num <= 7) ||
    track.channel <= 1
  );
}

const NOTE_NAME_SEMITONES: Record<string, number> = {
  C: 0,
  'C#': 1,
  DB: 1,
  D: 2,
  'D#': 3,
  EB: 3,
  E: 4,
  F: 5,
  'F#': 6,
  GB: 6,
  G: 7,
  'G#': 8,
  AB: 8,
  A: 9,
  'A#': 10,
  BB: 10,
  B: 11,
};

function resolveNoteMidi(note: Midi['tracks'][number]['notes'][number]): number | null {
  if (typeof note.midi === 'number' && Number.isFinite(note.midi)) {
    return Math.round(note.midi);
  }
  const match = /^([A-Ga-g][#bB]?)(-?\d)$/.exec(note.name || '');
  if (!match) return null;
  const semi = NOTE_NAME_SEMITONES[match[1].toUpperCase()];
  if (semi === undefined) return null;
  const octave = Number(match[2]);
  return (octave + 1) * 12 + semi;
}

/**
 * Extracts clean playable notes from multi-track GM hymn MIDIs:
 * strips percussion and sub-octave GM bass tracks when piano/SATB tracks exist,
 * deduplicates doubled GM ensemble layers, ignores brief lead-in tempo spikes,
 * and trims excessive leading silence.
 */
export function extractPlayableMidiData(parsed: Midi, fallbackBpm = 96): PlayableMidiData {
  interface DedupEntry {
    note: ParsedMidiNote;
    keyboardPriority: boolean;
  }

  const nonPercTracks = parsed.tracks.filter(
    (track) =>
      track.notes.length > 0 &&
      track.channel !== 9 &&
      !track.instrument?.percussion,
  );
  const satbTracks = nonPercTracks.filter((track) => !isBassTrack(track));
  const selectedTracks = satbTracks.length > 0 ? satbTracks : nonPercTracks;

  const deduped = new Map<string, DedupEntry>();

  for (const track of selectedTracks) {
    const keyboardPriority = isKeyboardTrack(track);

    for (const note of track.notes) {
      if (!note.name) continue;
      const midiNum = resolveNoteMidi(note);
      if (midiNum === null || midiNum < 21 || midiNum > 108) continue;

      const time = Math.max(0, note.time);
      const duration = Math.max(0.08, note.duration);
      const velocity = clampVelocity(note.velocity);
      const bucket = Math.round(time * 50);
      const key = `${bucket}_${midiNum}`;
      const existing = deduped.get(key);

      if (!existing) {
        deduped.set(key, {
          note: { time, duration, name: note.name, midi: midiNum, velocity },
          keyboardPriority,
        });
      } else {
        if (duration > existing.note.duration) {
          existing.note.duration = duration;
        }
        if (keyboardPriority && !existing.keyboardPriority) {
          existing.note.velocity = velocity;
          existing.keyboardPriority = true;
        } else if (keyboardPriority === existing.keyboardPriority && velocity > existing.note.velocity) {
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

function softLimitSample(x: number): number {
  const ax = Math.abs(x);
  if (ax <= 0.9) return x;
  return Math.sign(x) * (0.9 + 0.08 * Math.tanh((ax - 0.9) / 0.08));
}

const IS_LITTLE_ENDIAN =
  new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;

/**
 * Encodes stereo Float32 PCM buffers into a high-passed, peak-normalized,
 * soft-limited 16-bit PCM RIFF/WAVE ArrayBuffer so audio never hits clipping.
 */
export function encodePcmToWav(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
): ArrayBuffer {
  const length = Math.min(left.length, right.length);
  const hpLeft = new Float32Array(length);
  const hpRight = new Float32Array(length);

  // 1-pole ~45 Hz DC / subsonic high-pass filter + peak detection in a single pass
  const alpha = 1 / (1 + (2 * Math.PI * 45) / sampleRate);
  let prevInL = 0;
  let prevOutL = 0;
  let prevInR = 0;
  let prevOutR = 0;
  let peak = 0;

  for (let i = 0; i < length; i++) {
    const inL = left[i];
    const inR = right[i];
    const outL = alpha * (prevOutL + inL - prevInL);
    const outR = alpha * (prevOutR + inR - prevInR);
    prevInL = inL;
    prevOutL = outL;
    prevInR = inR;
    prevOutR = outR;

    hpLeft[i] = outL;
    hpRight[i] = outR;

    const a = Math.max(Math.abs(outL), Math.abs(outR));
    if (a > peak) peak = a;
  }

  const normGain = peak > 0.001 ? Math.min(3.5, 0.88 / peak) : 1.0;
  const dataBytes = length * 4;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataBytes, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 2, true); // Stereo
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);

  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataBytes, true);

  if (IS_LITTLE_ENDIAN) {
    const pcm = new Int16Array(buffer, 44);
    for (let i = 0, p = 0; i < length; i++, p += 2) {
      const l = softLimitSample(hpLeft[i] * normGain);
      const r = softLimitSample(hpRight[i] * normGain);
      pcm[p] = Math.max(-32767, Math.min(32767, Math.round(l * 32767)));
      pcm[p + 1] = Math.max(-32767, Math.min(32767, Math.round(r * 32767)));
    }
  } else {
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const l = softLimitSample(hpLeft[i] * normGain);
      const r = softLimitSample(hpRight[i] * normGain);
      view.setInt16(offset, Math.max(-32767, Math.min(32767, Math.round(l * 32767))), true);
      view.setInt16(offset + 2, Math.max(-32767, Math.min(32767, Math.round(r * 32767))), true);
      offset += 4;
    }
  }

  return buffer;
}

export interface DecodedSample {
  left: Float32Array;
  right: Float32Array;
  sampleRate: number;
}

export interface MixedStereoPcm {
  left: Float32Array;
  right: Float32Array;
  sampleRate: number;
}

function findClosestSampleMidi(targetMidi: number, availableMidis: number[]): number {
  let best = availableMidis[0];
  let bestDist = Math.abs(targetMidi - best);
  for (let i = 1; i < availableMidis.length; i++) {
    const dist = Math.abs(targetMidi - availableMidis[i]);
    if (dist < bestDist) {
      best = availableMidis[i];
      bestDist = dist;
    }
  }
  return best;
}

/**
 * Sums MIDI note events directly into stereo Float32Array PCM buffers with linear
 * sample interpolation and smooth attack/release envelopes, yielding periodically so
 * rapid hymn switching stays responsive and abortable.
 */
export async function mixNotesToStereoPcm(
  notes: ParsedMidiNote[],
  durationSec: number,
  voice: InstrumentVoice,
  sampleBank: Map<number, DecodedSample>,
  sampleRate: number,
  shouldAbort?: () => boolean,
): Promise<MixedStereoPcm | null> {
  const availableMidis = Array.from(sampleBank.keys()).sort((a, b) => a - b);
  if (availableMidis.length === 0) return null;

  const tailSec = voice === 'organ' ? 0.45 : 0.55;
  const totalSec = Math.min(360, Math.max(1.5, durationSec + tailSec));
  const totalFrames = Math.ceil(totalSec * sampleRate);
  const outL = new Float32Array(totalFrames);
  const outR = new Float32Array(totalFrames);

  const attackSec = voice === 'organ' ? 0.012 : 0.0025;
  const releaseSec = voice === 'organ' ? 0.22 : 0.22;
  const attackFrames = Math.max(1, Math.round(attackSec * sampleRate));
  const releaseFrames = Math.max(1, Math.round(releaseSec * sampleRate));
  const brightFrames = Math.round(0.035 * sampleRate);
  const minStartFrame = Math.round(0.005 * sampleRate);

  // Classify each note's musical role (melody / harmony / bass) within 40ms chord windows
  // so the soprano melody sings clearly above the accompaniment instead of being buried.
  const voiceRoles: Array<'melody' | 'harmony' | 'bass'> = new Array(notes.length).fill('harmony');
  let clusterStart = 0;
  while (clusterStart < notes.length) {
    const t0 = notes[clusterStart].time;
    let clusterEnd = clusterStart + 1;
    while (clusterEnd < notes.length && notes[clusterEnd].time - t0 <= 0.04) {
      clusterEnd++;
    }
    let maxMidi = -Infinity;
    let minMidi = Infinity;
    for (let k = clusterStart; k < clusterEnd; k++) {
      if (notes[k].midi > maxMidi) maxMidi = notes[k].midi;
      if (notes[k].midi < minMidi) minMidi = notes[k].midi;
    }
    const multiPitch = maxMidi > minMidi;
    for (let k = clusterStart; k < clusterEnd; k++) {
      if (notes[k].midi === maxMidi && maxMidi >= 57) {
        voiceRoles[k] = 'melody';
      } else if (multiPitch && notes[k].midi === minMidi) {
        voiceRoles[k] = 'bass';
      } else {
        voiceRoles[k] = 'harmony';
      }
    }
    clusterStart = clusterEnd;
  }

  for (let nIdx = 0; nIdx < notes.length; nIdx++) {
    if (nIdx > 0 && nIdx % 60 === 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      if (shouldAbort?.()) return null;
    }

    const note = notes[nIdx];
    const role = voiceRoles[nIdx];
    const startFrame = Math.max(minStartFrame, Math.round(note.time * sampleRate));
    if (startFrame >= totalFrames - 10) continue;

    const closestMidi = findClosestSampleMidi(note.midi, availableMidis);
    const smp = sampleBank.get(closestMidi);
    if (!smp || smp.left.length < 4) continue;

    const rate =
      Math.pow(2, (note.midi - closestMidi) / 12) * (smp.sampleRate / sampleRate);
    const maxOutFromSample = Math.floor((smp.left.length - 2) / rate);
    const targetFrames = Math.round((note.duration + releaseSec) * sampleRate);
    const span = Math.min(maxOutFromSample, targetFrames, totalFrames - startFrame);
    if (span <= attackFrames + 2) continue;

    const rel = Math.min(releaseFrames, Math.floor(span * 0.45));
    const relStart = span - rel;

    const baseGain =
      (voice === 'organ'
        ? 0.22 + 0.3 * note.velocity
        : 0.22 + 0.48 * note.velocity) * 0.65;
    const roleScale =
      role === 'melody'
        ? voice === 'organ'
          ? 1.35
          : 1.55
        : role === 'bass'
          ? voice === 'organ'
            ? 0.86
            : 0.78
          : voice === 'organ'
            ? 0.72
            : 0.62;
    const gain = baseGain * roleScale;

    // Subtle acoustic grand-piano stereo width (bass slightly left, melody slightly right)
    const panL = role === 'bass' ? 1.07 : role === 'melody' ? 0.94 : 0.98;
    const panR = role === 'bass' ? 0.91 : role === 'melody' ? 1.06 : 0.98;
    const addHammerCrisp = voice === 'piano' && role === 'melody';

    const sL = smp.left;
    const sR = smp.right;
    let pos = 0;
    let prevL = 0;
    let prevR = 0;

    for (let i = 0; i < span; i++) {
      const idx = Math.floor(pos);
      const frac = pos - idx;
      let env = gain;
      if (i < attackFrames) {
        env = gain * (i / attackFrames);
      } else if (i >= relStart) {
        env = gain * ((span - i) / rel);
      }

      let lVal = sL[idx] + (sL[idx + 1] - sL[idx]) * frac;
      let rVal = sR[idx] + (sR[idx + 1] - sR[idx]) * frac;

      // Subtle attack presence boost on piano melody notes so the tune stays sharp and clear
      if (addHammerCrisp && i < brightFrames) {
        const brightMix = 0.22 * (1 - i / brightFrames);
        const dL = lVal - prevL;
        const dR = rVal - prevR;
        prevL = lVal;
        prevR = rVal;
        lVal += dL * brightMix;
        rVal += dR * brightMix;
      }

      outL[startFrame + i] += lVal * env * panL;
      outR[startFrame + i] += rVal * env * panR;
      pos += rate;
    }
  }

  if (shouldAbort?.()) return null;
  return { left: outL, right: outR, sampleRate };
}

interface CachedRenderedTrack {
  key: string;
  blobUrl: string;
  durationSec: number;
  baseBpm: number;
}

class PreRenderedMidiPlayerEngine {
  private audioEl: HTMLAudioElement | null = null;
  private preferredSampleRate: number | null = null;
  private decoderCtx: OfflineAudioContext | null = null;

  private sampleBanks = new Map<InstrumentVoice, Map<number, DecodedSample>>();
  private samplePromises = new Map<string, Promise<DecodedSample>>();
  private renderedCache = new Map<string, CachedRenderedTrack>();
  private renderInFlight = new Map<string, Promise<CachedRenderedTrack | null>>();

  private hymnNumber: number | null = null;
  private hymnTitle = '';
  private notes: ParsedMidiNote[] = [];
  private midiDurationSec = 1;
  private baseBpm = 96;
  private speed = 1.0;
  private voice: InstrumentVoice = 'piano';
  private status: MidiLoadStatus = 'idle';
  private isPlaying = false;
  private errorMessage: string | undefined;

  private attachedBlobUrl = '';
  private pendingAutoPlay = false;
  private unlockingAudio = false;
  private progressTimerId: number | null = null;
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

  private ensureAudioElement(): HTMLAudioElement | null {
    if (this.audioEl || typeof Audio === 'undefined') {
      return this.audioEl;
    }

    const audio = new Audio();
    audio.preload = 'auto';

    audio.addEventListener('play', () => {
      if (this.unlockingAudio || this.status !== 'ready') return;
      this.isPlaying = true;
      this.startProgressLoop();
      this.emit();
    });

    audio.addEventListener('pause', () => {
      if (this.unlockingAudio) return;
      if (!audio.ended) {
        this.isPlaying = false;
        this.stopProgressLoop();
        this.emit();
      }
    });

    audio.addEventListener('ended', () => {
      if (this.unlockingAudio) return;
      this.isPlaying = false;
      this.stopProgressLoop();
      try {
        audio.currentTime = 0;
      } catch {
        // Ignore seek errors on ended element
      }
      this.emit();
    });

    audio.addEventListener('error', () => {
      if (this.unlockingAudio || !this.attachedBlobUrl) return;
      this.isPlaying = false;
      this.stopProgressLoop();
      this.status = 'error';
      this.errorMessage = 'Audio playback failed';
      this.emit();
    });

    this.audioEl = audio;
    return audio;
  }

  private getBaseUrl(): string {
    const base = import.meta.env.BASE_URL || '/';
    return base.endsWith('/') ? base : `${base}/`;
  }

  private getRenderSampleRate(): number {
    if (this.preferredSampleRate) return this.preferredSampleRate;
    try {
      const probe = new OfflineAudioContext(2, 1, 24000);
      this.preferredSampleRate = probe.sampleRate || 24000;
    } catch {
      this.preferredSampleRate = 44100;
    }
    return this.preferredSampleRate;
  }

  private getDecoderContext(): OfflineAudioContext {
    const sr = this.getRenderSampleRate();
    if (!this.decoderCtx) {
      this.decoderCtx = new OfflineAudioContext(2, 1, sr);
    }
    return this.decoderCtx;
  }

  private async ensureSingleSample(
    voice: InstrumentVoice,
    midiKey: number,
  ): Promise<DecodedSample> {
    let voiceBank = this.sampleBanks.get(voice);
    if (!voiceBank) {
      voiceBank = new Map<number, DecodedSample>();
      this.sampleBanks.set(voice, voiceBank);
    }
    const existing = voiceBank.get(midiKey);
    if (existing) return existing;

    const promiseKey = `${voice}_${midiKey}`;
    const inFlight = this.samplePromises.get(promiseKey);
    if (inFlight) return inFlight;

    const sampleMap = voice === 'organ' ? ORGAN_SAMPLES : SALAMANDER_SAMPLES;
    const filename = sampleMap[midiKey];
    if (!filename) {
      throw new Error(`Missing sample mapping for MIDI ${midiKey}`);
    }

    const folder = voice === 'organ' ? 'organ' : 'piano';
    const basePath = `${this.getBaseUrl()}samples/${folder}/`;
    const url =
      typeof window !== 'undefined'
        ? new URL(`${basePath}${filename}`, window.location.origin).href
        : `${basePath}${filename}`;

    const promise = (async () => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed loading sample ${filename} (${res.status})`);
      }
      const arrayBuf = await res.arrayBuffer();
      const audioBuf = await this.getDecoderContext().decodeAudioData(arrayBuf);
      const maxFrames = Math.min(
        audioBuf.length,
        Math.ceil(6.0 * audioBuf.sampleRate),
      );
      const left = audioBuf.getChannelData(0).slice(0, maxFrames);
      const right =
        audioBuf.numberOfChannels > 1
          ? audioBuf.getChannelData(1).slice(0, maxFrames)
          : left;

      const decoded: DecodedSample = {
        left,
        right,
        sampleRate: audioBuf.sampleRate,
      };
      voiceBank.set(midiKey, decoded);
      return decoded;
    })().finally(() => {
      this.samplePromises.delete(promiseKey);
    });

    this.samplePromises.set(promiseKey, promise);
    return promise;
  }

  private async ensureSamplesForMidis(
    voice: InstrumentVoice,
    midiKeys: number[],
  ): Promise<Map<number, DecodedSample>> {
    await Promise.all(
      midiKeys.map((midiKey) => this.ensureSingleSample(voice, midiKey)),
    );
    return this.sampleBanks.get(voice) || new Map<number, DecodedSample>();
  }

  private async renderHymnTrack(
    hymnNumber: number,
    voice: InstrumentVoice,
    notes: ParsedMidiNote[],
    durationSec: number,
    baseBpm: number,
    shouldAbort: () => boolean,
  ): Promise<CachedRenderedTrack | null> {
    const cacheKey = `${hymnNumber}_${voice}`;
    const existing = this.renderedCache.get(cacheKey);
    if (existing) {
      this.renderedCache.delete(cacheKey);
      this.renderedCache.set(cacheKey, existing);
      return existing;
    }

    const activePromise = this.renderInFlight.get(cacheKey);
    if (activePromise) return activePromise;

    const renderPromise = (async () => {
      const sampleMap = voice === 'organ' ? ORGAN_SAMPLES : SALAMANDER_SAMPLES;
      const allSampleMidis = Object.keys(sampleMap)
        .map(Number)
        .sort((a, b) => a - b);

      const neededKeys = new Set<number>();
      for (const note of notes) {
        neededKeys.add(findClosestSampleMidi(note.midi, allSampleMidis));
      }

      const bank = await this.ensureSamplesForMidis(
        voice,
        Array.from(neededKeys),
      );
      if (shouldAbort()) return null;

      const sr = this.getRenderSampleRate();
      const mixed = await mixNotesToStereoPcm(
        notes,
        durationSec,
        voice,
        bank,
        sr,
        shouldAbort,
      );
      if (!mixed || shouldAbort()) return null;

      const wavBuffer = encodePcmToWav(
        mixed.left,
        mixed.right,
        mixed.sampleRate,
      );
      if (shouldAbort()) return null;

      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      const blobUrl = URL.createObjectURL(blob);

      const entry: CachedRenderedTrack = {
        key: cacheKey,
        blobUrl,
        durationSec,
        baseBpm,
      };

      this.renderedCache.set(cacheKey, entry);
      while (this.renderedCache.size > MAX_RENDERED_CACHE) {
        const oldestKey = this.renderedCache.keys().next().value;
        if (!oldestKey) break;
        const oldest = this.renderedCache.get(oldestKey);
        this.renderedCache.delete(oldestKey);
        if (oldest && oldest.blobUrl !== this.attachedBlobUrl) {
          URL.revokeObjectURL(oldest.blobUrl);
        }
      }

      return entry;
    })().finally(() => {
      this.renderInFlight.delete(cacheKey);
    });

    this.renderInFlight.set(cacheKey, renderPromise);
    return renderPromise;
  }

  private applyAudioSpeed(audio: HTMLAudioElement): void {
    audio.playbackRate = this.speed;
    const pitchAudio = audio as HTMLAudioElement & {
      preservesPitch?: boolean;
      webkitPreservesPitch?: boolean;
      mozPreservesPitch?: boolean;
    };
    if ('preservesPitch' in pitchAudio) pitchAudio.preservesPitch = true;
    if ('webkitPreservesPitch' in pitchAudio) pitchAudio.webkitPreservesPitch = true;
    if ('mozPreservesPitch' in pitchAudio) pitchAudio.mozPreservesPitch = true;
  }

  private attachTrackToAudio(track: CachedRenderedTrack, startTimeSec = 0): void {
    const audio = this.ensureAudioElement();
    if (!audio) return;

    this.attachedBlobUrl = track.blobUrl;
    audio.src = track.blobUrl;
    audio.currentTime = Math.max(0, Math.min(track.durationSec, startTimeSec));
    this.applyAudioSpeed(audio);
  }

  private updateMediaSession(): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      const voiceLabel = this.voice === 'organ' ? 'Church Organ' : 'Grand Piano';
      if (typeof MediaMetadata !== 'undefined') {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: this.hymnTitle || `Hymn #${this.hymnNumber ?? ''}`,
          artist: voiceLabel,
          album: 'Sabbath Light Hymnal',
        });
      }
      navigator.mediaSession.setActionHandler('play', () => {
        void this.play();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.pause();
      });
    } catch {
      // Ignore Media Session errors on unsupported browsers
    }
  }

  getExactRawTimeSec(): number {
    const audio = this.audioEl;
    if (!audio || !this.attachedBlobUrl || this.status !== 'ready') return 0;
    return Math.max(0, Math.min(this.midiDurationSec, audio.currentTime || 0));
  }

  getState(): MidiPlaybackState {
    const audio = this.audioEl;
    const rawElapsed =
      audio && this.attachedBlobUrl && this.status === 'ready'
        ? Math.max(0, Math.min(this.midiDurationSec, audio.currentTime || 0))
        : 0;
    const progress =
      this.midiDurationSec > 0 ? Math.min(1, rawElapsed / this.midiDurationSec) : 0;

    return {
      hymnNumber: this.hymnNumber,
      status: this.status,
      isPlaying: this.isPlaying,
      samplesReady:
        this.sampleBanks.has(this.voice) &&
        (this.sampleBanks.get(this.voice)?.size ?? 0) > 0,
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

  async loadHymn(
    hymnNumber: number,
    fallbackBpm = 96,
    hymnTitle = '',
  ): Promise<void> {
    if (
      this.hymnNumber === hymnNumber &&
      this.renderedCache.has(`${hymnNumber}_${this.voice}`) &&
      this.status === 'ready'
    ) {
      return;
    }

    const token = ++this.loadSeq;
    this.stop();
    this.hymnNumber = hymnNumber;
    this.hymnTitle = hymnTitle;
    this.status = 'loading';
    this.notes = [];
    this.midiDurationSec = 1;
    this.baseBpm = fallbackBpm;
    this.errorMessage = undefined;
    this.attachedBlobUrl = '';
    this.emit();

    try {
      const parsed = await loadParsedMidi(hymnNumber);
      if (token !== this.loadSeq) return;

      if (!parsed) {
        this.status = 'unavailable';
        this.emit();
        return;
      }

      const { notes, durationSec, baseBpm } = extractPlayableMidiData(parsed, fallbackBpm);

      if (notes.length === 0) {
        this.status = 'unavailable';
        this.emit();
        return;
      }

      this.notes = notes;
      this.midiDurationSec = durationSec;
      this.baseBpm = baseBpm;

      const cacheKey = `${hymnNumber}_${this.voice}`;
      const cachedTrack = this.renderedCache.get(cacheKey);
      if (cachedTrack) {
        this.attachTrackToAudio(cachedTrack, 0);
        this.status = 'ready';
        this.emit();
        return;
      }

      this.status = 'preparing';
      this.emit();

      const rendered = await this.renderHymnTrack(
        hymnNumber,
        this.voice,
        notes,
        durationSec,
        baseBpm,
        () => token !== this.loadSeq,
      );
      if (!rendered || token !== this.loadSeq) return;

      this.attachTrackToAudio(rendered, 0);
      this.status = 'ready';
      this.emit();

      if (this.pendingAutoPlay) {
        this.pendingAutoPlay = false;
        await this.play();
      }
    } catch (err) {
      if (token !== this.loadSeq) return;
      this.pendingAutoPlay = false;
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        this.status = 'unavailable';
      } else {
        this.status = 'error';
        this.errorMessage =
          err instanceof Error ? err.message : 'Unable to prepare hymn audio';
      }
      this.emit();
    }
  }

  private unlockAudioElementSync(): void {
    const audio = this.ensureAudioElement();
    if (!audio || this.attachedBlobUrl) return;
    this.unlockingAudio = true;
    try {
      audio.src = SILENT_WAV_DATA_URL;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            if (!this.attachedBlobUrl) {
              audio.pause();
            }
            this.unlockingAudio = false;
          })
          .catch(() => {
            this.unlockingAudio = false;
          });
      } else {
        this.unlockingAudio = false;
      }
    } catch {
      this.unlockingAudio = false;
    }
  }

  async play(): Promise<void> {
    if (this.status === 'preparing') {
      this.pendingAutoPlay = true;
      this.unlockAudioElementSync();
      return;
    }

    if (this.status !== 'ready' || !this.attachedBlobUrl) return;
    const audio = this.ensureAudioElement();
    if (!audio) return;

    this.applyAudioSpeed(audio);
    this.updateMediaSession();

    try {
      await audio.play();
      this.isPlaying = true;
      this.startProgressLoop();
      this.emit();
    } catch (err) {
      this.isPlaying = false;
      this.errorMessage = err instanceof Error ? err.message : 'Playback blocked by browser';
      this.emit();
    }
  }

  pause(): void {
    this.pendingAutoPlay = false;
    if (this.audioEl) {
      try {
        this.audioEl.pause();
      } catch {
        // Ignore
      }
    }
    this.isPlaying = false;
    this.stopProgressLoop();
    this.emit();
  }

  stop(): void {
    this.pendingAutoPlay = false;
    if (this.audioEl) {
      try {
        this.audioEl.pause();
        this.audioEl.currentTime = 0;
      } catch {
        // Ignore
      }
    }
    this.isPlaying = false;
    this.stopProgressLoop();
    this.emit();
  }

  seek(progress01: number): void {
    if (this.status !== 'ready' || !this.audioEl) return;
    const clamped = Math.max(0, Math.min(0.995, progress01));
    try {
      this.audioEl.currentTime = clamped * this.midiDurationSec;
    } catch {
      // Ignore
    }
    this.emit();
  }

  seekToRawSeconds(rawMidiSec: number): void {
    if (this.status !== 'ready' || !this.audioEl || this.midiDurationSec <= 0) return;
    const clamped = Math.max(0, Math.min(this.midiDurationSec * 0.995, rawMidiSec));
    try {
      this.audioEl.currentTime = clamped;
    } catch {
      // Ignore
    }
    this.emit();
  }

  setSpeed(nextSpeed: number): void {
    const clamped = Math.max(0.75, Math.min(1.25, Math.round(nextSpeed * 100) / 100));
    this.speed = clamped;
    if (this.audioEl) {
      this.applyAudioSpeed(this.audioEl);
    }
    this.emit();
  }

  async setVoice(voice: InstrumentVoice): Promise<void> {
    if (this.voice === voice) return;

    const wasPlaying = this.isPlaying || this.pendingAutoPlay;
    const savedProgress = this.getState().progress;
    const targetHymn = this.hymnNumber;
    const targetNotes = this.notes;
    const targetDur = this.midiDurationSec;
    const targetBpm = this.baseBpm;
    const token = this.loadSeq;

    if (wasPlaying) {
      this.unlockAudioElementSync();
    }
    this.pause();
    this.voice = voice;

    if (targetHymn === null || targetNotes.length === 0) {
      this.emit();
      return;
    }

    const cacheKey = `${targetHymn}_${voice}`;
    const cached = this.renderedCache.get(cacheKey);
    if (cached) {
      this.attachTrackToAudio(cached, savedProgress * targetDur);
      this.status = 'ready';
      this.emit();
      if (wasPlaying) {
        await this.play();
      }
      return;
    }

    this.status = 'preparing';
    this.pendingAutoPlay = wasPlaying;
    this.emit();

    try {
      const rendered = await this.renderHymnTrack(
        targetHymn,
        voice,
        targetNotes,
        targetDur,
        targetBpm,
        () => token !== this.loadSeq || this.voice !== voice,
      );
      if (!rendered || token !== this.loadSeq || this.voice !== voice) return;

      this.attachTrackToAudio(rendered, savedProgress * targetDur);
      this.status = 'ready';
      this.emit();

      if (this.pendingAutoPlay) {
        this.pendingAutoPlay = false;
        await this.play();
      }
    } catch (err) {
      if (token !== this.loadSeq) return;
      this.pendingAutoPlay = false;
      this.status = 'error';
      this.errorMessage =
        err instanceof Error ? err.message : 'Unable to switch instrument';
      this.emit();
    }
  }

  private startProgressLoop(): void {
    this.stopProgressLoop();
    if (typeof window === 'undefined') return;
    this.progressTimerId = window.setInterval(() => {
      if (!this.isPlaying) return;
      this.emit();
    }, UI_PROGRESS_INTERVAL_MS);
  }

  private stopProgressLoop(): void {
    if (this.progressTimerId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.progressTimerId);
      this.progressTimerId = null;
    }
  }
}

export const midiPlayer = new PreRenderedMidiPlayerEngine();
