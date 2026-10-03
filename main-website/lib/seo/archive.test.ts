import { describe, expect, it } from 'vitest';

import {
  MAX_PAGE,
  archiveDecision,
  isFiltered,
  paginationNeighbours,
  parsePageParam,
  type ArchiveFilters,
} from '@/lib/seo/archive';

const NO_FILTERS: ArchiveFilters = { q: '', tag: '', sort: 'latest' };

const decide = (
  raw: string | string[] | undefined,
  totalPages: number | null,
  filters: ArchiveFilters = NO_FILTERS,
  basePath = '/blog',
) => archiveDecision({ basePath, page: parsePageParam(raw), filters, totalPages });

describe('parsePageParam', () => {
  it('treats a missing parameter as page 1, non-explicitly', () => {
    expect(parsePageParam(undefined)).toEqual({ ok: true, page: 1, explicit: false });
    expect(parsePageParam('')).toEqual({ ok: true, page: 1, explicit: false });
  });

  it('accepts canonical positive integers', () => {
    expect(parsePageParam('1')).toEqual({ ok: true, page: 1, explicit: true });
    expect(parsePageParam('42')).toEqual({ ok: true, page: 42, explicit: true });
  });

  it.each([
    ['0', 'zero'],
    ['-1', 'negative'],
    ['1.5', 'fractional'],
    ['01', 'leading zero — a second URL for page 1'],
    [' 2', 'whitespace'],
    ['abc', 'non-numeric'],
    ['2e3', 'exponent notation'],
    ['999999999999999999999', 'beyond a safe integer'],
    [String(MAX_PAGE + 1), 'beyond the page ceiling'],
  ])('rejects %s (%s)', (raw) => {
    expect(parsePageParam(raw)).toEqual({ ok: false, reason: 'malformed' });
  });

  it('rejects a repeated parameter', () => {
    expect(parsePageParam(['1', '2'])).toEqual({ ok: false, reason: 'malformed' });
  });
});

describe('isFiltered', () => {
  it('is false only for the clean archive', () => {
    expect(isFiltered(NO_FILTERS)).toBe(false);
    expect(isFiltered({ ...NO_FILTERS, q: 'python' })).toBe(true);
    expect(isFiltered({ ...NO_FILTERS, tag: 'aws' })).toBe(true);
    expect(isFiltered({ ...NO_FILTERS, sort: 'popular' })).toBe(true);
  });
});

describe('invalid pagination never produces an empty 200', () => {
  it('404s a page beyond the last real one', () => {
    expect(decide('999999', 8).status).toBe(404);
    expect(decide('9', 8).status).toBe(404);
  });

  it('404s malformed page values instead of silently serving page 1', () => {
    for (const raw of ['0', '-1', 'abc', '1.5', '01']) {
      expect(decide(raw, 8).status).toBe(404);
    }
  });

  it('404s any page beyond 1 on an empty archive', () => {
    expect(decide('2', 1).status).toBe(404);
    expect(decide(undefined, 1).status).toBe(200);
  });

  it('serves every valid page', () => {
    for (let p = 1; p <= 8; p++) {
      const d = decide(String(p), 8);
      expect(d.status).toBe(200);
      expect(d.page).toBe(p);
    }
  });

  it('never marks a 404 as indexable', () => {
    const d = decide('999999', 8);
    expect(d.index).toBe(false);
    expect(d.canonical).toBeNull();
  });

  it('does not 404 the archive during a backend outage', () => {
    // totalPages null = the read failed. Page 1 still renders (with its error
    // state); deeper pages cannot be verified, so they 404.
    expect(decide(undefined, null).status).toBe(200);
    expect(decide('1', null).status).toBe(200);
    expect(decide('2', null).status).toBe(404);
  });

  it('applies the same rules to a category archive', () => {
    const base = '/blog/category/python';
    expect(decide('999999', 3, NO_FILTERS, base).status).toBe(404);
    expect(decide('2', 3, NO_FILTERS, base).canonical).toBe('/blog/category/python?page=2');
  });
});

describe('canonicals on the clean archive', () => {
  it('page 1 canonicalises to the bare archive — never ?page=1', () => {
    expect(decide(undefined, 8).canonical).toBe('/blog');
    expect(decide('1', 8).canonical).toBe('/blog');
  });

  it('page N>1 self-canonicalises', () => {
    expect(decide('2', 8).canonical).toBe('/blog?page=2');
    expect(decide('8', 8).canonical).toBe('/blog?page=8');
  });

  it('is indexable and followable', () => {
    const d = decide('2', 8);
    expect(d.index).toBe(true);
    expect(d.follow).toBe(true);
  });
});

describe('search / filter / sort URLs are never indexable', () => {
  const cases: [string, ArchiveFilters][] = [
    ['?q=', { ...NO_FILTERS, q: 'python' }],
    ['?tag=', { ...NO_FILTERS, tag: 'aws' }],
    ['?sort=popular', { ...NO_FILTERS, sort: 'popular' }],
    ['?q= + ?sort=', { q: 'python', tag: '', sort: 'popular' }],
    ['all three', { q: 'python', tag: 'aws', sort: 'popular' }],
  ];

  it.each(cases)('%s → noindex, follow', (_label, filters) => {
    const d = decide(undefined, 8, filters);
    expect(d.status).toBe(200);
    expect(d.index).toBe(false);
    // follow is kept: the post links on a search result page are real links.
    expect(d.follow).toBe(true);
  });

  it.each(cases)('%s → no canonical at all', (_label, filters) => {
    // Deliberately null rather than "/blog": combining noindex with a
    // canonical pointing elsewhere risks the directive being attributed to
    // the canonical target.
    expect(decide(undefined, 8, filters).canonical).toBeNull();
  });

  it('stays noindex on deeper pages of a filtered view', () => {
    const d = decide('3', 8, { ...NO_FILTERS, q: 'python' });
    expect(d.status).toBe(200);
    expect(d.index).toBe(false);
  });

  it('still 404s an out-of-range page of a filtered view', () => {
    expect(decide('99', 3, { ...NO_FILTERS, q: 'python' }).status).toBe(404);
  });
});

describe('paginationNeighbours', () => {
  it('links the clean sequence', () => {
    expect(paginationNeighbours('/blog', 1, 5, false)).toEqual({ prev: undefined, next: '/blog?page=2' });
    expect(paginationNeighbours('/blog', 3, 5, false)).toEqual({ prev: '/blog?page=2', next: '/blog?page=4' });
    expect(paginationNeighbours('/blog', 5, 5, false)).toEqual({ prev: '/blog?page=4', next: undefined });
  });

  it('points page 2 back at the bare archive, not ?page=1', () => {
    expect(paginationNeighbours('/blog', 2, 5, false).prev).toBe('/blog');
  });

  it('emits nothing for a filtered view', () => {
    expect(paginationNeighbours('/blog', 2, 5, true)).toEqual({});
  });
});
