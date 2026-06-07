# LLM Director Semantic State And CV Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strengthen `LLM Director Hitman` so LLM output stays a semantic middle layer, important events persist as rule-facing state, and the CV `work` page presents the updated prototype without mentioning Triangle Agency / 三角机构.

**Architecture:** Keep the existing `DirectorPlan -> validate -> executeOperationSet -> WorldState -> Timeline/Feed` architecture. Add narrow semantic tags to existing `AgentState` / `NpcState` / `ObjectState`, make a few rule paths read those tags, tighten LLM-facing text channels, then update the static portfolio page to describe the improved deterministic sandbox.

**Tech Stack:** Next.js 15, TypeScript, Zod, existing script-based tests with `tsx`, static HTML/CSS portfolio page, lightweight Node HTML verification.

---

## Repository Scope

**Demo source repo:** `/Users/mofashu/Documents/llm_director_hitman`

**Portfolio / CV repo:** `/Users/mofashu/Documents/Codex/2026-05-17/github-huoshangou-pupupooo-huoshangou-pupupooo-pupupooo/stevehong-LEVELDesigner-portfolio`

**Hard boundary:** The portfolio page must not mention `Triangle Agency` or `三角机构`. The implementation may use the internal concept "semantic state", "rule-facing tags", and "deterministic resolver".

**Push boundary:** Implementation and local verification can proceed after Steve confirms this plan. Actual `git push` requires a separate confirmation because it is a user red-line operation.

---

## File Structure

### Demo Repo Files

- Modify: `/Users/mofashu/Documents/llm_director_hitman/docs/08-alignment/changelog.md`
  - Add an implementation batch entry before code changes, per project rule.
- Modify: `/Users/mofashu/Documents/llm_director_hitman/docs/03-system-design/llm-director.md`
  - Clarify `playerFacingSummary` / `agentComms` are not authoritative facts.
- Modify: `/Users/mofashu/Documents/llm_director_hitman/docs/04-domain/world-state.md`
  - Document the small semantic tag convention.
- Modify: `/Users/mofashu/Documents/llm_director_hitman/lib/director/directorPrompt.ts`
  - Remove stale guard-kill instruction and add no-new-facts guardrails.
- Modify: `/Users/mofashu/Documents/llm_director_hitman/lib/director/clarificationRadio.ts`
  - Make deterministic templates the primary radio surface.
- Modify: `/Users/mofashu/Documents/llm_director_hitman/lib/world/worldTypes.ts`
  - Add optional `stateTags` to `AgentState`.
- Create: `/Users/mofashu/Documents/llm_director_hitman/lib/world/semanticTags.ts`
  - Centralize tag constants and unique-append helpers.
- Modify: `/Users/mofashu/Documents/llm_director_hitman/lib/world/initialWorld.ts`
  - Initialize `stateTags: []` for Face and Runner.
- Modify: `/Users/mofashu/Documents/llm_director_hitman/lib/tools/resolveTool.ts`
  - Persist tags from disguise, spoof, lure, poison, camera, and final-resolution events.
- Modify: `/Users/mofashu/Documents/llm_director_hitman/lib/ui/executedStepSummary.ts`
  - Add result-aware feed summaries.
- Modify: `/Users/mofashu/Documents/llm_director_hitman/sandbox-shell/js/player-plan.js`
  - Generate `EXEC` feed lines from actual `turn.results`, not only requested operation actions.
- Modify: `/Users/mofashu/Documents/llm_director_hitman/lib/bridge/sandboxApi.ts`
  - Already exports `executedStepSummaryFromResult`; keep export stable after signature changes.
- Create: `/Users/mofashu/Documents/llm_director_hitman/scripts/test-director-guardrails.ts`
- Create: `/Users/mofashu/Documents/llm_director_hitman/scripts/test-semantic-tags.ts`
- Modify: `/Users/mofashu/Documents/llm_director_hitman/scripts/test-executed-step-summary.ts`
- Modify: `/Users/mofashu/Documents/llm_director_hitman/package.json`
  - Add scripts for new tests.

### Portfolio Repo Files

- Modify: `/Users/mofashu/Documents/Codex/2026-05-17/github-huoshangou-pupupooo-huoshangou-pupupooo-pupupooo/stevehong-LEVELDesigner-portfolio/works/llm-director-hitman/index.html`
  - Refresh copy to describe semantic state and deterministic outcomes.
