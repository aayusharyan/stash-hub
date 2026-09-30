#!/usr/bin/env python3
# Maintainer CLI that renders the themed "S" favicon PNGs into frontend/public
# and a site-root favicon.ico (orange-dark) for crawlers. Not part of the
# runtime image — regenerate after accent/theme colour changes:
#   pip install pillow
#   python scripts/generate_favicons.py
# Uses the vendored Nunito variable font (weight 700) under scripts/assets/.
# The variant ("<accent>-<theme>", e.g. "orange-dark") is the filename stem.

from __future__ import annotations

import io
import os
import sys
from pathlib import Path

# Accent key -> hex colour. Mirrors ACCENT_OPTIONS in the frontend theme context.
ACCENT_COLORS: dict[str, str] = {
    "orange": "#ff9000",
    "blue": "#0d6efd",
    "red": "#e50914",
    "purple": "#9147ff",
    "green": "#1db954",
    "teal": "#00b4b4",
}

# Resolved theme -> background colour behind the glyph.
THEME_BACKGROUNDS: dict[str, str] = {
    "light": "#f0f0f0",
    "dark": "#111111",
}

_SCRIPTS_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _SCRIPTS_DIR.parent
_FONT_PATH = _SCRIPTS_DIR / "assets" / "Nunito-Variable.ttf"
_DEFAULT_OUT = _REPO_ROOT / "frontend" / "public" / "favicons"
# Crawler fallback at the site root (default accent + dark).
_DEFAULT_ICO = _REPO_ROOT / "frontend" / "public" / "favicon.ico"
_DEFAULT_VARIANT = ("orange", "dark")

# Bold axis value for the favicon glyph.
_NUNITO_BOLD_WEIGHT = 700

# Final favicon edge length, and the supersample canvas used before downscale.
_ICON_SIZE = 32
_SAMPLE_SIZE = 512


# Converts a "#rrggbb" string into an (r, g, b) tuple for Pillow.
def _hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


# Loads Nunito at Bold weight for the requested size, falling back to the built-in
# bitmap font only if the vendored face is missing.
def _load_font(size: int):
    from PIL import ImageFont

    try:
        font = ImageFont.truetype(str(_FONT_PATH), size)
        font.set_variation_by_axes([_NUNITO_BOLD_WEIGHT])
        return font
    except OSError:
        return ImageFont.load_default()


# Downscales an RGBA image with premultiplied alpha so transparent edges stay
# clean (plain LANCZOS on straight alpha fringes colour into the corners).
# Semi-transparent edge pixels are recolored to `edge_rgb` so filter ringing
# cannot tint the rounded-corner AA.
def _downscale_rgba(
    img: "Image.Image", size: int, edge_rgb: tuple[int, int, int]
) -> "Image.Image":
    from PIL import Image

    r, g, b, a = img.split()
    zero = Image.new("L", img.size, 0)
    premult = Image.merge(
        "RGBA",
        (
            Image.composite(r, zero, a),
            Image.composite(g, zero, a),
            Image.composite(b, zero, a),
            a,
        ),
    ).resize((size, size), Image.Resampling.LANCZOS)

    er, eg, eb = edge_rgb
    pixels = premult.load()
    for y in range(size):
        for x in range(size):
            _pr, _pg, _pb, pa = pixels[x, y]
            if pa < 8:
                pixels[x, y] = (0, 0, 0, 0)
            elif pa < 255:
                pixels[x, y] = (er, eg, eb, pa)
    return premult


# Draws a single 32x32 "S" mark in the accent colour on a rounded theme-coloured
# tile and returns the encoded PNG bytes. Renders at 512x512 then downscales so
# the corner radius and glyph curves stay smooth at favicon size.
def render(accent: str, theme: str) -> bytes:
    from PIL import Image, ImageDraw

    color = _hex_to_rgb(ACCENT_COLORS.get(accent, ACCENT_COLORS["orange"]))
    bg = _hex_to_rgb(THEME_BACKGROUNDS.get(theme, THEME_BACKGROUNDS["dark"]))

    scale = _SAMPLE_SIZE // _ICON_SIZE
    img = Image.new("RGBA", (_SAMPLE_SIZE, _SAMPLE_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle(
        [0, 0, _SAMPLE_SIZE - 1, _SAMPLE_SIZE - 1],
        radius=6 * scale,
        fill=bg,
    )

    # Nunito's "S" ink box sits optically high relative to its typographic center,
    # so use a modest size and anchor below the geometric midpoint.
    font = _load_font(18 * scale)
    draw.text(
        (_SAMPLE_SIZE / 2, _SAMPLE_SIZE / 2 + scale),
        "S",
        font=font,
        fill=color,
        anchor="mm",
    )

    img = _downscale_rgba(img, _ICON_SIZE, bg)

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


# Canonical variant name ("<accent>-<theme>") used as the file stem and URL slug.
def variant_name(accent: str, theme: str) -> str:
    return f"{accent}-{theme}"


# Every accent/theme slug this CLI knows how to render.
VALID_VARIANTS: frozenset[str] = frozenset(
    variant_name(a, t) for a in ACCENT_COLORS for t in THEME_BACKGROUNDS
)


# Renders every accent/theme combination into target_dir as "<variant>.png",
# and writes frontend/public/favicon.ico from the default orange-dark variant
# for crawlers that request /favicon.ico with no <link>. Returns the PNG dir.
def generate_all(target_dir: str | os.PathLike[str]) -> Path:
    from PIL import Image

    target = Path(target_dir)
    target.mkdir(parents=True, exist_ok=True)

    for accent in ACCENT_COLORS:
        for theme in THEME_BACKGROUNDS:
            dest = target / f"{variant_name(accent, theme)}.png"
            tmp = dest.with_name(f"{dest.name}.{os.getpid()}.tmp")
            tmp.write_bytes(render(accent, theme))
            os.replace(tmp, dest)

    # Site-root ICO for bots/tools that hit /favicon.ico by convention.
    default_png = target / f"{variant_name(*_DEFAULT_VARIANT)}.png"
    ico_tmp = _DEFAULT_ICO.with_name(f"{_DEFAULT_ICO.name}.{os.getpid()}.tmp")
    Image.open(default_png).save(
        ico_tmp, format="ICO", sizes=[(_ICON_SIZE, _ICON_SIZE)]
    )
    os.replace(ico_tmp, _DEFAULT_ICO)

    return target.resolve()


# Entry point: `python scripts/generate_favicons.py [dir]`.
# Defaults to frontend/public/favicons under the repo root.
if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else str(_DEFAULT_OUT)
    written = generate_all(out)
    print(f"Wrote {len(VALID_VARIANTS)} favicon variants to {written}")
    print(f"Wrote crawler fallback {_DEFAULT_ICO}")
