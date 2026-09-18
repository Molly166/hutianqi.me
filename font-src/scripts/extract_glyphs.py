#!/usr/bin/env python3
"""Extract handwritten glyph crops from the source PDF."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageOps


FONT_ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = FONT_ROOT / "glyphs.json"
GLYPH_DIR = FONT_ROOT / "glyphs"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", required=True, type=Path, help="Path to the handwriting PDF")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.pdf.is_file():
        raise SystemExit(f"PDF not found: {args.pdf}")
    if shutil.which("pdftoppm") is None:
        raise SystemExit("pdftoppm is required but was not found on PATH")

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    dpi = int(manifest["source_dpi"])
    GLYPH_DIR.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="hutianqi-glyphs-") as temp_dir:
        temp_root = Path(temp_dir)
        rendered_pages: dict[int, Path] = {}

        for glyph in manifest["glyphs"]:
            codepoint = glyph["codepoint"]
            bbox = tuple(int(value) for value in glyph["bbox"])
            source_file = glyph.get("source_file")
            if source_file:
                source_path = FONT_ROOT / source_file
                if not source_path.is_file():
                    raise SystemExit(f"Glyph source not found: {source_path}")
                with Image.open(source_path) as source_image:
                    crop = ImageOps.grayscale(source_image.crop(bbox))
                    crop.save(GLYPH_DIR / f"{codepoint}.png", optimize=True)
                print(f"extracted {glyph['character']} {codepoint} from {source_file}")
                continue

            page = int(glyph["page"])
            if page not in rendered_pages:
                prefix = temp_root / f"page-{page:02d}"
                subprocess.run(
                    [
                        "pdftoppm",
                        "-f",
                        str(page),
                        "-l",
                        str(page),
                        "-singlefile",
                        "-png",
                        "-r",
                        str(dpi),
                        str(args.pdf),
                        str(prefix),
                    ],
                    check=True,
                )
                rendered_pages[page] = prefix.with_suffix(".png")

            with Image.open(rendered_pages[page]) as page_image:
                crop = ImageOps.grayscale(page_image.crop(bbox))
                crop.save(GLYPH_DIR / f"{codepoint}.png", optimize=True)
            print(f"extracted {glyph['character']} {codepoint} from page {page}")


if __name__ == "__main__":
    main()
