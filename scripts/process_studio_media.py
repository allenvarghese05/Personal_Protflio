#!/usr/bin/env python3
"""
Process the Studio's original media into web-ready files + a data manifest.

  python3 scripts/process_studio_media.py <pictures_dir> <beats_dir>

Photos  → public/studio/photos/NN.jpg (2400px, FULL metadata kept, rotation
          baked in) + NN-sm.jpg (900px grid thumbnail, no metadata)
Beats   → public/studio/sound/NN.m4a (AAC 192 kbps)
Manifest→ src/data/studioMedia.json — per photo: size, camera, lens, focal
          length, aperture, shutter, ISO, capture date, GPS; per beat:
          duration + a 120-point loudness envelope (the real waveform, used
          for the scrub bar and the generated cover art).

macOS only: uses `sips` (HEIC/PNG → JPEG) and `afconvert` (audio).
Photos without camera metadata are labelled with FALLBACK_CAMERA.
"""
import json
import os
import subprocess
import sys
import tempfile
import wave
import array
from fractions import Fraction

from PIL import Image, ImageOps

FALLBACK_CAMERA = 'Sony α7 III'
CAMERAS = {
    'ILCE-6400': 'Sony α6400',
    'ILCE-7M3': 'Sony α7 III',
    'DSC-HX300': 'Sony HX300',
    'Canon EOS 800D': 'Canon EOS 800D',
}
PEAKS = 120

OUT_PHOTOS = 'public/studio/photos'
OUT_SOUND = 'public/studio/sound'
MANIFEST = 'src/data/studioMedia.json'


def num(v):
    try:
        return float(Fraction(v)) if not isinstance(v, (int, float)) else float(v)
    except Exception:
        try:
            return float(v)
        except Exception:
            return None


def shutter(v):
    s = num(v)
    if not s:
        return None
    return f'1/{round(1 / s)} s' if s < 1 else f'{s:g} s'


def gps_decimal(gps):
    """EXIF GPS IFD → (lat, lon) in decimal degrees, or None."""
    try:
        def dms(vals, ref):
            d, m, s = (num(x) for x in vals)
            dec = d + m / 60 + s / 3600
            return -dec if ref in ('S', 'W') else dec
        lat = dms(gps[2], gps[1])
        lon = dms(gps[4], gps[3])
        return round(lat, 5), round(lon, 5)
    except Exception:
        return None


# City-level place names for GPS points (offline — no geocoding service).
# (name, lat, lon, radius_km). Add a row when you shoot somewhere new.
PLACES = [
    ('Philadelphia, PA', 39.9526, -75.1652, 25),
    ('Istanbul, Türkiye', 41.0151, 28.9795, 40),
    ('Cappadocia, Türkiye', 38.6431, 34.8289, 30),
    ('Kandy, Sri Lanka', 7.2906, 80.6337, 20),
    ('Madhya Pradesh, India', 22.9734, 78.6569, 400),
]


def place_for(gps):
    if not gps:
        return None
    from math import radians, sin, cos, asin, sqrt
    lat, lon = gps
    best = None
    for name, plat, plon, r in PLACES:
        dlat, dlon = radians(plat - lat), radians(plon - lon)
        h = sin(dlat / 2) ** 2 + cos(radians(lat)) * cos(radians(plat)) * sin(dlon / 2) ** 2
        km = 6371 * 2 * asin(sqrt(h))
        if km <= r and (best is None or km < best[1]):
            best = (name, km)
    return best[0] if best else None


def camera_name(make, model):
    model = (model or '').strip()
    if not model:
        return FALLBACK_CAMERA
    return CAMERAS.get(model, model)


def photo_sort_key(f):
    u = f.upper()
    dedicated = u.startswith('DSC') or (u.startswith('IMG_9') and u.endswith(('.JPG', '-2.JPG')))
    return (0 if dedicated else 1, f)


