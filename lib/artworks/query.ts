import { integerValue } from '../../util/integer-value';

export const ARTWORK_SORTS = ['year_asc', 'year_desc', 'price_asc', 'price_desc'] as const;
export type ArtworkSort = (typeof ARTWORK_SORTS)[number];
export const DEFAULT_SORT: ArtworkSort = 'year_desc';

export interface ArtworkFilters {
  artistId?: string;
  artworkTypeId?: string;
  materialIds: string[];
  yearStart?: string;
  yearEnd?: string;
  country?: string;
}

export interface ArtworkQuery {
  filters: ArtworkFilters;
  sort: ArtworkSort;
}

export function validateYears(start: string, end: string): string | null {
  if ((start && integerValue(start, 0) === undefined) || (end && integerValue(end, 0) === undefined)) {
    return 'Enter nonnegative whole-number years.';
  }
  if (start && end && Number(start) > Number(end)) {
    return 'Start year must not exceed end year.';
  }
  return null;
}

export function parseArtworkQuery(params: URLSearchParams): ArtworkQuery {
  const filters: ArtworkFilters = { materialIds: [] };
  for (const key of ['artistId', 'artworkTypeId'] as const) {
    const value = integerValue(params.get(key), 1);
    if (value) filters[key] = value;
  }
  filters.materialIds = [...new Set((params.get('materialIds') ?? '').split(',')
    .map((value) => integerValue(value.trim(), 1))
    .filter((value): value is string => value !== undefined))].sort((a, b) => Number(a) - Number(b));
  const start = integerValue(params.get('yearStart'), 0);
  const end = integerValue(params.get('yearEnd'), 0);
  if (!validateYears(start ?? '', end ?? '')) {
    if (start !== undefined) filters.yearStart = start;
    if (end !== undefined) filters.yearEnd = end;
  }
  const country = params.get('country')?.trim();
  if (country) filters.country = country;
  const sort = ARTWORK_SORTS.find((value) => value === params.get('sort')) ?? DEFAULT_SORT;
  return { filters, sort };
}

export function serializeArtworkQuery(query: ArtworkQuery): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of ['artistId', 'artworkTypeId', 'yearStart', 'yearEnd', 'country'] as const) {
    const value = query.filters[key];
    if (value) params.set(key, value);
  }
  if (query.filters.materialIds.length) params.set('materialIds', query.filters.materialIds.join(','));
  if (query.sort !== DEFAULT_SORT) params.set('sort', query.sort);
  return params;
}

export function hasActiveFilters(filters: ArtworkFilters): boolean {
  return Object.entries(filters).some(([key, value]) => key === 'materialIds' ? value.length > 0 : Boolean(value));
}

export function writeArtworkQuery(query: ArtworkQuery, mode: 'push' | 'replace') {
  const url = new URL(window.location.href);
  for (const key of ['artistId', 'artworkTypeId', 'materialIds', 'yearStart', 'yearEnd', 'country', 'sort', 'page', 'limit']) {
    url.searchParams.delete(key);
  }
  serializeArtworkQuery(query).forEach((value, key) => url.searchParams.set(key, value));
  const path = `${url.pathname}${url.search}${url.hash}`;
  if (path === `${location.pathname}${location.search}${location.hash}`) return;
  if (mode === 'push') window.history.pushState(null, '', path);
  else window.history.replaceState(null, '', path);
}
