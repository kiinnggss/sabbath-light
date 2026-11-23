export interface BibleBookMeta {
  id: number;
  usfm: string;
  name: string;
  shortName: string;
  testament: 'OT' | 'NT';
  chapters: number;
  aliases: string[];
}

export const BIBLE_BOOKS: BibleBookMeta[] = [
  { id: 1, usfm: 'GEN', name: 'Genesis', shortName: 'Gen', testament: 'OT', chapters: 50, aliases: ['gen', 'ge', 'gn'] },
  { id: 2, usfm: 'EXO', name: 'Exodus', shortName: 'Exod', testament: 'OT', chapters: 40, aliases: ['exod', 'exo', 'ex'] },
  { id: 3, usfm: 'LEV', name: 'Leviticus', shortName: 'Lev', testament: 'OT', chapters: 27, aliases: ['lev', 'le', 'lv'] },
  { id: 4, usfm: 'NUM', name: 'Numbers', shortName: 'Num', testament: 'OT', chapters: 36, aliases: ['num', 'nu', 'nm', 'nb'] },
  { id: 5, usfm: 'DEU', name: 'Deuteronomy', shortName: 'Deut', testament: 'OT', chapters: 34, aliases: ['deut', 'deu', 'dt'] },
  { id: 6, usfm: 'JOS', name: 'Joshua', shortName: 'Josh', testament: 'OT', chapters: 24, aliases: ['josh', 'jos', 'jsh'] },
  { id: 7, usfm: 'JDG', name: 'Judges', shortName: 'Judg', testament: 'OT', chapters: 21, aliases: ['judg', 'jdg', 'jg', 'jdgs'] },
  { id: 8, usfm: 'RUT', name: 'Ruth', shortName: 'Ruth', testament: 'OT', chapters: 4, aliases: ['ruth', 'rut', 'rth', 'ru'] },
  { id: 9, usfm: '1SA', name: '1 Samuel', shortName: '1 Sam', testament: 'OT', chapters: 31, aliases: ['1sam', '1sa', '1s', 'i samuel', 'i sam'] },
  { id: 10, usfm: '2SA', name: '2 Samuel', shortName: '2 Sam', testament: 'OT', chapters: 24, aliases: ['2sam', '2sa', '2s', 'ii samuel', 'ii sam'] },
  { id: 11, usfm: '1KI', name: '1 Kings', shortName: '1 Kgs', testament: 'OT', chapters: 22, aliases: ['1kgs', '1ki', '1k', '1 kings', '1 king'] },
  { id: 12, usfm: '2KI', name: '2 Kings', shortName: '2 Kgs', testament: 'OT', chapters: 25, aliases: ['2kgs', '2ki', '2k', '2 kings', '2 king'] },
  { id: 13, usfm: '1CH', name: '1 Chronicles', shortName: '1 Chr', testament: 'OT', chapters: 29, aliases: ['1chr', '1ch', '1chron', '1 chr'] },
  { id: 14, usfm: '2CH', name: '2 Chronicles', shortName: '2 Chr', testament: 'OT', chapters: 36, aliases: ['2chr', '2ch', '2chron', '2 chr'] },
  { id: 15, usfm: 'EZR', name: 'Ezra', shortName: 'Ezra', testament: 'OT', chapters: 10, aliases: ['ezra', 'ezr'] },
  { id: 16, usfm: 'NEH', name: 'Nehemiah', shortName: 'Neh', testament: 'OT', chapters: 13, aliases: ['neh', 'ne'] },
  { id: 17, usfm: 'EST', name: 'Esther', shortName: 'Esth', testament: 'OT', chapters: 10, aliases: ['esth', 'est', 'es'] },
  { id: 18, usfm: 'JOB', name: 'Job', shortName: 'Job', testament: 'OT', chapters: 42, aliases: ['job', 'jb'] },
  { id: 19, usfm: 'PSA', name: 'Psalms', shortName: 'Ps', testament: 'OT', chapters: 150, aliases: ['psalms', 'psalm', 'psa', 'ps', 'pss'] },
  { id: 20, usfm: 'PRO', name: 'Proverbs', shortName: 'Prov', testament: 'OT', chapters: 31, aliases: ['prov', 'pro', 'prv', 'pr'] },
  { id: 21, usfm: 'ECC', name: 'Ecclesiastes', shortName: 'Eccl', testament: 'OT', chapters: 12, aliases: ['eccl', 'ecc', 'eccles', 'ec'] },
  { id: 22, usfm: 'SNG', name: 'Song of Solomon', shortName: 'Song', testament: 'OT', chapters: 8, aliases: ['song of solomon', 'song of songs', 'song', 'sos', 'sng', 'canticles', 'cant'] },
  { id: 23, usfm: 'ISA', name: 'Isaiah', shortName: 'Isa', testament: 'OT', chapters: 66, aliases: ['isa', 'is'] },
  { id: 24, usfm: 'JER', name: 'Jeremiah', shortName: 'Jer', testament: 'OT', chapters: 52, aliases: ['jer', 'je', 'jr'] },
  { id: 25, usfm: 'LAM', name: 'Lamentations', shortName: 'Lam', testament: 'OT', chapters: 5, aliases: ['lam', 'la'] },
  { id: 26, usfm: 'EZK', name: 'Ezekiel', shortName: 'Ezek', testament: 'OT', chapters: 48, aliases: ['ezek', 'ezk', 'eze'] },
  { id: 27, usfm: 'DAN', name: 'Daniel', shortName: 'Dan', testament: 'OT', chapters: 12, aliases: ['dan', 'da', 'dn'] },
  { id: 28, usfm: 'HOS', name: 'Hosea', shortName: 'Hos', testament: 'OT', chapters: 14, aliases: ['hos', 'ho'] },
  { id: 29, usfm: 'JOL', name: 'Joel', shortName: 'Joel', testament: 'OT', chapters: 3, aliases: ['joel', 'jol', 'jl'] },
  { id: 30, usfm: 'AMO', name: 'Amos', shortName: 'Amos', testament: 'OT', chapters: 9, aliases: ['amos', 'amo', 'am'] },
  { id: 31, usfm: 'OBA', name: 'Obadiah', shortName: 'Obad', testament: 'OT', chapters: 1, aliases: ['obad', 'oba', 'ob'] },
  { id: 32, usfm: 'JON', name: 'Jonah', shortName: 'Jonah', testament: 'OT', chapters: 4, aliases: ['jonah', 'jon', 'jnh'] },
  { id: 33, usfm: 'MIC', name: 'Micah', shortName: 'Mic', testament: 'OT', chapters: 7, aliases: ['mic', 'mc'] },
  { id: 34, usfm: 'NAM', name: 'Nahum', shortName: 'Nah', testament: 'OT', chapters: 3, aliases: ['nah', 'nam', 'na'] },
  { id: 35, usfm: 'HAB', name: 'Habakkuk', shortName: 'Hab', testament: 'OT', chapters: 3, aliases: ['hab', 'hb'] },
  { id: 36, usfm: 'ZEP', name: 'Zephaniah', shortName: 'Zeph', testament: 'OT', chapters: 3, aliases: ['zeph', 'zep', 'zp'] },
  { id: 37, usfm: 'HAG', name: 'Haggai', shortName: 'Hag', testament: 'OT', chapters: 2, aliases: ['hag', 'hg'] },
  { id: 38, usfm: 'ZEC', name: 'Zechariah', shortName: 'Zech', testament: 'OT', chapters: 14, aliases: ['zech', 'zec', 'zc'] },
  { id: 39, usfm: 'MAL', name: 'Malachi', shortName: 'Mal', testament: 'OT', chapters: 4, aliases: ['mal', 'ml'] },
  { id: 40, usfm: 'MAT', name: 'Matthew', shortName: 'Matt', testament: 'NT', chapters: 28, aliases: ['matt', 'mat', 'mt'] },
  { id: 41, usfm: 'MRK', name: 'Mark', shortName: 'Mark', testament: 'NT', chapters: 16, aliases: ['mark', 'mrk', 'mk', 'mr'] },
  { id: 42, usfm: 'LUK', name: 'Luke', shortName: 'Luke', testament: 'NT', chapters: 24, aliases: ['luke', 'luk', 'lk'] },
  { id: 43, usfm: 'JHN', name: 'John', shortName: 'John', testament: 'NT', chapters: 21, aliases: ['john', 'jhn', 'jn', 'joh'] },
  { id: 44, usfm: 'ACT', name: 'Acts', shortName: 'Acts', testament: 'NT', chapters: 28, aliases: ['acts', 'act', 'ac'] },
  { id: 45, usfm: 'ROM', name: 'Romans', shortName: 'Rom', testament: 'NT', chapters: 16, aliases: ['rom', 'ro', 'rm'] },
  { id: 46, usfm: '1CO', name: '1 Corinthians', shortName: '1 Cor', testament: 'NT', chapters: 16, aliases: ['1cor', '1co', '1 corinthians', '1 cor'] },
  { id: 47, usfm: '2CO', name: '2 Corinthians', shortName: '2 Cor', testament: 'NT', chapters: 13, aliases: ['2cor', '2co', '2 corinthians', '2 cor'] },
  { id: 48, usfm: 'GAL', name: 'Galatians', shortName: 'Gal', testament: 'NT', chapters: 6, aliases: ['gal', 'ga'] },
  { id: 49, usfm: 'EPH', name: 'Ephesians', shortName: 'Eph', testament: 'NT', chapters: 6, aliases: ['eph', 'ephes'] },
  { id: 50, usfm: 'PHP', name: 'Philippians', shortName: 'Phil', testament: 'NT', chapters: 4, aliases: ['phil', 'php', 'pp'] },
  { id: 51, usfm: 'COL', name: 'Colossians', shortName: 'Col', testament: 'NT', chapters: 4, aliases: ['col', 'co'] },
  { id: 52, usfm: '1TH', name: '1 Thessalonians', shortName: '1 Thess', testament: 'NT', chapters: 5, aliases: ['1thess', '1thes', '1th', '1 thessalonians', '1 thess'] },
  { id: 53, usfm: '2TH', name: '2 Thessalonians', shortName: '2 Thess', testament: 'NT', chapters: 3, aliases: ['2thess', '2thes', '2th', '2 thessalonians', '2 thess'] },
  { id: 54, usfm: '1TI', name: '1 Timothy', shortName: '1 Tim', testament: 'NT', chapters: 6, aliases: ['1tim', '1ti', '1 timothy', '1 tim'] },
  { id: 55, usfm: '2TI', name: '2 Timothy', shortName: '2 Tim', testament: 'NT', chapters: 4, aliases: ['2tim', '2ti', '2 timothy', '2 tim'] },
  { id: 56, usfm: 'TIT', name: 'Titus', shortName: 'Titus', testament: 'NT', chapters: 3, aliases: ['titus', 'tit', 'ti'] },
  { id: 57, usfm: 'PHM', name: 'Philemon', shortName: 'Phlm', testament: 'NT', chapters: 1, aliases: ['phlm', 'phm', 'philem'] },
  { id: 58, usfm: 'HEB', name: 'Hebrews', shortName: 'Heb', testament: 'NT', chapters: 13, aliases: ['heb', 'he'] },
  { id: 59, usfm: 'JAS', name: 'James', shortName: 'Jas', testament: 'NT', chapters: 5, aliases: ['jas', 'jam', 'jm'] },
  { id: 60, usfm: '1PE', name: '1 Peter', shortName: '1 Pet', testament: 'NT', chapters: 5, aliases: ['1pet', '1pe', '1pt', '1p', '1 peter', '1 pet'] },
  { id: 61, usfm: '2PE', name: '2 Peter', shortName: '2 Pet', testament: 'NT', chapters: 3, aliases: ['2pet', '2pe', '2pt', '2p', '2 peter', '2 pet'] },
  { id: 62, usfm: '1JN', name: '1 John', shortName: '1 John', testament: 'NT', chapters: 5, aliases: ['1john', '1jn', '1jhn', '1jo', '1 john', '1 jn'] },
  { id: 63, usfm: '2JN', name: '2 John', shortName: '2 John', testament: 'NT', chapters: 1, aliases: ['2john', '2jn', '2jhn', '2jo', '2 john', '2 jn'] },
  { id: 64, usfm: '3JN', name: '3 John', shortName: '3 John', testament: 'NT', chapters: 1, aliases: ['3john', '3jn', '3jhn', '3jo', '3 john', '3 jn'] },
  { id: 65, usfm: 'JUD', name: 'Jude', shortName: 'Jude', testament: 'NT', chapters: 1, aliases: ['jude', 'jud', 'jd'] },
  { id: 66, usfm: 'REV', name: 'Revelation', shortName: 'Rev', testament: 'NT', chapters: 22, aliases: ['revelation', 'revelations', 'rev', 're', 'rv'] },
];

export const BIBLE_BOOK_BY_ID = new Map<number, BibleBookMeta>(
  BIBLE_BOOKS.map((b) => [b.id, b]),
);

export const SINGLE_CHAPTER_BOOK_IDS = new Set(
  BIBLE_BOOKS.filter((b) => b.chapters === 1).map((b) => b.id),
);
