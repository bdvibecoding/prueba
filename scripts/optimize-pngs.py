"""
Optimize PNGs in videos info/ — convert to JPEG (max 1024px wide, quality 85).
Skip thumbnails already small (< 200 KB). Update data.js paths.
"""
import os, re, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
VIDEOS_DIR = ROOT / 'videos info'
DATA_FILE = ROOT / 'data' / 'data.js'
MAX_WIDTH = 1024
JPEG_QUALITY = 85
MIN_SIZE_TO_OPTIMIZE = 200 * 1024  # 200 KB threshold

converted = []
skipped_small = 0
failed = 0
saved_bytes = 0

png_files = list(VIDEOS_DIR.rglob('*.png'))
print(f'Scanning {len(png_files)} PNG files...')

for png in png_files:
    try:
        original_size = png.stat().st_size
        if original_size < MIN_SIZE_TO_OPTIMIZE:
            skipped_small += 1
            continue

        img = Image.open(png)
        # Convert to RGB (drop alpha if any) — required for JPEG
        if img.mode in ('RGBA', 'LA', 'P'):
            bg = Image.new('RGB', img.size, (255, 255, 255))
            bg.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
            img = bg
        else:
            img = img.convert('RGB')

        # Resize maintaining aspect ratio if wider than MAX_WIDTH
        if img.width > MAX_WIDTH:
            new_h = int(img.height * (MAX_WIDTH / img.width))
            img = img.resize((MAX_WIDTH, new_h), Image.LANCZOS)

        # Save as JPG next to the original
        jpg_path = png.with_suffix('.jpg')
        img.save(jpg_path, 'JPEG', quality=JPEG_QUALITY, optimize=True, progressive=True)
        new_size = jpg_path.stat().st_size

        old_rel = png.relative_to(ROOT).as_posix()
        new_rel = jpg_path.relative_to(ROOT).as_posix()
        converted.append({'old': old_rel, 'new': new_rel, 'old_size': original_size, 'new_size': new_size})
        saved_bytes += (original_size - new_size)
        # Delete original PNG
        png.unlink()
        print(f'  {old_rel}  {original_size//1024} KB -> {new_size//1024} KB')
    except Exception as e:
        print(f'  [FAIL] {png}: {e}')
        failed += 1

# Update data.js paths
src = DATA_FILE.read_text(encoding='utf-8')
updated_paths = 0
for c in converted:
    if c['old'] in src:
        src = src.replace(c['old'], c['new'])
        updated_paths += 1

DATA_FILE.write_text(src, encoding='utf-8')

print('-' * 60)
print(f'PNGs converted to JPG:    {len(converted)}')
print(f'PNGs left untouched:      {skipped_small} (under {MIN_SIZE_TO_OPTIMIZE//1024} KB)')
print(f'Failed:                   {failed}')
print(f'Saved:                    {saved_bytes/1024/1024:.1f} MB')
print(f'data.js paths updated:    {updated_paths}')
