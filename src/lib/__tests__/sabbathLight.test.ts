import { describe, expect, it } from 'vitest';
import { formatMidiFilename, isValidMidiBuffer } from '../../components/audio/midiPlayer';
import { FONT_PRESETS, resolveFontPresetId } from '../../data/fonts';
import type { HymnalEntry } from '../../data/hymnalTypes';
import { getContrastTextColor, normalizeHex, resolveThemeId, THEMES } from '../../data/themes';
import { sanitizeBollsVerseText } from '../bibleApi';
import { extractJumpNumber, filterAndSearchHymnal } from '../fuzzySearch';
import {
  makeBibleNoteRef,
  makeHymnalNoteRef,
  makeSSBlockRef,
  makeSSReflectionRef,
  parseImportedNotesJson,
  parseNoteJumpTarget,
} from '../noteReferences';
import {
  deleteNoteById,
  getAllNotes,
  getOfflineBibleChapter,
  putNote,
  putOfflineBibleChapter,
  searchOfflineBibleVersion,
} from '../offlineDb';
import {
  extractMemoryText,
  filterQuarterliesByEdition,
  resolveActiveLesson,
  resolveActiveQuarterly,
  type SSLessonSummary,
  type SSQuarterlySummary,
} from '../sabbathSchoolApi';
import { parseAdventechVerseAttr, parseScriptureReference } from '../scriptureParser';

describe('sanitizeBollsVerseText', () => {
  it('strips Strongs <S> tags and HTML footnotes cleanly', () => {
    const raw =
      'In the beginning<S>7225</S> God<S>430</S> created<S>1254</S> <S>853</S> the heaven<sup>a</sup> and the earth.';
    expect(sanitizeBollsVerseText(raw)).toBe(
      'In the beginning God created the heaven and the earth.',
    );
  });

  it('decodes quotes and apostrophes without leaving tags', () => {
    const raw = '&#8220;For God so loved&#8221; <i>the</i> world&rsquo;s people.';
    const result = sanitizeBollsVerseText(raw);
    expect(result).not.toContain('<');
    expect(result).toContain('For God so loved');
  });
});

describe('scriptureParser', () => {
  it('parses single verses and ranges with version tags', () => {
    const res = parseScriptureReference('1 John 4:1, NKJV');
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({
      bookId: 62,
      bookName: '1 John',
      chapter: 4,
      startVerse: 1,
      endVerse: 1,
    });
  });

  it('parses semicolon-separated passages and single-chapter books', () => {
    const res = parseScriptureReference('Dan. 10:7-19; Deut. 13:1-5; Jude 24-25');
    expect(res).toHaveLength(3);
    expect(res[0]).toMatchObject({ bookId: 27, chapter: 10, startVerse: 7, endVerse: 19 });
    expect(res[1]).toMatchObject({ bookId: 5, chapter: 13, startVerse: 1, endVerse: 5 });
    expect(res[2]).toMatchObject({ bookId: 65, chapter: 1, startVerse: 24, endVerse: 25 });
  });

  it('falls back to Adventech compact verse attribute when text is absent', () => {
    const res = parseAdventechVerseAttr('Dan107-Dan1019,Isa820');
    expect(res.length).toBeGreaterThanOrEqual(2);
    expect(res[0]).toMatchObject({ bookId: 27, chapter: 10, startVerse: 7 });
    expect(res[1]).toMatchObject({ bookId: 23, chapter: 8, startVerse: 20 });
  });
});

