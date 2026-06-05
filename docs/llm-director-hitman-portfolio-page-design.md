# LLM Director Hitman Portfolio Page Design

status: draft  
date: 2026-06-05  
scope: `works/llm-director-hitman/index.html` and the homepage work card

## Goal

Add `LLM Director Hitman` to the portfolio as a playable design research prototype.

The page should explain why this prototype exists, how its three-layer structure keeps AI-driven play controllable, and how the project tests a spindle-shaped play experience: one clear mission start, a widened middle of natural-language opportunity chains, and one or a limited number of designed endpoints.

Repository link:

https://github.com/huoshangou/llm-director-hitman

## Positioning

This page should read as a gameplay design case study proven through a runnable prototype.

The core claim:

> Open-ended feeling comes from natural-language planning. Credibility comes from a deterministic sandbox. Richness comes from staged, believable intermediate states.

`LLM Director Hitman` is the small playable slice for this design problem. The stealth / assassination case is used because intent, constraints, routes, risk, and consequences are easy to test in a small demo. The broader design concern also connects to `Sandbox Director` / `沙盒开放世界任务设计`, which explores the same problem at an open-world quest-system scale.

## Entry Strategy

Create a standalone page:

`works/llm-director-hitman/index.html`

Add a homepage work card immediately after `level-design-deck` and before `Yatzyforge`.

Keep `Sandbox Director` available as adjacent or historical thinking. Give `LLM Director Hitman` the stronger current-proof-point placement.

## Title Hierarchy

H1:

`LLM Director Hitman：可控 AI 玩法体验原型`

Opening subtitle:

`一个 LLM 驱动的类《杀手》沙盒原型设计：玩家用自然语言提出暗杀计划，系统把开放表达编排成合法工具调用，并通过确定性结算与演出表现层让玩家看见自己如何真实影响了世界。`

Supporting first-viewport claim:

`用三层结构构建“单一起点 -> 中段展开 -> 有限终点”的纺锤体体验线。`

## Writing Style

Use direct positive claims. Avoid repeated `不是...而是...` sentence structures, because they read as AI-generated rhetorical filler and do not match the rest of the CV pages.

Prefer:

- Concrete design problems
- Direct design judgments
- Explicit boundaries
- Examples that move through player intent, system interpretation, world change, and presentation

Avoid:

- Defensive contrast chains
- Over-explaining AI theory
- Treating the project as an IP-dependent "LLM Hitman clone"
- Claims that imply infinite sandbox freedom

## Page Structure

### 1. Hero

Purpose: state the project and make the design thesis visible in the first viewport.

Include:

- H1 and subtitle above
- GitHub link
- Three-layer mini diagram
- Short tags: `AI Play Prototype`, `Natural Language Planning`, `Deterministic Sandbox`, `2.5D Presentation`

### 2. Why This Exists

Compress the AI-native thinking into 3-5 paragraphs.

Argument:

Traditional games often contain player fantasies that production cost, branching complexity, systemic fragility, and older AI constraints force into fixed buttons or scripted routes. Stealth and assassination games are a clear example: players can imagine nuanced plans involving intent, risk, priority, and style, while the implemented game often has to reduce those plans into menu actions or a small set of authored routes.

The prototype asks whether LLMs can cheaply create credible intermediate states inside a finite authored task: partial progress, blocked preconditions, NPC and world reactions, next-step choices, and visible consequences.

Public wording anchor:

`开放感来自自然语言计划；可信度来自确定性沙盒；丰富度来自可演出的可信中间状态。`

### 3. Core Experience Problem

Explain the two constraints the design is balancing:

- Preset-button mission flow gives control but compresses player intention.
- Unbounded AI improvisation creates surface freedom but can lose rule boundaries, world consistency, and performable results.

Use affirmative framing for this section. State the design problem directly: the prototype needs open expression in the middle of the experience while preserving authored endpoints and deterministic consequences.

### 4. Spindle Experience Line

Define `纺锤体体验线`.

Structure:

- Single start: the player is a remote Hacker inside The Balcony Job.
- Widened middle: the player uses natural language to combine opportunity chains such as spoofed invitation, power disruption, guard redirection, poisoned drink, cleaning-cart obstruction, and balcony setup.
- Limited endpoints: balcony accident, balcony poison, explicit failure, or guided degradation.

Key sentence:

`自然语言打开中段表达，确定性规则和有限终点保留设计控制。`

### 5. Three-Layer Structure

Use dual naming.

