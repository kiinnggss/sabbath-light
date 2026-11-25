import { describe, expect, it } from 'vitest';
import { Midi } from '@tonejs/midi';
import {
  decomposeDurationSteps,
  extractHymnScore,
  findActiveMeasureIndex,
  normalizeKeySignature,
} from '../midiScore';

function buildMultiStanzaHymnMidi(): Midi {
  const midi = new Midi();
  midi.header.setTempo(100);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [3, 4], measures: 0 });
  midi.header.keySignatures.push({ key: 'F', scale: 'major', ticks: 0 });

  const ppq = midi.header.ppq;
  const barTicks = ppq * 3; // 3/4 time

  const treble = midi.addTrack();
  treble.channel = 0;
  const bass = midi.addTrack();
  bass.channel = 1;

  // 4-bar intro (different melody)
  const introPitches = [65, 67, 69, 72];
  for (let bar = 0; bar < 4; bar++) {
    const start = bar * barTicks;
    treble.addNote({ midi: introPitches[bar], ticks: start, durationTicks: ppq * 3 });
    bass.addNote({ midi: 53, ticks: start, durationTicks: ppq * 3 });
  }

  // Two identical 8-bar stanzas (bars 4..11 and bars 12..19)
  const stanzaMelody = [65, 69, 72, 70, 69, 67, 65, 64];
  const stanzaBass = [41, 45, 48, 46, 45, 43, 41, 48];

  for (let repeat = 0; repeat < 2; repeat++) {
    const baseBar = 4 + repeat * 8;
    for (let i = 0; i < 8; i++) {
      const start = (baseBar + i) * barTicks;
      // Three slightly detached quarter notes per bar (0.95 beats each)
      for (let beat = 0; beat < 3; beat++) {
        treble.addNote({
          midi: stanzaMelody[i],
          ticks: start + beat * ppq,
          durationTicks: Math.round(ppq * 0.95),
        });
        bass.addNote({
          midi: stanzaBass[i],
          ticks: start + beat * ppq,
          durationTicks: Math.round(ppq * 0.95),
        });
      }
    }
  }

  return midi;
}

describe('midiScore parser and quantization', () => {
  it('normalizes MIDI and fallback key signatures to VexFlow keys', () => {
    expect(normalizeKeySignature('F', 'major')).toEqual({
      keySignature: 'F',
      keyLabel: 'F Major',
    });
    expect(normalizeKeySignature('Db', 'major')).toEqual({
      keySignature: 'Db',
      keyLabel: 'Db Major',
    });
    expect(normalizeKeySignature('F', 'minor')).toEqual({
      keySignature: 'Fm',
      keyLabel: 'F Minor',
    });
    expect(normalizeKeySignature(undefined, undefined, 'E-flat Major')).toEqual({
      keySignature: 'Eb',
      keyLabel: 'Eb Major',
    });
    expect(normalizeKeySignature(undefined, undefined, undefined)).toEqual({
      keySignature: 'C',
      keyLabel: 'C Major',
    });
  });

  it('decomposes every 16th-note length from 1 to 16 into exact VexFlow chunks', () => {
    for (let steps = 1; steps <= 16; steps++) {
      const chunks = decomposeDurationSteps(steps);
      const sum = chunks.reduce((acc, c) => acc + c.steps, 0);
      expect(sum).toBe(steps);
    }
  });

  it('extracts exact-length grand-staff measures and detects repeating stanzas', () => {
    const midi = buildMultiStanzaHymnMidi();
    const score = extractHymnScore(midi, 96);

    expect(score.keySignature).toBe('F');
    expect(score.timeSignatureLabel).toBe('3/4');
    expect(score.measures).toHaveLength(20);

    // Every measure in 3/4 must sum to 12 sixteenth-note steps on both staves
    for (const measure of score.measures) {
      const trebleSum = measure.treble.reduce((acc, e) => acc + e.durationSteps, 0);
      const bassSum = measure.bass.reduce((acc, e) => acc + e.durationSteps, 0);
      expect(trebleSum).toBe(12);
      expect(bassSum).toBe(12);
    }

    // Detects the 8-bar stanza starting at bar 4 (after the 4-bar intro)
    expect(score.stanzaRange).toEqual([4, 12]);
    expect(score.stanzaStarts).toEqual([4, 12]);
    expect(score.stanzaLength).toBe(8);
  });

  it('maps playback timestamps to active measures in both full and 1-stanza scopes', () => {
    const midi = buildMultiStanzaHymnMidi();
    const score = extractHymnScore(midi, 96);

    const verse1Measure = score.measures[6]; // bar 2 of stanza 1
    const verse2Measure = score.measures[14]; // bar 2 of stanza 2

    const v1MidSec = (verse1Measure.startSec + verse1Measure.endSec) / 2;
    const v2MidSec = (verse2Measure.startSec + verse2Measure.endSec) / 2;

    expect(findActiveMeasureIndex(score, v1MidSec, 'full')).toBe(6);
    expect(findActiveMeasureIndex(score, v2MidSec, 'full')).toBe(14);
    // In 1-stanza mode, verse 2 wraps back onto the matching bar in verse 1
    expect(findActiveMeasureIndex(score, v2MidSec, 'stanza')).toBe(6);
  });
});