describe('sabbathSchoolApi resolvers', () => {
  const sampleQuarterlies: SSQuarterlySummary[] = [
    { id: '2026-04', title: 'The Gift of Prophecy', start_date: '26/09/2026', end_date: '25/12/2026' },
    { id: '2026-04-cq', title: 'The Gift of Prophecy', start_date: '27/09/2026', end_date: '26/12/2026' },
    // Deliberate top-level Adventech metadata typo on -cc
    { id: '2026-04-cc', title: 'An Open Book', start_date: '26/06/2026', end_date: '24/09/2026' },
    { id: '2026-03-cc', title: 'Commitment Under Fire', start_date: '27/06/2026', end_date: '25/09/2026' },
  ];

  it('filters editions and resolves 2026-11-23 even with -cc date quirk', () => {
    const today = new Date(2026, 10, 23, 12, 0, 0);
    const adultQ = resolveActiveQuarterly(filterQuarterliesByEdition(sampleQuarterlies, 'adult'), today);
    const inverseQ = resolveActiveQuarterly(filterQuarterliesByEdition(sampleQuarterlies, 'inverse'), today);
    const ccQ = resolveActiveQuarterly(filterQuarterliesByEdition(sampleQuarterlies, 'cornerstone'), today);

    expect(adultQ?.id).toBe('2026-04');
    expect(inverseQ?.id).toBe('2026-04-cq');
    expect(ccQ?.id).toBe('2026-04-cc');
  });

  it('resolves the active lesson and extracts Memory Text', () => {
    const lessons: SSLessonSummary[] = [
      { id: '08', title: 'Week 8', start_date: '14/11/2026', end_date: '20/11/2026', index: '', path: '' },
      { id: '09', title: 'Week 9', start_date: '21/11/2026', end_date: '27/11/2026', index: '', path: '' },
    ];
    const picked = resolveActiveLesson(lessons, new Date(2026, 10, 23, 12, 0, 0));
    expect(picked?.id).toBe('09');

    const mem = extractMemoryText(
      '<blockquote><p>Memory Text:</p>“Beloved, do not believe every spirit.” (<a class="verse" verse="1John41">1 John 4:1, NKJV</a>).</blockquote>',
    );
    expect(mem?.reference).toBe('1 John 4:1, NKJV');
    expect(mem?.text).toContain('Beloved, do not believe every spirit');
  });
});

describe('fuzzySearch hymnal', () => {
  const sampleEntries: HymnalEntry[] = [
    {
      number: 1,
      kind: 'hymn',
      title: 'Praise to the Lord',
      firstLine: 'Praise to the Lord, the Almighty, the King of creation!',
      section: 'Hymns',
      category: 'Worship',
      author: 'Joachim Neander',
      tuneName: 'LOBE DEN HERREN',
      defaultBpm: 108,
      verses: [{ label: 'Verse 1', lines: ['Praise to the Lord, the Almighty'] }],
    },
    {
      number: 462,
      kind: 'hymn',
      title: 'Blessed Assurance, Jesus is Mine',
      firstLine: 'Blessed assurance, Jesus is mine!',
      section: 'Hymns',
      category: 'Christian Life',
      author: 'Fanny J. Crosby',
      tuneName: 'ASSURANCE',
      defaultBpm: 96,
      verses: [{ label: 'Verse 1', lines: ['Blessed assurance, Jesus is mine!'] }],
    },
    {
      number: 696,
      kind: 'reading',
      title: 'I Will Extol the Lord',
      firstLine: 'I will extol the Lord at all times;',
      section: 'Worship Aids',
      category: 'Scripture Songs & Readings',
      scriptureRef: 'Psalm 34, NIV',
      readingStyle: 'responsive',
      parts: [
        { speaker: 'leader', lines: ['I will extol the Lord at all times;'] },
        { speaker: 'congregation', lines: ['I sought the Lord, and he answered me;'] },
      ],
    },
  ];

  it('extracts valid jump numbers 1-920 and filters by tune, author, and section', () => {
    expect(extractJumpNumber('#462')).toBe(462);
    expect(extractJumpNumber('920')).toBe(920);
    expect(extractJumpNumber('999')).toBeNull();

    expect(filterAndSearchHymnal(sampleEntries, 'Neander', 'all', [])[0].number).toBe(1);
    expect(filterAndSearchHymnal(sampleEntries, 'Lobe den', 'hymns', [])[0].number).toBe(1);
    expect(filterAndSearchHymnal(sampleEntries, '', 'readings', [])).toHaveLength(1);
    expect(filterAndSearchHymnal(sampleEntries, '', 'favorites', [462])).toHaveLength(1);
  });
});

describe('themes and font presets', () => {
  it('provides 11 themes with only the 3 curated video-downloader palettes', () => {
    const ids = THEMES.map((t) => t.id);
    expect(THEMES).toHaveLength(11);
    expect(ids).toEqual(expect.arrayContaining(['soul-velvet', 'fitzgerald-print', 'paw-pop']));

    for (const removed of [
      'porcelain-citrus',
      'oskar-coral',
      'midnight-violet',
      'matcha-kyoto',
      'carbon-mechanic',
    ]) {
      expect(ids).not.toContain(removed);
    }
  });

  it('migrates legacy light/dark theme keys and computes accessible accent ink', () => {
    expect(resolveThemeId('light')).toBe('daylight');
    expect(resolveThemeId('dark')).toBe('nightlight');
    expect(resolveThemeId('unknown-theme')).toBe('daylight');

    expect(normalizeHex('b64f1b')).toBe('#B64F1B');
    expect(normalizeHex('#abc')).toBe('#AABBCC');
    expect(getContrastTextColor('#E48E58')).toBe('#130603');
    expect(getContrastTextColor('#B64F1B')).toBe('#FFFFFF');
  });

  it('exposes 6 curated font presets and validates unknown values', () => {
    expect(FONT_PRESETS).toHaveLength(6);
    expect(resolveFontPresetId('fast-and-loose')).toBe('fast-and-loose');
    expect(resolveFontPresetId('not-a-font')).toBe('sanctuary');
  });
});