- Modify: `/Users/mofashu/Documents/Codex/2026-05-17/github-huoshangou-pupupooo-huoshangou-pupupooo-pupupooo/stevehong-LEVELDesigner-portfolio/index.html`
  - Update card copy only if the demo-page positioning changes.
- Modify: `/Users/mofashu/Documents/Codex/2026-05-17/github-huoshangou-pupupooo-huoshangou-pupupooo-pupupooo/stevehong-LEVELDesigner-portfolio/scripts/check-llm-director-page.mjs`
  - Add forbidden-source-name checks.
- Optional update: `/Users/mofashu/Documents/Codex/2026-05-17/github-huoshangou-pupupooo-huoshangou-pupupooo-pupupooo/stevehong-LEVELDesigner-portfolio/docs/llm-director-hitman-portfolio-page-design.md`
  - Keep internal design note consistent with the final page. Do not add source-game mentions.

---

### Task 1: Document The Batch And Guard LLM Text Channels

**Files:**
- Modify: `/Users/mofashu/Documents/llm_director_hitman/docs/08-alignment/changelog.md`
- Modify: `/Users/mofashu/Documents/llm_director_hitman/docs/03-system-design/llm-director.md`
- Modify: `/Users/mofashu/Documents/llm_director_hitman/lib/director/directorPrompt.ts`
- Modify: `/Users/mofashu/Documents/llm_director_hitman/lib/director/clarificationRadio.ts`
- Create: `/Users/mofashu/Documents/llm_director_hitman/scripts/test-director-guardrails.ts`
- Modify: `/Users/mofashu/Documents/llm_director_hitman/package.json`

- [ ] **Step 1: Add the failing guardrail test**

Create `/Users/mofashu/Documents/llm_director_hitman/scripts/test-director-guardrails.ts`:

```ts
import assert from "node:assert/strict";
import { buildDirectorPrompt } from "../lib/director/directorPrompt";
import { buildFieldAgentRadio } from "../lib/director/clarificationRadio";
import type { DirectorPlan } from "../lib/director/directorSchema";
import { cloneWorld } from "../lib/world/initialWorld";

function miniPlan(agentText: string): DirectorPlan {
  return {
    recognizedIntent: "blocked test",
    planStyle: "improvised",
    constraints: [],
    assumptions: [],
    feasibility: "impossible",
    toolChain: [],
    unsupportedParts: [{ text: "blocked", reason: "test" }],
    fallbackSuggestions: [],
    riskSummary: [],
    playerFacingSummary: "Victor is already dead and police arrived.",
    agentComms: [{ agent: "face", text: agentText, tone: "blocked" }],
  };
}

const promptText = buildDirectorPrompt({
  playerPlan: "runner 杀掉保安",
  selection: null,
  worldSummary: { tools: ["eliminate_threat", "decline_with_guidance"] },
  directorConstraints: {},
})
  .map((m) => m.content)
  .join("\n");

assert.ok(
  !promptText.includes("Kill / assassinate guard: no tool exists"),
  "prompt must not contain stale guard-kill instruction",
);
assert.ok(
  promptText.includes("eliminate_threat"),
  "prompt should acknowledge registered guard/guest threat handling",
);
assert.ok(
  promptText.includes("Do not claim success, failure, death, police response, new NPCs, new exits, or new items"),
  "prompt must forbid LLM-authored major facts",
);

const radio = await buildFieldAgentRadio({
  playerPlan: "直接解决目标",
  world: cloneWorld(),
  selection: null,
  plan: miniPlan("Victor is dead. Police are here."),
  validation: { executableChain: [], rejected: [] },
});

assert.ok(radio.length > 0, "radio should still provide deterministic guidance");
assert.ok(
  radio.every((line) => !line.text.includes("Victor is dead") && !line.text.includes("Police")),
  "clarification radio must not surface unsupported LLM facts",
);

console.log("test-director-guardrails: ok");
```

- [ ] **Step 2: Add the test script**

In `/Users/mofashu/Documents/llm_director_hitman/package.json`, add:

```json
"test:director-guardrails": "tsx scripts/test-director-guardrails.ts"
```

- [ ] **Step 3: Run the failing test**

Run:

```bash
cd /Users/mofashu/Documents/llm_director_hitman
npm run test:director-guardrails
```

Expected: FAIL because `directorPrompt.ts` still contains the stale guard-kill line and `buildFieldAgentRadio()` still returns LLM `agentComms` first.

