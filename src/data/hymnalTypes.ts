export interface HymnVerse {
  label: string;
  isRefrain?: boolean;
  lines: string[];
}

export interface HymnEntry {
  number: number;
  kind: 'hymn';
  title: string;
  firstLine: string;
  section: string;
  category: string;
  author: string;
  authorDates?: string;
  authorBio?: string;
  tuneName: string;
  composer?: string;
  key?: string;
  meter?: string;
  defaultBpm: number;
  story?: string;
  verses: HymnVerse[];
}

export interface ReadingPart {
  speaker: 'leader' | 'congregation' | 'unison';
  lines: string[];
}

export interface WorshipAidEntry {
  number: number;
  kind: 'reading';
  title: string;
  firstLine: string;
  section: string;
  category: string;
  scriptureRef?: string;
  readingStyle: 'responsive' | 'unison';
  parts: ReadingPart[];
}

export type HymnalEntry = HymnEntry | WorshipAidEntry;

export interface HymnalDataset {
  version: number;
  edition: string;
  generatedAt: string;
  counts: {
    total: number;
    hymns: number;
    readings: number;
  };
  entries: HymnalEntry[];
}