describe('midi player helpers', () => {
  it('formats zero-padded MIDI filenames and validates MThd headers', () => {
    expect(formatMidiFilename(1)).toBe('001.mid');
    expect(formatMidiFilename(62)).toBe('062.mid');
    expect(formatMidiFilename(695)).toBe('695.mid');

    const validHeader = new Uint8Array([
      0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x01, 0x00, 0x02, 0x01, 0xe0,
    ]);
    expect(isValidMidiBuffer(validHeader.buffer)).toBe(true);

    const htmlFallback = new TextEncoder().encode('<!doctype html><html></html>');
    expect(isValidMidiBuffer(htmlFallback.buffer)).toBe(false);
  });
});

describe('notes references and offline storage', () => {
  it('builds and parses 1-tap jump targets for Bible, Sabbath School, and Hymnal notes', () => {
    const bibleRef = makeBibleNoteRef(43, 3, 16);
    expect(parseNoteJumpTarget({ sourceType: 'bible', referenceId: bibleRef })).toEqual({
      type: 'bible',
      bookId: 43,
      chapter: 3,
      verse: 16,
    });

    const hymnRef = makeHymnalNoteRef(524);
    expect(parseNoteJumpTarget({ sourceType: 'hymnal', referenceId: hymnRef })).toEqual({
      type: 'hymnal',
      number: 524,
    });

    const ssBlockRef = makeSSBlockRef('inverse', '2026-04-cq', '09', '03', 4);
    expect(parseNoteJumpTarget({ sourceType: 'sabbath-school', referenceId: ssBlockRef })).toEqual({
      type: 'sabbath-school',
      edition: 'inverse',
      quarterlyId: '2026-04-cq',
      lessonId: '09',
      dayId: '03',
      blockIdx: 4,
    });

    const ssRefl = makeSSReflectionRef('adult', '2026-04', '09', '04');
    expect(parseNoteJumpTarget({ sourceType: 'sabbath-school', referenceId: ssRefl })).toEqual({
      type: 'sabbath-school',
      edition: 'adult',
      quarterlyId: '2026-04',
      lessonId: '09',
      dayId: '04',
      isReflection: true,
    });
  });

  it('validates imported JSON backup payloads and persists offline notes/chapters', async () => {
    const payload = JSON.stringify({
      app: 'sabbath-light',
      version: 1,
      notes: [
        {
          sourceType: 'bible',
          referenceId: 'bible:19:23:1',
          referenceLabel: 'Psalms 23:1 · NKJV',
          quoteSnippet: 'The Lord is my shepherd;',
          noteText: 'Comfort in difficult weeks.',
        },
        {
          sourceType: 'bible',
          referenceId: 'bad-empty-note',
          noteText: '   ',
        },
      ],
    });

    const parsed = parseImportedNotesJson(payload);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].referenceId).toBe('bible:19:23:1');

    await putNote(parsed[0]);
    const listAfterSave = await getAllNotes();
    expect(listAfterSave.some((n) => n.id === parsed[0].id)).toBe(true);

    await deleteNoteById(parsed[0].id);
    const listAfterDelete = await getAllNotes();
    expect(listAfterDelete.some((n) => n.id === parsed[0].id)).toBe(false);

    await putOfflineBibleChapter('NKJV', 43, 3, [
      { verse: 16, text: 'For God so loved the world that He gave His only begotten Son.' },
    ]);
    const ch = await getOfflineBibleChapter('NKJV', 43, 3);
    expect(ch).toHaveLength(1);

    const hits = await searchOfflineBibleVersion(
      'NKJV',
      'begotten Son',
      new Map([[43, 'John']]),
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ bookName: 'John', chapter: 3, verse: 16 });
  });
});
