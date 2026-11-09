"""Rebuild only the Studio's beats, in a chosen order, keeping the photos.

  python3 scripts/rebuild_beats.py <beats_dir>

BEATS below lists each beat's title and its source file in <beats_dir>, in
the order the Studio shows them. Every source (mp3, wav, even a video) is
decoded with ffmpeg and encoded to AAC 192 kbps → public/studio/sound/NN.m4a,
with the same waveform (for the cover) as process_studio_media.py.
The titles themselves live in src/data/beats.js, in the same order.
"""
import json
import os
import subprocess
import sys
import tempfile
import wave

sys.path.insert(0, os.path.dirname(__file__))

from process_studio_media import OUT_SOUND, envelope  # noqa: E402

BEATS_JSON = 'src/data/studioBeats.json'

BEATS = [
    ('Moonlight', 'MOONLIGHT THE CHILLEST BEAT (PROD.XLEN).mp3'),
    ('Daydream', 'DAYDREAM GETTING OUT OF MY COMFORT ZONE!! A PANIO LO-FI BEAT. (PROD.XLEN).mp3'),
    ('Deep Era', 'DEEP ERA A GUITAR DARK CHILL BEAT (PROD.XLEN).mp3'),
    ('Cold', 'COLD A DARK DRILL BEAT!! (PROD.XLEN).mp3'),
    ('Snow', 'Take Your Piece Drake Type Beat.mp3'),
    ('Dusk', 'guitar_123bpm_fmin.mp3'),
    ('Afterhours', 'aaasss_Master.wav'),
    ('Hometown', 'jcole type beat.mp4'),
    ('Slither', '"Slither" (KID_laroi) A guitar beat.wav'),
    ('Wild Anthem', '"Wild anthem" A UK Drill Beat.mp3'),
    ('Revolution', '"Revolution" Drill Beat.wav'),
    ('Rebel', '"Rebel" A UK Drill Beat.wav'),
    ('Try Again', 'trytry.mp3'),
]

if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    src = sys.argv[1]
    os.makedirs(OUT_SOUND, exist_ok=True)
    # drop the old files, so a shorter list leaves nothing behind
    for old in os.listdir(OUT_SOUND):
        if old.endswith('.m4a'):
            os.remove(os.path.join(OUT_SOUND, old))
    tracks = []
    with tempfile.TemporaryDirectory() as tmp:
        for i, (title, f) in enumerate(BEATS, 1):
            name = f'{i:02d}'
            dst = os.path.join(OUT_SOUND, name + '.m4a')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(src, f), '-vn', '-map_metadata', '-1',
                            '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', dst], check=True)
            pcm = os.path.join(tmp, name + '.wav')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', dst, '-ac', '1', '-ar', '22050', '-c:a', 'pcm_s16le', pcm],
                           check=True)
            with wave.open(pcm) as w:
                duration = w.getnframes() / w.getframerate()
            tracks.append({'src': f'/studio/sound/{name}.m4a', 'file': f, 'duration': round(duration, 2),
                           'peaks': envelope(pcm)})
    with open(BEATS_JSON, 'w') as fh:
        json.dump(tracks, fh, ensure_ascii=False, indent=1)
    print(f'{len(tracks)} beats → {OUT_SOUND}, {BEATS_JSON}')
