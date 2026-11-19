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
};

export default nextConfig;
