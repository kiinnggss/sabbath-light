import type { HymnEntry } from './hymnalTypes';

export interface MelodyNote {
  note: string; // e.g. 'C4', 'F#4', 'rest'
  beats: number;
}

export interface TuneSequence {
  id: string;
  tuneName: string;
  key: string;
  defaultBpm: number;
  isExactTune: boolean;
  melody: MelodyNote[];
  bass: MelodyNote[];
}

// Helper to parse compact melody notation like "F4:1 F4:1 C5:1 A4:1.5 G4:0.5 F4:1"
function parseNotes(spec: string): MelodyNote[] {
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

// Authentic public-domain written SDAH tunes + bass harmony
const EXACT_TUNES: Record<string, TuneSequence> = {
  LOBE_DEN_HERREN: {
    id: 'LOBE_DEN_HERREN',
    tuneName: 'LOBE DEN HERREN',
    key: 'F Major',
    defaultBpm: 108,
    isExactTune: true,
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
    id: 'LASST_UNS_ERFREUEN',
    tuneName: 'LASST UNS ERFREUEN',
    key: 'Eb Major',
    defaultBpm: 112,
    isExactTune: true,
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
    id: 'HYMN_TO_JOY',
    tuneName: 'HYMN TO JOY',
    key: 'G Major',
    defaultBpm: 112,
    isExactTune: true,
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
    id: 'OLD_HUNDREDTH',
    tuneName: 'OLD HUNDREDTH',
    key: 'G Major',
    defaultBpm: 92,
    isExactTune: true,
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
    id: 'ST_DENIO',
    tuneName: 'ST. DENIO',
    key: 'G Major',
    defaultBpm: 108,
    isExactTune: true,
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
  EVENTIDE: {
    id: 'EVENTIDE',
    tuneName: 'EVENTIDE',
    key: 'Eb Major',
    defaultBpm: 88,
    isExactTune: true,
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
    id: 'NICAEA',
    tuneName: 'NICAEA',
    key: 'D Major',
    defaultBpm: 94,
    isExactTune: true,
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
    id: 'LYONS',
    tuneName: 'LYONS',
    key: 'G Major',
    defaultBpm: 108,
    isExactTune: true,
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
    id: 'O_STORE_GUD',
    tuneName: 'O STORE GUD',
    key: 'Bb Major',
    defaultBpm: 92,
    isExactTune: true,
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
    id: 'TERRA_BEATA',
    tuneName: 'TERRA BEATA',
    key: 'Eb Major',
    defaultBpm: 102,
    isExactTune: true,
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
    id: 'FAITHFULNESS',
    tuneName: 'FAITHFULNESS',
    key: 'D Major',
    defaultBpm: 92,
    isExactTune: true,
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
    id: 'NEW_BRITAIN',
    tuneName: 'NEW BRITAIN',
    key: 'G Major',
    defaultBpm: 88,
    isExactTune: true,
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
    id: 'MENDELSSOHN',
    tuneName: 'MENDELSSOHN',
    key: 'F Major',
    defaultBpm: 110,
    isExactTune: true,
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
    id: 'ANTIOCH',
    tuneName: 'ANTIOCH',
    key: 'D Major',
    defaultBpm: 112,
    isExactTune: true,
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
    id: 'STILLE_NACHT',
    tuneName: 'STILLE NACHT',
    key: 'Bb Major',
    defaultBpm: 84,
    isExactTune: true,
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
    id: 'OLD_RUGGED_CROSS',
    tuneName: 'OLD RUGGED CROSS',
    key: 'Bb Major',
    defaultBpm: 92,
    isExactTune: true,
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
    id: 'CHINA',
    tuneName: 'CHINA',
    key: 'Eb Major',
    defaultBpm: 100,
    isExactTune: true,
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
    id: 'WE_HAVE_THIS_HOPE',
    tuneName: 'WE HAVE THIS HOPE',
    key: 'G Major',
    defaultBpm: 94,
    isExactTune: true,
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
    id: 'SURRENDER',
    tuneName: 'SURRENDER',
    key: 'D Major',
    defaultBpm: 88,
    isExactTune: true,
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
  ASSURANCE: {
    id: 'ASSURANCE',
    tuneName: 'ASSURANCE',
    key: 'D Major',
    defaultBpm: 96,
    isExactTune: true,
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
    id: 'CONVERSE',
    tuneName: 'CONVERSE',
    key: 'F Major',
    defaultBpm: 94,
    isExactTune: true,
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
    id: 'EIN_FESTE_BURG',
    tuneName: 'EIN FESTE BURG',
    key: 'C Major',
    defaultBpm: 98,
    isExactTune: true,
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
    id: 'SOLID_ROCK',
    tuneName: 'SOLID ROCK',
    key: 'F Major',
    defaultBpm: 96,
    isExactTune: true,
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
    id: 'VILLE_DU_HAVRE',
    tuneName: 'VILLE DU HAVRE',
    key: 'C Major',
    defaultBpm: 90,
    isExactTune: true,
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
  TRUST_AND_OBEY: {
    id: 'TRUST_AND_OBEY',
    tuneName: 'TRUST AND OBEY',
    key: 'F Major',
    defaultBpm: 98,
    isExactTune: true,
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
  WOODWORTH: {
    id: 'WOODWORTH',
    tuneName: 'WOODWORTH',
    key: 'Eb Major',
    defaultBpm: 86,
    isExactTune: true,
    melody: parseNotes(
      'Eb4:1 G4:1 Bb4:1 Bb4:1.5 Ab4:0.5 G4:1 Eb4:1 F4:1 G4:2 ' +
        'G4:1 Bb4:1 Eb5:1 Eb5:1.5 D5:0.5 C5:1 Bb4:1 G4:1 Bb4:2 ' +
        'Bb4:1 C5:1 Bb4:1 Ab4:1 G4:1 F4:1 G4:2 ' +
        'G4:1 Ab4:1 G4:1 F4:1 Eb4:3',
    ),
    bass: parseNotes(
      'Eb3:3 Bb2:3 Eb3:3 Eb3:3 Ab2:3 Eb3:3 Bb2:3 Eb3:3',
    ),
  },
  TO_GOD_BE_THE_GLORY: {
    id: 'TO_GOD_BE_THE_GLORY',
    tuneName: 'TO GOD BE THE GLORY',
    key: 'Ab Major',
    defaultBpm: 106,
    isExactTune: true,
    melody: parseNotes(
      'Eb4:1 Eb4:0.5 F4:0.5 G4:1 Ab4:1 Eb4:1 C5:1 Bb4:1 Ab4:1 G4:2 ' +
        'Ab4:1 Bb4:1 C5:1 C5:1 Bb4:1 Ab4:1 G4:2 ' +
        'C5:1.5 Db5:0.5 Eb5:1 Eb5:1 Db5:1 C5:1 Bb4:2 ' +
        'Eb5:1.5 Db5:0.5 C5:1 Bb4:1 Ab4:1 G4:1 Ab4:3',
    ),
    bass: parseNotes(
      'Ab2:3 Ab2:3 Eb3:3 Ab2:3 Db3:3 Eb3:3 Ab2:3 Eb3:3 Ab2:3',
    ),
  },
  CWM_RHONDDA: {
    id: 'CWM_RHONDDA',
    tuneName: 'CWM RHONDDA',
    key: 'G Major',
    defaultBpm: 100,
    isExactTune: true,
    melody: parseNotes(
      'D4:1 G4:1.5 F#4:0.5 G4:1 A4:1 B4:1.5 A4:0.5 G4:2 ' +
        'B4:1 D5:1.5 C5:0.5 B4:1 A4:1 G4:1 F#4:1 G4:2 ' +
        'D5:1.5 D5:0.5 B4:1 G4:1 E5:1.5 E5:0.5 C5:1 A4:1 ' +
        'D5:1 B4:1 G4:1 E4:1 D4:1 G4:1 A4:1 G4:3',
    ),
    bass: parseNotes(
      'G2:4 D3:4 G2:4 D3:2 G2:2 ' +
        'G2:4 C3:4 D3:4 G2:4',
    ),
  },
  NETTLETON: {
    id: 'NETTLETON',
    tuneName: 'NETTLETON',
    key: 'D Major',
    defaultBpm: 96,
    isExactTune: true,
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
  BUNESSAN: {
    id: 'BUNESSAN',
    tuneName: 'BUNESSAN',
    key: 'C Major',
    defaultBpm: 96,
    isExactTune: true,
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
  ST_ANNE: {
    id: 'ST_ANNE',
    tuneName: 'ST. ANNE',
    key: 'C Major',
    defaultBpm: 96,
    isExactTune: false,
    melody: parseNotes(
      'G4:1 E4:1 A4:1 G4:1 C5:1 C5:1 B4:1 C5:2 ' +
        'G4:1 C5:1 G4:1 A4:1 F#4:1 G4:3 ' +
        'B4:1 C5:1 A4:1 D5:1 B4:1 G4:1 A4:1 F#4:1 G4:2 ' +
        'G4:1 E4:1 A4:1 G4:1 F4:1 E4:1 D4:1 C4:3',
    ),
    bass: parseNotes(
      'C3:2 F2:2 C3:2 G2:2 C3:2 D3:2 G2:4 ' +
        'G2:2 D3:2 G2:2 D3:2 G2:2 F2:2 G2:2 C3:3',
    ),
  },
  DUKE_STREET: {
    id: 'DUKE_STREET',
    tuneName: 'DUKE STREET',
    key: 'D Major',
    defaultBpm: 96,
    isExactTune: false,
    melody: parseNotes(
      'D4:2 F#4:1 G4:1 A4:2 B4:1 C#5:1 D5:2 C#5:1 B4:1 A4:3 ' +
        'A4:1 A4:1 B4:1 A4:1 G4:2 F#4:2 E4:2 F#4:1 G4:1 A4:3 ' +
        'A4:1 A4:1 B4:1 C#5:1 D5:2 B4:1 G4:1 F#4:2 E4:2 D4:3',
    ),
    bass: parseNotes(
      'D3:4 D3:2 A2:2 D3:4 A2:4 D3:4 A2:4 D3:4 G2:2 A2:2 D3:3',
    ),
  },
  AZMON: {
    id: 'AZMON',
    tuneName: 'AZMON',
    key: 'G Major',
    defaultBpm: 100,
    isExactTune: false,
    melody: parseNotes(
      'D4:1 G4:2 G4:1 A4:2 A4:1 B4:1 A4:1 G4:1 A4:2 ' +
        'B4:1 D5:2 B4:1 G4:2 A4:1 B4:1 A4:1 G4:1 F#4:2 ' +
        'D4:1 B4:2 B4:1 C5:2 C5:1 D5:1 C5:1 B4:1 A4:2 ' +
        'B4:1 D5:2 B4:1 G4:2 E4:1 D4:1 G4:1 F#4:1 G4:3',
    ),
    bass: parseNotes(
      'G2:3 D3:3 G2:3 D3:3 G2:3 G2:3 C3:3 D3:3 ' +
        'G2:3 C3:3 G2:3 D3:3 G2:3 C3:3 D3:3 G2:3',
    ),
  },
  HYFRYDOL: {
    id: 'HYFRYDOL',
    tuneName: 'HYFRYDOL',
    key: 'F Major',
    defaultBpm: 98,
    isExactTune: false,
    melody: parseNotes(
      'F4:1.5 G4:0.5 A4:1 F4:1 G4:1 A4:1 Bb4:1 G4:1 A4:1 Bb4:1 C5:1 A4:1 G4:3 ' +
        'F4:1.5 G4:0.5 A4:1 F4:1 G4:1 A4:1 Bb4:1 G4:1 C5:1 Bb4:1 A4:1 G4:1 F4:3 ' +
        'C5:1 C5:1 C5:1 Bb4:1 A4:1 A4:1 A4:1 G4:1 F4:1 G4:1 A4:1 F4:1 G4:3 ' +
        'C5:1.5 Bb4:0.5 A4:1 F4:1 Bb4:1.5 A4:0.5 G4:1 E4:1 F4:1 Bb4:1 A4:1 G4:1 F4:3',
    ),
    bass: parseNotes(
      'F2:4 Bb2:4 C3:4 F2:4 F2:4 Bb2:4 C3:4 F2:4 ' +
        'F2:4 F2:4 Bb2:4 C3:4 F2:4 Bb2:4 C3:4 F2:4',
    ),
  },
  ST_THOMAS: {
    id: 'ST_THOMAS',
    tuneName: 'ST. THOMAS',
    key: 'G Major',
    defaultBpm: 100,
    isExactTune: false,
    melody: parseNotes(
      'D4:1 G4:1 G4:1 B4:1 A4:1 G4:2 ' +
        'B4:1 D5:1 C5:1 B4:1 A4:3 ' +
        'D5:1 B4:1 C5:1 A4:1 G4:1 E4:1 D4:2 ' +
        'G4:1 A4:1 B4:1 C5:1 A4:1 G4:3',
    ),
    bass: parseNotes(
      'G2:4 D3:2 G2:2 G2:4 D3:3 G2:2 C3:2 D3:4 G2:2 C3:2 D3:2 G2:3',
    ),
  },
};

// Direct mapping from SDAH hymn number to exact written tune
const HYMN_TUNE_MAP: Record<number, string> = {
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

const METER_FALLBACK_TUNES = ['ST_ANNE', 'DUKE_STREET', 'AZMON', 'HYFRYDOL', 'ST_THOMAS'];

export function getTuneSequenceForHymn(hymn: HymnEntry): TuneSequence {
  const mappedKey = HYMN_TUNE_MAP[hymn.number];
  if (mappedKey && EXACT_TUNES[mappedKey]) {
    const seq = EXACT_TUNES[mappedKey];
    return {
      ...seq,
      defaultBpm: hymn.defaultBpm || seq.defaultBpm,
    };
  }

  // Deterministic metrical fallback based on meter string & hymn number
  const meter = (hymn.meter || '').toUpperCase();
  let fallbackId = METER_FALLBACK_TUNES[hymn.number % METER_FALLBACK_TUNES.length];
  if (meter.includes('L.M.') || meter.includes('8.8.8.8')) fallbackId = 'DUKE_STREET';
  else if (meter.includes('8.7.8.7')) fallbackId = 'HYFRYDOL';
  else if (meter.includes('S.M.')) fallbackId = 'ST_THOMAS';
  else if (meter.includes('C.M.')) fallbackId = hymn.number % 2 === 0 ? 'ST_ANNE' : 'AZMON';

  const base = EXACT_TUNES[fallbackId] || EXACT_TUNES.ST_ANNE;
  return {
    ...base,
    tuneName:
      hymn.tuneName && hymn.tuneName !== 'Traditional SDAH Setting'
        ? `${hymn.tuneName} (${base.tuneName} setting)`
        : `${base.tuneName} (Metrical Setting)`,
    defaultBpm: hymn.defaultBpm || base.defaultBpm,
    isExactTune: false,
  };
}
