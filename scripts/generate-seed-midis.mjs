import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from '@tonejs/midi';

const { Midi } = pkg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'midi');

function parseNotes(spec) {
  return spec
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const [note, beatsStr] = token.split(':');
      return {
        note,
        beats: Number(beatsStr || 1),
      };
    });
}

const NOTE_OFFSETS = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

function noteNameToMidi(name) {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(name.trim());
  if (!m) return null;
  const base = NOTE_OFFSETS[m[1].toUpperCase()];
  if (base === undefined) return null;
  const accidental = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  const octave = Number(m[3]);
  return (octave + 1) * 12 + base + accidental;
}

const EXACT_TUNES = {
  LOBE_DEN_HERREN: {
    defaultBpm: 108,
    melody: parseNotes(
      'F4:1 F4:1 C5:1 A4:1.5 G4:0.5 F4:1 E4:1 D4:1 C4:1 D4:1 E4:1 F4:1 G4:2 F4:3 ' +
        'F4:1 F4:1 C5:1 A4:1.5 G4:0.5 F4:1 E4:1 D4:1 C4:1 D4:1 E4:1 F4:1 G4:2 F4:3 ' +
        'C5:1 C5:1 C5:1 D5:3 A4:1 Bb4:1 C5:1 C5:1.5 Bb4:0.5 A4:1 G4:3 ' +
        'C4:1 D4:1 E4:1 F4:1 G4:1 A4:1 G4:2 F4:3',
    ),
    bass: parseNotes(
      'F2:3 A2:3 Bb2:2 C3:1 F2:3 C3:2 F2:3 ' +
        'F2:3 A2:3 Bb2:2 C3:1 F2:3 C3:2 F2:3 ' +
        'C3:3 Bb2:3 F2:2 C3:1 F2:3 C3:3 ' +
        'A2:2 Bb2:1 F2:2 C3:1 C3:2 F2:3',
    ),
  },
  LASST_UNS_ERFREUEN: {
    defaultBpm: 112,
    melody: parseNotes(
      'Eb4:1 Eb4:1 F4:1 G4:1 Eb4:1 G4:1 Ab4:1 Bb4:2 Eb4:1 Eb4:1 F4:1 G4:1 Eb4:1 G4:1 Ab4:1 Bb4:2 ' +
        'Bb4:1 G4:1 Ab4:1 Bb4:2 Eb5:1 D5:1 C5:1 Bb4:2 G4:1 F4:1 Eb4:3 ' +
        'G4:1 Ab4:1 Bb4:1 G4:1 Ab4:1 Bb4:1 G4:1 Eb4:1 F4:1 G4:1 Eb4:2 ' +
        'Eb4:1 F4:1 G4:1 Ab4:1 G4:1 F4:1 Eb4:3',
    ),
    bass: parseNotes(
      'Eb3:2 Bb2:2 Eb3:2 Ab2:1 Eb3:2 Eb3:2 Bb2:2 Eb3:2 Ab2:1 Eb3:2 ' +
        'Eb3:2 Ab2:1 Bb2:2 G2:2 Ab2:1 Bb2:2 Eb3:2 Bb2:1 Eb3:3 ' +
        'Eb3:2 Bb2:2 Eb3:2 Bb2:2 Eb3:2 Bb2:2 ' +
        'Eb3:2 Ab2:2 Bb2:2 Eb3:3',
    ),
  },
  HYMN_TO_JOY: {
    defaultBpm: 112,
    melody: parseNotes(
      'B4:1 B4:1 C5:1 D5:1 D5:1 C5:1 B4:1 A4:1 G4:1 G4:1 A4:1 B4:1 B4:1.5 A4:0.5 A4:2 ' +
        'B4:1 B4:1 C5:1 D5:1 D5:1 C5:1 B4:1 A4:1 G4:1 G4:1 A4:1 B4:1 A4:1.5 G4:0.5 G4:2 ' +
        'A4:1 A4:1 B4:1 G4:1 A4:1 B4:0.5 C5:0.5 B4:1 G4:1 A4:1 B4:0.5 C5:0.5 B4:1 A4:1 G4:1 A4:1 D4:2 ' +
        'B4:1 B4:1 C5:1 D5:1 D5:1 C5:1 B4:1 A4:1 G4:1 G4:1 A4:1 B4:1 A4:1.5 G4:0.5 G4:2',
    ),
    bass: parseNotes(
      'G2:2 D3:2 G2:2 D3:2 E2:2 C3:2 D3:4 ' +
        'G2:2 D3:2 G2:2 D3:2 E2:2 C3:2 D3:2 G2:2 ' +
        'D3:2 G2:2 D3:2 G2:2 D3:2 G2:2 E2:2 D3:2 ' +
        'G2:2 D3:2 G2:2 D3:2 E2:2 C3:2 D3:2 G2:2',
    ),
  },
  OLD_HUNDREDTH: {
    defaultBpm: 92,
    melody: parseNotes(
      'G4:2 G4:1 F#4:1 E4:1 D4:1 G4:1 A4:1 B4:2 ' +
        'B4:1 B4:1 B4:1 A4:1 G4:1 C5:1 B4:1 A4:1 G4:2 ' +
        'A4:1 B4:1 A4:1 G4:1 E4:1 F#4:1 G4:2 ' +
        'D5:1 B4:1 G4:1 A4:1 C5:1 B4:1 A4:1 G4:3',
    ),
    bass: parseNotes(
      'G2:2 D3:1 B2:1 C3:1 D3:1 G2:1 D3:1 G2:2 ' +
        'G2:2 E2:1 F#2:1 G2:1 C3:1 D3:1 D2:1 G2:2 ' +
        'D3:1 G2:1 D3:1 B2:1 C3:1 D3:1 G2:2 ' +
        'B2:1 G2:1 E2:1 D3:1 C3:1 D3:1 D2:1 G2:3',
    ),
  },
  ST_DENIO: {
    defaultBpm: 108,
    melody: parseNotes(
      'D4:1 G4:1 B4:1 D5:1 B4:1 G4:1 E4:1 G4:1 F#4:1 D4:2 ' +
        'D4:1 G4:1 B4:1 D5:1 B4:1 G4:1 A4:1 G4:1 F#4:1 G4:2 ' +
        'B4:1 D5:1 E5:1 D5:1 B4:1 G4:1 E4:1 G4:1 F#4:1 D4:2 ' +
        'D4:1 G4:1 B4:1 D5:1 B4:1 G4:1 A4:1 G4:1 F#4:1 G4:2',
    ),
    bass: parseNotes(
      'G2:3 G2:3 C3:3 D3:3 G2:3 G2:3 D3:3 G2:3 ' +
        'G2:3 C3:3 A2:3 D3:3 G2:3 G2:3 D3:3 G2:3',
    ),
  },
  BUNESSAN: {
    defaultBpm: 96,
    melody: parseNotes(
      'C4:1 E4:1 G4:1 C5:3 D5:2 C5:1 B4:1 A4:1 G4:1 A4:3 ' +
        'G4:1 C4:1 D4:1 E4:3 G4:1 A4:1 G4:1 E4:1 D4:1 C4:3 ' +
        'G4:1 E4:1 G4:1 C5:3 A4:2 G4:1 E4:1 C4:1 D4:1 G4:3 ' +
        'E4:1 G4:1 A4:1 G4:2 E4:1 D4:2 C4:1 C4:3',
    ),
    bass: parseNotes(
      'C3:3 C3:3 G2:3 F2:3 C3:3 G2:3 C3:3 ' +
        'C3:3 F2:3 G2:3 C3:3 G2:3 C3:3',
    ),
  },
  EVENTIDE: {
    defaultBpm: 88,
    melody: parseNotes(
      'G4:2 G4:1 F4:1 Eb4:2 Bb4:2 C5:1 Bb4:1 Bb4:1 Ab4:1 G4:4 ' +
        'G4:2 Ab4:1 Bb4:1 C5:2 Bb4:2 Ab4:1 F4:1 G4:1 A4:1 Bb4:4 ' +
        'G4:2 G4:1 F4:1 Eb4:2 Bb4:2 Bb4:1 Ab4:1 Ab4:1 G4:1 F4:4 ' +
        'F4:2 G4:1 Ab4:1 G4:1 F4:1 Eb4:1 Ab4:1 G4:2 F4:2 Eb4:4',
    ),
    bass: parseNotes(
      'Eb3:2 Bb2:2 C3:2 G2:2 Ab2:2 Bb2:2 Eb3:4 ' +
        'Eb3:2 F2:2 Ab2:2 G2:2 F2:2 Bb2:2 Bb2:4 ' +
        'Eb3:2 Bb2:2 C3:2 G2:2 Ab2:2 C3:2 F2:4 ' +
        'Bb2:2 Bb2:2 C3:2 Ab2:2 Bb2:4 Eb3:4',
    ),
  },
  NICAEA: {
    defaultBpm: 94,
    melody: parseNotes(
      'D4:1 D4:1 F#4:1 F#4:1 A4:2 A4:2 B4:1 B4:1 B4:1 B4:1 A4:2 F#4:2 ' +
        'A4:1.5 A4:0.5 A4:1 A4:1 D5:2 A4:2 E4:1 A4:1 F#4:1.5 E4:0.5 D4:4 ' +
        'D4:1 D4:1 F#4:1 F#4:1 A4:2 A4:2 B4:1 B4:1 B4:1 B4:1 A4:2 F#4:2 ' +
        'D5:2 A4:2 B4:2 F#4:2 G4:1 E4:1 E4:1.5 D4:0.5 D4:4',
    ),
    bass: parseNotes(
      'D3:2 D3:2 D3:2 D3:2 G2:2 G2:2 D3:4 ' +
        'A2:2 A2:2 D3:2 A2:2 A2:2 A2:2 D3:4 ' +
        'D3:2 D3:2 D3:2 D3:2 G2:2 G2:2 D3:4 ' +
        'D3:2 D3:2 G2:2 D3:2 A2:2 A2:2 D3:4',
    ),
  },
  LYONS: {
    defaultBpm: 108,
    melody: parseNotes(
      'D4:1 G4:1 G4:1 A4:1 B4:2 G4:1 C5:1 C5:1 B4:1 A4:2 ' +
        'D4:1 G4:1 A4:1 B4:1 C5:1 B4:1 A4:1 G4:1 A4:1 F#4:1 G4:2 ' +
        'D4:1 D4:1 E4:1 F#4:1 G4:2 G4:1 A4:1 B4:1 C5:1 A4:2 ' +
        'D5:1 C5:1 B4:1 A4:1 G4:1 C5:1 B4:1 A4:1 G4:2',
    ),
    bass: parseNotes(
      'G2:3 G2:3 C3:2 D3:3 G2:3 C3:2 D3:3 G2:3 ' +
        'D3:3 D3:3 G2:3 D3:3 G2:3 C3:2 D3:2 G2:3',
    ),
  },
  O_STORE_GUD: {
    defaultBpm: 92,
    melody: parseNotes(
      'D4:0.5 D4:0.5 F4:1.5 F4:0.5 G4:0.5 F4:0.5 G4:1.5 G4:0.5 Eb4:0.5 G4:0.5 F4:1.5 F4:0.5 D4:0.5 Eb4:0.5 D4:2 ' +
        'F4:0.5 F4:0.5 Bb4:1.5 D5:0.5 C5:0.5 Bb4:0.5 A4:1.5 Bb4:0.5 G4:0.5 F4:2 ' +
        'F4:0.5 Bb4:1.5 D5:0.5 C5:0.5 Bb4:0.5 A4:1.5 Bb4:0.5 G4:0.5 F4:2 ' +
        'Bb4:1 G4:0.5 F4:0.5 Bb4:2 C5:0.5 Bb4:0.5 A4:0.5 Bb4:0.5 C5:1 D5:1 Bb4:3',
    ),
    bass: parseNotes(
      'Bb2:3 Bb2:3 Eb3:3 Bb2:3 Bb2:3 F2:3 Eb3:2 Bb2:3 ' +
        'Bb2:3 Bb2:3 Eb3:2 Bb2:3 Eb3:2 F2:2 Bb2:3',
    ),
  },
  TERRA_BEATA: {
    defaultBpm: 102,
    melody: parseNotes(
      'Eb4:1 G4:1 Bb4:1 Eb5:1 Bb4:1 G4:1 F4:1 G4:1 Eb4:2 ' +
        'G4:1 Bb4:1 C5:1 Bb4:1 G4:1 F4:3 ' +
        'Eb4:1 G4:1 Bb4:1 Eb5:1 C5:1 Bb4:1 Ab4:1 G4:1 F4:2 ' +
        'Bb4:1 G4:1 Eb4:1 F4:1 G4:1 F4:1 Eb4:3',
    ),
    bass: parseNotes(
      'Eb3:3 Eb3:3 Bb2:3 Eb3:3 Eb3:3 Bb2:3 Eb3:3 Ab2:3 Bb2:3 Eb3:3 Bb2:2 Eb3:3',
    ),
  },
  FAITHFULNESS: {
    defaultBpm: 92,
    melody: parseNotes(
      'F#4:1 F#4:1 F#4:1 F#4:1.5 E4:0.5 E4:1 G4:1 G4:1 G4:1 G4:1.5 F#4:0.5 F#4:1 ' +
        'A4:1 B4:1 A4:1 G4:1 F#4:1 E4:1 D4:1 F#4:1 E4:2 ' +
        'A4:1 A4:1 E4:1 G4:1.5 F#4:0.5 F#4:1 B4:1 B4:1 F#4:1 A4:1.5 G4:0.5 G4:1 ' +
        'A4:1 B4:1 C#5:1 D5:1 A4:1 B4:1 F#4:1 E4:1 D4:3',
    ),
    bass: parseNotes(
      'D3:3 A2:3 G2:3 D3:3 A2:3 D3:3 A2:3 ' +
        'A2:3 D3:3 B2:3 E2:3 A2:3 D3:2 A2:1 D3:3',
    ),
  },
  NEW_BRITAIN: {
    defaultBpm: 88,
    melody: parseNotes(
      'D4:1 G4:2 B4:0.5 G4:0.5 B4:2 A4:1 G4:2 E4:1 D4:2 ' +
        'D4:1 G4:2 B4:0.5 G4:0.5 B4:2 A4:1 D5:3 D5:2 ' +
        'B4:1 D5:1.5 B4:0.5 G4:1 D4:2 E4:1 G4:1.5 G4:0.5 E4:1 D4:2 ' +
        'D4:1 G4:2 B4:0.5 G4:0.5 B4:2 A4:1 G4:3',
    ),
    bass: parseNotes(
      'G2:3 G2:3 C3:3 G2:3 G2:3 D3:3 G2:3 ' +
        'G2:3 C3:3 G2:3 G2:3 D3:3 G2:3',
    ),
  },
  MENDELSSOHN: {
    defaultBpm: 110,
    melody: parseNotes(
      'C4:1 F4:1 F4:1.5 E4:0.5 F4:1 A4:1 A4:1 G4:1 C5:1 C5:1 C5:1.5 Bb4:0.5 A4:1 G4:1 A4:2 ' +
        'C4:1 F4:1 F4:1.5 E4:0.5 F4:1 A4:1 A4:1 G4:1 C5:1 G4:1 G4:1.5 E4:0.5 E4:1 D4:1 C4:2 ' +
        'C5:1 C5:1 C5:1 F4:1 Bb4:1 A4:1 A4:1 G4:1 C5:1 C5:1 C5:1 F4:1 Bb4:1 A4:1 A4:1 G4:1 ' +
        'D5:1 D5:1 D5:1 C5:1 Bb4:1 A4:1 Bb4:2 G4:1 A4:0.5 Bb4:0.5 C5:1.5 F4:0.5 F4:1 G4:1 F4:2',
    ),
    bass: parseNotes(
      'F2:2 F2:2 C3:2 C3:2 F2:2 Bb2:2 C3:4 ' +
        'F2:2 F2:2 C3:2 C3:2 G2:2 C3:2 C3:4 ' +
        'F2:2 F2:2 Bb2:2 C3:2 F2:2 F2:2 Bb2:2 C3:2 ' +
        'Bb2:2 F2:2 G2:2 C3:2 F2:2 C3:2 F2:4',
    ),
  },
  ANTIOCH: {
    defaultBpm: 112,
    melody: parseNotes(
      'D5:1 C#5:0.75 B4:0.25 A4:1.5 G4:0.5 F#4:1 E4:1 D4:1.5 A4:0.5 B4:1.5 B4:0.5 C#5:1.5 C#5:0.5 D5:2 ' +
        'D5:0.5 D5:0.5 C#5:0.5 B4:0.5 A4:0.75 G4:0.25 F#4:0.5 D5:0.5 D5:0.5 C#5:0.5 B4:0.5 A4:0.75 G4:0.25 F#4:1 ' +
        'F#4:0.5 F#4:0.5 F#4:0.5 F#4:0.5 F#4:0.5 G4:0.5 A4:1.5 G4:0.5 F#4:0.5 E4:0.5 E4:0.5 E4:0.5 E4:0.5 F#4:0.5 G4:1.5 ' +
        'F#4:0.5 E4:0.5 D4:1 D5:1 B4:1 A4:0.75 G4:0.25 F#4:0.5 G4:0.5 F#4:1 E4:1 D4:2',
    ),
    bass: parseNotes(
      'D3:2 A2:2 D3:2 A2:2 D3:2 G2:2 A2:2 D3:2 ' +
        'D3:2 G2:2 D3:2 D3:2 D3:2 A2:2 ' +
        'D3:2 A2:2 D3:2 G2:2 A2:2 D3:2',
    ),
  },
  STILLE_NACHT: {
    defaultBpm: 84,
    melody: parseNotes(
      'F4:1.5 G4:0.5 F4:1 D4:3 F4:1.5 G4:0.5 F4:1 D4:3 ' +
        'C5:2 C5:1 A4:3 Bb4:2 Bb4:1 F4:3 ' +
        'G4:2 G4:1 Bb4:1.5 A4:0.5 G4:1 F4:1.5 G4:0.5 F4:1 D4:3 ' +
        'C5:2 C5:1 Eb5:1.5 C5:0.5 A4:1 Bb4:3 D5:3 Bb4:1 F4:1 D4:1 F4:1.5 Eb4:0.5 C4:1 Bb3:3',
    ),
    bass: parseNotes(
      'Bb2:3 Bb2:3 Bb2:3 Bb2:3 F2:3 F2:3 Bb2:3 Bb2:3 ' +
        'Eb3:3 Eb3:3 Bb2:3 Bb2:3 F2:3 F2:3 Bb2:3 Bb2:3 F2:3 Bb2:3',
    ),
  },
  OLD_RUGGED_CROSS: {
    defaultBpm: 92,
    melody: parseNotes(
      'D4:0.5 Eb4:0.5 F4:1.5 E4:0.5 G4:0.5 F4:0.5 F4:2 ' +
        'F4:0.5 G4:0.5 A4:1.5 G4:0.5 F4:0.5 A4:0.5 G4:2 ' +
        'A4:1 Bb4:1.5 A4:0.5 G4:0.5 G4:0.5 G4:1.5 F4:0.5 E4:0.5 F4:2 ' +
        'D5:0.5 D5:0.5 D5:1.5 D5:0.5 C5:0.5 Bb4:0.5 G4:2 ' +
        'Bb4:0.5 Bb4:0.5 Bb4:1.5 A4:0.5 G4:0.5 Bb4:0.5 A4:2 ' +
        'Bb4:1.5 C5:0.5 D5:0.5 D5:0.5 C5:0.5 Bb4:0.5 A4:0.5 Bb4:3',
    ),
    bass: parseNotes(
      'Bb2:3 Bb2:3 F2:3 F2:3 Eb3:3 F2:3 Bb2:3 ' +
        'Bb2:3 Eb3:3 F2:3 F2:3 Bb2:3',
    ),
  },
  CHINA: {
    defaultBpm: 100,
    melody: parseNotes(
      'Bb4:1 G4:1 G4:1 F4:1 G4:1 Bb4:1 G4:2 ' +
        'F4:1 F4:1 Eb4:1 F4:1 G4:2 Bb4:2 ' +
        'Bb4:1 G4:1 G4:1 F4:1 G4:1 Bb4:1 G4:2 ' +
        'F4:1 Eb4:1 G4:1 F4:1 Eb4:4 ' +
        'Bb4:2 G4:1 Bb4:1 C5:4 Bb4:2 G4:1 Eb4:1 F4:4 ' +
        'Bb4:2 G4:1 Bb4:1 C5:2 Ab4:2 G4:2 F4:2 Eb4:4',
    ),
    bass: parseNotes(
      'Eb3:4 Eb3:4 Bb2:4 Eb3:4 Eb3:4 Eb3:4 Bb2:4 Eb3:4 ' +
        'Eb3:4 Ab2:4 Eb3:4 Bb2:4 Eb3:4 Ab2:4 Bb2:4 Eb3:4',
    ),
  },
  WE_HAVE_THIS_HOPE: {
    defaultBpm: 94,
    melody: parseNotes(
      'D4:1 G4:2 B4:1 A4:1.5 G4:0.5 G4:2 ' +
        'D4:1 E4:1 G4:1 B4:1 A4:3 ' +
        'D4:1 A4:2 C5:1 B4:1.5 A4:0.5 A4:2 ' +
        'B4:1 A4:1 G4:1 F#4:1 G4:3 ' +
        'B4:1 D5:2 B4:1 C5:1.5 B4:0.5 A4:2 ' +
        'A4:1 C5:2 A4:1 B4:1.5 A4:0.5 G4:2 ' +
        'D4:1 E4:1 G4:1 B4:1 D5:2 C5:1 B4:1 A4:2 G4:4',
    ),
    bass: parseNotes(
      'G2:4 G2:4 C3:2 D3:2 D3:3 D3:4 D3:4 G2:2 D3:2 G2:3 ' +
        'G2:4 C3:4 D3:4 G2:4 C3:2 G2:2 D3:2 G2:4',
    ),
  },
  SURRENDER: {
    defaultBpm: 88,
    melody: parseNotes(
      'F#4:1 F#4:1 G4:1 F#4:1 E4:2 E4:2 E4:1 F#4:1 G4:1 E4:1 D4:3 ' +
        'F#4:1 F#4:1 G4:1 F#4:1 E4:2 E4:2 E4:1 F#4:1 G4:1 E4:1 D4:3 ' +
        'D5:1.5 C#5:0.5 B4:1 A4:1 G4:2 F#4:2 E4:1.5 F#4:0.5 G4:1 E4:1 D4:3 ' +
        'D5:1.5 C#5:0.5 B4:1 A4:1 B4:2 A4:2 G4:1 F#4:1 E4:2 D4:3',
    ),
    bass: parseNotes(
      'D3:4 A2:4 A2:4 D3:3 D3:4 A2:4 A2:4 D3:3 ' +
        'D3:4 G2:2 D3:2 A2:4 D3:3 D3:4 G2:2 D3:2 A2:4 D3:3',
    ),
  },
  WOODWORTH: {
    defaultBpm: 86,
    melody: parseNotes(
      'Eb4:1 G4:1 Bb4:1 Bb4:1.5 Ab4:0.5 G4:1 Eb4:1 F4:1 G4:2 ' +
        'G4:1 Bb4:1 Eb5:1 Eb5:1.5 D5:0.5 C5:1 Bb4:1 G4:1 Bb4:2 ' +
        'Bb4:1 C5:1 Bb4:1 Ab4:1 G4:1 F4:1 G4:2 ' +
        'G4:1 Ab4:1 G4:1 F4:1 Eb4:3',
    ),
    bass: parseNotes('Eb3:3 Bb2:3 Eb3:3 Eb3:3 Ab2:3 Eb3:3 Bb2:3 Eb3:3'),
  },
  NETTLETON: {
    defaultBpm: 96,
    melody: parseNotes(
      'F#4:0.5 E4:0.5 D4:1 D4:1 F#4:1 A4:1 F#4:1 A4:1 B4:1 A4:2 ' +
        'F#4:0.5 E4:0.5 D4:1 D4:1 F#4:1 A4:1 F#4:1 E4:1 D4:3 ' +
        'A4:1 B4:1 C#5:1 D5:1 C#5:1 B4:1 A4:2 ' +
        'F#4:0.5 E4:0.5 D4:1 D4:1 F#4:1 A4:1 F#4:1 E4:1 D4:3',
    ),
    bass: parseNotes(
      'D3:3 D3:3 G2:3 D3:3 D3:3 A2:3 D3:3 ' +
        'A2:3 G2:3 D3:3 A2:3 D3:3',
    ),
  },
  TO_GOD_BE_THE_GLORY: {
    defaultBpm: 106,
    melody: parseNotes(
      'Eb4:1 Eb4:0.5 F4:0.5 G4:1 Ab4:1 Eb4:1 C5:1 Bb4:1 Ab4:1 G4:2 ' +
        'Ab4:1 Bb4:1 C5:1 C5:1 Bb4:1 Ab4:1 G4:2 ' +
        'C5:1.5 Db5:0.5 Eb5:1 Eb5:1 Db5:1 C5:1 Bb4:2 ' +
        'Eb5:1.5 Db5:0.5 C5:1 Bb4:1 Ab4:1 G4:1 Ab4:3',
    ),
    bass: parseNotes('Ab2:3 Ab2:3 Eb3:3 Ab2:3 Db3:3 Eb3:3 Ab2:3 Eb3:3 Ab2:3'),
  },
  ASSURANCE: {
    defaultBpm: 96,
    melody: parseNotes(
      'F#4:1 E4:1 D4:1 A4:3 A4:1 G4:1 A4:1 B4:3 ' +
        'B4:1 A4:1 F#4:1 D4:1 E4:1 F#4:1 E4:3 ' +
        'F#4:1 E4:1 D4:1 A4:3 A4:1 G4:1 A4:1 B4:3 ' +
        'A4:1 D5:1 C#5:1 B4:1 A4:1 G4:1 F#4:1 E4:1 D4:3 ' +
        'A4:1 A4:1 A4:1 D5:3 A4:1 A4:1 A4:1 B4:3 ' +
        'B4:1 B4:1 B4:1 C#5:3 C#5:1 D5:1 B4:1 A4:3 ' +
        'A4:1 D5:1 C#5:1 B4:1 A4:1 G4:1 F#4:1 E4:1 D4:3',
    ),
    bass: parseNotes(
      'D3:3 D3:3 G2:3 D3:3 A2:3 D3:3 G2:3 A2:3 ' +
        'D3:3 D3:3 G2:3 D3:3 A2:3 D3:3 ' +
        'D3:3 D3:3 G2:3 D3:3 A2:3 D3:3',
    ),
  },
  CONVERSE: {
    defaultBpm: 94,
    melody: parseNotes(
      'C5:1.5 C5:0.5 D5:1 C5:1 A4:1 F4:1 F4:2 D4:1.5 F4:0.5 Bb4:1 A4:1 G4:1 F4:1 G4:2 ' +
        'C5:1.5 C5:0.5 D5:1 C5:1 A4:1 F4:1 F4:2 D4:1.5 F4:0.5 Bb4:1 A4:1 G4:1 A4:1 F4:2 ' +
        'G4:1.5 F#4:0.5 G4:1 A4:1 Bb4:1 G4:1 A4:2 Bb4:1.5 Bb4:0.5 D5:1 C5:1 Bb4:1 A4:1 G4:2 ' +
        'C5:1.5 C5:0.5 D5:1 C5:1 A4:1 F4:1 F4:2 D4:1.5 F4:0.5 Bb4:1 A4:1 G4:1 A4:1 F4:2',
    ),
    bass: parseNotes(
      'F2:4 F2:4 Bb2:4 C3:4 F2:4 F2:4 Bb2:2 C3:2 F2:4 ' +
        'C3:4 F2:4 Bb2:4 C3:4 F2:4 F2:4 Bb2:2 C3:2 F2:4',
    ),
  },
  EIN_FESTE_BURG: {
    defaultBpm: 98,
    melody: parseNotes(
      'C5:1 C5:1 C5:1 G4:0.5 A4:0.5 B4:1 C5:0.5 B4:0.5 A4:1 G4:2 ' +
        'C5:1 B4:1 A4:1 G4:1 A4:1 F4:0.5 E4:0.5 D4:1 C4:2 ' +
        'C4:1 G4:1 A4:1 B4:1 C5:2 ' +
        'B4:1 C5:1 B4:1 A4:1 G4:2 ' +
        'A4:1 A4:1 G4:1 A4:1 F4:1 E4:2 ' +
        'C5:1 B4:1 A4:1 G4:1 A4:1 F4:0.5 E4:0.5 D4:1 C4:3',
    ),
    bass: parseNotes(
      'C3:4 G2:4 F2:2 C3:2 G2:2 C3:2 ' +
        'C3:2 G2:2 F2:2 C3:2 G2:2 C3:4 ' +
        'C3:4 G2:4 F2:2 C3:2 G2:2 C3:3',
    ),
  },
  SOLID_ROCK: {
    defaultBpm: 96,
    melody: parseNotes(
      'C4:1 F4:1 A4:1 C5:1 A4:1 F4:1 G4:2 G4:1 G4:1 A4:1 Bb4:1 A4:1 G4:1 F4:2 ' +
        'C4:1 F4:1 A4:1 C5:1 A4:1 F4:1 G4:2 G4:1 G4:1 A4:1 Bb4:1 A4:1 G4:1 F4:2 ' +
        'C5:1 C5:1 C5:1 C5:2 D5:1 C5:1 Bb4:1 Bb4:1 Bb4:1 A4:2 ' +
        'C5:1 A4:1 F4:1 F4:2 G4:1 A4:1 Bb4:1 A4:1 G4:1 F4:3',
    ),
    bass: parseNotes(
      'F2:3 F2:3 C3:3 F2:3 F2:3 F2:3 C3:3 F2:3 ' +
        'F2:3 F2:3 Bb2:3 F2:3 Bb2:3 C3:3 F2:3',
    ),
  },
  VILLE_DU_HAVRE: {
    defaultBpm: 90,
    melody: parseNotes(
      'G4:1 G4:2 F4:1 E4:2 E4:1 D4:1 E4:1 F4:1 A4:1 G4:1 E4:2 ' +
        'G4:1 C5:2 B4:1 A4:2 A4:1 G4:1 F#4:1 G4:3 ' +
        'G4:1 C5:2 C5:1 B4:2 A4:1 A4:1 A4:1 D5:2 D5:1 C5:1 B4:1 A4:1 G4:2 ' +
        'G4:1 C5:2 C5:1 C5:2 B4:1 C5:1 C5:3 ' +
        'G4:1 G4:3 E4:1 G4:3 A4:1 A4:1 D5:1 C5:1 B4:1 C5:3',
    ),
    bass: parseNotes(
      'C3:4 G2:4 C3:4 G2:4 C3:4 F2:4 G2:4 C3:4 ' +
        'F2:4 G2:4 C3:4 G2:4 C3:4 F2:2 G2:2 C3:4',
    ),
  },
  CWM_RHONDDA: {
    defaultBpm: 100,
    melody: parseNotes(
      'D4:1 G4:1.5 F#4:0.5 G4:1 A4:1 B4:1.5 A4:0.5 G4:2 ' +
        'B4:1 D5:1.5 C5:0.5 B4:1 A4:1 G4:1 F#4:1 G4:2 ' +
        'D5:1.5 D5:0.5 B4:1 G4:1 E5:1.5 E5:0.5 C5:1 A4:1 ' +
        'D5:1 B4:1 G4:1 E4:1 D4:1 G4:1 A4:1 G4:3',
    ),
    bass: parseNotes('G2:4 D3:4 G2:4 D3:2 G2:2 G2:4 C3:4 D3:4 G2:4'),
  },
  TRUST_AND_OBEY: {
    defaultBpm: 98,
    melody: parseNotes(
      'C4:1 F4:1 A4:1 A4:2 G4:1 F4:3 C4:1 F4:1 A4:1 A4:2 G4:1 F4:3 ' +
        'F4:1 G4:1 A4:1 Bb4:2 Bb4:1 A4:2 G4:1 F4:3 ' +
        'C5:1 C5:1 C5:1 A4:2 C5:1 Bb4:3 Bb4:1 Bb4:1 Bb4:1 G4:2 Bb4:1 A4:3 ' +
        'F4:1 A4:1 C5:1 D5:2 Bb4:1 A4:2 G4:1 F4:3',
    ),
    bass: parseNotes(
      'F2:3 C3:3 F2:3 F2:3 C3:3 F2:3 Bb2:3 C3:3 F2:3 ' +
        'F2:3 C3:3 C3:3 F2:3 Bb2:3 C3:3 F2:3',
    ),
  },
};

