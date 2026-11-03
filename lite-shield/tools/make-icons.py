#!/usr/bin/env python3
"""Sinh icon PNG (16/32/48/128): nền "cookie" 12 cánh kiểu M3 Expressive + khiên có dấu tick."""
import math
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "icons")
os.makedirs(OUT, exist_ok=True)

BG = (76, 175, 80, 255)         # Material Green 500 (#4CAF50)
FG = (255, 255, 255, 255)
TICK = (46, 125, 50, 255)         # Green 800 (#2E7D32)
S = 1024                          # vẽ ở độ phân giải cao rồi thu nhỏ


def cookie(cx, cy, r, lobes=12, amp=0.055, n=720):
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        rr = r * (1 + amp * math.cos(lobes * t))
        pts.append((cx + rr * math.cos(t), cy + rr * math.sin(t)))
    return pts


def chaikin(pts, it=3):
    for _ in range(it):
        out = []
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            out.append((0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]))
            out.append((0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]))
        pts = out
    return pts


img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.polygon(cookie(S / 2, S / 2, S * 0.455), fill=BG)

shield = [(0.5, 0.2), (0.74, 0.29), (0.74, 0.5), (0.66, 0.68), (0.5, 0.8),
          (0.34, 0.68), (0.26, 0.5), (0.26, 0.29)]
d.polygon(chaikin([(x * S, y * S) for x, y in shield], 4), fill=FG)

w = int(S * 0.055)
tick = [(0.4, 0.5), (0.47, 0.58), (0.61, 0.42)]
tp = [(x * S, y * S) for x, y in tick]
d.line(tp, fill=TICK, width=w, joint="curve")
for x, y in (tp[0], tp[-1]):
    d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=TICK)

for size in (16, 32, 48, 128):
    img.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, f"icon{size}.png"))
print("icons ok")
