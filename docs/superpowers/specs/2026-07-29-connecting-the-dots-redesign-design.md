# Social Cafe — "Connecting the Dots" redesign

**Date:** 2026-07-29
**Scope:** Full visual redesign of the single-page static site.

## Problem

The site was a Mr. Web Designer template: stock white coffee-cup PNGs, three
photographic background images, and a wobbly `border-radius` blob applied to
every button, card and box. It shipped ~1.9 MB to render one page and looked
like a template rather than like Social Cafe.

## Concept

The logo already reads **"Connecting The Dots"** around a green ring. The site
is built around that phrase taken literally: a single continuous curve — *the
thread* — runs the length of the page, drawing itself as you scroll and lighting
a dot at each section it reaches.

## Decisions

**Palette.** Warm paper (`#faf7f2`) with espresso ink (`#2b231d`). The brand
green (`#3aa76d`) is reserved for the thread, the dots, and interactive states,
so it reads as *connection* rather than decoration. Buttons use the green as
their solid fill.

**Type.** Fraunces (variable serif, `SOFT`/`WONK` axes) for display, Poppins
trimmed to two weights for body.

**Shape language.** The blob radius is gone. One signature form — the **arch**
(`50vw 50vw` top, small radius bottom) — carries the "fine curve" idea on the
hero photograph. Everything else uses a calm 12/20/32/pill scale.

**The thread.** One SVG spanning the document, `pointer-events: none`, at
`z-index: 0` with all sections transparent above it.

- Path is built in JS from the live positions of every `[data-thread-node]`
  section, smoothed with Catmull-Rom emitted as cubic beziers.
- Two paths render: a faint **track** showing the whole route ahead, and the
  green **progress** line drawn over it.
- `stroke-dashoffset` is driven by a y→length lookup table (600 samples,
  binary searched), so the draw is *scrubbed* by scroll — scroll up and it
  retracts.
- The thread lives in the left gutter, meandering between two fractions of
  viewport width. Swinging it across the full page dragged the line diagonally
  through the hero copy; the gutter lane keeps it visible end to end and never
  on top of content. `--gutter` was widened to `clamp(2.4rem, 11vw, 16rem)` to
  give it that lane.
- Rebuilt on resize, on `fonts.ready`, and via `ResizeObserver` on `main` and
  the footer — deliberately *not* `<body>`, so the thread's own height cannot
  feed back into the measurement.
- `prefers-reduced-motion`: path fully drawn, all dots lit, no transforms.

**Section seams.** Hairline SVG wave strokes rather than filled bands. Filled
alternating bands would have painted over the thread and broken its continuity;
hairlines also match the "fine curves and lines" brief more closely.

**Hero.** Copy left, arch photograph right, sharing a grid row but never the
same space. An earlier revision ran the wordmark *behind* the photo; it cost
legibility, so the two columns are now strictly separated. Below 768px the copy
centres and the arch drops beneath it.

**Reviews.** Real Google reviews, attributed "via Google Reviews", with a link
out to the Google Maps listing for verifiability.

## Weight

Every background image and every stock PNG was removed; Font Awesome and Swiper
were replaced by an inline SVG sprite and a CSS `scroll-snap` carousel.

| | before | after |
|---|---|---|
| images | ~1.55 MB | 127 KB (`hero.jpg` + `logo-mark.png`) |
| JS/CSS libraries | ~355 KB | 0 |

No build step and no runtime dependencies.

## Structural fixes carried along

- `<html lang="es">` → `en`.
- The booking `<form>` was never closed and `.footer` was nested inside
  `.book`.
- `* { transition: all .2s linear }` — animated every property on every
  element and would have fought the scroll animation.
- `* { text-transform: capitalize }` — mangled copy globally.

## Files

`index.html` · `css/style.css` · `js/script.js` (header, nav, scroll-spy,
reveals, carousel) · `js/thread.js` (the thread, self-contained).

## Verification

Behaviour was verified by driving a real headless Chrome over CDP with genuine
wheel gestures — virtual-time headless starves `requestAnimationFrame` and never
dispatches scroll events, which makes the thread impossible to observe. At
1440×900 the line draws monotonically (426 → 4400 of 4400), all six dots light
in sequence, 29/29 reveals fire and scroll-spy tracks the active section.
Layout checked at 1440, 500 and in a full-page render.
