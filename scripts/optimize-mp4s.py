"""
Re-encode MP4s in videos info/ with H.264 CRF=28 + max width 720px.
Keeps quality acceptable for ~250px wide playback area while shrinking 70-85%.
"""
import os, subprocess, sys
from pathlib import Path
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent.parent
VIDEOS_DIR = ROOT / 'videos info'
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
MAX_WIDTH = 720
CRF = 28  # higher = smaller; 23 default, 28 still good

mp4s = list(VIDEOS_DIR.rglob('*.mp4'))
print(f'Found {len(mp4s)} MP4 files. ffmpeg: {FFMPEG}')

ok = 0
fail = 0
saved = 0

for src in mp4s:
    try:
        orig_size = src.stat().st_size
        tmp_out = src.with_suffix('.opt.mp4')
        cmd = [
            FFMPEG, '-y', '-loglevel', 'error',
            '-i', str(src),
            '-vf', f"scale='min({MAX_WIDTH},iw)':-2",  # cap width, keep even height
            '-c:v', 'libx264', '-preset', 'medium', '-crf', str(CRF),
            '-profile:v', 'high', '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart',
            '-an',  # strip audio
            str(tmp_out)
        ]
        r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
        if r.returncode != 0 or not tmp_out.exists():
            print(f'  [FAIL] {src.name}: ' + (r.stderr or '')[:200])
            fail += 1
            if tmp_out.exists(): tmp_out.unlink()
            continue
        new_size = tmp_out.stat().st_size
        # Only replace if smaller
        if new_size < orig_size:
            src.unlink()
            tmp_out.rename(src)
            saved += (orig_size - new_size)
            print(f'  {src.name}  {orig_size//1024} KB -> {new_size//1024} KB')
            ok += 1
        else:
            tmp_out.unlink()
            print(f'  [SKIP-LARGER] {src.name}  {orig_size//1024} KB <= reencoded {new_size//1024} KB')
    except Exception as e:
        print(f'  [FAIL] {src.name}: {e}')
        fail += 1

print('-' * 60)
print(f'MP4s optimized: {ok}')
print(f'Failed:         {fail}')
print(f'Saved:          {saved/1024/1024:.1f} MB')
