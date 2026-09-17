# Pre-renders the themed "S" favicon into PNG files, one per accent/theme variant,
# so the HTTP layer just serves a static file instead of drawing on every request.
# The variant ("<accent>-<theme>", e.g. "orange-dark") is the filename stem.

from __future__ import annotations

import io
import os
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

# Bold faces to try in order; falls back to Pillow's bitmap font if none exist.
_FONT_CANDIDATES = (
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
    "DejaVuSans-Bold.ttf",
)


# Converts a "#rrggbb" string into an (r, g, b) tuple for Pillow.
def _hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


# Loads a bold TrueType face at the requested size, falling back to the built-in
# bitmap font when no system font is available.
def _load_font(size: int):
    from PIL import ImageFont

    for path in _FONT_CANDIDATES:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


# Draws a single 32x32 "S" mark in the accent colour on a rounded theme-coloured
# tile and returns the encoded PNG bytes.
def render(accent: str, theme: str) -> bytes:
    from PIL import Image, ImageDraw

    color = _hex_to_rgb(ACCENT_COLORS.get(accent, ACCENT_COLORS["orange"]))
    bg = _hex_to_rgb(THEME_BACKGROUNDS.get(theme, THEME_BACKGROUNDS["dark"]))

    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([0, 0, 31, 31], radius=6, fill=bg)

    font = _load_font(26)
    # Centre the glyph using its measured bounding box.
    left, top, right, bottom = draw.textbbox((0, 0), "S", font=font)
    x = (32 - (right - left)) / 2 - left
    y = (32 - (bottom - top)) / 2 - top
    draw.text((x, y), "S", font=font, fill=color)

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


# Canonical variant name ("<accent>-<theme>") used as the file stem and URL slug.
def variant_name(accent: str, theme: str) -> str:
    return f"{accent}-{theme}"


# Every valid variant slug, used by the server to reject unknown filenames.
VALID_VARIANTS: frozenset[str] = frozenset(
    variant_name(a, t) for a in ACCENT_COLORS for t in THEME_BACKGROUNDS
)


# Renders every accent/theme combination into target_dir as "<variant>.png".
# Files are written to a per-process temp name and atomically moved into place so a
# concurrent worker never serves a half-written file. Returns the resolved directory.
def generate_all(target_dir: str | os.PathLike[str]) -> Path:
    target = Path(target_dir)
    target.mkdir(parents=True, exist_ok=True)

    for accent in ACCENT_COLORS:
        for theme in THEME_BACKGROUNDS:
            dest = target / f"{variant_name(accent, theme)}.png"
            tmp = dest.with_name(f"{dest.name}.{os.getpid()}.tmp")
            tmp.write_bytes(render(accent, theme))
            os.replace(tmp, dest)

    return target


# Allows build-time generation: `python -m app.favicon <dir>`.
if __name__ == "__main__":
    import sys

    out = sys.argv[1] if len(sys.argv) > 1 else "favicons"
    written = generate_all(out)
    print(f"Wrote {len(VALID_VARIANTS)} favicon variants to {written}")