const HYMN_TUNE_MAP = {
  1: 'LOBE_DEN_HERREN',
  2: 'LASST_UNS_ERFREUEN',
  12: 'HYMN_TO_JOY',
  16: 'OLD_HUNDREDTH',
  21: 'ST_DENIO',
  44: 'BUNESSAN',
  50: 'EVENTIDE',
  73: 'NICAEA',
  83: 'LYONS',
  86: 'O_STORE_GUD',
  92: 'TERRA_BEATA',
  100: 'FAITHFULNESS',
  108: 'NEW_BRITAIN',
  122: 'MENDELSSOHN',
  125: 'ANTIOCH',
  143: 'STILLE_NACHT',
  159: 'OLD_RUGGED_CROSS',
  190: 'CHINA',
  214: 'WE_HAVE_THIS_HOPE',
  309: 'SURRENDER',
  314: 'WOODWORTH',
  334: 'NETTLETON',
  341: 'TO_GOD_BE_THE_GLORY',
  462: 'ASSURANCE',
  499: 'CONVERSE',
  506: 'EIN_FESTE_BURG',
  522: 'SOLID_ROCK',
  530: 'VILLE_DU_HAVRE',
  538: 'CWM_RHONDDA',
  590: 'TRUST_AND_OBEY',
  694: 'OLD_HUNDREDTH',
  695: 'OLD_HUNDREDTH',
};

