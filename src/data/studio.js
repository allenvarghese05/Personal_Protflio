import media from './studioMedia.json';

/**
 * The Studio — photography, film and sound.
 *
 * studioMedia.json is GENERATED — don't hand-edit it. Re-run
 *   python3 scripts/process_studio_media.py <pictures_dir> <beats_dir>
 * after adding photos or beats. It holds every photo's size + full metadata
 * (camera, lens, exposure, capture date, GPS + place) and every beat's
 * duration + real waveform. This file layers on what only you can write:
 * track titles and the films.
 *
 * Films — YouTube: https://www.youtube.com/embed/<id>
 *         Google Drive: https://drive.google.com/file/d/<id>/preview
 *         (Drive files must be shared "Anyone with the link").
 */

// One entry per beat, in the manifest's order (BEATS in scripts/rebuild_beats.py).
// `mood` picks the cover palette, 'cold' (ice) or 'warm' (amber), so the
// wall alternates; no genres are shown.
const TRACK_INFO = [
  { title: 'Moonlight', mood: 'cold' },
  { title: 'Daydream', mood: 'warm' },
  { title: 'Deep Era', mood: 'warm' },
  { title: 'Cold', mood: 'cold' },
  { title: 'Snow', mood: 'cold' },
  { title: 'Dusk', mood: 'warm' },
  { title: 'Afterhours', mood: 'cold' },
  { title: 'Hometown', mood: 'warm' },
  { title: 'Slither', mood: 'warm' },
  { title: 'Wild Anthem', mood: 'cold' },
  { title: 'Revolution', mood: 'cold' },
  { title: 'Rebel', mood: 'cold' },
  { title: 'Try Again', mood: 'warm' },
];

export const STUDIO = {
  intro: 'Away from the keyboard: photographs, short films and beats.',
  artist: 'Allen Varghese',
  photos: media.photos,
  films: [
    // TODO(allen): give each film its real title + your role on it
    { title: 'Film 01', embed: 'https://www.youtube.com/embed/RFSHbN9bihI', meta: 'YouTube · worked on' },
    { title: 'Film 02', embed: 'https://drive.google.com/file/d/1Ut1YaweNFZFMH5mKmb5dn2lmDaGH7LKk/preview', meta: 'Worked on' },
  ],
  tracks: media.tracks.map((t, i) => ({ ...t, ...(TRACK_INFO[i] || { title: `Track ${i + 1}`, mood: 'warm' }) })),
};

// How many placeholder frames to show while a section is empty
export const PLACEHOLDER_COUNT = { photos: 9, films: 2, tracks: 4 };

/** "2019:01:11 12:21:14" → "11 Jan 2019" */
export function formatShotDate(exifDate) {
  if (!exifDate) return null;
  const [d] = exifDate.split(' ');
  const [y, m, day] = d.split(':').map(Number);
  if (!y || !m || !day) return null;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${MONTHS[m - 1]} ${y}`;
}

/** [39.95589, -75.19102] → "39.9559° N · 75.1910° W" */
export function formatCoords(gps) {
  if (!gps) return null;
  const [lat, lon] = gps;
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
}

/** 83.89 → "1:23" */
export const formatTime = (s) => {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};
