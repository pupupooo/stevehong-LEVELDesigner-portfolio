# Level Design Portfolio Landing

## Purpose

`/level-design/` is a parallel public landing page for level-design-focused opportunities.
It does not replace or redirect the repository root homepage.

## Page contract

- Reuse the root homepage's visual language, typography, and section order.
- Keep public copy factual and portfolio-facing.
- Do not explain the portfolio strategy, reading order, or job-search intent.
- Do not use first-person narration in the landing-page copy.
- Do not link this landing page back to the root AI/gameplay profile.
- Order work by relevance: level design, gameplay systems, then tools.

## File boundary

- `index.html`: self-contained structure, styles, and public Chinese copy.
- `styles.css`: retained first-draft stylesheet; not loaded by the current page.
- `og.png`: link preview image for this independent public URL.
- Do not introduce shared dependencies or modify the root homepage for this landing page.
- Reuse existing work images by relative path; do not duplicate them.

## Public routes

- `/level-design/`: this landing page.
- `/works/wetland-poi-case-study/`: the featured Wetland POI case study.

## Verification

- Serve the repository root at `http://127.0.0.1:4180`.
- Check desktop and mobile layouts.
- Check all work links and local image paths.
- Confirm the Wetland POI video loads and chapter controls remain usable.
