import { describe, expect, it } from 'vitest';
import { parseArtworkQuery, serializeArtworkQuery, validateYears } from './query';

describe('artwork query', () => {
  it('round-trips filters, including year zero and comma-separated materials', () => {
    const params = new URLSearchParams('artistId=10&artworkTypeId=1&materialIds=2,3&yearStart=0&yearEnd=1950&country=France&sort=price_asc');
    const query = parseArtworkQuery(params);
    expect(query.filters).toEqual({ artistId: '10', artworkTypeId: '1', materialIds: ['2', '3'], yearStart: '0', yearEnd: '1950', country: 'France' });
    expect(parseArtworkQuery(serializeArtworkQuery(query))).toEqual(query);
  });

  it('discards invalid URL values and deduplicates materials', () => {
    const query = parseArtworkQuery(new URLSearchParams('artistId=-1&artworkTypeId=no&materialIds=1,1,-2,x,3.5&yearStart=2000&yearEnd=1900&sort=unsupported'));
    expect(query.sort).toBe('year_desc');
    expect(query.filters).toEqual({ materialIds: ['1'] });
  });

  it.each([['-1', ''], ['1.5', ''], ['abc', ''], ['2001', '2000']])('rejects invalid years %s to %s', (start, end) => {
    expect(validateYears(start, end)).not.toBeNull();
  });

  it.each([['0', '0'], ['', '1900'], ['1900', ''], ['1900', '1900']])('accepts years %s to %s', (start, end) => {
    expect(validateYears(start, end)).toBeNull();
  });
});