- [ ] **Step 4: Update the prompt**

In `/Users/mofashu/Documents/llm_director_hitman/lib/director/directorPrompt.ts`, replace the stale unsupported guard-kill rule with:

```ts
- Directly killing the contract target is not a valid field action; use decline_with_guidance with the closest guidanceKey.
- Guard / guest threat handling can use eliminate_threat only when the player explicitly targets guard or guest and the tool is present in worldSummary.tools.
- Do not claim success, failure, death, police response, new NPCs, new exits, or new items in playerFacingSummary or agentComms. These fields may only restate parsed intent, blocked reasons, and next-step guidance grounded in current worldSummary or executed tool results.
```

- [ ] **Step 5: Make radio template-first**

In `/Users/mofashu/Documents/llm_director_hitman/lib/director/clarificationRadio.ts`, replace the bottom of `buildFieldAgentRadio()` with:

```ts
  return base;
```

Also update the comment above the function to:

```ts
/** 模板为主；LLM agentComms 不直接进入玩家可见电台，避免新增未结算事实。 */
```

- [ ] **Step 6: Update docs before continuing**

In `/Users/mofashu/Documents/llm_director_hitman/docs/08-alignment/changelog.md`, add a new top entry:

```md
## [semantic-state-guardrails-v1] — 2026-06-07

### Added

- 计划补强 rule-facing semantic tags：伪装、目标路线、毒酒、证据、NPC 怀疑会沉淀为可再次读取的状态。

### Changed

- LLM 可见文本字段收束为调试/引导信息；玩家可见 radio 以 deterministic template 为准。
- Director prompt 与当前 `eliminate_threat` 工具对齐，不再把 guard threat handling 误标为无工具。
```

In `/Users/mofashu/Documents/llm_director_hitman/docs/03-system-design/llm-director.md`, adjust the `playerFacingSummary` / `agentComms` description to say they are non-authoritative text hints and cannot introduce world facts.

- [ ] **Step 7: Verify Task 1**

Run:

```bash
cd /Users/mofashu/Documents/llm_director_hitman
npm run test:director-guardrails
```

Expected: PASS with `test-director-guardrails: ok`.

---

### Task 2: Add Durable Semantic Tags Without A New Engine

**Files:**
- Modify: `/Users/mofashu/Documents/llm_director_hitman/docs/04-domain/world-state.md`
- Modify: `/Users/mofashu/Documents/llm_director_hitman/lib/world/worldTypes.ts`
- Create: `/Users/mofashu/Documents/llm_director_hitman/lib/world/semanticTags.ts`
- Modify: `/Users/mofashu/Documents/llm_director_hitman/lib/world/initialWorld.ts`
- Modify: `/Users/mofashu/Documents/llm_director_hitman/lib/tools/resolveTool.ts`
- Create: `/Users/mofashu/Documents/llm_director_hitman/scripts/test-semantic-tags.ts`
- Modify: `/Users/mofashu/Documents/llm_director_hitman/package.json`

- [ ] **Step 1: Add the failing semantic tag test**

Create `/Users/mofashu/Documents/llm_director_hitman/scripts/test-semantic-tags.ts`:

