import { describe, expect, it } from 'vitest';
import {
  buildRouteFromState,
  formatHashRoute,
  parseHashRoute,
} from '../router';
import { chooseMeasuresPerSystem } from '../vexflowRenderer';

describe('hash router', () => {
  it('parses hymnal, hymn view modes, sabbath school, and bible deep links', () => {
    expect(parseHashRoute('#/hymnal')).toEqual({ tab: 'hymnal' });
    expect(parseHashRoute('#/hymnal/100')).toEqual({
      tab: 'hymnal',
      hymnNumber: 100,
      viewMode: 'lyrics',
    });
    expect(parseHashRoute('#/hymnal/100/sheet')).toEqual({
      tab: 'hymnal',
      hymnNumber: 100,
      viewMode: 'sheet',
    });
    expect(parseHashRoute('#/hymnal/1/story')).toEqual({
      tab: 'hymnal',
      hymnNumber: 1,
      viewMode: 'story',
    });
    expect(parseHashRoute('#/sabbath-school')).toEqual({ tab: 'sabbath-school' });
    expect(parseHashRoute('#/bible/43/3/16')).toEqual({
      tab: 'bible',
      bookId: 43,
      chapter: 3,
      verse: 16,
    });
    expect(parseHashRoute('')).toBeNull();
    expect(parseHashRoute('#/unknown/path')).toBeNull();
  });

  it('round-trips routes through formatHashRoute and buildRouteFromState', () => {
    const sheetRoute = buildRouteFromState('hymnal', 12, 'sheet', { bookId: 1, chapter: 1 });
    expect(formatHashRoute(sheetRoute)).toBe('#/hymnal/12/sheet');
    expect(parseHashRoute(formatHashRoute(sheetRoute))).toEqual(sheetRoute);

    const lyricsRoute = buildRouteFromState('hymnal', 12, 'lyrics', { bookId: 1, chapter: 1 });
    expect(formatHashRoute(lyricsRoute)).toBe('#/hymnal/12');
    expect(parseHashRoute(formatHashRoute(lyricsRoute))).toEqual(lyricsRoute);

    const bibleRoute = buildRouteFromState('bible', null, 'lyrics', {
      bookId: 19,
      chapter: 23,
      verse: 1,
    });
    expect(formatHashRoute(bibleRoute)).toBe('#/bible/19/23/1');
    expect(parseHashRoute(formatHashRoute(bibleRoute))).toEqual(bibleRoute);
  });
});

describe('vexflowRenderer layout math', () => {
  it('chooses compact measure counts across mobile, tablet, and desktop widths', () => {
    expect(chooseMeasuresPerSystem(480, 'hymnal')).toBe(2);
    expect(chooseMeasuresPerSystem(760, 'hymnal')).toBe(3);
    expect(chooseMeasuresPerSystem(1040, 'hymnal')).toBe(4);

    expect(chooseMeasuresPerSystem(480, 'melody')).toBe(2);
    expect(chooseMeasuresPerSystem(680, 'melody')).toBe(3);
    expect(chooseMeasuresPerSystem(900, 'melody')).toBe(4);
  });
});
