#!/usr/bin/env node
/**
 * Builds public/data/hymnal.json containing the unified 1985 Seventh-day Adventist Hymnal (#1-#920).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURATED_HYMNS } from './curated-hymn-enrichment.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.resolve(__dirname, '../public/data/hymnal.json');

const HEADERS = {
  'User-Agent': 'SabbathLightPWA-DataBuilder/1.0',
  Accept: 'application/json',
};

async function fetchJson(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#8211;|&ndash;|–/g, '-')
    .replace(/&#8212;|&mdash;|—/g, ', ')
    .replace(/&#8216;|&#8217;|&rsquo;|&lsquo;/g, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

function htmlToParagraphs(html) {
  if (!html) return '';
  let cleaned = html
    .replace(/<(script|style|iframe|figure|audio|video)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '');
  cleaned = decodeHtmlEntities(cleaned)
    .replace(/\s*\n\s*/g, '\n')
    .trim();
  return cleaned;
}

function cleanPlainText(str) {
  if (!str) return '';
  return str
    .replace(/—/g, ', ')
    .replace(/–/g, '-')
    .replace(/`/g, "'")
    .replace(/\b([A-Za-z]+)'(S|T|Re|Ve|Ll|D|M)\b/g, (_, word, suf) => `${word}'${suf.toLowerCase()}`)
    .replace(/\s+/g, ' ')
    .trim();
}

const CATEGORY_DEFAULTS = {
  Worship: { meter: 'C.M.', defaultBpm: 98, tuneName: 'Traditional SDAH Setting' },
  Trinity: { meter: 'L.M.', defaultBpm: 94, tuneName: 'Traditional SDAH Setting' },
  'God the Father': { meter: 'C.M.', defaultBpm: 96, tuneName: 'Traditional SDAH Setting' },
  'Jesus Christ': { meter: '8.7.8.7', defaultBpm: 96, tuneName: 'Traditional SDAH Setting' },
  'Holy Spirit': { meter: 'S.M.', defaultBpm: 92, tuneName: 'Traditional SDAH Setting' },
  'Holy Scripture': { meter: 'C.M.', defaultBpm: 96, tuneName: 'Traditional SDAH Setting' },
  Gospel: { meter: '8.7.8.7', defaultBpm: 98, tuneName: 'Traditional SDAH Setting' },
  'Christian Church': { meter: '7.6.7.6.D', defaultBpm: 98, tuneName: 'Traditional SDAH Setting' },
  Doctrines: { meter: 'L.M.', defaultBpm: 96, tuneName: 'Traditional SDAH Setting' },
  'Early Advent': { meter: 'C.M.', defaultBpm: 100, tuneName: 'Early Advent Melody' },
  'Christian Life': { meter: '8.7.8.7', defaultBpm: 96, tuneName: 'Traditional SDAH Setting' },
  'Christian Home': { meter: 'C.M.', defaultBpm: 92, tuneName: 'Traditional SDAH Setting' },
  'Sentences and Responses': { meter: 'L.M.', defaultBpm: 88, tuneName: 'Sanctuary Response' },
};

async function fetchSdaHymnalsEnrichment() {
  const authorByHymn = new Map();
  const storyByHymn = new Map();
  const authorBioByName = new Map();

  try {
    console.log('Fetching sdahymnals.com categories, stories, and author bios...');
    const cats = [];
    for (let page = 1; page <= 4; page++) {
      try {
        const batch = await fetchJson(
          `https://sdahymnals.com/Hymnal/wp-json/wp/v2/categories?per_page=100&page=${page}&_fields=id,name,slug,parent,count`,
          12000,
        );
        if (!Array.isArray(batch) || batch.length === 0) break;
        cats.push(...batch);
        if (batch.length < 100) break;
      } catch {
        break;
      }
    }

    const authorCatIdToName = new Map();
    for (const c of cats) {
      if (c.parent === 160 && c.name) {
        authorCatIdToName.set(c.id, decodeHtmlEntities(c.name));
      }
    }
    console.log(`  Found ${authorCatIdToName.size} author categories on sdahymnals.com`);

    try {
      const stories = await fetchJson(
        'https://sdahymnals.com/Hymnal/wp-json/wp/v2/posts?categories=1464&per_page=50&_fields=id,title,content',
        12000,
      );
      for (const s of stories) {
        const title = decodeHtmlEntities(s.title?.rendered || '');
        const text = htmlToParagraphs(s.content?.rendered || '');
        const numMatch = title.match(/^(\d{1,3})\b/);
        if (numMatch && text.length > 80) {
          storyByHymn.set(Number(numMatch[1]), text);
        } else if (title.toLowerCase().includes('praise to the lord') && text.length > 80) {
          storyByHymn.set(1, text);
        } else if (title.toLowerCase().includes('all creatures') && text.length > 80) {
          storyByHymn.set(2, text);
        } else if (title.toLowerCase().includes('god himself is with us') && text.length > 80) {
          storyByHymn.set(3, text);
        } else if (title.toLowerCase().includes('blessed assurance') && text.length > 80) {
          storyByHymn.set(462, text);
        }
      }
    } catch (e) {
      console.warn('  Skipping sdahymnals stories fetch:', e.message);
    }

    try {
      const bioPosts = await fetchJson(
        'https://sdahymnals.com/Hymnal/wp-json/wp/v2/posts?categories=160&per_page=50&_fields=id,title,content',
        12000,
      );
      for (const b of bioPosts) {
        const title = decodeHtmlEntities(b.title?.rendered || '');
        if (/^\d{1,3}\b/.test(title)) continue;
        const text = htmlToParagraphs(b.content?.rendered || '');
        if (title && text.length > 80) {
          const trimmed = text.length > 560 ? `${text.slice(0, 540).replace(/\s+\S*$/, '')}.` : text;
          authorBioByName.set(title.toLowerCase(), trimmed);
        }
      }
    } catch (e) {
      console.warn('  Skipping sdahymnals author bios fetch:', e.message);
    }

    for (let page = 1; page <= 8; page++) {
      try {
        const posts = await fetchJson(
          `https://sdahymnals.com/Hymnal/wp-json/wp/v2/posts?per_page=100&page=${page}&_fields=title,categories`,
          12000,
        );
        if (!Array.isArray(posts) || posts.length === 0) break;
        for (const p of posts) {
          const title = decodeHtmlEntities(p.title?.rendered || '');
          const m = title.match(/^0*(\d{1,3})\s*[-]/);
          if (!m) continue;
          const num = Number(m[1]);
          if (num < 1 || num > 695) continue;
          const matchedAuthor = (p.categories || [])
            .map((id) => authorCatIdToName.get(id))
            .find(Boolean);
          if (matchedAuthor && !authorByHymn.has(num)) {
            authorByHymn.set(num, matchedAuthor);
          }
        }
        if (posts.length < 100) break;
      } catch {
        break;
      }
    }
    console.log(
      `  Mapped ${authorByHymn.size} hymn authors, ${storyByHymn.size} stories, ${authorBioByName.size} bios from sdahymnals.com`,
    );
  } catch (err) {
    console.warn('Warning: sdahymnals.com enrichment partially skipped:', err.message);
  }

  return { authorByHymn, storyByHymn, authorBioByName };
}

async function main() {
  console.log('1. Fetching base 1-920 dataset from Simplypheyie96/sdah-hymnal...');
  const baseData = await fetchJson(
    'https://raw.githubusercontent.com/Simplypheyie96/sdah-hymnal/main/public/data/en.json',
    30000,
  );
  if (!baseData?.hymns || baseData.hymns.length !== 920) {
    throw new Error(`Expected 920 entries from base dataset, got ${baseData?.hymns?.length}`);
  }

  console.log('2. Fetching GospelSounders SDAH author/key overlay...');
  const gsByNum = new Map();
  try {
    const gsData = await fetchJson(
      'https://raw.githubusercontent.com/GospelSounders/hymnals-data/master/SDAH/index.json',
      20000,
    );
    const songs = gsData?.songs || {};
    for (const val of Object.values(songs)) {
      if (val && typeof val.id === 'number' && val.id >= 1 && val.id <= 695) {
        gsByNum.set(val.id, {
          author: cleanPlainText(val.author || ''),
          key: cleanPlainText(val.key || ''),
        });
      }
    }
    console.log(`  Loaded ${gsByNum.size} entries from GospelSounders overlay`);
  } catch (err) {
    console.warn('  GospelSounders overlay skipped:', err.message);
  }

  console.log('3. Fetching sdahymnals.com enrichment...');
  const sdaEnrich = await fetchSdaHymnalsEnrichment();

  console.log('4. Merging unified #1-#920 entries...');
  const unified = baseData.hymns
    .slice()
    .sort((a, b) => a.number - b.number)
    .map((entry) => {
      const number = Number(entry.number);
      const isHymn = number <= 695;
      const title = cleanPlainText(decodeHtmlEntities(entry.title || `Selection ${number}`));
      const rawVerses = Array.isArray(entry.verses) ? entry.verses : [];
      const firstLine = cleanPlainText(rawVerses[0]?.lines?.[0] || title);
      const category = cleanPlainText(entry.category || (isHymn ? 'Worship' : 'Scripture Readings'));

      if (isHymn) {
        const curated = CURATED_HYMNS[number] || {};
        const gs = gsByNum.get(number) || {};
        const sdaAuthor = sdaEnrich.authorByHymn.get(number) || '';
        const baseAuthor = cleanPlainText(entry.author || '');

        const author =
          curated.author ||
          baseAuthor ||
          gs.author ||
          sdaAuthor ||
          'Seventh-day Adventist Hymnal (1985)';

        const catDefaults = CATEGORY_DEFAULTS[category] || CATEGORY_DEFAULTS.Worship;
        const keyVal = curated.key || (gs.key ? `${gs.key} Major` : undefined);
        const tuneName = curated.tuneName || catDefaults.tuneName;
        const meter = curated.meter || catDefaults.meter;
        const defaultBpm = curated.defaultBpm || catDefaults.defaultBpm;

        const externalBio = sdaEnrich.authorBioByName.get(author.toLowerCase());
        const authorBio = curated.authorBio || externalBio || undefined;
        const story = curated.story || sdaEnrich.storyByHymn.get(number) || undefined;

        let verseCounter = 0;
        const verses = rawVerses.map((v) => {
          const isRefrain = Boolean(v.isRefrain);
          if (!isRefrain) verseCounter += 1;
          return {
            label: isRefrain ? 'Refrain' : `Verse ${verseCounter}`,
            isRefrain,
            lines: (v.lines || []).map((line) => cleanPlainText(decodeHtmlEntities(line))),
          };
        });

        return {
          number,
          kind: 'hymn',
          title,
          firstLine,
          section: 'Hymns',
          category,
          author,
          authorDates: curated.authorDates || undefined,
          authorBio: authorBio ? cleanPlainText(authorBio) : undefined,
          tuneName,
          composer: curated.composer || undefined,
          key: keyVal,
          meter,
          defaultBpm,
          story: story ? cleanPlainText(story) : undefined,
          verses,
        };
      }

      const scriptureRef = cleanPlainText(
        decodeHtmlEntities(entry.author || (/^[1-3]?\s*[A-Za-z]+\s+\d+/.test(title) ? title : '')),
      );
      const isResponsive = rawVerses.length >= 2 && category === 'Scripture Songs & Readings';

      const parts = rawVerses.map((v, idx) => ({
        speaker: isResponsive ? (idx % 2 === 0 ? 'leader' : 'congregation') : 'unison',
        lines: (v.lines || []).map((line) => cleanPlainText(decodeHtmlEntities(line))),
      }));

      return {
        number,
        kind: 'reading',
        title,
        firstLine,
        section: 'Worship Aids',
        category,
        scriptureRef: scriptureRef || undefined,
        readingStyle: isResponsive ? 'responsive' : 'unison',
        parts,
      };
    });

  if (unified.length !== 920) {
    throw new Error(`Validation failed: expected 920 entries, got ${unified.length}`);
  }
  for (let i = 0; i < 920; i++) {
    const expectedNum = i + 1;
    const item = unified[i];
    if (item.number !== expectedNum) {
      throw new Error(`Gap or order mismatch at index ${i}: expected #${expectedNum}, got #${item.number}`);
    }
    if (!item.title) {
      throw new Error(`Missing title on #${item.number}`);
    }
    if (item.kind === 'hymn' && (!item.verses || item.verses.length === 0)) {
      throw new Error(`Missing verses on hymn #${item.number}`);
    }
    if (item.kind === 'reading' && (!item.parts || item.parts.length === 0)) {
      throw new Error(`Missing parts on reading #${item.number}`);
    }
  }

  const hymnsCount = unified.filter((x) => x.kind === 'hymn').length;
  const readingsCount = unified.filter((x) => x.kind === 'reading').length;
  const withStory = unified.filter((x) => x.kind === 'hymn' && x.story).length;
  const withBio = unified.filter((x) => x.kind === 'hymn' && x.authorBio).length;
  const withNamedAuthor = unified.filter(
    (x) => x.kind === 'hymn' && x.author !== 'Seventh-day Adventist Hymnal (1985)',
  ).length;

  const payload = {
    version: 1,
    edition: 'Seventh-day Adventist Hymnal (1985)',
    generatedAt: new Date().toISOString(),
    counts: {
      total: unified.length,
      hymns: hymnsCount,
      readings: readingsCount,
    },
    entries: unified,
  };

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(payload), 'utf8');
  const stats = await fs.stat(OUT_FILE);

  console.log('\nBuild complete!');
  console.log(`  Output: ${OUT_FILE} (${(stats.size / 1024).toFixed(1)} KB)`);
  console.log(`  Entries: ${unified.length} (${hymnsCount} hymns, ${readingsCount} worship aids)`);
  console.log(`  Named authors: ${withNamedAuthor}, Stories: ${withStory}, Author bios: ${withBio}`);
}

main().catch((err) => {
  console.error('Failed to build hymnal data:', err);
  process.exit(1);
});
