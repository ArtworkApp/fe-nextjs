import { describe, expect, it } from 'vitest';
import nextConfig from './next.config';

describe('reset password security headers', () => {
  it('sets no-referrer for the reset page', async () => {
    const rules = await nextConfig.headers?.();
    expect(rules).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: '/reset-password', headers: expect.arrayContaining([{ key: 'Referrer-Policy', value: 'no-referrer' }]) }),
    ]));
  });
});

describe('Turbopack configuration', () => {
  it('uses the frontend directory as the project root', () => {
    expect(nextConfig.turbopack?.root).toBe(process.cwd());
  });
});