function buildMidiBuffer(tune) {
  const midi = new Midi();
  const bpm = tune.defaultBpm || 96;
  const secPerBeat = 60 / bpm;
  midi.header.setTempo(bpm);

  const rightHand = midi.addTrack();
  rightHand.name = 'Piano Melody';
  rightHand.channel = 0;
  rightHand.instrument.number = 0;

  let cursor = 0;
  for (const item of tune.melody) {
    if (item.note && item.note.toLowerCase() !== 'rest') {
      const midiNum = noteNameToMidi(item.note);
      if (midiNum !== null) {
        const startSec = cursor * secPerBeat;
        const durSec = Math.max(0.08, item.beats * secPerBeat * 0.94);
        rightHand.addNote({
          midi: midiNum,
          time: startSec,
          duration: durSec,
          velocity: 0.78,
        });
      }
    }
    cursor += item.beats;
  }

  const leftHand = midi.addTrack();
  leftHand.name = 'Piano Bass';
  leftHand.channel = 1;
  leftHand.instrument.number = 0;

  let bassCursor = 0;
  for (const item of tune.bass) {
    if (item.note && item.note.toLowerCase() !== 'rest') {
      const midiNum = noteNameToMidi(item.note);
      if (midiNum !== null) {
        const startSec = bassCursor * secPerBeat;
        const durSec = Math.max(0.1, item.beats * secPerBeat * 0.96);
        leftHand.addNote({
          midi: midiNum,
          time: startSec,
          duration: durSec,
          velocity: 0.64,
        });
        // Add warm upper octave on low bass notes (< E3 = MIDI 52) for full piano body
        if (midiNum < 52) {
          leftHand.addNote({
            midi: midiNum + 12,
            time: startSec,
            duration: durSec,
            velocity: 0.44,
          });
        }
      }
    }
    bassCursor += item.beats;
  }

  return Buffer.from(midi.toArray());
}

mkdirSync(OUT_DIR, { recursive: true });
let count = 0;
for (const [numStr, tuneKey] of Object.entries(HYMN_TUNE_MAP)) {
  const num = Number(numStr);
  const tune = EXACT_TUNES[tuneKey];
  if (!tune) continue;
  const filename = `${String(num).padStart(3, '0')}.mid`;
  const buf = buildMidiBuffer(tune);
  writeFileSync(join(OUT_DIR, filename), buf);
  count += 1;
}

console.log(`Generated ${count} binary MIDI tracks in public/midi/`);
