"""Render icons/icon{16,32,48,128}.png and the social cover from the same geometry as icons/icon.svg.
Requires Pillow:  pip install pillow   |   Run: python scripts/make-icons.py"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

RED = (244, 67, 54, 255)
WHITE = (255, 255, 255, 255)
ROOT = Path(__file__).resolve().parent.parent
SS = 8  # supersampling factor for crisp edges


def draw_mark(size, bg=True):
    """Draw the logo at `size` px using the 128-unit geometry of icon.svg."""
    k = size * SS / 128
    img = Image.new("RGBA", (size * SS, size * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if bg:
        d.rounded_rectangle([0, 0, 128 * k - 1, 128 * k - 1], radius=28 * k, fill=RED)
    tile = (WHITE if bg else RED)
    for x, y in ((24, 24), (70, 24), (24, 70), (70, 70)):
        d.rounded_rectangle([x * k, y * k, (x + 34) * k, (y + 34) * k], radius=8 * k, fill=tile)
    play = [(36, 32.5), (36, 49.5), (52.5, 41)]
    d.polygon([(px * k, py * k) for px, py in play], fill=RED if bg else WHITE)
    return img.resize((size, size), Image.LANCZOS)


for s in (16, 32, 48, 128):
    draw_mark(s).save(ROOT / "icons" / f"icon{s}.png", optimize=True)
print("icons written")
