# Experience Note Framework QA

Final result: passed.

## Scope and Evidence

- Reference image: `/var/folders/yd/p2jnshkn0k127_80fl5t4ymm0000gn/T/codex-clipboard-e176eace-5e14-4db1-8920-3b6201a3899d.png`, 1080 × 1440.
- Local page: `http://127.0.0.1:3000/school/`.
- Desktop screenshot: `/private/tmp/hutianqi-experience-qa/desktop-final.jpg`, 1280 × 720.
- Mobile screenshot: `/private/tmp/hutianqi-experience-qa/mobile-final.jpg`, 390 × 844.
- Historical empty-state screenshot: `/private/tmp/hutianqi-experience-qa/empty-final.jpg`, 1280 × 720.
- Detail comparison: `/private/tmp/hutianqi-experience-qa/reference-detail.png` and `implementation-detail.png` in the same directory.
- The browser DPR was 2. Screenshots were already exported at CSS-pixel dimensions and were not resized again. The reference is a physical photograph rather than a same-viewport interface design, so the comparison covers materials, pins, staggered composition, and handwriting character rather than claiming pixel-perfect reproduction.
- The reference, desktop and mobile screenshots, and both detail images were reviewed together. Screenshots remain in the temporary directory and are not bundled with the website.

## State and Intentional Differences

The original visual QA used clearly labeled layout-test data: five notes in September and one in October. These fixtures tested text length, wrapping, image ratios, empty months, and date order. The solid-color squares were paper textures for image-layout verification, not real photographs. All QA fixtures were removed. Production experiences use one JSON file per event; no experience event had been published when this QA was completed.

The existing mist-green background, Kai-style system typeface, and footprint back control were retained. The reference image's lamp, jewelry, and quoted text were not copied. Individual notes were arranged row by row in date order to avoid readability issues caused by overlap. Mobile used a single column with independent vertical scrolling. Denser collage layouts and real-photo composition were deferred until real content became available.

## Required Visual Checks

| Area | Result |
| --- | --- |
| Typography | Uses the user-selected Kai-style system font stack. Dates appear at the top of each note; title and body hierarchy is clear; long text wraps without clipping. The result intentionally differs from the thinner handwriting in the reference photograph. |
| Layout rhythm | Four columns on desktop and one column on mobile. Paper cards used subtle rotation and staggered spacing. Notes did not cover the footprint control or bottom timeline. A 320 px viewport had no horizontal page overflow. |
| Color | Warm white paper and soft shadows contrasted with the mist-green background. The dark brown lighting of the reference was not copied, preserving the site's established theme. |
| Assets | Paper and transparent pins were real bitmap assets generated with ImageGen, not simulated CSS shapes. The WebP files totaled 58,422 bytes. Pins displayed at 128 px had no white background or obvious transparency edge. |
| Copy | Month labels remained available to screen readers while the visual timeline displayed years only. No identity heading, month heading, or left/right arrow was added. The visual QA kept no fictional experiences; production content came from per-event JSON files. |

## Interaction Verification

- Unsorted input rendered as 09.01, 09.12, 09.23, 09.26, and 09.28. Unit tests guaranteed stable ordering for events on the same date.
- Selecting the timeline replaced the entire board: the outgoing board used a negative-X transform and the incoming board used a positive-X transform. The outgoing board also received `aria-hidden` and `inert`.
- Dragging left over the note area or an image advanced to the next month. Empty months retained no notes from the previous month.
- After scrolling long content and changing months, the outgoing board retained its `scrollTop` value, measured at 910, instead of jumping to the top.
- Home, End, and arrow-key navigation worked with a single radio tab stop and automatic scrolling to the selected tick. Mobile tick targets measured 46 × 44 px.
- A test date in December 2027 extended the timeline automatically. Removing that test data while it was selected safely returned the view to September 2023 and preserved all 37 months and the timeline.
- Vertical scrolling on mobile did not obscure the footprint control or timeline. Neither 390 × 844 nor 320 × 740 produced document-level horizontal overflow.
- The footprint control triggered the existing cloud transition and returned to the home page. The home-page model and education entry control remained available.
- The console contained no errors or warnings. The temporary viewport was reset.
- Reduced-motion styles and branches were checked statically: board animations were disabled and page replacement happened immediately. The operating-system preference was not toggled for a browser-level test during this QA.

## Review History and Conclusion

1. The first desktop comparison confirmed that materials, date placement, the vertical-line timeline, and blank-space boundaries matched the intended adaptation. No P0, P1, or P2 visual issues were found.
2. Code review also found an out-of-range selected index when the date range contracted, plus an exit-scroll reset caused by the revision key. Stable month IDs fixed both issues. Browser checks covered removing an extended date and preserving `scrollTop`. These were functional fixes, not presented as visual-QA iteration.
3. After image-size optimization, the same 1280 × 720 desktop state was captured again and reviewed with the reference and mobile screenshots. No new P0, P1, or P2 issues were found. Paper texture, transparent pins, body text, and dates remained clear.

Delivery checks: 32 automated tests, ESLint, static build, and `git diff --check` passed. No demo data remained. Nothing was pushed or merged. Shared data support existed for companies, internships, work, and life, but their pages and models had not yet been added.

Optional follow-up: adjust individual note widths, visual density, and photo composition after real images and copy are available.