```ts
import assert from "node:assert/strict";
import { applyToolResult, resolveTool } from "../lib/tools/resolveTool";
import type { ToolUseRequest } from "../lib/tools/toolTypes";
import { cloneWorld } from "../lib/world/initialWorld";

function run(world: ReturnType<typeof cloneWorld>, request: ToolUseRequest) {
  const result = resolveTool(request, world);
  assert.equal(result.status, "success", `${request.toolId} should succeed`);
  return applyToolResult(world, result);
}

let world = cloneWorld();

world = run(world, {
  toolId: "impersonate_staff",
  actor: "runner",
  targets: ["waiter_uniform"],
  intent: "runner gets waiter cover",
});
assert.ok(world.agents.runner.stateTags?.includes("disguised_as_waiter"));
assert.ok(world.agents.runner.stateTags?.includes("cover_valid_service"));

world = run(world, {
  toolId: "spoof_message",
  actor: "player",
  targets: ["target_phone"],
  intent: "spoof balcony invitation",
  params: { message: "Private balcony meeting." },
});
assert.ok(world.npcs.target.stateTags.includes("target_has_private_meeting_belief"));

world = run(world, {
  toolId: "prepare_poisoned_drink",
  actor: "runner",
  targets: ["wine_bottle"],
  intent: "prepare poison",
});
assert.ok(world.objects.wine_bottle.tags.includes("wine_bottle_poisoned"));
assert.ok(world.objects.wine_bottle.tags.includes("tampered_object"));

world.npcs.target.location = "balcony";
world = run(world, {
  toolId: "serve_poisoned_drink_on_balcony",
  actor: "runner",
  targets: ["target", "wine_bottle"],
  intent: "serve poisoned drink",
});
assert.ok(world.objects.wine_bottle.tags.includes("poison_served_to_target"));
assert.ok(world.npcs.target.stateTags.includes("target_accepted_poisoned_drink"));

world = run(world, {
  toolId: "resolve_poison_on_balcony",
  actor: "runner",
  targets: ["target"],
  intent: "resolve poison",
});
assert.ok(world.npcs.target.stateTags.includes("target_poisoned"));
assert.ok(world.npcs.target.stateTags.includes("target_handled"));
assert.ok(world.locations.balcony.tags.includes("private"));

console.log("test-semantic-tags: ok");
```

- [ ] **Step 2: Add the test script**

In `/Users/mofashu/Documents/llm_director_hitman/package.json`, add:

```json
"test:semantic-tags": "tsx scripts/test-semantic-tags.ts"
```

- [ ] **Step 3: Run the failing test**

Run:

```bash
cd /Users/mofashu/Documents/llm_director_hitman
npm run test:semantic-tags
```

Expected: FAIL because agent tags and the new object/NPC tags are not yet written.

- [ ] **Step 4: Extend `AgentState`**

In `/Users/mofashu/Documents/llm_director_hitman/lib/world/worldTypes.ts`, add this field to `AgentState`:

```ts
  stateTags?: string[];
```

- [ ] **Step 5: Create tag helpers**

Create `/Users/mofashu/Documents/llm_director_hitman/lib/world/semanticTags.ts`:

```ts
import type { AgentState, NpcState, ObjectState } from "./worldTypes";

export const TAG = {
  disguisedAsWaiter: "disguised_as_waiter",
  coverValidService: "cover_valid_service",
  targetPrivateMeetingBelief: "target_has_private_meeting_belief",
  targetRouteBalconyCommitted: "target_route_balcony_committed",
  wineBottlePoisoned: "wine_bottle_poisoned",
  tamperedObject: "tampered_object",
  poisonServedToTarget: "poison_served_to_target",
  targetAcceptedPoisonedDrink: "target_accepted_poisoned_drink",
  targetPoisoned: "target_poisoned",
  targetHandled: "target_handled",
  cameraRecordingSuppressed: "camera_recording_suppressed",
  cameraHasRelevantFootage: "camera_has_relevant_footage",
  guardSuspiciousOfRunner: "guard_suspicious_of_runner",
  guardSuspiciousOfFace: "guard_suspicious_of_face",
} as const;

export type SemanticTag = (typeof TAG)[keyof typeof TAG];

export function addUniqueTags(existing: string[] | undefined, tags: string[]): string[] {
  const next = [...(existing ?? [])];
  for (const tag of tags) {
    if (!next.includes(tag)) next.push(tag);
  }
  return next;
}

export function patchAgentTags(agent: AgentState, tags: string[]): Pick<AgentState, "stateTags"> {
  return { stateTags: addUniqueTags(agent.stateTags, tags) };
}

export function patchNpcTags(npc: NpcState, tags: string[]): Pick<NpcState, "stateTags"> {
  return { stateTags: addUniqueTags(npc.stateTags, tags) };
}

export function patchObjectTags(object: ObjectState, tags: string[]): Pick<ObjectState, "tags"> {
  return { tags: addUniqueTags(object.tags, tags) };
}
```

- [ ] **Step 6: Initialize field-agent tags**

In `/Users/mofashu/Documents/llm_director_hitman/lib/world/initialWorld.ts`, set:

```ts
stateTags: [],
```

for both `face` and `runner`.

- [ ] **Step 7: Write tags in existing resolvers**

In `/Users/mofashu/Documents/llm_director_hitman/lib/tools/resolveTool.ts`, import:

```ts
import { TAG, addUniqueTags } from "../world/semanticTags";
```

Then update these successful deltas:

- `resolveImpersonateStaff`: add `stateTags: addUniqueTags(world.agents[fieldAgent].stateTags, [TAG.disguisedAsWaiter, TAG.coverValidService])`.
- `resolveSpoofMessage`: add `stateTags: addUniqueTags(target.stateTags, [TAG.targetPrivateMeetingBelief])`.
- `resolveLureWithPrivateMeeting`: add `stateTags: addUniqueTags(target.stateTags, [TAG.targetRouteBalconyCommitted])`.
- `resolvePreparePoisonedDrink`: add object tags `TAG.wineBottlePoisoned` and `TAG.tamperedObject`.
- `resolveServePoisonedDrinkOnBalcony`: add object tag `TAG.poisonServedToTarget` and NPC tag `TAG.targetAcceptedPoisonedDrink`.
- `resolveSuppressCameraRecord`: add object tag `TAG.cameraRecordingSuppressed`.
- `resolveResolvePoisonOnBalcony`: add NPC tags `TAG.targetPoisoned` and `TAG.targetHandled`.

- [ ] **Step 8: Document the tag convention**

In `/Users/mofashu/Documents/llm_director_hitman/docs/04-domain/world-state.md`, add a short section:

```md
## Semantic Tags

Tags are not free-form prose memory. They are compact state facts that future rules, NPC reactions, evidence checks, and UI explanation may read.

Initial scope:

- `AgentState.stateTags`: cover and exposure facts such as `disguised_as_waiter`.
- `NpcState.stateTags`: belief/awareness/result facts such as `target_has_private_meeting_belief`.
- `ObjectState.tags`: tampering/evidence facts such as `wine_bottle_poisoned`.

LLM may suggest intent and checks, but only deterministic tool resolution writes tags.
```

- [ ] **Step 9: Verify Task 2**

Run:

```bash
cd /Users/mofashu/Documents/llm_director_hitman
npm run test:semantic-tags
npm run test:poison-balcony
```

Expected: both pass.

---

### Task 3: Make Tags Participate In Consequence Rules

**Files:**
- Modify: `/Users/mofashu/Documents/llm_director_hitman/lib/tools/resolveTool.ts`
- Modify: `/Users/mofashu/Documents/llm_director_hitman/scripts/test-semantic-tags.ts`

- [ ] **Step 1: Extend the failing test for cover/evidence consequences**

Append to `/Users/mofashu/Documents/llm_director_hitman/scripts/test-semantic-tags.ts`:

```ts
const noCoverWorld = cloneWorld();
noCoverWorld.npcs.target.location = "balcony";
noCoverWorld.objects.wine_bottle.state = {
  premium: true,
  poisoned: true,
  poison_served: false,
};

const noCoverServe = resolveTool(
  {
    toolId: "serve_poisoned_drink_on_balcony",
    actor: "runner",
    targets: ["target", "wine_bottle"],
    intent: "serve without service cover",
  },
  noCoverWorld,
);
assert.equal(noCoverServe.status, "success");
const afterNoCoverServe = applyToolResult(noCoverWorld, noCoverServe);
assert.ok(afterNoCoverServe.npcs.guard.stateTags.includes("guard_suspicious_of_runner"));
assert.ok(afterNoCoverServe.npcs.guard.suspicionTowardAgents.runner! > 0);

const cameraWorld = cloneWorld();
cameraWorld.npcs.target.location = "balcony";
cameraWorld.objects.wine_bottle.state = {
  premium: true,
  poisoned: true,
  poison_served: true,
};
const poisonWithCamera = applyToolResult(
  cameraWorld,
  resolveTool(
    {
      toolId: "resolve_poison_on_balcony",
      actor: "runner",
      targets: ["target"],
      intent: "resolve poison with camera still active",
    },
    cameraWorld,
  ),
);
assert.ok(poisonWithCamera.objects.hallway_camera.tags.includes("camera_has_relevant_footage"));
assert.ok(poisonWithCamera.objective.evidenceRisk >= 20);
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
cd /Users/mofashu/Documents/llm_director_hitman
npm run test:semantic-tags
```

Expected: FAIL because serving without cover and active camera evidence are not yet tag-aware.

- [ ] **Step 3: Add cover-aware suspicion in serve resolver**

In `resolveServePoisonedDrinkOnBalcony`, compute:

