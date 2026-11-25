import type { HymnVerse } from '../data/hymnalTypes';
import type { ParsedHymnScore } from './midiScore';

export interface MelodyOnset {
  measureIndex: number;
  /** Index into measure.melody of the first chunk of this note */
  eventIndex: number;
  /** Absolute MIDI tick of the note start (inside the canonical stanza) */
  tick: number;
  /** Total length in 16th steps including tied continuation chunks */
  durationSteps: number;
}

export interface LyricToken {
  /** Display text under the note, with a trailing hyphen for mid-word syllables */
  text: string;
  lineIndex: number;
  wordIndex: number;
}

export interface LyricLine {
  words: string[];
  startOnset: number;
  endOnset: number; // exclusive
}

export interface LyricAlignment {
  /** One token per onset; null for melisma continuation notes */
  tokens: (LyricToken | null)[];
  /** For every onset (including melisma notes), the line/word it belongs to */
  onsetWord: { lineIndex: number; wordIndex: number }[];
  lines: LyricLine[];
}

export interface StanzaLyrics {
  label: string;
  lines: string[];
}

const VOWEL_RE = /[aeiouy]/;

/** Piece lengths for words the heuristic gets wrong in common hymn usage. */
const SYLLABLE_EXCEPTIONS: Record<string, number[]> = {
  alleluia: [2, 2, 2, 2], // Al-le-lu-ia
  hallelujah: [3, 2, 2, 3], // Hal-le-lu-jah
  savior: [3, 3], // Sav-ior
  saviour: [3, 4],
};

function isVowelAt(lower: string, i: number): boolean {
  const ch = lower[i];
  if (!ch || !VOWEL_RE.test(ch)) return false;
  if (ch === 'y') {
    // Consonant "y" at word start or before a vowel ("yea", "beyond")
    if (i === 0) return false;
    const next = lower[i + 1];
    if (next && /[aeiou]/.test(next)) return false;
  }
  if (ch === 'u' && i > 0 && lower[i - 1] === 'q') return false;
  return true;
}

/** Splits a vowel group where English usually breaks it into two syllables. */
function hiatusSplitOffset(lower: string, start: number, end: number): number | null {
  const group = lower.slice(start, end);
  const before = lower[start - 1] ?? '';
  // glo-ri-ous, al-le-lu-i-a, but na-tion, pre-cious, re-li-gion
  const io = group.search(/i[aou]/);
  if (io >= 0 && !/[tscxg]/.test(before)) return start + io + 1;
  // cre-a-tion, cre-a-ture
  if (group.startsWith('ea') && lower.slice(Math.max(0, start - 2), start) === 'cr') return start + 1;
  // ac-tu-al, but qua-, gua-
  if (group === 'ua' && !/[qg]/.test(before)) return start + 1;
  return null;
}

/**
 * Splits a word into sung syllables, preserving original characters.
 * Heuristic English hyphenation tuned for hymn texts (archaic "-eth",
 * contractions such as "heav'n" and "o'er").
 */
