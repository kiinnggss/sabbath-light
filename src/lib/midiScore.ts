import type { Midi } from '@tonejs/midi';

export interface ScoreNoteEvent {
  /** Start position within the measure in 16th-note units */
  startStep: number;
  /** Duration in 16th-note units */
  durationSteps: number;
  /** Base VexFlow duration without dot/rest suffix: 'w' | 'h' | 'q' | '8' | '16' */
  baseDuration: 'w' | 'h' | 'q' | '8' | '16';
  /** Number of augmentation dots (0 or 1) */
  dots: 0 | 1;
  /** True when this event is a rest */
  isRest: boolean;
  /** VexFlow key strings sorted low to high, e.g. ['f/4', 'a/4', 'c/5'] */
  keys: string[];
  /** Raw MIDI note numbers sorted low to high */
  midis: number[];
  /** Explicit accidental per key ('#', 'b', 'n') or null when implied by key/measure */
  accidentals: (string | null)[];
}

export interface ScoreMeasure {
  /** 0-based index across the full MIDI */
  index: number;
  /** 1-based bar number */
  displayNumber: number;
  startTick: number;
  endTick: number;
  startSec: number;
  endSec: number;
  treble: ScoreNoteEvent[];
  bass: ScoreNoteEvent[];
}

export interface ParsedHymnScore {
  keySignature: string;
  keyLabel: string;
  timeSignature: [number, number];
  timeSignatureLabel: string;
  bpm: number;
  ppq: number;
  measures: ScoreMeasure[];
  /** Suggested single-stanza slice [startIdx, endIdxExclusive] */
  stanzaRange: [number, number];
  /** Start measure indices of each detected stanza occurrence */
  stanzaStarts: number[];
  stanzaLength: number;
}

const VALID_MAJOR_KEYS = new Set([
  'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#',
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb',
]);

const VALID_MINOR_KEYS = new Set([
  'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'A#m',
  'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm',
]);

const FLAT_KEYS = new Set([
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb',
  'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm',
]);

const SHARP_ORDER = ['f', 'c', 'g', 'd', 'a', 'e', 'b'] as const;
const FLAT_ORDER = ['b', 'e', 'a', 'd', 'g', 'c', 'f'] as const;

const KEY_ACCIDENTAL_COUNTS: Record<string, number> = {
  C: 0, Am: 0,
  G: 1, Em: 1,
  D: 2, Bm: 2,
  A: 3, 'F#m': 3,
  E: 4, 'C#m': 4,
  B: 5, 'G#m': 5,
  'F#': 6, 'D#m': 6,
  'C#': 7, 'A#m': 7,
  F: -1, Dm: -1,
  Bb: -2, Gm: -2,
  Eb: -3, Cm: -3,
  Ab: -4, Fm: -4,
  Db: -5, Bbm: -5,
  Gb: -6, Ebm: -6,
  Cb: -7, Abm: -7,
};

const SHARP_SPELLING: ReadonlyArray<{ letter: string; acc: '#' | '' }> = [
  { letter: 'c', acc: '' },
  { letter: 'c', acc: '#' },
  { letter: 'd', acc: '' },
  { letter: 'd', acc: '#' },
  { letter: 'e', acc: '' },
  { letter: 'f', acc: '' },
  { letter: 'f', acc: '#' },
  { letter: 'g', acc: '' },
  { letter: 'g', acc: '#' },
  { letter: 'a', acc: '' },
  { letter: 'a', acc: '#' },
  { letter: 'b', acc: '' },
];

const FLAT_SPELLING: ReadonlyArray<{ letter: string; acc: 'b' | '' }> = [
  { letter: 'c', acc: '' },
  { letter: 'd', acc: 'b' },
  { letter: 'd', acc: '' },
  { letter: 'e', acc: 'b' },
  { letter: 'e', acc: '' },
  { letter: 'f', acc: '' },
  { letter: 'g', acc: 'b' },
  { letter: 'g', acc: '' },
  { letter: 'a', acc: 'b' },
  { letter: 'a', acc: '' },
  { letter: 'b', acc: 'b' },
  { letter: 'b', acc: '' },
];

