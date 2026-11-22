import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const configDirectory = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: { root: configDirectory },

  async headers() {
    return [{
      source: '/reset-password',
      headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }],
    }];
  },
};

export default nextConfig;