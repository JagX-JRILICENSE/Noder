#!/usr/bin/env python3
"""Generate Noder app icons for electron-builder."""
from __future__ import annotations
import io, os, struct, sys
try:
    from PIL import Image, ImageDraw
except ImportError:
    print('Pillow required: pip install pillow', file=sys.stderr)
    sys.exit(1)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets')
def make_icon(size: int):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = max(4, int(size * 0.22))
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=(18, 22, 28, 255))
    pad = max(2, int(size * 0.055))
    d.rounded_rectangle([pad, pad, size - 1 - pad, size - 1 - pad], radius=max(3, int(r * 0.85)), fill=(14, 99, 156, 55))
    s = size / 128.0
    nodes = [(35 * s, 34 * s), (35 * s, 94 * s), (93 * s, 34 * s), (93 * s, 94 * s), (64 * s, 64 * s)]
    for a, b in [(0, 1), (0, 3), (2, 3), (0, 4), (2, 4), (1, 4)]:
        d.line([nodes[a], nodes[b]], fill=(0, 212, 170, 235), width=max(2, int(size * 0.04)))
    for i, (x, y) in enumerate(nodes):
        rad = int(size * (0.075 if i == 4 else 0.055))
        d.ellipse([x - rad, y - rad, x + rad, y + rad], fill=(0, 212, 170, 255) if i == 4 else (62, 207, 255, 255))
    return img
def write_ico(path, sizes):
    images = [make_icon(s) for s in sizes]
    entries, blobs, offset = [], [], 6 + 16 * len(images)
    for im in images:
        buf = io.BytesIO(); im.save(buf, format='PNG'); blob = buf.getvalue(); blobs.append(blob)
        w, h = im.size; entries.append((w if w < 256 else 0, h if h < 256 else 0, len(blob), offset)); offset += len(blob)
    data = bytearray() + struct.pack('<HHH', 0, 1, len(images))
    for w, h, size, off in entries:
        data += struct.pack('<BBBBHHII', w, h, 0, 0, 1, 32, size, off)
    for blob in blobs: data += blob
    open(path, 'wb').write(data)
def main():
    os.makedirs(OUT, exist_ok=True)
    for s in [16, 32, 48, 64, 128, 256, 512, 1024]:
        make_icon(s).save(os.path.join(OUT, f'icon-{s}.png'))
    make_icon(512).save(os.path.join(OUT, 'icon.png'))
    write_ico(os.path.join(OUT, 'icon.ico'), [16, 32, 48, 64, 128, 256])
    print('Icons written to', OUT)
if __name__ == '__main__': main()