def process_photos(src):
    os.makedirs(OUT_PHOTOS, exist_ok=True)
    files = sorted((f for f in os.listdir(src) if not f.startswith('.')), key=photo_sort_key)
    out = []
    with tempfile.TemporaryDirectory() as tmp:
        for i, f in enumerate(files, 1):
            name = f'{i:02d}'
            mid = os.path.join(tmp, name + '.jpg')
            # any format → 8-bit JPEG; sips carries the metadata (incl. GPS) across
            subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '92', '-Z', '3000',
                            os.path.join(src, f), '--out', mid], check=True,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            im = Image.open(mid)
            exif = im.getexif()
            sub = exif.get_ifd(0x8769)
            gps = exif.get_ifd(0x8825)
            meta = {
                'camera': camera_name(exif.get(0x010F), exif.get(0x0110)),
                'lens': (str(sub.get(0xA434)).split('|')[0].strip() if sub.get(0xA434) else None),
                'focal': (f'{num(sub.get(0x920A)):g} mm' if sub.get(0x920A) else None),
                'aperture': (f'ƒ/{num(sub.get(0x829D)):.1f}'.replace('.0', '') if sub.get(0x829D) else None),
                'shutter': shutter(sub.get(0x829A)),
                'iso': (f'ISO {sub.get(0x8827)}' if sub.get(0x8827) else None),
                'date': (str(sub.get(0x9003)) if sub.get(0x9003) else None),  # capture date, not export date
                'gps': gps_decimal(gps) if gps else None,
            }
            meta['place'] = place_for(meta['gps'])
            # bake the rotation in, then mark the stored metadata upright
            upright = ImageOps.exif_transpose(im).convert('RGB')
            exif[0x0112] = 1
            full = upright.copy()
            full.thumbnail((2400, 2400), Image.LANCZOS)
            full.save(os.path.join(OUT_PHOTOS, name + '.jpg'), 'JPEG', quality=82, optimize=True,
                      progressive=True, exif=exif.tobytes())
            thumb = upright.copy()
            thumb.thumbnail((900, 900), Image.LANCZOS)
            thumb.save(os.path.join(OUT_PHOTOS, name + '-sm.jpg'), 'JPEG', quality=78, optimize=True, progressive=True)
            out.append({'src': f'/studio/photos/{name}.jpg', 'thumb': f'/studio/photos/{name}-sm.jpg',
                        'w': full.width, 'h': full.height, 'file': f,
                        **{k: v for k, v in meta.items() if v is not None}})
    return out


def envelope(wav_path, n=PEAKS):
    """Loudness envelope (RMS per bucket, normalised 0..1) from 16-bit PCM."""
    with wave.open(wav_path) as w:
        ch, frames = w.getnchannels(), w.getnframes()
        data = array.array('h', w.readframes(frames))
    step = max(1, len(data) // (n * ch))
    out = []
    for b in range(n):
        seg = data[b * step * ch:(b + 1) * step * ch:ch * 8] or [0]
        out.append((sum(x * x for x in seg) / len(seg)) ** 0.5)
    peak = max(out) or 1
    return [round(v / peak, 3) for v in out]


def process_beats(src):
    os.makedirs(OUT_SOUND, exist_ok=True)
    files = sorted(f for f in os.listdir(src) if not f.startswith('.'))
    out = []
    with tempfile.TemporaryDirectory() as tmp:
        for i, f in enumerate(files, 1):
            name = f'{i:02d}'
            dst = os.path.join(OUT_SOUND, name + '.m4a')
            subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '192000', os.path.join(src, f), dst], check=True)
            pcm = os.path.join(tmp, name + '.wav')
            subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@22050', '-c', '1', dst, pcm], check=True)
            with wave.open(pcm) as w:
                duration = w.getnframes() / w.getframerate()
            out.append({'src': f'/studio/sound/{name}.m4a', 'file': f, 'duration': round(duration, 2), 'peaks': envelope(pcm)})
    return out


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    pictures, beats = sys.argv[1], sys.argv[2]
    manifest = {'photos': process_photos(pictures), 'tracks': process_beats(beats)}
    with open(MANIFEST, 'w') as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=1)
    print(f"{len(manifest['photos'])} photos, {len(manifest['tracks'])} beats → {MANIFEST}")
