import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin Turbopack's root to this project. A stray package-lock.json in the
  // home folder otherwise makes it infer /Users/allen as the workspace root,
  // which breaks next/font ("Can't resolve '@vercel/turbopack-next/...'").
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
  // allenvarghese.com lands on /projects. The 3D journey is still one link
  // away: /?intro=1 (the whole journey), /?world=1 or /?room=... (deep links)
  // skip the redirect. Temporary (307), so browsers never cache it.
  async redirects() {
    return [
      {
        source: '/',
        missing: [
          { type: 'query', key: 'intro' },
          { type: 'query', key: 'world' },
          { type: 'query', key: 'room' },
        ],
        destination: '/projects',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