export function syllabify(word: string): string[] {
  const match = /^([^A-Za-z]*)([A-Za-z'’]*[A-Za-z])([^A-Za-z]*)$/.exec(word);
  if (!match) return [word];
  const [, prefix, core, suffix] = match;
  const lower = core.toLowerCase().replace(/’/g, "'");

  const exception = SYLLABLE_EXCEPTIONS[lower];
  if (exception) {
    const pieces: string[] = [];
    let from = 0;
    for (const len of exception) {
      pieces.push(core.slice(from, from + len));
      from += len;
    }
    pieces[0] = prefix + pieces[0];
    pieces[pieces.length - 1] += suffix;
    return pieces;
  }

  // Collect vowel groups; an apostrophe between vowels joins them ("o'er", "e'er")
  const groups: [number, number][] = [];
  let i = 0;
  while (i < lower.length) {
    if (isVowelAt(lower, i)) {
      const start = i;
      i++;
      while (
        i < lower.length &&
        (isVowelAt(lower, i) || (lower[i] === "'" && isVowelAt(lower, i + 1)))
      ) {
        i++;
      }
      const split = hiatusSplitOffset(lower, start, i);
      if (split !== null) {
        groups.push([start, split], [split, i]);
      } else {
        groups.push([start, i]);
      }
    } else {
      i++;
    }
  }

  // Silent endings: final "e" (but not consonant + "le"), "-es", "-ed"
  if (groups.length > 1) {
    const last = groups[groups.length - 1];
    const lastText = lower.slice(last[0], last[1]);
    const tail = lower.slice(last[0]);
    const beforeLast = lower[last[0] - 1] ?? '';
    const consonantBefore = beforeLast && !VOWEL_RE.test(beforeLast);
    if (lastText === 'e' && consonantBefore) {
      const silentE = tail === 'e' && !(beforeLast === 'l' && !VOWEL_RE.test(lower[last[0] - 2] ?? 'a'));
      const silentEs = tail === 'es' && !/[sxzcgh]/.test(beforeLast);
      const silentEd = tail === 'ed' && !/[td]/.test(beforeLast);
      if (silentE || silentEs || silentEd) groups.pop();
    }
  }

  if (groups.length <= 1) return [word];

  const cuts: number[] = [];
  for (let g = 0; g < groups.length - 1; g++) {
    cuts.push(cutInConsonantGap(lower, groups[g][1], groups[g + 1][0]));
  }

  const pieces: string[] = [];
  let from = 0;
  for (const cut of cuts) {
    pieces.push(core.slice(from, cut));
    from = cut;
  }
  pieces.push(core.slice(from));
  pieces[0] = prefix + pieces[0];
  pieces[pieces.length - 1] += suffix;
  return pieces;
}

const CONSONANT_UNITS = ['tch', 'ght', 'th', 'ch', 'sh', 'ph', 'wh', 'ck', 'ng', 'gh', 'gn', 'qu'];
const NON_ONSET_UNITS = new Set(['ght', 'gh', 'ck', 'ng', 'gn', 'x']);
const ONSET_CLUSTERS = new Set([
  'bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'tr',
  'thr', 'shr', 'chr', 'phr', 'wr',
]);

/** Picks where to hyphenate inside the consonants separating two vowel groups. */
function cutInConsonantGap(lower: string, gapStart: number, gapEnd: number): number {
  const units: { text: string; start: number }[] = [];
  let p = gapStart;
  while (p < gapEnd) {
    const unit = CONSONANT_UNITS.find((u) => p + u.length <= gapEnd && lower.startsWith(u, p));
    const text = unit ?? lower[p];
    units.push({ text, start: p });
    p += text.length;
  }

  if (units.length === 0) return gapStart; // hiatus: cre-a
  if (units.length === 1) {
    return NON_ONSET_UNITS.has(units[0].text) ? gapEnd : gapStart; // might-y, Fa-ther
  }
  const n = units.length;
  if (ONSET_CLUSTERS.has(units[n - 2].text + units[n - 1].text)) {
    return units[n - 2].start; // ta-ble, chil-dren
  }
  const last = units[n - 1];
  return NON_ONSET_UNITS.has(last.text) ? gapEnd : last.start; // faith-ful, thank-ful
}

/** Splits a lyric line into words, folding punctuation-only tokens into the previous word. */
export function splitLyricWords(line: string): string[] {
  const words: string[] = [];
  for (const raw of line.split(/\s+/)) {
    if (!raw) continue;
    if (!/[A-Za-z]/.test(raw) && words.length > 0) {
      words[words.length - 1] += ` ${raw}`;
    } else {
      words.push(raw);
    }
  }
  return words;
}

/** Lyrics sung during one stanza occurrence: verse N followed by the refrain, if any. */
export function getStanzaLyrics(verses: HymnVerse[], occurrence: number): StanzaLyrics {
  const stanzaVerses = verses.filter((v) => !v.isRefrain);
  const refrain = verses.find((v) => v.isRefrain);
  if (stanzaVerses.length === 0) {
    return { label: refrain?.label ?? '', lines: refrain?.lines ?? [] };
  }
  const idx = Math.max(0, Math.min(stanzaVerses.length - 1, occurrence));
  const verse = stanzaVerses[idx];
  return {
    label: verse.label,
    lines: refrain ? [...verse.lines, ...refrain.lines] : verse.lines,
  };
}

export function countStanzaVerses(verses: HymnVerse[]): number {
  return Math.max(1, verses.filter((v) => !v.isRefrain).length);
}

/** Collects sung note onsets of the canonical stanza's melody line. */
export function collectMelodyOnsets(score: ParsedHymnScore): MelodyOnset[] {
  const [start, end] = score.stanzaRange;
  const onsets: MelodyOnset[] = [];
  for (let m = start; m < end; m++) {
    const measure = score.measures[m];
    if (!measure) continue;
    measure.melody.forEach((ev, idx) => {
      if (ev.isRest || ev.tieFromPrevious) return;
      let durationSteps = ev.durationSteps;
      for (let j = idx + 1; j < measure.melody.length && measure.melody[j].tieFromPrevious; j++) {
        durationSteps += measure.melody[j].durationSteps;
      }
      onsets.push({
        measureIndex: m,
        eventIndex: idx,
        tick: measure.startTick + ev.startStep * score.stepTicks,
        durationSteps,
      });
    });
  }
  return onsets;
}

interface Syllable {
  piece: string;
  wordIndex: number;
  wordEnd: boolean;
}

/**
 * Assigns lyric syllables to melody notes. Line boundaries are placed on long
 * (phrase-ending) notes near the position predicted by syllable counts, so any
 * syllable-count error is contained within one line.
 */
export function alignLyricsToMelody(onsets: MelodyOnset[], lineTexts: string[]): LyricAlignment {
  const n = onsets.length;
  const lineWords = lineTexts.map(splitLyricWords).filter((w) => w.length > 0);
  if (n === 0 || lineWords.length === 0) {
    return { tokens: onsets.map(() => null), onsetWord: onsets.map(() => ({ lineIndex: 0, wordIndex: 0 })), lines: [] };
  }

  const lineSyllables: Syllable[][] = lineWords.map((words) =>
    words.flatMap((word, wordIndex) => {
      const pieces = syllabify(word);
      return pieces.map((piece, p) => ({ piece, wordIndex, wordEnd: p === pieces.length - 1 }));
    }),
  );

  const L = Math.min(lineSyllables.length, n);
  const counts = lineSyllables.slice(0, L).map((s) => s.length);
  const total = counts.reduce((a, b) => a + b, 0);

  // Choose line start indices: prefer starting right after a long or rest-followed note
  const stepTicksGuess = n > 1 ? inferStepTicks(onsets) : 1;
  const phraseEndScore = (j: number): number => {
    const prev = onsets[j - 1];
    const endTick = prev.tick + prev.durationSteps * stepTicksGuess;
    const restAfter = onsets[j].tick - endTick > stepTicksGuess * 0.5 ? 3 : 0;
    return 3 * Math.log2(Math.max(1, prev.durationSteps)) + restAfter;
  };

  const starts: number[] = [0];
  let cum = 0;
  for (let i = 1; i < L; i++) {
    cum += counts[i - 1];
    const target = Math.round((n * cum) / total);
    const lo = Math.max(starts[i - 1] + 1, target - 3);
    const hi = Math.min(n - (L - i), target + 3);
    let best = Math.max(lo, Math.min(hi, target));
    let bestScore = -Infinity;
    for (let j = lo; j <= hi; j++) {
      const score = phraseEndScore(j) - 2 * Math.abs(j - target);
      if (score > bestScore) {
        bestScore = score;
        best = j;
      }
    }
    starts.push(best);
  }

  const tokens: (LyricToken | null)[] = new Array(n).fill(null);
  const onsetWord: { lineIndex: number; wordIndex: number }[] = new Array(n);
  const lines: LyricLine[] = [];

  for (let li = 0; li < L; li++) {
    const s = starts[li];
    const e = li + 1 < L ? starts[li + 1] : n;
    const notes = e - s;
    const syl = lineSyllables[li];
    const c = syl.length;
    lines.push({ words: lineWords[li], startOnset: s, endOnset: e });

    if (notes >= c) {
      // Place each syllable on the note nearest its proportional time in the
      // line, so short ornament notes become melisma continuations.
      const lineStartTick = onsets[s].tick;
      const lineEndTick = onsets[e - 1].tick + onsets[e - 1].durationSteps * stepTicksGuess;
      const span = Math.max(1, lineEndTick - lineStartTick);
      const sylStarts: number[] = [];
      for (let k = 0; k < c; k++) {
        const lo = k === 0 ? s : sylStarts[k - 1] + 1;
        const hi = e - (c - k);
        const targetTick = lineStartTick + (k / c) * span;
        let bestJ = lo;
        for (let j = lo; j <= hi; j++) {
          if (Math.abs(onsets[j].tick - targetTick) < Math.abs(onsets[bestJ].tick - targetTick)) bestJ = j;
        }
        sylStarts.push(k === 0 ? s : bestJ);
      }
      for (let k = 0; k < c; k++) {
        const first = sylStarts[k];
        const last = k + 1 < c ? sylStarts[k + 1] : e;
        const sy = syl[k];
        tokens[first] = {
          text: sy.wordEnd ? sy.piece : `${sy.piece}-`,
          lineIndex: li,
          wordIndex: sy.wordIndex,
        };
        for (let j = first; j < last; j++) {
          onsetWord[j] = { lineIndex: li, wordIndex: sy.wordIndex };
        }
      }
    } else {
      // More syllables than notes: several syllables share a note
      for (let j = 0; j < notes; j++) {
        const from = Math.floor((j * c) / notes);
        const to = Math.floor(((j + 1) * c) / notes);
        const group = syl.slice(from, to);
        let text = '';
        group.forEach((sy, gi) => {
          text += sy.piece;
          if (sy.wordEnd && gi < group.length - 1) text += ' ';
        });
        const lastSy = group[group.length - 1];
        if (!lastSy.wordEnd) text += '-';
        tokens[s + j] = { text, lineIndex: li, wordIndex: lastSy.wordIndex };
        onsetWord[s + j] = { lineIndex: li, wordIndex: lastSy.wordIndex };
      }
    }
  }

  return { tokens, onsetWord, lines };
}

function inferStepTicks(onsets: MelodyOnset[]): number {
  let minStep = Infinity;
  for (let i = 1; i < onsets.length; i++) {
    const dt = onsets[i].tick - onsets[i - 1].tick;
    const steps = onsets[i - 1].durationSteps;
    if (dt > 0 && steps > 0) {
      const candidate = dt / steps;
      if (candidate > 0 && candidate < minStep) {
        minStep = candidate;
      }
    }
  }
  return Number.isFinite(minStep) ? minStep : 96;
}

/** Index of the onset sounding at stanzaTick, or null before the first note. */
export function findOnsetAtTick(onsets: MelodyOnset[], stanzaTick: number): number | null {
  let lo = 0;
  let hi = onsets.length - 1;
  let found: number | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (onsets[mid].tick <= stanzaTick + 1) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}