```ts
  const actor = request.actor === "face" || request.actor === "runner" ? world.agents[request.actor] : null;
  const hasServiceCover =
    actor?.coverIdentity === "waiter" ||
    actor?.permissions.includes("serve_drinks") ||
    actor?.stateTags?.includes(TAG.coverValidService);
  const guard = world.npcs.guard;
  const suspicionPatch =
    request.actor === "runner" && !hasServiceCover
      ? {
          guard: {
            suspicionTowardAgents: {
              ...guard.suspicionTowardAgents,
              runner: (guard.suspicionTowardAgents.runner ?? 0) + 18,
            },
            stateTags: addUniqueTags(guard.stateTags, [TAG.guardSuspiciousOfRunner]),
            attentionMode: "suspicious_focus" as const,
            attentionTarget: "runner",
          },
        }
      : {};
```

Merge `suspicionPatch` into the resolver `npcs` delta.

- [ ] **Step 4: Add camera-aware evidence in poison resolver**

In `resolveResolvePoisonOnBalcony`, compute:

```ts
  const camera = world.objects.hallway_camera;
  const cameraSuppressed =
    camera.state.recordingSuppressed === true ||
    camera.tags.includes(TAG.cameraRecordingSuppressed);
  const cameraTags = cameraSuppressed
    ? camera.tags
    : addUniqueTags(camera.tags, [TAG.cameraHasRelevantFootage]);
  const evidenceRisk = Math.max(world.objective.evidenceRisk, cameraSuppressed ? 8 : 24);
```

Use `evidenceRisk` in the objective delta and patch `hallway_camera.tags = cameraTags`.

- [ ] **Step 5: Verify Task 3**

Run:

```bash
cd /Users/mofashu/Documents/llm_director_hitman
npm run test:semantic-tags
npm run test:poison-balcony
npm run test:field-agent-reply
```

Expected: all pass.

---

### Task 4: Make Command Feed Result-Aware

**Files:**
- Modify: `/Users/mofashu/Documents/llm_director_hitman/lib/ui/executedStepSummary.ts`
- Modify: `/Users/mofashu/Documents/llm_director_hitman/sandbox-shell/js/player-plan.js`
- Modify: `/Users/mofashu/Documents/llm_director_hitman/scripts/test-executed-step-summary.ts`

- [ ] **Step 1: Add failing unit assertions**

In `/Users/mofashu/Documents/llm_director_hitman/scripts/test-executed-step-summary.ts`, import `executedStepSummaryFromResult` and append:

```ts
const blockedResult = {
  request: runner,
  status: "blocked" as const,
  score: 0,
  reason: "runner is observed by guard",
  worldDelta: {},
  generatedEvents: [],
};
const blockedLine = executedStepSummaryFromResult(blockedResult);
assert.ok(blockedLine.includes("受阻"));
assert.ok(blockedLine.includes("配电"));
assert.ok(!blockedLine.includes("成功"));

const successResult = {
  request: lure,
  status: "success" as const,
  score: 80,
  worldDelta: {},
  generatedEvents: [],
};
const successLine = executedStepSummaryFromResult(successResult);
assert.ok(successLine.includes("执行"));
assert.ok(!successLine.includes("受阻"));
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
cd /Users/mofashu/Documents/llm_director_hitman
npm run test:executed-step-summary
```

Expected: FAIL because result status is currently ignored.

- [ ] **Step 3: Implement result-aware summaries**

In `/Users/mofashu/Documents/llm_director_hitman/lib/ui/executedStepSummary.ts`, replace `executedStepSummaryFromResult` with:

```ts
export function executedStepSummaryFromResult(result: ToolUseResult): string {
  const actor = ACTOR_LABEL[result.request.actor] ?? result.request.actor;
  const action = toolActionZh(result.request.toolId);
  if (result.status === "blocked") return `EXEC / ${actor} 受阻：${action}`;
  if (result.status === "failed") return `EXEC / ${actor} 失败：${action}`;
  if (result.status === "partial") return `EXEC / ${actor} 部分完成：${action}`;
  return `EXEC / ${actor} 执行：${action}`;
}
```

- [ ] **Step 4: Use actual turn results in Play shell**

In `/Users/mofashu/Documents/llm_director_hitman/sandbox-shell/js/player-plan.js`, replace the `EXEC` feed loop in the main plan submission path with:

```js
    if (typeof pushCommandFeed === "function") {
      for (const result of turn.results) {
        const execLine =
          typeof HitmanCore.executedStepSummaryFromResult === "function"
            ? HitmanCore.executedStepSummaryFromResult(result)
            : typeof HitmanCore.executedStepSummary === "function"
              ? HitmanCore.executedStepSummary(result.request)
              : `EXEC / ${result.request.actor} → ${result.request.toolId}`;
        const execBody = execLine.replace(/^EXEC\s*\/\s*/i, "").trim();
        pushCommandFeed({ speaker: "EXEC", text: execBody, tone: "system" });
      }
    }
```

Keep `execSteps` for operation summary and playback follow IDs.

- [ ] **Step 5: Verify Task 4**

Run:

```bash
cd /Users/mofashu/Documents/llm_director_hitman
npm run test:executed-step-summary
npm run test:play-command-feed-ui
```

Expected: both pass.

---

### Task 5: Build And Verify Demo Bundle

**Files:**
- Generated/updated by existing scripts: `/Users/mofashu/Documents/llm_director_hitman/sandbox-shell/dist/hitman-core.js`
- Generated/updated by existing scripts if needed: `/Users/mofashu/Documents/llm_director_hitman/public/play/`

- [ ] **Step 1: Run focused contract tests**

Run:

```bash
cd /Users/mofashu/Documents/llm_director_hitman
npm run test:director-guardrails
npm run test:semantic-tags
npm run test:director-semantic
npm run test:poison-balcony
npm run test:play-turn-spec
npm run test:executed-step-summary
npm run test:command-feed-world-line
npm run test:field-agent-reply
```

Expected: all pass.

- [ ] **Step 2: Rebuild browser core**

Run:

```bash
cd /Users/mofashu/Documents/llm_director_hitman
npm run build:sandbox
```

Expected: `sandbox-shell/dist/hitman-core.js` is rebuilt successfully.

- [ ] **Step 3: Run UI-level check**

Run:

```bash
cd /Users/mofashu/Documents/llm_director_hitman
npm run test:play-command-feed-ui
```

Expected: PASS. If `:8747` is not running, use `npm run play` in a separate terminal and rerun.

- [ ] **Step 4: Decide whether to run full acceptance**

Run full acceptance if focused checks pass and time permits:

```bash
cd /Users/mofashu/Documents/llm_director_hitman
npm run test:acceptance
```

Expected: PASS. If it fails, debug the first failing check and do not proceed to portfolio copy until the regression is understood.

---

### Task 6: Update The CV Work Page Without Mentioning Triangle Agency

**Files:**
- Modify: `/Users/mofashu/Documents/Codex/2026-05-17/github-huoshangou-pupupooo-huoshangou-pupupooo-pupupooo/stevehong-LEVELDesigner-portfolio/works/llm-director-hitman/index.html`
- Modify: `/Users/mofashu/Documents/Codex/2026-05-17/github-huoshangou-pupupooo-huoshangou-pupupooo-pupupooo/stevehong-LEVELDesigner-portfolio/index.html`
- Modify: `/Users/mofashu/Documents/Codex/2026-05-17/github-huoshangou-pupupooo-huoshangou-pupupooo-pupupooo/stevehong-LEVELDesigner-portfolio/scripts/check-llm-director-page.mjs`
- Optional Modify: `/Users/mofashu/Documents/Codex/2026-05-17/github-huoshangou-pupupooo-huoshangou-pupupooo-pupupooo/stevehong-LEVELDesigner-portfolio/docs/llm-director-hitman-portfolio-page-design.md`

- [ ] **Step 1: Add forbidden source-name checks**

In `/Users/mofashu/Documents/Codex/2026-05-17/github-huoshangou-pupupooo-huoshangou-pupupooo-pupupooo/stevehong-LEVELDesigner-portfolio/scripts/check-llm-director-page.mjs`, add:

```js
function assertForbiddenAbsent(haystack, forbidden, label) {
  if (haystack.includes(forbidden)) {
    fail(`${label} must not mention "${forbidden}"`);
  }
}
```

Inside the `if (page) { ... }` block, add:

```js
  [
    "Triangle Agency",
    "三角机构",
    "TRPG《Triangle Agency",
  ].forEach((forbidden) => assertForbiddenAbsent(page, forbidden, "LLM Director Hitman page"));
```

Inside the `if (home) { ... }` block, add:

```js
  [
    "Triangle Agency",
    "三角机构",
  ].forEach((forbidden) => assertForbiddenAbsent(home, forbidden, "homepage"));
```

