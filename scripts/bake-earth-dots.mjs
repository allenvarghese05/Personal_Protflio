// Bakes the dotted Earth for the Meet Me globe: samples an even-ish lat/lng
// grid, keeps the points that fall on land, and writes them as Int16 pairs
// (lat × 100, lng × 100) to public/meet/earth-dots.bin — a few dozen KB,
// shipped with the site so nothing is fetched at runtime.
//
//   node scripts/bake-earth-dots.mjs
//
// Land outline: Natural Earth 1:110m (public domain).
import { writeFileSync, mkdirSync } from 'node:fs';
import { geoContains } from 'd3-geo';

const SRC = 'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json';
const STEP = 1.5; // degrees between dots, along a parallel at the equator
const OUT = new URL('../public/meet/earth-dots.bin', import.meta.url);

const res = await fetch(SRC);
if (!res.ok) throw new Error(`land data: HTTP ${res.status}`);
const land = await res.json();

const pts = [];
for (let lat = -84; lat <= 84; lat += STEP) {
  // fewer dots toward the poles, so the spacing on the sphere stays even
  const step = STEP / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const offset = (Math.round(lat / STEP) % 2) * step * 0.5; // stagger rows
  for (let lng = -180 + offset; lng < 180; lng += step) {
    if (land.features.some((f) => geoContains(f, [lng, lat]))) pts.push(lat, lng);
  }
}

const buf = new Int16Array(pts.length);
pts.forEach((v, i) => (buf[i] = Math.round(v * 100)));
mkdirSync(new URL('../public/meet/', import.meta.url), { recursive: true });
writeFileSync(OUT, Buffer.from(buf.buffer));
console.log(`earth-dots.bin: ${pts.length / 2} dots, ${buf.byteLength} bytes`);
