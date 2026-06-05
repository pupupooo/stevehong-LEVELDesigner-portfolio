# LLM Director Hitman Portfolio Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `LLM Director Hitman` standalone portfolio page and add its homepage work card.

**Architecture:** This is a static portfolio addition. The new page lives under `works/llm-director-hitman/`, shares the existing industrial portfolio visual language, uses copied prototype imagery from the local `llm_director_hitman` repository, and is guarded by a lightweight Node static test.

**Tech Stack:** Static HTML/CSS, local image assets, Node.js built-in `fs` / `path` for verification.

---

### Task 1: Static Verification Test

**Files:**
- Create: `scripts/check-llm-director-page.mjs`

- [ ] **Step 1: Write the failing test**

Create a Node script that asserts:

- `works/llm-director-hitman/index.html` exists.
- The page contains the approved H1, GitHub link, three public layer names, `纺锤体体验线`, `可信中间状态`, and `同一命题的两个尺度`.
- The page copy does not contain `不是...而是` or `不是...，而是`.
- `index.html` links to `works/llm-director-hitman/index.html`.
- The homepage ordering is `level-design-deck` before `llm-director-hitman`, and `llm-director-hitman` before `Yatzyforge`.

- [ ] **Step 2: Run the test to verify RED**

Run: `node scripts/check-llm-director-page.mjs`

Expected: failure because `works/llm-director-hitman/index.html` does not exist.

### Task 2: Prototype Assets

**Files:**
- Create: `works/llm-director-hitman/images/`
- Copy selected files from `/Users/mofashu/Documents/llm_director_hitman/`

- [ ] **Step 1: Copy visual assets**

Copy these assets:

- `public/sprites/map/gallery_event_map_v2.png` -> `works/llm-director-hitman/images/gallery_event_map_v2.png`
- `.logs/strategy-probe/poison_intent.png` -> `works/llm-director-hitman/images/poison_intent.png`
- `.logs/strategy-probe/combo_power_infiltrate.png` -> `works/llm-director-hitman/images/combo_power_infiltrate.png`
- `.logs/strategy-probe/spoof_lure.png` -> `works/llm-director-hitman/images/spoof_lure.png`

- [ ] **Step 2: Confirm assets exist**

Run: `find works/llm-director-hitman/images -maxdepth 1 -type f | sort`

Expected: the four copied image files are listed.

### Task 3: Standalone Page

**Files:**
- Create: `works/llm-director-hitman/index.html`

- [ ] **Step 1: Implement the page**

Create the page from the approved spec:

- Hero with H1, subtitle, GitHub link, and actual prototype image.
- Design judgment section compressed to 3-5 paragraphs.
- Core problem section with affirmative wording.
- Spindle experience line section.
- Three-layer structure section.
- One plan through the system section.
- Prototype status section.
- `同一命题的两个尺度` section.
- Boundaries and next step section.

- [ ] **Step 2: Run static test**

Run: `node scripts/check-llm-director-page.mjs`

Expected: still fails because homepage card is not added.

### Task 4: Homepage Card

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add work card**

Insert a `LLM Director Hitman` card immediately after the `level-design-deck` card and before `Yatzyforge`.

- [ ] **Step 2: Run static test**

Run: `node scripts/check-llm-director-page.mjs`

Expected: pass.

### Task 5: Browser Verification

**Files:**
- No new files unless screenshot artifacts are needed.

- [ ] **Step 1: Serve the static portfolio**

Run: `python3 -m http.server 8765`

Open: `http://127.0.0.1:8765/`

- [ ] **Step 2: Inspect desktop and mobile**

Use Browser to inspect:

- Homepage card placement.
- Standalone page first viewport.
- Desktop and mobile layout.
- GitHub link target.

- [ ] **Step 3: Final verification**

Run:

- `node scripts/check-llm-director-page.mjs`
- `git diff --check`
