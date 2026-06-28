# alexholland.tech

Single-page portfolio for Alex Holland. Static assets only, deployed to GitHub Pages on the custom domain `alexholland.tech` (see `CNAME`). No build step — edit, commit, push.

## Design

Swiss-modern editorial layout on a rich deep-green canvas, brighter and warmer than a pure dark theme, with a luminous jade accent used throughout. Type-led hierarchy: Archivo for UI, JetBrains Mono for technical labels, and Instrument Serif for display type (hero name, project titles). Hairline rules, generous whitespace, no decorative glows or AI-trope effects. One confident art direction — no light/dark toggle. The aim is calm "high design" (Apple/Swiss), skimmable and show-don't-tell — not a forced-techy look. The `AH` logo (`assets/images/AH logo white/black.png`) is the brand mark, favicon, and a recurring motif.

## Structure

`index.html` is one page, in-page anchors only:

- **Hero** (`#top`) — the name in Instrument Serif and a short value line, with a large **AH monogram** as the focal motif. The monogram is an inline **SVG** (`.mono`) whose geometry was traced from the logo PNG: six parchment strokes (`.mono__s`) that draw on stage by stage via `stroke-dashoffset` (`@keyframes monoDraw`, staggered with `--i`), then the "hidden" jade up-arrow living in the negative space (`.mono__arrow`) is revealed last with a glow flash + expanding `.mono__pop` ring. All CSS-driven, gated on `.js` so it shows solid without JS, and collapsed to the final state under `prefers-reduced-motion`. No canvas, no floating cards, no parallax.
- **About** (`#about`) — round avatar + short prose, then a `.spec` definition list of key facts (non-clickable rows have no hover affordance; only links underline).
- **Work** (`#work`) — a large **featured** block (`.feature`, currently Qualify, always shown) above the client-side filters and a 3-up `.work-grid`. Both the featured block and each `.g-item` are `data-project` containers: the visible `<a data-case-open>` opens a full-screen case study instead of navigating, and a sibling `<template data-case>` holds that study's markup. `data-tags` on each `.g-item` drives the filters (`all`, `ai`, `web`, `hardware`, `business`); the featured block sits outside the filtered list.
- **Project viewer** — a single full-screen overlay (`.viewer`, `[data-viewer]`) near the end of `<body>`. Clicking a project clones its `<template data-case>` into the viewer (`openViewer` in `main.js`): scrollable, focus-trapped, closes on Esc / scrim / Close, locks body scroll. Deep case studies (Qualify, Cynthia) carry full narrative + `.case__meta`; lighter ones carry image + blurb + external link.
- **Experience** (`#experience`) — `.ledger` role timeline with a static hairline accent rule per row (not clickable, no hover).
- **Contact** (`#contact`) — statement, email, résumé and social text links.

## Styling & behavior

- All styles live in `assets/css/main.css`. Design tokens (colors, spacing, fonts, easing) are CSS variables in `:root`. Motion respects `prefers-reduced-motion` (sheen/parallax disabled); hover transitions avoid layout-shifting properties. Only clickable things get hover styling.
- `assets/js/main.js` handles: sticky-header background, scrollspy nav, scroll reveal (`.reveal`, with `style="--d:n"` for stagger), the mobile sheet, project filters, the full-screen project viewer, and the hero monogram parallax. A shared `lock()`/`unlock()` counter drives `body[data-locked="true"]` for both the mobile sheet and the viewer. Add `class="reveal"` to any new block to animate it in.

## Content tips

- Adding a project: duplicate a `<article class="g-item" data-tags="…" data-project>` — the visible card (`<a class="g-card" href="<external>" data-case-open>`) plus a `<template data-case>` with the case study. Keep the `href` pointed at the real external link so it still works without JS.
- The featured cover and case covers use a CSS-only branded placeholder (`.brandcover`, AH mark + wordmark). To use a real screenshot, replace the `.brandcover` block with an `<img class="feature__shot">` (featured) or an `<img>` inside `.case__cover`.
- Résumé file is `Alexander Holland Resume.pdf`; links use the URL-encoded path `Alexander%20Holland%20Resume.pdf`.
- Project thumbnails are WebP with PNG/JPEG fallbacks in `assets/images/projects`. Keep `loading="lazy"` and explicit `width`/`height` for CLS.
- Run Lighthouse after significant changes; target ≥95 for Performance, Accessibility, Best Practices, and SEO.
