#!/usr/bin/env python3
"""Generate Noder app icons (PNG + multi-size ICO) for electron-builder."""
from __future__ import annotations

import io
import os
import struct
import sys

try:
    from PIL import Image, ImageDraw
except ImportError:
    print('Pillow required: pip install pillow', file=sys.stderr)
    sys.exit(1)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets')


def make_icon(size: int) -> Image.Image:
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = max(4, int(size * 0.22))
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=(18, 22, 28, 255))
    pad = max(2, int(size * 0.055))
    d.rounded_rectangle(
        [pad, pad, size - 1 - pad, size - 1 - pad],
        radius=max(3, int(r * 0.85)),
        fill=(14, 99, 156, 55),
    )
    # N network geometry in 0..128 space
    s = size / 128.0
    nodes = [
        (35 * s, 34 * s),
        (35 * s, 94 * s),
        (93 * s, 34 * s),
        (93 * s, 94 * s),
        (64 * s, 64 * s),
    ]
    edges = [(0, 1), (0, 3), (2, 3), (0, 4), (2, 4), (1, 4)]
    w = max(2, int(size * 0.04))
    for a, b in edges:
        d.line([nodes[a], nodes[b]], fill=(0, 212, 170, 235), width=w)
    for i, (x, y) in enumerate(nodes):
        rad = int(size * (0.075 if i == 4 else 0.055))
        color = (0, 212, 170, 255) if i == 4 else (62, 207, 255, 255)
        d.ellipse([x - rad, y - rad, x + rad, y + rad], fill=color)
    # live pulse
    lr = max(3, int(size * 0.055))
    lx, ly = int(size * 0.78), int(size * 0.22)
    d.ellipse([lx - lr, ly - lr, lx + lr, ly + lr], fill=(0, 255, 180, 255))
    return img


def write_ico(path: str, sizes: list[int]) -> None:
    images = [make_icon(s) for s in sizes]
    entries = []
    blobs = []
    offset = 6 + 16 * len(images)
    for im in images:
        buf = io.BytesIO()
        im.save(buf, format='PNG')
        blob = buf.getvalue()
        blobs.append(blob)
        w, h = im.size
        entries.append((w if w < 256 else 0, h if h < 256 else 0, len(blob), offset))
        offset += len(blob)
    data = bytearray()
    data += struct.pack('<HHH', 0, 1, len(images))
    for w, h, size, off in entries:
        data += struct.pack('<BBBBHHII', w, h, 0, 0, 1, 32, size, off)
    for blob in blobs:
        data += blob
    with open(path, 'wb') as f:
        f.write(data)


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    sizes = [16, 32, 48, 64, 128, 256, 512, 1024]
    for s in sizes:
        make_icon(s).save(os.path.join(OUT, f'icon-{s}.png'))
    make_icon(512).save(os.path.join(OUT, 'icon.png'))
    write_ico(os.path.join(OUT, 'icon.ico'), [16, 32, 48, 64, 128, 256])
    # macOS: electron-builder accepts png; optional icns via iconutil on mac runners
    print('Icons written to', OUT)


if __name__ == '__main__':
    main()