1. `语义编排层`
   Project mapping: `决策 / 编译`, `语义层`
   Role: let LLM Director understand the player's natural-language plan, choose registered tools, fill actor / target / intent parameters, and produce `DirectorPlan`: intent, constraints, actor roles, `toolChain`, blocked parts, and next-step guidance.

2. `确定性沙盒层`
   Project mapping: `规则 / 执行`, `规则层`
   Role: expose registered tools as callable interfaces, then validate tool requests through permissions, preconditions, executable frontier, `WorldState` submission, `GameEvent` generation, and turn-end `tickWorld()`. The current prototype validates one plan -> toolChain -> deterministic execution; the target direction is a continuous `observe -> choose tool -> execute -> observe` agentic loop.

3. `演出表现层`
   Project mapping: `表现层`
   Role: present the result through `Timeline`, 2.5D map movement, speech bubbles, `Command Feed`, `Hacker Analysis`, HUD changes, overlays, and result modals so the player sees how the world changed.

### 6. One Plan Through The System

Use one concrete route to show the system working.

Recommended example:

`让 Victor 去阳台，别像安保事故。Runner 先处理配电，Face 找机会接触他。`

Flow:

1. Player intent contains target, location, risk preference, and role assumptions.
2. Semantic orchestration produces a structured `DirectorPlan`.
3. The deterministic sandbox validates current preconditions and executes the current frontier.
4. The staged presentation layer shows movement, blocked conditions, dialogue bubbles, feed lines, and next-step prompts.
5. The player replans from the visible world state.

Alternative example if visual material is stronger:

阳台毒酒链: `prepare_poisoned_drink -> lure_with_private_meeting -> serve_poisoned_drink_on_balcony -> resolve_poison_on_balcony`.

### 7. Prototype Status

Describe the current local project state as the evidence baseline.

Include:

- The Balcony Job playable slice
- Player as Hacker
- Face / Runner field-agent split
- LLM Director with stub fallback
- Registered tools and deterministic resolver
- `WorldState`, preconditions, ripples, and `tickWorld`
- 2.5D map, sprites, overlays, speech bubbles, Command Feed, Hacker Analysis
- Tests and documentation as process evidence
- GitHub link as project entry point

Use the repository link as project access. Let the page explain the design and prototype state directly.

### 8. Same Problem, Two Scales

Add a late-page section titled around `同一命题的两个尺度`.

Content:

- `LLM Director Hitman`: small constrained playable slice, focused on making one authored mission feel less formulaic through natural-language planning and credible intermediate states.
- `沙盒开放世界任务设计`: broader open-world quest / director-system exploration, focused on how finite world content can produce less repetitive, less checklist-like tasks.

Keep this section compact. Do not expand the `Sandbox Director` article inside this page.

### 9. Boundaries And Next Step

State boundaries directly:

- This is a focused prototype slice.
- The goal is controlled AI-assisted play.
- The current mission is finite by design.
- The next portfolio step is to revisit `沙盒开放世界任务设计` and align it with the same design language at a larger scale.

## Visual Direction

Use the current portfolio language: industrial, architecture-diagram, dark interface, restrained accent color, dense but readable sections.

Use visual assets from the local `llm_director_hitman` project when possible:

- `public/sprites/map/gallery_event_map_v2.png`
- character sprites for Face, Runner, Victor, Guard, Waiter, Cleaner
- object sprites such as wine, power panel, target phone, balcony rail
- overlays such as fake message, alert, route arrow, opportunity window, suspicion
- existing `.logs/strategy-probe` screenshots if they are clear enough for portfolio use

Avoid a generic stock-like hero image. The first viewport should reveal the actual prototype, its map, or an architecture diagram tied to the prototype.

## Homepage Card

Placement:

Immediately after `level-design-deck`, before `Yatzyforge`.

Working card copy:

Title:

`LLM Director Hitman`

Description:

`LLM 驱动的类《杀手》沙盒原型：用自然语言计划、确定性沙盒和演出表现层，验证“单一起点 -> 中段展开 -> 有限终点”的可控 AI 玩法体验。`

Tags:

- `AI 玩法原型`
- `确定性沙盒`
- `纺锤体体验线`

## Verification Expectations

After implementation:

- Open the portfolio locally and inspect the new page.
- Check desktop and mobile viewport layout.
- Verify the homepage card appears after `level-design-deck`.
- Verify the GitHub link opens `https://github.com/huoshangou/llm-director-hitman`.
- Run the repository's normal static verification command if one exists; otherwise run lightweight HTML/link checks.
- Search final copy for repeated `不是...而是...` patterns and revise them out.
