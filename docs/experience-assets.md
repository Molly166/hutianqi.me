# Experience note assets

Generated on 2026-09-20 with the built-in `image_gen` tool. These assets provide the paper surface and decorative pin for handwritten memory notes. The supplied study-wall photograph was inspected as a material and mood reference.

## Web assets

| Asset | Public file | Dimensions | Encoding | Size |
| --- | --- | --- | --- | ---: |
| Paper | `public/images/experiences/note-paper.webp` | 1024 × 1024 | WebP, quality 82, RGB | 51,164 bytes |
| Pin | `public/images/experiences/note-pin.webp` | 128 × 128 | WebP, quality 90, alpha quality 100, RGBA | 7,258 bytes |

Combined size: **58,422 bytes** (about 57.1 KiB).

The source PNG files are retained outside the repository at `/private/tmp/hutianqi-experience-qa/note-paper.png` and `/private/tmp/hutianqi-experience-qa/note-pin.png`; only the optimized assets ship. Conversion used the already installed `sharp` 0.35.4 library with encoding effort 6. No artistic changes, flattening, or background replacement were applied during conversion.

## Paper provenance

Mode: built-in image generation, one generation call. The photograph informed the text brief; it was not attached to the generation call. The output was 1254 × 1254 RGB, then resized with macOS `sips` to the retained 1024 × 1024 source PNG before WebP encoding.

Original generated file:

`/Users/bytedance/.codex/generated_images/01a0bf7a-6ec0-7982-94f1-aa9fcb16658d/exec-7d43690f-5a5a-426f-8334-dc2d6e1b7e36.png`

Exact generation prompt:

```text
Use case: photorealistic-natural
Asset type: blank paper texture for handwritten memory note cards on a website.
Primary request: Generate ONE square 1024 by 1024 pixel photographic texture of pale warm ivory writing paper. The material should evoke cozy handwritten notes pinned on a warm study wall, but this asset contains only blank paper.
Composition/framing: perfectly overhead close-up; paper fills the entire frame edge to edge with no visible sheet edges, no background surface, and no perspective distortion.
Materials/textures: delicate fine natural paper fibers, very faint organic tonal variation, smooth uncoated writing-paper surface, restrained texture suitable underneath readable handwriting.
Lighting/mood: even soft warm illumination across the whole image, pale ivory rather than brown, no cast shadows, no vignette, no directional lighting gradients.
Constraints: completely blank; absolutely NO text, letters, handwriting, numbers, marks, ruled lines, grid lines, stains, creases, borders, tears, clips, pins, tape, other objects, logos, or watermarks. Photographic material texture only.
```

## Pin provenance

Mode: built-in image generation followed by one framing edit. The edit tightened the framing without changing the artwork. The retained source PNG is 1254 × 1254 RGBA with real transparency.

Generation brief summary: one transparent clear acrylic or glasslike thumbtack, viewed from the front, with warm light from the upper left and a short shadow extending down and right. The framing edit brought the same pin closer within the square canvas.

Exact initial prompt:

```text
Use case: product-mockup
Asset type: transparent PNG website decoration, a tiny realistic thumbtack for the top of a handwritten paper memory note.
Primary request: ONE individual transparent clear acrylic / glasslike push pin, photographed nearly straight-on as though it is already pinning a note to a vertical wall. The visible pin has a glossy round domed cap, a very short narrow neck and small clear base, with the metal point concealed behind it. The object should read well when displayed around 26 by 32 pixels.
Scene/backdrop: genuinely transparent alpha background. Isolated cutout of only the single pin, with no paper or wall. Preserve transparency through the clear acrylic, with subtle warm reflections defining its shape.
Style/medium: photorealistic macro product photograph, matching a quiet, warm handwritten keepsake wall.
Composition/framing: tight square canvas, single centered pin fills about 70 percent of the canvas height; front-facing, vertical, with a slight downward view just enough to show rounded cap and short neck.
Lighting/mood: soft warm light from upper left, crisp small glossy highlight, delicate neutral amber edge reflections. Include only a small short soft translucent contact shadow extending slightly down-right behind the pin.
Constraints: output one PNG with genuine transparent alpha surrounding the pin and shadow. No opaque background, no white rectangle, no checkerboard pattern, no paper, no wall, no text, no watermark, no extra pins, no extra objects, no long exposed metal needle.
```

Exact framing-edit prompt:

```text
Use case: precise-object-edit
Input image: the generated transparent acrylic thumbtack cutout is the edit target.
Primary request: change ONLY the framing: zoom in / crop more tightly so the physical pin itself fills 74 percent of the square canvas height. Keep the complete pin and its short down-right shadow inside the canvas.
Invariants: preserve the exact single glasslike clear acrylic thumbtack, rounded glossy cap, short neck, warm upper-left highlights, nearly straight-on viewpoint and the short soft down-right shadow. Preserve the genuine transparent alpha background. Do not add any objects, background, paper, wall, text or checkerboard pattern. Output a square transparent PNG.
```

## Verification

- Visually inspected both final WebP files.
- Paper remains blank, pale warm ivory, with fine fibers and no visible sheet edges, writing, ruled lines, pins, or cast shadows.
- Pin retains its clear material, warm highlights, soft shadow, and transparent background.
- Compared all 16,384 alpha pixels against the source resized to 128 × 128: maximum alpha difference is **0**. The final pin contains 8,259 fully transparent pixels, 7,917 partially transparent pixels, and 208 opaque pixels.
