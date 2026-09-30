// Bakes the dotted Earth for the Meet Me globe from the Earth texture the
// site already ships (public/cosmic/planets/earth.jpg, equirectangular):
// samples an even spread of points over the sphere, keeps the points that land on land (the
// ocean is a uniform blue, so land = "not blue"), and writes them as Int16
// pairs (lat × 100, lng × 100) to public/meet/earth-dots.bin.
//
//   node scripts/bake-earth-dots.mjs
//
// Local only — nothing is downloaded.
import { writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const SRC = new URL('../public/cosmic/planets/earth.jpg', import.meta.url);
const OUT = new URL('../public/meet/earth-dots.bin', import.meta.url);
const LAT = [-58, 72]; // skip Antarctica and the texture's hazy polar cap

const { data, info } = await sharp(SRC.pathname).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const px = (lng, lat) => {
  const x = Math.min(W - 1, Math.max(0, Math.round(((lng + 180) / 360) * W)));
  const y = Math.min(H - 1, Math.max(0, Math.round(((90 - lat) / 180) * H)));
  const i = (y * W + x) * 3;
  return [data[i], data[i + 1], data[i + 2]];
};
// land when the pixel isn't ocean-blue (vegetation, desert, ice, cities)
const isLand = (lng, lat) => {
  const [r, g, b] = px(lng, lat);
  return b < r + 18 || r + g > b * 1.45;
};
// a little majority vote so single noisy pixels (lakes, specks) don't count
const land = (lng, lat) => {
  let n = 0;
  for (const [dx, dy] of [[0, 0], [0.35, 0], [-0.35, 0], [0, 0.35], [0, -0.35]]) n += isLand(lng + dx, lat + dy) ? 1 : 0;
  return n >= 3;
};

// an even spread over the sphere (a Fibonacci lattice) — no latitude rows,
// so the globe never shows concentric ridges toward its edge
const N = 26000;
const pts = [];
const golden = Math.PI * (3 - Math.sqrt(5));
for (let i = 0; i < N; i++) {
  const y = 1 - (2 * (i + 0.5)) / N;
  const lat = (Math.asin(y) * 180) / Math.PI;
  if (lat < LAT[0] || lat > LAT[1]) continue;
  let lng = ((i * golden * 180) / Math.PI) % 360;
  if (lng > 180) lng -= 360;
  if (land(lng, lat)) pts.push(lat, lng);
}

const buf = new Int16Array(pts.length);
pts.forEach((v, i) => (buf[i] = Math.round(v * 100)));
mkdirSync(new URL('../public/meet/', import.meta.url), { recursive: true });
writeFileSync(OUT, Buffer.from(buf.buffer));
console.log(`earth-dots.bin: ${pts.length / 2} dots, ${buf.byteLength} bytes`);