interface DurationChunk {
  steps: number;
  baseDuration: 'w' | 'h' | 'q' | '8' | '16';
  dots: 0 | 1;
}

const DURATION_TABLE: ReadonlyArray<DurationChunk> = [
  { steps: 16, baseDuration: 'w', dots: 0 },
  { steps: 12, baseDuration: 'h', dots: 1 },
  { steps: 8, baseDuration: 'h', dots: 0 },
  { steps: 6, baseDuration: 'q', dots: 1 },
  { steps: 4, baseDuration: 'q', dots: 0 },
  { steps: 3, baseDuration: '8', dots: 1 },
  { steps: 2, baseDuration: '8', dots: 0 },
  { steps: 1, baseDuration: '16', dots: 0 },
];

const CLEAN_DURATIONS = new Set(DURATION_TABLE.map((d) => d.steps));

export function normalizeKeySignature(
  rawKey?: string,
  rawScale?: string,
  fallbackKeyLabel?: string,
): { keySignature: string; keyLabel: string } {
  if (rawKey) {
    const cleanRoot = rawKey.trim().replace(/♯/g, '#').replace(/♭/g, 'b');
    const isMinor = (rawScale || '').toLowerCase().includes('minor');
    const candidate = isMinor ? `${cleanRoot}m` : cleanRoot;
    if (isMinor && VALID_MINOR_KEYS.has(candidate)) {
      return { keySignature: candidate, keyLabel: `${cleanRoot} Minor` };
    }
    if (!isMinor && VALID_MAJOR_KEYS.has(candidate)) {
      return { keySignature: candidate, keyLabel: `${cleanRoot} Major` };
    }
  }

  if (fallbackKeyLabel) {
    const cleaned = fallbackKeyLabel
      .trim()
      .replace(/[-\s]?flat/gi, 'b')
      .replace(/[-\s]?sharp/gi, '#')
      .replace(/♭/g, 'b')
      .replace(/♯/g, '#');
    const match = /^([A-G][#b]?)\s*(minor|min|major|maj|m\b)?/i.exec(cleaned);
    if (match) {
      const root = match[1].charAt(0).toUpperCase() + match[1].slice(1);
      const scaleToken = (match[2] || '').toLowerCase();
      const isMinor = scaleToken === 'm' || scaleToken.startsWith('min');
      const candidate = isMinor ? `${root}m` : root;
      if (isMinor && VALID_MINOR_KEYS.has(candidate)) {
        return { keySignature: candidate, keyLabel: `${root} Minor` };
      }
      if (!isMinor && VALID_MAJOR_KEYS.has(candidate)) {
        return { keySignature: candidate, keyLabel: `${root} Major` };
      }
    }
  }

  return { keySignature: 'C', keyLabel: 'C Major' };
}

function getKeyDefaultAlterations(keySignature: string): Record<string, '#' | 'b' | ''> {
  const map: Record<string, '#' | 'b' | ''> = {
    c: '', d: '', e: '', f: '', g: '', a: '', b: '',
  };
  const count = KEY_ACCIDENTAL_COUNTS[keySignature] ?? 0;
  if (count > 0) {
    for (let i = 0; i < count; i++) {
      map[SHARP_ORDER[i]] = '#';
    }
  } else if (count < 0) {
    for (let i = 0; i < Math.abs(count); i++) {
      map[FLAT_ORDER[i]] = 'b';
    }
  }
  return map;
}

export function decomposeDurationSteps(totalSteps: number): DurationChunk[] {
  const chunks: DurationChunk[] = [];
  let remaining = Math.max(0, Math.floor(totalSteps));
  while (remaining > 0) {
    const match = DURATION_TABLE.find((entry) => entry.steps <= remaining);
    if (!match) break;
    chunks.push(match);
    remaining -= match.steps;
  }
  return chunks;
}

function spellMidiPitch(
  midiNote: number,
  preferFlats: boolean,
): { letter: string; acc: '#' | 'b' | ''; octave: number; vexKey: string } {
  const clamped = Math.max(21, Math.min(108, Math.round(midiNote)));
  const pc = ((clamped % 12) + 12) % 12;
  const octave = Math.floor(clamped / 12) - 1;
  const { letter, acc } = preferFlats ? FLAT_SPELLING[pc] : SHARP_SPELLING[pc];
  return {
    letter,
    acc,
    octave,
    vexKey: `${letter}${acc}/${octave}`,
  };
}

interface RawStaffNote {
  ticks: number;
  durationTicks: number;
  midi: number;
}

function buildStaffEventsForMeasure(
  rawNotes: RawStaffNote[],
  measureStartTick: number,
  stepTicks: number,
  measureSixteenths: number,
  clef: 'treble' | 'bass',
  keySignature: string,
): ScoreNoteEvent[] {
  const restKey = clef === 'treble' ? 'b/4' : 'd/3';
  const preferFlats = FLAT_KEYS.has(keySignature);
  const keyDefaults = getKeyDefaultAlterations(keySignature);
  // Active alteration state per pitch letter + octave within this measure
  const activeAlterations = new Map<string, '#' | 'b' | ''>();

  const resolveAccidental = (
    letter: string,
    octave: number,
    acc: '#' | 'b' | '',
  ): string | null => {
    const slot = `${letter}${octave}`;
    const current = activeAlterations.has(slot)
      ? activeAlterations.get(slot)!
      : keyDefaults[letter] ?? '';
    if (current === acc) return null;
    activeAlterations.set(slot, acc);
    return acc === '' ? 'n' : acc;
  };

  if (rawNotes.length === 0) {
    let cursor = 0;
    return decomposeDurationSteps(measureSixteenths).map((chunk) => {
      const ev: ScoreNoteEvent = {
        startStep: cursor,
        durationSteps: chunk.steps,
        baseDuration: chunk.baseDuration,
        dots: chunk.dots,
        isRest: true,
        keys: [restKey],
        midis: [],
        accidentals: [null],
      };
      cursor += chunk.steps;
      return ev;
    });
  }

  // Group notes starting on the same quantized 16th-note step into chords
  const stepMap = new Map<number, { midis: Set<number>; maxDurSteps: number }>();
  for (const n of rawNotes) {
    const relSteps = Math.round((n.ticks - measureStartTick) / stepTicks);
    const step = Math.max(0, Math.min(measureSixteenths - 1, relSteps));
    const durSteps = Math.max(1, Math.round(n.durationTicks / stepTicks));
    let bucket = stepMap.get(step);
    if (!bucket) {
      bucket = { midis: new Set<number>(), maxDurSteps: durSteps };
      stepMap.set(step, bucket);
    }
    bucket.midis.add(Math.round(n.midi));
    if (durSteps > bucket.maxDurSteps) {
      bucket.maxDurSteps = durSteps;
    }
  }

  const onsetSteps = [...stepMap.keys()].sort((a, b) => a - b);
  const events: ScoreNoteEvent[] = [];

  const pushRests = (startStep: number, lengthSteps: number) => {
    let cursor = startStep;
    for (const chunk of decomposeDurationSteps(lengthSteps)) {
      events.push({
        startStep: cursor,
        durationSteps: chunk.steps,
        baseDuration: chunk.baseDuration,
        dots: chunk.dots,
        isRest: true,
        keys: [restKey],
        midis: [],
        accidentals: [null],
      });
      cursor += chunk.steps;
    }
  };

  let cursor = 0;

  for (let i = 0; i < onsetSteps.length; i++) {
    const onset = onsetSteps[i];
    if (onset > cursor) {
      pushRests(cursor, onset - cursor);
      cursor = onset;
    }

    const nextOnset = i + 1 < onsetSteps.length ? onsetSteps[i + 1] : measureSixteenths;
    const gap = Math.max(1, nextOnset - onset);
    const bucket = stepMap.get(onset)!;

    // Gentle legato snap: hymns often detach notes to ~90% duration; fill the gap if close
    let targetDur = Math.min(gap, bucket.maxDurSteps);
    if (gap - targetDur <= 1 && (CLEAN_DURATIONS.has(gap) || targetDur >= gap * 0.7)) {
      targetDur = gap;
    } else if (targetDur >= gap * 0.75) {
      targetDur = gap;
    }

    const sortedMidis = [...bucket.midis].sort((a, b) => a - b);
    const spelled = sortedMidis.map((m) => spellMidiPitch(m, preferFlats));

    const chunks = decomposeDurationSteps(targetDur);
    let chordCursor = onset;
    for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
      const chunk = chunks[cIdx];
      const accidentals =
        cIdx === 0
          ? spelled.map((s) => resolveAccidental(s.letter, s.octave, s.acc))
          : spelled.map(() => null);
      events.push({
        startStep: chordCursor,
        durationSteps: chunk.steps,
        baseDuration: chunk.baseDuration,
        dots: chunk.dots,
        isRest: false,
        keys: spelled.map((s) => s.vexKey),
        midis: sortedMidis,
        accidentals,
      });
      chordCursor += chunk.steps;
    }

    cursor = chordCursor;
  }

  if (cursor < measureSixteenths) {
    pushRests(cursor, measureSixteenths - cursor);
  }

  return events;
}

function measureFingerprint(measure: ScoreMeasure): string {
  const pitches: string[] = [];
  for (const ev of measure.treble) {
    if (!ev.isRest && ev.midis.length > 0) {
      // Top melody pitch + onset step is a strong stanza signature
      pitches.push(`${ev.startStep}:${ev.midis[ev.midis.length - 1]}`);
    }
  }
  return pitches.join(',');
}

/**
 * Detects the repeating stanza span in multi-verse hymn MIDIs (intro + verses).
 * Falls back to the full measure list for short or non-repeating hymns.
 */
function detectStanzaRange(
  measures: ScoreMeasure[],
  tempoResetBars: Set<number>,
): {
  stanzaRange: [number, number];
  stanzaStarts: number[];
  stanzaLength: number;
} {
  const total = measures.length;
  if (total < 16) {
    return { stanzaRange: [0, total], stanzaStarts: [0], stanzaLength: total };
  }

  const fps = measures.map(measureFingerprint);
  let bestScore = 0;
  let bestStart = 0;
  let bestLen = total;

  const maxStart = Math.min(16, Math.floor(total / 3));
  const maxLen = Math.min(36, Math.floor(total / 2));

  for (let len = 8; len <= maxLen; len++) {
    for (let start = 0; start <= maxStart; start++) {
      if (start + len * 2 > total) continue;
      let matches = 0;
      let nonEmpty = 0;
      for (let offset = 0; offset < len; offset++) {
        const a = fps[start + offset];
        const b = fps[start + len + offset];
        if (a.length > 0) nonEmpty++;
        if (a.length > 0 && a === b) matches++;
      }
      if (nonEmpty < 6) continue;
      const ratio = matches / nonEmpty;
      if (ratio >= 0.78) {
        // Prefer starts that align with a post-intro tempo reset boundary
        const tempoBonus = tempoResetBars.has(start) ? 12 : 0;
        const score = ratio * 100 + len * 0.6 + tempoBonus - start * 0.05;
        if (score > bestScore) {
          bestScore = score;
          bestStart = start;
          bestLen = len;
        }
      }
    }
  }

  if (bestScore === 0) {
    return { stanzaRange: [0, total], stanzaStarts: [0], stanzaLength: total };
  }

  // Collect all stanza occurrences matching bestStart..bestStart+bestLen
  const starts: number[] = [bestStart];
  let probe = bestStart + bestLen;
  while (probe + bestLen <= total) {
    let matches = 0;
    let nonEmpty = 0;
    for (let offset = 0; offset < bestLen; offset++) {
      const a = fps[bestStart + offset];
      const b = fps[probe + offset];
      if (a.length > 0) nonEmpty++;
      if (a.length > 0 && a === b) matches++;
    }
    if (nonEmpty > 0 && matches / nonEmpty >= 0.7) {
      starts.push(probe);
      probe += bestLen;
    } else {
      break;
    }
  }

  return {
    stanzaRange: [bestStart, bestStart + bestLen],
    stanzaStarts: starts,
    stanzaLength: bestLen,
  };
}

export function extractHymnScore(
  parsed: Midi,
  fallbackBpm = 96,
  fallbackKeyLabel?: string,
): ParsedHymnScore {
  const ppq = parsed.header?.ppq || 384;
  const rawTs = parsed.header?.timeSignatures?.[0]?.timeSignature;
  const tsNum = rawTs && rawTs[0] > 0 ? rawTs[0] : 4;
  const tsDen = rawTs && rawTs[1] > 0 ? rawTs[1] : 4;
  const timeSignature: [number, number] = [tsNum, tsDen];
  const timeSignatureLabel = `${tsNum}/${tsDen}`;

  const rawKs = parsed.header?.keySignatures?.[0];
  const { keySignature, keyLabel } = normalizeKeySignature(
    rawKs?.key,
    rawKs?.scale,
    fallbackKeyLabel,
  );

  const validTempo = (parsed.header?.tempos || []).find(
    (t) => typeof t.bpm === 'number' && t.bpm >= 35 && t.bpm <= 210,
  );
  const bpm = Math.round(validTempo?.bpm ?? fallbackBpm ?? 96);

  const nonEmptyTracks = parsed.tracks.filter((t) => t.notes && t.notes.length > 0);
  const ch0Tracks = nonEmptyTracks.filter((t) => t.channel === 0);
  const ch1Tracks = nonEmptyTracks.filter((t) => t.channel === 1);

  const trebleRaw: RawStaffNote[] = [];
  const bassRaw: RawStaffNote[] = [];

  if (ch0Tracks.length > 0 && ch1Tracks.length > 0) {
    for (const track of ch0Tracks) {
      for (const n of track.notes) {
        trebleRaw.push({ ticks: n.ticks, durationTicks: n.durationTicks, midi: n.midi });
      }
    }
    for (const track of ch1Tracks) {
      for (const n of track.notes) {
        bassRaw.push({ ticks: n.ticks, durationTicks: n.durationTicks, midi: n.midi });
      }
    }
  } else {
    // Fallback when a hymn lacks channel 1: split around middle C (MIDI 60)
    const sourceTracks = ch0Tracks.length > 0 ? ch0Tracks : nonEmptyTracks;
    for (const track of sourceTracks) {
      if (track.channel === 9) continue;
      for (const n of track.notes) {
        const item: RawStaffNote = {
          ticks: n.ticks,
          durationTicks: n.durationTicks,
          midi: n.midi,
        };
        if (n.midi >= 60) {
          trebleRaw.push(item);
        } else {
          bassRaw.push(item);
        }
      }
    }
  }

  const stepTicks = ppq / 4; // 16th-note grid
  const measureSixteenths = Math.max(4, Math.round(tsNum * (16 / tsDen)));
  const barTicks = measureSixteenths * stepTicks;

  let maxTick = 0;
  for (const n of trebleRaw) {
    const end = n.ticks + n.durationTicks;
    if (end > maxTick) maxTick = end;
  }
  for (const n of bassRaw) {
    const end = n.ticks + n.durationTicks;
    if (end > maxTick) maxTick = end;
  }

  const measureCount = Math.max(1, Math.ceil(maxTick / barTicks));

  // Bucket notes by measure index
  const trebleByBar: RawStaffNote[][] = Array.from({ length: measureCount }, () => []);
  const bassByBar: RawStaffNote[][] = Array.from({ length: measureCount }, () => []);

  for (const n of trebleRaw) {
    const barIdx = Math.max(0, Math.min(measureCount - 1, Math.floor((n.ticks + stepTicks * 0.45) / barTicks)));
    trebleByBar[barIdx].push(n);
  }
  for (const n of bassRaw) {
    const barIdx = Math.max(0, Math.min(measureCount - 1, Math.floor((n.ticks + stepTicks * 0.45) / barTicks)));
    bassByBar[barIdx].push(n);
  }

  const measures: ScoreMeasure[] = [];
  for (let i = 0; i < measureCount; i++) {
    const startTick = i * barTicks;
    const endTick = (i + 1) * barTicks;
    const startSec = parsed.header.ticksToSeconds(startTick);
    const endSec = parsed.header.ticksToSeconds(endTick);

    measures.push({
      index: i,
      displayNumber: i + 1,
      startTick,
      endTick,
      startSec,
      endSec,
      treble: buildStaffEventsForMeasure(
        trebleByBar[i],
        startTick,
        stepTicks,
        measureSixteenths,
        'treble',
        keySignature,
      ),
      bass: buildStaffEventsForMeasure(
        bassByBar[i],
        startTick,
        stepTicks,
        measureSixteenths,
        'bass',
        keySignature,
      ),
    });
  }

  // Trim trailing all-rest measures
  while (
    measures.length > 1 &&
    measures[measures.length - 1].treble.every((e) => e.isRest) &&
    measures[measures.length - 1].bass.every((e) => e.isRest)
  ) {
    measures.pop();
  }

  // Identify bars where tempo resets upward after an intro or stanza ritardando
  const tempoResetBars = new Set<number>();
  const tempos = parsed.header?.tempos || [];
  for (let i = 1; i < tempos.length; i++) {
    if (tempos[i].bpm > tempos[i - 1].bpm * 1.25) {
      const barIdx = Math.round(tempos[i].ticks / barTicks);
      if (barIdx > 0 && barIdx < measures.length) {
        tempoResetBars.add(barIdx);
      }
    }
  }

  const { stanzaRange, stanzaStarts, stanzaLength } = detectStanzaRange(
    measures,
    tempoResetBars,
  );

  return {
    keySignature,
    keyLabel,
    timeSignature,
    timeSignatureLabel,
    bpm,
    ppq,
    measures,
    stanzaRange,
    stanzaStarts,
    stanzaLength,
  };
}

/**
 * Maps current MIDI playback time (in raw MIDI seconds, i.e. before speed scaling)
 * to the active measure index in the visible slice.
 */
export function findActiveMeasureIndex(
  score: ParsedHymnScore,
  rawMidiTimeSec: number,
  scope: 'stanza' | 'full',
): number | null {
  if (score.measures.length === 0 || rawMidiTimeSec < 0) return null;

  let fullIdx = -1;
  for (let i = 0; i < score.measures.length; i++) {
    const m = score.measures[i];
    if (rawMidiTimeSec >= m.startSec && rawMidiTimeSec < m.endSec) {
      fullIdx = i;
      break;
    }
  }
  if (fullIdx === -1) return null;

  if (scope === 'full') return fullIdx;

  const [stanzaStart, stanzaEnd] = score.stanzaRange;
  const stanzaLen = stanzaEnd - stanzaStart;
  if (stanzaLen <= 0) return null;

  if (fullIdx >= stanzaStart && fullIdx < stanzaEnd) {
    return fullIdx;
  }

  // Wrap later verses back onto the single-stanza measures
  for (const s of score.stanzaStarts) {
    if (fullIdx >= s && fullIdx < s + score.stanzaLength) {
      return stanzaStart + (fullIdx - s);
    }
  }

  return null;
}
