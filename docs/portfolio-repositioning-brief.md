# Portfolio Repositioning Brief

This note captures the working agreement for repositioning Steve Hong's personal portfolio.

## Current Problem

The current homepage is too strongly framed as a level design portfolio. It under-represents Steve's newer work around AI-assisted design workflows, design tooling, and product thinking.

The existing article `Level_Design_Agent构思.html` is now partly outdated: it presents an early architecture-level view of level design agents, but does not yet reflect the later, more concrete work proven by `huoshangou/level-design-deck`.

## New Positioning

The portfolio should present Steve as someone who connects:

- Game and level design practice
- AI-assisted design workflows
- Tool/product thinking
- Verification-oriented design process

Recommended public framing:

> I build AI-assisted design tooling that turns design intent into structured source-of-truth records, mechanical checks, and reusable artifacts, while keeping human design judgment in control.

## Core Thesis

Software engineering can often treat code as the source of truth because many software products are platform-like, scenario-specific, and built from clear, verifiable behavior units.

Game design is different. A game environment produces experience through space, pacing, mechanics, atmosphere, assets, and player behavior interacting together. The experience has boundaries, but it is not as cleanly defined as a transactional app flow.

Therefore, in game design, the portfolio should argue for:

> Document as source of truth.

This does not mean Word, HTML, or PPT as the source. It means a design source of truth: structured specs, constraints, intent, spatial relationships, pacing beats, and other records that preserve intended player experience before implementation translates it into code, assets, or runtime behavior.

## Proof Point

`level-design-deck` is the current proof point for this thesis.

It demonstrates:

- `spec.json` as source of truth
- HTML and slide decks as derived artifacts
- Schema-driven editing
- Mechanical checks before AI confidence
- Cross-module consistency checks
- LevelCraft layout import
- Rendered long-form docs and deck views
- A Claude Code skill workflow that moves from conversation to structured specs

Known boundary:

- `level-design-deck` currently proves the path from design source of truth to derived artifacts and mechanical checks.
- It does not yet fully prove the future interaction model: conversation clarification, structured editing, visual inspection, and human approval gates.
- It also does not yet fully prove the future project goal alignment layer: injection of prior project goals, constraints, patterns, and reference cases.

The old "level design agent" article should be upgraded from an agent architecture proposal into a practical case study about productizing an AI-assisted game design workflow.

The personal homepage can present the intended mature product shape, including interaction patterns inspired by strong open-source design tooling references. The GitHub project should remain framed as implementation proof of the parts already practiced and landed.

## Homepage Direction

The homepage should become broader and less role-narrow.

Likely hierarchy:

1. Lead with Steve's broader identity: 关卡/玩法策划 + AI 设计工具实践.
2. Feature `level-design-deck` as a major current work, not a side experiment.
3. Keep level design works as evidence of domain grounding.
4. Treat AI workflow articles/tools as an equal pillar beside portfolio pieces.

Homepage scope:

- The homepage should not carry the full argument about AI-assisted design tooling.
- It should provide a clear entry point into a dedicated subpage about how AI tools can assist the design process.
- The homepage should avoid over-claiming current implementation status; it should preview the thinking and route interested readers to the deeper article.

## Dedicated AI Design Tooling Subpage

Create a standalone subpage titled "level-design-deck：AI 辅助关卡设计工作流" that explains the current concrete project and Steve's thinking about how AI tools should assist design workflows.

Primary focus:

- Start by presenting the full framework design, similar to the existing "Agent 架构方案" article, rather than opening with a narrow pain-point essay.
- The product design thinking behind the workflow: conversation clarification, structured editing, visual inspection, human approval gates, and project goal alignment.
- What interaction model is being designed for designers, including IM-style conversational entry points and intermediate layers between chat and source-of-truth records.
- How the workflow accelerates open-world level design communication by using discipline interface files to check whether each downstream team has the information needed to begin work.
- What has already been designed or documented, including the current v4.5 historical version as prior thinking.
- What has already landed as implementation proof, with a link to the `level-design-deck` GitHub project.

The subpage should separate:

- Product vision: the intended mature AI-assisted design workflow.
- Historical record: the previous Level Agent architecture v0.45 thinking and artifacts.
- Evolution rationale: why the work moved from a broad Level Agent architecture proposal into the more concrete `level-design-deck` form after prior lessons and pitfalls.
- Implementation proof: the current `level-design-deck` work that has been practiced and landed as the updated version of the Level Agent architecture direction.