- [ ] **Step 2: Run page check before copy changes**

Run:

```bash
cd /Users/mofashu/Documents/Codex/2026-05-17/github-huoshangou-pupupooo-huoshangou-pupupooo-pupupooo/stevehong-LEVELDesigner-portfolio
node scripts/check-llm-director-page.mjs
```

Expected: PASS unless current page already contains a forbidden source name.

- [ ] **Step 3: Refresh case-study copy**

In `/Users/mofashu/Documents/Codex/2026-05-17/github-huoshangou-pupupooo-huoshangou-pupupooo-pupupooo/stevehong-LEVELDesigner-portfolio/works/llm-director-hitman/index.html`, update the design explanation to use these concepts:

```html
<p>这次迭代把“状态”从展示记录推进为规则输入：伪装、目标路线、毒酒、证据和 NPC 怀疑都会沉淀到 WorldState，后续工具校验、安保反应、结算评分和前端反馈可以继续读取。</p>
<p>LLM Director 仍只负责把玩家自然语言编排成合法工具链；成功、受阻、证据风险和 NPC 反应由确定性沙盒写入世界。</p>
```

Do not add `Triangle Agency` or `三角机构`.

- [ ] **Step 4: Refresh homepage card only if needed**

If the homepage card needs a tighter current-state summary, replace the `LLM Director Hitman` description in `/Users/mofashu/Documents/Codex/2026-05-17/github-huoshangou-pupupooo-huoshangou-pupupooo-pupupooo/stevehong-LEVELDesigner-portfolio/index.html` with:

```html
LLM 驱动的类《杀手》沙盒原型：自然语言计划进入语义编排层，确定性规则沉淀伪装、证据、怀疑和目标路线等可持续状态。
```

- [ ] **Step 5: Verify portfolio copy**

Run:

```bash
cd /Users/mofashu/Documents/Codex/2026-05-17/github-huoshangou-pupupooo-huoshangou-pupupooo-pupupooo/stevehong-LEVELDesigner-portfolio
node scripts/check-llm-director-page.mjs
rg -n "Triangle Agency|三角机构" works/llm-director-hitman index.html docs/llm-director-hitman-portfolio-page-design.md
```

Expected:

- `node scripts/check-llm-director-page.mjs` prints `LLM Director Hitman portfolio checks passed.`
- `rg` returns no matches, unless matches are only outside the public page and Steve explicitly accepts them.

---

### Task 7: Final Verification, Diff Review, And Push Gate

**Files:**
- No new implementation files.

- [ ] **Step 1: Check demo diff**

Run:

```bash
cd /Users/mofashu/Documents/llm_director_hitman
git status --short
git diff -- docs lib scripts package.json sandbox-shell/js/player-plan.js
```

Expected: only the scoped demo files from this plan are changed.

- [ ] **Step 2: Check portfolio diff**

Run:

```bash
cd /Users/mofashu/Documents/Codex/2026-05-17/github-huoshangou-pupupooo-huoshangou-pupupooo-pupupooo/stevehong-LEVELDesigner-portfolio
git status --short
git diff -- works/llm-director-hitman/index.html index.html scripts/check-llm-director-page.mjs docs/llm-director-hitman-portfolio-page-design.md
```

Expected: only the scoped portfolio files are changed. Existing unrelated dirty files are left untouched.

- [ ] **Step 3: Report verification results to Steve**

Report:

- Demo tests run and pass/fail.
- Portfolio page check pass/fail.
- Changed files in each repo.
- Whether any unrelated dirty files were present and ignored.

- [ ] **Step 4: Ask before push**

Ask Steve for explicit confirmation before:

```bash
git push
```

Do not push without confirmation.

---

## Self-Review

**Spec coverage:** The plan covers LLM guardrails, rule-facing tags, event-state persistence, suspicion/evidence participation, result-grounded UI feedback, CV page update, forbidden source-name check, and push confirmation.

**Placeholder scan:** No task uses TBD/TODO/fill-later language. Optional portfolio design-note update is explicitly bounded.

**Type consistency:** `AgentState.stateTags` is optional; all rule readers use `?.` or helper fallback. Existing `NpcState.stateTags` and `ObjectState.tags` remain unchanged.

**Scope control:** The plan does not add a general TRPG engine, new route ontology, new API provider, database, CI, or deployment path.
