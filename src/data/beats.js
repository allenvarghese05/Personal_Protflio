import tracks from './studioBeats.json';

/**
 * The beats — everything the music player needs, kept apart from the photo
 * metadata, because the player is on every page (see components/audio).
 *
 * studioBeats.json is GENERATED (durations, real waveforms): re-run
 *   python3 scripts/rebuild_beats.py <beats_dir>
 * after changing the set. Titles and cover palettes are written here.
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

export const ARTIST = 'Allen Varghese';

// the Sound tab's header: the beats as one tape
export const TAPE = {
  title: 'Beat Tape',
  blurb: 'Beats I make on my own time: late-night guitar, piano loops and drill. Headphones on.',
};

export const BEATS = tracks.map((t, i) => ({ ...t, ...(TRACK_INFO[i] || { title: `Track ${i + 1}`, mood: 'warm' }) }));

/** 83.89 → "1:23" */
export const formatTime = (s) => {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};
