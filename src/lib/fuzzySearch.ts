import type { HymnalEntry } from '../data/hymnalTypes';

export type HymnalFilterMode = 'all' | 'hymns' | 'readings' | 'favorites';

export function extractJumpNumber(query: string): number | null {
  const cleaned = query.trim().replace(/^#/, '');
  if (!/^\d{1,3}$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return n >= 1 && n <= 920 ? n : null;
}

function fuzzySubsequenceScore(query: string, target: string): number {
  if (!query || !target) return 0;
  let qi = 0;
  let consecutive = 0;
  let bestRun = 0;
  for (let ti = 0; ti < target.length && qi < query.length; ti++) {
    if (target[ti] === query[qi]) {
      qi += 1;
      consecutive += 1;
      if (consecutive > bestRun) bestRun = consecutive;
    } else {
      consecutive = 0;
    }
  }
  if (qi < query.length) return 0;
  return 10 + bestRun * 2;
}

export function filterAndSearchHymnal(
  entries: HymnalEntry[],
  query: string,
  filterMode: HymnalFilterMode,
  favorites: number[],
): HymnalEntry[] {
  const favSet = new Set(favorites);

  const byMode = entries.filter((entry) => {
    if (filterMode === 'hymns') return entry.kind === 'hymn';
    if (filterMode === 'readings') return entry.kind === 'reading';
    if (filterMode === 'favorites') return favSet.has(entry.number);
    return true;
  });

  const qRaw = query.trim();
  if (!qRaw) return byMode;

  const q = qRaw.toLowerCase().replace(/^#/, '');
  const numericQuery = /^\d{1,3}$/.test(q) ? q : null;

  const scored: Array<{ entry: HymnalEntry; score: number }> = [];

  for (const entry of byMode) {
    let score = 0;
    const numStr = String(entry.number);
    const titleL = entry.title.toLowerCase();
    const firstL = entry.firstLine.toLowerCase();
    const catL = entry.category.toLowerCase();

    if (numericQuery) {
      if (numStr === numericQuery) score += 1000;
      else if (numStr.startsWith(numericQuery)) score += 500;
      else if (numStr.includes(numericQuery)) score += 200;
    }

    if (titleL === q) score += 400;
    else if (titleL.startsWith(q)) score += 240;
    else if (titleL.includes(q)) score += 150;

    if (firstL.startsWith(q)) score += 200;
    else if (firstL.includes(q)) score += 130;

    if (entry.kind === 'hymn') {
      const tuneL = entry.tuneName.toLowerCase();
      const authorL = entry.author.toLowerCase();
      if (tuneL === q) score += 260;
      else if (tuneL.includes(q)) score += 140;

      if (authorL.includes(q)) score += 135;
      if (catL.includes(q)) score += 60;

      if (score === 0) {
        const bodyText = entry.verses.map((v) => v.lines.join(' ')).join(' ').toLowerCase();
        if (bodyText.includes(q)) score += 55;
      }
    } else {
      const refL = (entry.scriptureRef || '').toLowerCase();
      if (refL.includes(q)) score += 140;
      if (catL.includes(q)) score += 70;
      if (score === 0) {
        const bodyText = entry.parts.map((p) => p.lines.join(' ')).join(' ').toLowerCase();
        if (bodyText.includes(q)) score += 55;
      }
    }

    // Fuzzy subsequence fallback on title + firstLine + tune/author
    if (score === 0 && q.length >= 3) {
      const target =
        entry.kind === 'hymn'
          ? `${titleL} ${firstL} ${entry.tuneName.toLowerCase()} ${entry.author.toLowerCase()}`
          : `${titleL} ${firstL} ${(entry.scriptureRef || '').toLowerCase()}`;
      score = fuzzySubsequenceScore(q, target);
    }

    if (score > 0) {
      scored.push({ entry, score });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.entry.number - b.entry.number;
  });

  return scored.map((s) => s.entry);
}
