"""
Extract a middle frame from every GIF added as a fallback localVideo.
Saves it next to the GIF as <name>_thumb.png and updates data.js with localImg.
"""
import json, os, re, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
VIDEOS_DIR = ROOT / 'videos info'
DATA_FILE = ROOT / 'data' / 'data.js'

# Find all .gif files in videos info/
gifs = list(VIDEOS_DIR.rglob('*.gif'))
print(f'Found {len(gifs)} GIF files in videos info/')

results = []
for gif_path in gifs:
    try:
        img = Image.open(gif_path)
        # Count frames
        try:
            img.seek(img.tell())
            n_frames = getattr(img, 'n_frames', 1)
        except Exception:
            n_frames = 1

        # Pick a middle frame (most representative pose, usually mid-rep)
        target_frame = max(0, n_frames // 2)
        try:
            img.seek(target_frame)
        except EOFError:
            img.seek(0)

        # Convert to RGBA / RGB and save as PNG
        frame = img.convert('RGB')
        thumb_path = gif_path.with_name(gif_path.stem + '_thumb.png')
        frame.save(thumb_path, 'PNG', optimize=True)

        # Relative path for data.js (using forward slashes)
        rel = thumb_path.relative_to(ROOT).as_posix()
        gif_rel = gif_path.relative_to(ROOT).as_posix()
        results.append({
            'gif': gif_rel,
            'thumb': rel,
            'frames': n_frames,
            'chosen': target_frame
        })
        print(f'  [OK]   {gif_path.name} ({n_frames} frames) -> {thumb_path.name}')
    except Exception as e:
        print(f'  [FAIL] {gif_path.name} -- {e}')

# Inject localImg into data.js for entries whose localVideo matches a GIF
src = DATA_FILE.read_text(encoding='utf-8')
updated, already, skipped = 0, 0, 0

for r in results:
    gif_rel = r['gif']  # e.g. "videos info/Abdomen - Abs/rueda_abdominal.gif"
    thumb_rel = r['thumb']

    # Escape regex special chars
    esc_gif = re.escape(gif_rel)
    # Find the exercise entry that has this gif as localVideo
    pattern = re.compile(
        r'(\{[^{}]*?localVideo:\s*"' + esc_gif + r'"[^{}]*?)(\})',
        re.DOTALL
    )
    m = pattern.search(src)
    if not m:
        skipped += 1
        continue
    if 'localImg:' in m.group(1):
        already += 1
        continue

    inject = f', localImg: ["{thumb_rel}"]'
    src = pattern.sub(lambda mm: mm.group(1) + inject + mm.group(2), src, count=1)
    updated += 1

DATA_FILE.write_text(src, encoding='utf-8')
print('-' * 50)
print(f'Total GIFs processed: {len(results)}')
print(f'data.js updated:      {updated}')
print(f'Already had localImg: {already}')
print(f'No matching entry:    {skipped}')
