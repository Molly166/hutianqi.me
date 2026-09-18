#!/usr/bin/env python3
"""Build a Unicode-mapped TrueType/WOFF2 font from handwritten glyph PNGs."""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont


FONT_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = FONT_ROOT.parent
GLYPH_DIR = FONT_ROOT / "glyphs"
MANIFEST_PATH = FONT_ROOT / "glyphs.json"
CHARSET_PATH = FONT_ROOT / "charset.txt"
OUTPUT_DIR = PROJECT_ROOT / "public" / "fonts"

UNITS_PER_EM = 1000
ADVANCE_WIDTH = 1000
INK_SIZE = 760
BASELINE = 90
THRESHOLD = 235
MIN_COMPONENT_AREA = 18


def codepoint_value(value: str) -> int:
    return int(value.removeprefix("U+"), 16)


def clean_mask(
    path: Path,
    keep_largest_components: int | None = None,
    threshold: int | str = THRESHOLD,
) -> np.ndarray:
    image = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
    if image is None:
        raise RuntimeError(f"Unable to read glyph image: {path}")

    if threshold == "otsu":
        _, mask = cv2.threshold(
            image, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
        )
    else:
        mask = np.where(image < int(threshold), 255, 0).astype(np.uint8)
    component_count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    usable_components = [
        component
        for component in range(1, component_count)
        if int(stats[component, cv2.CC_STAT_AREA]) >= MIN_COMPONENT_AREA
    ]
    usable_components.sort(
        key=lambda component: int(stats[component, cv2.CC_STAT_AREA]), reverse=True
    )
    if keep_largest_components is not None:
        usable_components = usable_components[:keep_largest_components]

    cleaned = np.zeros_like(mask)
    for component in usable_components:
        cleaned[labels == component] = 255

    points = cv2.findNonZero(cleaned)
    if points is None:
        raise RuntimeError(f"No usable ink found in {path}")
    x, y, width, height = cv2.boundingRect(points)
    return cleaned[y : y + height, x : x + width]


def contour_clockwise(points: list[tuple[float, float]]) -> bool:
    area = 0.0
    for index, (x1, y1) in enumerate(points):
        x2, y2 = points[(index + 1) % len(points)]
        area += (x2 - x1) * (y2 + y1)
    return area > 0


def glyph_from_mask(mask: np.ndarray):
    height, width = mask.shape
    scale = INK_SIZE / max(width, height)
    scaled_width = width * scale
    x_offset = (ADVANCE_WIDTH - scaled_width) / 2
    y_offset = BASELINE

    contours, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    if hierarchy is None:
        raise RuntimeError("Glyph has no contours")

    pen = TTGlyphPen(None)
    for index, contour in enumerate(contours):
        if abs(cv2.contourArea(contour)) < MIN_COMPONENT_AREA:
            continue
        simplified = cv2.approxPolyDP(contour, epsilon=0.8, closed=True)
        points = [
            (
                round(x_offset + float(point[0][0]) * scale),
                round(y_offset + (height - float(point[0][1])) * scale),
            )
            for point in simplified
        ]
        if len(points) < 3:
            continue

        is_hole = hierarchy[0][index][3] >= 0
        is_clockwise = contour_clockwise(points)
        if (not is_hole and not is_clockwise) or (is_hole and is_clockwise):
            points.reverse()

        pen.moveTo(points[0])
        for point in points[1:]:
            pen.lineTo(point)
        pen.closePath()

    return pen.glyph()


def notdef_glyph():
    pen = TTGlyphPen(None)
    pen.moveTo((120, 100))
    pen.lineTo((880, 100))
    pen.lineTo((880, 860))
    pen.lineTo((120, 860))
    pen.closePath()
    pen.moveTo((200, 180))
    pen.lineTo((200, 780))
    pen.lineTo((800, 780))
    pen.lineTo((800, 180))
    pen.closePath()
    return pen.glyph()


def empty_glyph():
    return TTGlyphPen(None).glyph()


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    wanted_characters = set(CHARSET_PATH.read_text(encoding="utf-8").strip())
    entries = manifest["glyphs"]
    available_characters = {entry["character"] for entry in entries}
    missing = wanted_characters - available_characters
    if missing:
        raise SystemExit(f"Missing glyph mappings: {''.join(sorted(missing))}")

    glyph_order = [".notdef", "space"]
    glyphs = {".notdef": notdef_glyph(), "space": empty_glyph()}
    metrics = {".notdef": (ADVANCE_WIDTH, 0), "space": (500, 0)}
    cmap: dict[int, str] = {0x20: "space"}

    for entry in entries:
        character = entry["character"]
        if character not in wanted_characters:
            continue
        codepoint = codepoint_value(entry["codepoint"])
        glyph_name = f"uni{codepoint:04X}"
        source_path = GLYPH_DIR / f"{entry['codepoint']}.png"
        if not source_path.is_file():
            raise SystemExit(f"Missing source image: {source_path}")
        glyph_order.append(glyph_name)
        glyphs[glyph_name] = glyph_from_mask(
            clean_mask(
                source_path,
                entry.get("keep_largest_components"),
                entry.get("threshold", THRESHOLD),
            )
        )
        metrics[glyph_name] = (ADVANCE_WIDTH, 0)
        cmap[codepoint] = glyph_name

    builder = FontBuilder(UNITS_PER_EM, isTTF=True)
    builder.setupGlyphOrder(glyph_order)
    builder.setupCharacterMap(cmap)
    builder.setupGlyf(glyphs)
    builder.setupHorizontalMetrics(metrics)
    builder.setupHorizontalHeader(ascent=880, descent=-120)
    builder.setupNameTable(
        {
            "familyName": "Hu Tianqi Handwriting",
            "styleName": "Regular",
            "uniqueFontIdentifier": "HuTianqiHandwriting-Regular-0.1",
            "fullName": "Hu Tianqi Handwriting Regular",
            "psName": "HuTianqiHandwriting-Regular",
            "version": "Version 0.1",
        }
    )
    builder.setupOS2(
        sTypoAscender=880,
        sTypoDescender=-120,
        usWinAscent=880,
        usWinDescent=120,
        sxHeight=500,
        sCapHeight=700,
        fsType=0,
    )
    builder.setupPost()
    builder.setupMaxp()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    ttf_path = OUTPUT_DIR / "hu-tianqi-handwriting.ttf"
    woff2_path = OUTPUT_DIR / "hu-tianqi-handwriting.woff2"
    builder.save(ttf_path)

    web_font = TTFont(ttf_path)
    web_font.flavor = "woff2"
    web_font.save(woff2_path)

    expected = {ord(character) for character in wanted_characters}
    built_font = TTFont(woff2_path)
    built_cmap = set(built_font.getBestCmap())
    if not expected.issubset(built_cmap):
        missing_values = expected - built_cmap
        raise SystemExit(f"Built font cmap is incomplete: {missing_values}")

    print(f"built {ttf_path.relative_to(PROJECT_ROOT)}")
    print(f"built {woff2_path.relative_to(PROJECT_ROOT)}")
    print("mapped:", " ".join(f"{char} U+{ord(char):04X}" for char in sorted(wanted_characters)))


if __name__ == "__main__":
    main()