Keep the previous v0.45 Level Agent architecture page as a historical standalone page. The new `level-design-deck` subpage should not merge the old architecture essay with extensive meta-analysis. It should use only a short bridge sentence or compact section to explain that `level-design-deck` is the more concrete, current form of the earlier Level Agent direction, then focus on the current product design and implementation proof.

Recommended subtitle:

> 从设计源事实出发，把设计意图转化为可检查、可派生、可展示的结构化产物。

Recommended short bridge to v0.45:

> 这是我在 Level Agent v0.45 之后，对 AI 辅助关卡设计流程更具体的一次落地：先把设计源事实、机械检查和派生产物跑通，再逐步接入职能接口、项目知识与原型能力。

Recommended first viewport:

- Lead with a compact framework diagram rather than a long essay or historical explanation.
- The page should be written in Chinese. Keep only necessary project names, repository names, and code identifiers in English.
- The framework should show "人的设计主导" as a control band across the workflow, not as a final step.
- The main process should show four Chinese nodes: 设计意图 -> 设计源事实 -> 机械检查 -> 派生产物.
- The human control band should mention: 意图澄清 / 结构化编辑 / 可视化检查 / 批准门.
- Place a short project summary and GitHub link near the framework.
- Do not put v0.45 history, Open Design references, pitfalls, or future-roadmap-heavy content in the first viewport.

Recommended acceleration argument:

- The efficiency gain has two complementary parts: faster documentation work / lower paperwork burden, and lower communication friction across disciplines.
- Open-world level designers often act as the connector for many downstream disciplines, while traditional documents are too broad and each discipline only reads a small part.
- `level-design-deck` should be framed as a workflow that can use 职能接口文件 to ask missing questions early: art, lighting, audio, VFX, system design, programming, and other teams should each receive the requirements, context, and unresolved questions needed to begin work.
- This reduces repeated clarification loops before handoff and keeps the design source of truth more actionable.
- A 职能接口文件 should not be presented as something the level designer can fully invent alone. The mature workflow requires the consuming discipline to define or validate its interface needs.
- For the portfolio article, it is acceptable to use a clearly labeled 暂定接口边界 to explain the product thinking, as long as it is not framed as a final production standard.

Recommended page sequence:

1. 框架总览：人的设计主导覆盖全流程，主流程为设计意图 -> 设计源事实 -> 机械检查 -> 派生产物。
2. 效率目标：降低文档事务负担，同时降低跨职能沟通摩擦。
3. 样例一：玩法原型接口，GD -> TD/GPP，说明项目专属蓝图 MCP 如何压缩玩法需求、原型实现、正式需求之间的反复沟通。
4. 样例二：灯光接口文件，说明职能接口如何提前暴露信息缺口。
5. 当前状态：`level-design-deck` 当前做了什么、还缺少什么、接下来怎么演进。
6. 产品形态展望：对话优先交互、结构化编辑、可视化检查、人工批准门、项目目标对齐层、项目专属蓝图 MCP、更多职能接口校准。

Recommended current-state section:

Use a three-column structure:

1. 当前已落地
   - `spec.json` as design source of truth
   - Multiple derived artifacts
   - Mechanical checks
   - Schema-driven editing
   - Long-form document and deck rendering
   - Claude Code skill workflow
2. 当前缺口
   - 职能接口文件 are still provisional examples, not validated production contracts
   - 项目专属蓝图 MCP is not yet connected
   - 对话优先交互 is still being iterated
   - 项目目标对齐层 is not yet fully implemented
3. 下一步展望
   - Move from "generating structured design documents / decks" toward an internal efficiency product: 对话澄清 -> 设计源事实 -> 职能接口检查 -> 原型/文档派生 -> 人工批准门.

Interaction form reference:

- The final product form can reference `nexu-io/open-design` as an interaction inspiration, especially its IM-like prompt entry, interactive question form before generation, live plan / agent status, sandboxed preview, and interruptible artifact-generation loop.
- The article should mention this as an interaction reference for product form, not as a borrowed brand or as the main subject of the page.

Visual direction:

