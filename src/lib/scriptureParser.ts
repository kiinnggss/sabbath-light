import { BIBLE_BOOKS, SINGLE_CHAPTER_BOOK_IDS, type BibleBookMeta } from '../data/bibleBooks';

export interface ParsedPassage {
  label: string;
  bookId: number;
  bookName: string;
  chapter: number;
  startVerse?: number;
  endVerse?: number;
}

const ALIAS_ENTRIES: Array<[string, BibleBookMeta]> = [];
for (const book of BIBLE_BOOKS) {
  ALIAS_ENTRIES.push([book.name.toLowerCase(), book]);
  ALIAS_ENTRIES.push([book.shortName.toLowerCase(), book]);
  for (const alias of book.aliases) {
    ALIAS_ENTRIES.push([alias.toLowerCase(), book]);
  }
}
// Longest match first so "1 john" matches before "john" and "song of solomon" before "song"
ALIAS_ENTRIES.sort((a, b) => b[0].length - a[0].length);

function matchBookPrefix(raw: string): { book: BibleBookMeta; rest: string } | null {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  for (const [alias, book] of ALIAS_ENTRIES) {
    if (!lower.startsWith(alias)) continue;
    const afterChar = trimmed.slice(alias.length, alias.length + 1);
    if (afterChar && !/[\s.\d:]/.test(afterChar)) continue;
    const rest = trimmed.slice(alias.length).replace(/^[.\s]+/, '');
    return { book, rest };
  }
  return null;
}

function clampChapter(book: BibleBookMeta, ch: number): number {
  if (!Number.isFinite(ch) || ch < 1) return 1;
  if (ch > book.chapters) return book.chapters;
  return ch;
}

function parseVerseSegments(
  book: BibleBookMeta,
  chapter: number,
  versesPart: string,
): ParsedPassage[] {
  const passages: ParsedPassage[] = [];
  const segs = versesPart
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const seg of segs) {
    const rangeMatch = seg.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!rangeMatch) continue;
    const startVerse = Number(rangeMatch[1]);
    const endVerse = rangeMatch[2] ? Number(rangeMatch[2]) : startVerse;
    const rangeLabel =
      endVerse > startVerse ? `${startVerse}-${endVerse}` : `${startVerse}`;
    passages.push({
      label: `${book.shortName} ${chapter}:${rangeLabel}`,
      bookId: book.id,
      bookName: book.name,
      chapter,
      startVerse,
      endVerse: Math.max(startVerse, endVerse),
    });
  }
  return passages;
}

/**
 * Parses human scripture references such as:
 * - "John 3:16"
 * - "1 John 4:1, NKJV"
 * - "Dan. 10:7-19; Deut. 13:1-5; Isa. 8:20; Jer. 28:9, 15-17"
 * - "Psalm 34"
 * - "Jude 24-25"
 */
