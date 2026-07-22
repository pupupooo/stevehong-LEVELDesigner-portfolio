# Event Frontline Time System

Public portfolio case for the event-frontline time-system prototype.

## Structure

- `index.html`: Chinese-facing system design case study.
- `demo/index.html`: standalone playable prototype.
- `demo/event-frontline-engine.mjs`: deterministic rules and state transitions.
- `demo/event-frontline-engine.test.mjs`: focused regression coverage.
- `images/`: screenshots used by this case only.

## Ownership

The public demo under `works/` is the portfolio snapshot and should remain playable on its own. Research notes under `docs/teach-llm-open-world/` are supporting design material; changes do not sync automatically between the two locations.

The case page must keep implemented proof separate from future system direction.

## Verification

Run from the repository root:

```bash
python3 -m http.server 4180
node --test works/event-frontline-time-system/demo/event-frontline-engine.test.mjs
```

Then verify the case page and demo at desktop and mobile widths with no console errors or overflow.
