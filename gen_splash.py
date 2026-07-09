#!/usr/bin/env python3
"""
Generates:
  icons/icon-180.png              -- exact Apple apple-touch-icon spec size
  icons/splash/splash-WxH-l.png   -- light-theme launch splash, one per unique
  icons/splash/splash-WxH-d.png   -- dark-theme launch splash                 physical resolution from iPhone 13 mini (2021) through the
                                      current iPhone 17 / Air / 17e lineup (2026)

Design: matches the app's actual first-paint look -- the ambient gradient
wash from body::before, plus the rounded app icon centered, so the splash
reads as a continuation of the app rather than a generic loading screen.
"""
import math
from PIL import Image, ImageDraw, ImageFilter

SRC_ICON = 'src/icons/icon-512.png'
OUT_DIR = 'src/icons/splash'

# (logical_w, logical_h) -> physical (w,h) at the devices' native @3x scale.
# One entry per unique physical resolution actually in use, iPhone 13 mini (2021) onward.
SIZES = [
    (1080, 2340),  # 13 mini
    (1170, 2532),  # 13, 13 Pro, 14, 16e, 17e
    (1284, 2778),  # 13 Pro Max, 14 Plus
    (1179, 2556),  # 14 Pro, 15, 15 Pro, 16
    (1290, 2796),  # 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
    (1206, 2622),  # 16 Pro, 17, 17 Pro
    (1320, 2868),  # 16 Pro Max, 17 Pro Max
    (1260, 2736),  # iPhone Air
]

THEMES = {
    'l': {
        'bg': (237, 236, 243),
        'wash1': (255, 149, 0, 60),   # --wash-1 orange, alpha scaled for a raster blur
        'wash2': (175, 82, 222, 55),  # --wash-2 purple
        'wash3': (0, 122, 255, 50),   # --wash-3 blue
    },
    'd': {
        'bg': (8, 8, 12),
        'wash1': (255, 149, 0, 45),
        'wash2': (175, 82, 222, 50),
        'wash3': (10, 132, 255, 45),
    },
}


def rounded_icon(size):
    """Load the source icon, resize, and apply iOS-style rounded corners."""
    src = Image.open(SRC_ICON).convert('RGBA').resize((size, size), Image.LANCZOS)
    mask = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(mask)
    radius = round(size * 0.2237)  # iOS icon corner-radius ratio
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(src, (0, 0), mask)
    return out


def wash_blob(canvas_size, cx_pct, cy_pct, r_pct, color):
    """A single soft radial color blob, blurred, matching one of body::before's gradients."""
    w, h = canvas_size
    layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = w * cx_pct, h * cy_pct
    r = max(w, h) * r_pct
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
    blur_radius = max(w, h) * 0.12
    return layer.filter(ImageFilter.GaussianBlur(blur_radius))


def make_splash(w, h, theme):
    t = THEMES[theme]
    img = Image.new('RGBA', (w, h), t['bg'] + (255,))
    for (cx, cy, r, color) in [
        (0.12, 0.10, 0.42, t['wash1']),
        (0.90, 0.20, 0.46, t['wash2']),
        (0.66, 0.94, 0.50, t['wash3']),
    ]:
        img = Image.alpha_composite(img, wash_blob((w, h), cx, cy, r, color))

    icon_size = round(min(w, h) * 0.24)
    icon = rounded_icon(icon_size)
    pos = ((w - icon_size) // 2, (h - icon_size) // 2)
    img = img.convert('RGBA')
    img.paste(icon, pos, icon)

    return img.convert('RGB')


def main():
    import os
    os.makedirs(OUT_DIR, exist_ok=True)

    icon180 = rounded_icon2 = None
    # apple-touch-icon: plain square (no rounding -- iOS applies its own mask), exact 180x180
    Image.open(SRC_ICON).convert('RGBA').resize((180, 180), Image.LANCZOS).save('src/icons/icon-180.png')
    print('icon-180.png')

    for (w, h) in SIZES:
        for theme in ('l', 'd'):
            img = make_splash(w, h, theme)
            name = f'{OUT_DIR}/splash-{w}x{h}-{theme}.png'
            img.save(name, optimize=True)
            print(name, img.size)


if __name__ == '__main__':
    main()