- Inherit the architecture-document feel of the existing `Level_Design_Agent构思.html` page, but reduce noise.
- Keep: dark/industrial mood, grid structure, node diagrams, workflow visuals, architecture-style sections, accent color, status labels.
- Reduce: oversized architecture taxonomies, excessive Agent terminology, too many tables, long historical meta-analysis, and v0.45-style grand roadmap energy.
- The new page should read as a product design explanation plus toolchain case study, not as another broad Agent manifesto.

Recommended provisional example for the article:

### 灯光接口文件（暂定示例）

Use this as a compact product-mechanism example, not as a final lighting production standard.

Chinese copy direction:

> 这个示例不是要替灯光师定义最终规范，而是说明：当关卡策划填写设计源事实时，工具可以根据“灯光开始工作需要什么信息”提前检查缺口，并把需要确认的问题抛回给设计师或灯光/TA 同事。

Example structure:

- 已有设计源事实：区域功能、情绪曲线、时间段、关键视线、危险/安全区域、重点事件节点。
- 灯光开始工作可能需要：主视觉焦点、玩家导航引导、明暗节奏、可读性要求、动态变化条件、与美术/TA 的依赖。
- 工具应追问设计师：哪些区域需要灯光引导玩家？哪些区域必须保持压迫或迷失？战斗/潜行/解谜状态下可见度是否变化？关键事件是否需要灯光状态切换？
- 必须由灯光或 TA 校准：实时光/烘焙光边界、性能预算、后处理依赖、材质响应、平台限制、具体光照参数。
- 输出价值：不是生成一份“更完整的灯光文档”，而是在交付前暴露“灯光无法开始工作”的信息缺口，减少后续反复会议和返工。

Recommended gameplay prototype example:

### 玩法原型接口：GD 到 TD/GPP 标准文档（暂定示例）

Use this example to show that the workflow can reduce repeated communication in gameplay prototype production, not only in art-facing handoff.

Current process to describe:

- Gameplay designer writes gameplay requirements.
- TD implements prototype components based on the requirements.
- GD assembles or tunes the prototype.
- After prototype approval, the prototype requirements are converted into formal requirements.
- GPP implements the production feature.
- The process contains many communication layers, reinterpretations, and repeated clarification loops.

Framework version to describe:

- TD/GPP maintain a long-lived 项目专属蓝图 MCP for the project.
- The 项目专属蓝图 MCP contains validated blueprint components, implementation patterns, project-specific constraints, and interface requirements.
- It also partially acts as the interface document: it defines what information AI and designers must provide before calling implementation capabilities.
- After GD completes gameplay design through `level-design-deck`, the tool uses the 项目专属蓝图 MCP and interface requirements to generate a GD 到 TD/GPP 标准文档.
- The implementer no longer receives a broad design document and reverse-engineers the requirement. They review the standard document, supervise the AI Agent calling the project-specific blueprint MCP, and approve key implementation logic.
- For pure prototypes, the middle prototype-implementation step may be compressed: GD can use the 项目专属蓝图 MCP to create a prototype independently, then the interface layer translates the prototype into information GPP needs for formal production development.

Important boundary:

- This does not remove TD/GPP judgment. Their role shifts toward maintaining the blueprint MCP, defining implementation interfaces, reviewing key logic, and ensuring the prototype uses reasonable implementation patterns.
- In this workflow, TD and GPP boundaries may become more fluid during prototyping, because the implementation knowledge is partly represented by the project-specific MCP and interface contracts.
- From an internal efficiency product perspective, the 项目专属蓝图 MCP should be jointly maintained by TD/GPP. Interface requirements should be calibrated by the full usage chain, including GD, TD, and GPP.
- This should be framed as a shared capability layer, not as GD bypassing TD/GPP with AI.

## Known Constraint

The portfolio repository is owned by `pupupooo`.

Current GitHub CLI login is `huoshangou`, which has `READ` permission on `pupupooo/stevehong-LEVELDesigner-portfolio`. Local edits are possible, but direct push to the original repository requires either:

- Logging in as `pupupooo`, or
- Granting `huoshangou` write permission to the repository.

## Open Grill Questions

- What is the biggest failure mode of "document as source of truth": AI fabrication, stale documents, implementation drift, derived artifacts replacing the source, or team unwillingness to maintain structure?
- Should `level-design-deck` be shown as a product/tool, a research prototype, or a design methodology case study?
- How much of the homepage should remain recruiter-facing versus peer/industry-facing?
- Should the old agent article be replaced, archived as v1, or kept with an explicit "earlier thinking" label?