export function parseScriptureReference(input: string): ParsedPassage[] {
  if (!input) return [];

  // Strip translation tags and extra parentheses
  const cleaned = input
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(?:NKJV|KJV|NIV|ESV|NLT|WEB|BSB|NASB|RSV|NEB|ASV|NRSV)\b/gi, '')
    .replace(/–|—/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  const clauses = cleaned
    .split(';')
    .map((c) => c.trim().replace(/^[,.\s]+|[,.\s]+$/g, ''))
    .filter(Boolean);

  const results: ParsedPassage[] = [];
  let lastBook: BibleBookMeta | null = null;
  let lastChapter = 1;

  for (const clause of clauses) {
    const bookMatch = matchBookPrefix(clause);
    if (bookMatch) {
      const { book, rest } = bookMatch;
      lastBook = book;

      if (!rest) {
        lastChapter = 1;
        results.push({
          label: `${book.shortName} 1`,
          bookId: book.id,
          bookName: book.name,
          chapter: 1,
        });
        continue;
      }

      // Check for "chapter:verses" e.g. "28:9, 15-17" or "3:16-18"
      const colonIdx = rest.indexOf(':');
      if (colonIdx !== -1) {
        const chNum = clampChapter(book, Number(rest.slice(0, colonIdx).trim()));
        lastChapter = chNum;
        const versesPart = rest.slice(colonIdx + 1).trim();
        const parsed = parseVerseSegments(book, chNum, versesPart);
        if (parsed.length > 0) {
          results.push(...parsed);
        } else {
          results.push({
            label: `${book.shortName} ${chNum}`,
            bookId: book.id,
            bookName: book.name,
            chapter: chNum,
          });
        }
        continue;
      }

      // Single-chapter books like "Jude 24-25" or "Jude 24"
      if (SINGLE_CHAPTER_BOOK_IDS.has(book.id)) {
        lastChapter = 1;
        const parsed = parseVerseSegments(book, 1, rest);
        if (parsed.length > 0) {
          results.push(...parsed);
          continue;
        }
      }

      // Otherwise treat as chapter or chapter range e.g. "Psalm 34" or "Revelation 21 and 22"
      const chRange = rest.match(/^(\d+)(?:\s*(?:-|and)\s*(\d+))?/i);
      if (chRange) {
        const ch1 = clampChapter(book, Number(chRange[1]));
        lastChapter = ch1;
        results.push({
          label: `${book.shortName} ${ch1}`,
          bookId: book.id,
          bookName: book.name,
          chapter: ch1,
        });
        if (chRange[2]) {
          const ch2 = clampChapter(book, Number(chRange[2]));
          if (ch2 !== ch1) {
            lastChapter = ch2;
            results.push({
              label: `${book.shortName} ${ch2}`,
              bookId: book.id,
              bookName: book.name,
              chapter: ch2,
            });
          }
        }
      }
      continue;
    }

    // Continuation clause without book name, e.g. "; 15:1-4" or ", 15-17"
    if (lastBook) {
      const colonIdx = clause.indexOf(':');
      if (colonIdx !== -1) {
        const chNum = clampChapter(lastBook, Number(clause.slice(0, colonIdx).trim()));
        lastChapter = chNum;
        results.push(...parseVerseSegments(lastBook, chNum, clause.slice(colonIdx + 1).trim()));
      } else {
        const parsed = parseVerseSegments(lastBook, lastChapter, clause);
        if (parsed.length > 0) {
          results.push(...parsed);
        }
      }
    }
  }

  return results;
}

/**
 * Fallback parser for Adventech's compact `verse` attribute (e.g. "Dan107-Dan1019,Isa820,1John41").
 */
export function parseAdventechVerseAttr(attr: string, fallbackText?: string): ParsedPassage[] {
  if (fallbackText) {
    const human = parseScriptureReference(fallbackText);
    if (human.length > 0) return human;
  }
  if (!attr) return [];

  const tokens = attr.split(',').map((t) => t.trim()).filter(Boolean);
  const out: ParsedPassage[] = [];

  for (const tok of tokens) {
    const startTok = tok.split('-')[0].trim();
    const m = startTok.match(/^([1-3]?[A-Za-z]+)(\d+)$/);
    if (!m) continue;
    const [, bookCode, digits] = m;
    const bookMatch = matchBookPrefix(bookCode);
    if (!bookMatch) continue;
    const book = bookMatch.book;

    let chapter = 1;
    let verse: number | undefined;
    if (SINGLE_CHAPTER_BOOK_IDS.has(book.id)) {
      verse = Number(digits);
    } else if (digits.length <= 2) {
      chapter = clampChapter(book, Number(digits));
    } else {
      // Split digits into chapter + verse where chapter <= book.chapters
      for (let split = Math.min(3, digits.length - 1); split >= 1; split--) {
        const c = Number(digits.slice(0, split));
        const v = Number(digits.slice(split));
        if (c >= 1 && c <= book.chapters && v >= 1) {
          chapter = c;
          verse = v;
          break;
        }
      }
    }

    out.push({
      label: verse ? `${book.shortName} ${chapter}:${verse}` : `${book.shortName} ${chapter}`,
      bookId: book.id,
      bookName: book.name,
      chapter,
      startVerse: verse,
      endVerse: verse,
    });
  }
  return out;
}
