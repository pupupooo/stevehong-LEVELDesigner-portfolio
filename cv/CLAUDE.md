# CV Pages Rules

## Scope

This directory contains job-targeted CV landing pages. These pages reuse the existing portfolio evidence but present it with role-specific positioning.

## Structure

- `for-ai-native/index.html`: AI Native game research, system analysis, and prototype-builder CV page.
- `for-ai-native/resume.html`: print-ready one-page resume for the same role direction.
- `for-ai-native/resume-copy.md`: source copy for matching resume exports. Keep it text-only and company-neutral.
- `for-ai-native/resume-export/`: generated PDF/image exports from `resume.html`.
- Future role-specific pages should use lowercase English slugs under `cv/`.

## Naming

- Use lowercase English slugs for directories.
- Do not include company names in directory names, page titles, metadata, or public copy unless Steve explicitly asks for a company-specific version.
- Keep public-facing copy in Chinese. Keep project names, code identifiers, and role labels in English where useful.

## Editing

- Do not modify the public homepage or existing work pages when creating a targeted CV page unless explicitly requested.
- Do not link targeted CV pages from the public homepage by default.
- Add `noindex,nofollow` metadata to targeted CV pages unless the page is intended to become public navigation.
- Reuse existing work assets by relative path instead of duplicating images.

## Verification

Serve from the repository root:

```bash
python3 -m http.server 4180
```

Then check the targeted page path directly. Confirm desktop and mobile layouts do not overlap, local links resolve, and the page does not mention an unintended company name.
