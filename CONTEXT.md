# Portfolio Positioning

This context defines the language used to describe Steve Hong's portfolio repositioning: from a level design portfolio into a broader presentation of AI-assisted design tooling, product thinking, and game design practice.

## Language

**AI-Assisted Design Tooling**:
Tools and workflows that turn design intent into structured source-of-truth data, mechanical checks, and reusable artifacts while keeping human design judgment in control.
_Avoid_: AI workflow, AI productivity, agent automation

**Document as Source of Truth**:
The game-industry-facing phrase for treating the design record as authoritative before implementation translates it into code, assets, or runtime behavior.
_Avoid_: Word file as source, HTML as source, final write-up as source

**Design Source of Truth**:
The precise meaning behind **Document as Source of Truth**: structured specs, constraints, intent, spatial relationships, pacing beats, and other records that preserve intended player experience.
_Avoid_: Rendered document, presentation page, static article

**Derived Artifact**:
Any readable or presentational output rendered from the design source of truth.
_Avoid_: Deliverable as source, HTML source, deck source

**Productized Design Workflow**:
A repeatable design process shaped into usable tools, checks, and interfaces rather than remaining as ad hoc prompts or one-off documents.
_Avoid_: Prompt collection, personal trick, automation script

**Human-in-the-Loop Design Control**:
The principle that human designers remain responsible for intent, judgment, trade-offs, and approval inside an AI-assisted design process.
_Avoid_: Human review as cleanup, AI-first design, automatic generation pipeline

**Existing Knowledge Injection**:
The controlled use of prior project knowledge, design patterns, constraints, and reference cases to shape new design work toward the project's intended goals.
_Avoid_: RAG, knowledge base, context stuffing

**Project Goal Alignment Layer**:
The portfolio-facing name for **Existing Knowledge Injection**: the layer that keeps new design work aligned with the project's goals, rules, constraints, and accumulated design knowledge.
_Avoid_: Retrieval layer, prompt context, reference dump

**Discipline Interface File（职能接口文件）**:
A role-specific contract, validated by the consuming discipline, that defines what that discipline needs from the design source of truth to understand the request and begin work.
_Avoid_: Department document, handoff template, generic checklist

**Interface Ownership（接口所有权）**:
The principle that the discipline consuming an interface has authority to define and validate what information the interface must contain.
_Avoid_: Designer-guessed requirements, one-way handoff format, universal template

**Capability Ownership（能力层所有权）**:
The principle that reusable implementation capabilities are maintained by the disciplines responsible for implementation quality, while interface requirements are calibrated across the full usage chain.
_Avoid_: Designer-owned implementation layer, AI-owned capability layer, bypassing implementers

**Provisional Interface Boundary（暂定接口边界）**:
A clearly labeled assumed interface scope used to explain or prototype the workflow before the consuming discipline has validated the real contract.
_Avoid_: Final interface standard, guessed production requirement, fake certainty

**项目专属蓝图 MCP**:
A project-specific implementation capability maintained by technical collaborators that exposes validated blueprint components, implementation patterns, and interface requirements for AI-assisted prototyping.
_Avoid_: 项目蓝图接口层, generic MCP server, code generator, personal script

**GD to TD/GPP Standard Document（GD 到 TD/GPP 标准文档）**:
A discipline-facing derived artifact that translates gameplay design intent into the requirements and implementation context needed by technical designers and gameplay programmers.
_Avoid_: Generic design doc, prototype notes, final feature spec

**Communication Friction（沟通摩擦）**:
The repeated clarification cost caused when a design document is complete in general but incomplete for a specific discipline's next action.
_Avoid_: Slow writing, poor communication, meeting cost

**Paperwork Reduction（文档事务负担降低）**:
The reduction of repetitive documentation labor required to turn design intent into usable records and handoff materials.
_Avoid_: Skipping documentation, rough notes, undocumented design

**Conversation-First Interaction（对话优先交互）**:
An interaction model where designers begin through an IM-like conversation, while the tool converts clarified intent into structured records, checks, previews, and approval gates.
_Avoid_: Chat-only workflow, final document editor, prompt box

**Product Vision Surface**:
The portfolio-facing description of the intended mature product experience, including interaction patterns that may still be in active iteration.
_Avoid_: Finished feature claim, shipped implementation, roadmap filler

**Implementation Proof**:
The GitHub-facing evidence of what has already been built, tested, or made concrete in the current toolchain.
_Avoid_: Product promise, concept demo, future direction

**Semantic Compilation Layer（语义编译层）**:
The portfolio-facing name for the LLM Director layer in **LLM Director Hitman**: it turns a player's natural-language plan into a structured, validated plan that can be checked before execution.
_Avoid_: LLM brain, narrator, freeform AI decision

**Deterministic Sandbox Layer（确定性沙盒层）**:
The portfolio-facing name for the rule execution layer in **LLM Director Hitman**: registered tools, preconditions, effects, and world-state changes decide what can actually happen.
_Avoid_: AI simulation, free sandbox, arbitrary world editing

**Staged Presentation Layer（演出表现层）**:
The portfolio-facing name for the visual and feedback layer in **LLM Director Hitman**: timeline playback, 2.5D map presentation, character movement, speech bubbles, HUD state, and visual assets show the player how their plan has affected the world.
_Avoid_: log output, cosmetic layer, pure animation

**Spindle Experience Line（纺锤体体验线）**:
A bounded play-experience structure in **LLM Director Hitman**: one clear mission start, a widened middle where the player can compose multiple opportunity chains through natural language, and one or a limited number of designed endpoints. It rejects both preset-button mission flow and unbounded AI improvisation.
_Avoid_: infinite sandbox, linear scripted route, branching tree

**Credible Intermediate State（可信中间状态）**:
The playable partial states between mission start and endpoint in **LLM Director Hitman**: partial execution, blocked preconditions, NPC reactions, changed world state, next-step hints, and visible consequences that let a finite sandbox feel less formulaic.
_Avoid_: flavor text, fake branching, LLM-only narration

**Recovered Play Sweet Spot（被重新做回来的玩法甜区）**:
The AI-native design opportunity where LLMs make previously expensive or brittle player desires more playable, such as complex stealth plans that traditional games often compress into fixed buttons or scripted routes.
_Avoid_: AI novelty, content generation at scale, generic immersion

**Formulaic Open World Problem（公式化大世界问题）**:
The portfolio-facing problem behind **Vehicle Deck Director**: authored open-world content can feel like repeated static triggers when event timing, location, context, and consequences do not respond to the player's current behavior.
_Avoid_: lack of content, random mission spawning, generic immersion problem

**Vehicle Beat（载具 Beat）**:
A structured T2 vehicle-play event contract in **Vehicle Deck Director**: a playable event grammar with required context, entry signal, modifiers, acceptance/ignore handling, active encounter logic, and result feedback. In the broader system, a **Vehicle Beat（载具 Beat）** is selected after semantic suitability analysis and Director policy filtering, not by blind random draw alone.
_Avoid_: instant mission trigger, raw card draw, LLM-generated quest, concrete task name as the whole design unit

**T2 Vehicle Beat Layer（T2 载具 Beat 层）**:
The main showcase layer for **Vehicle Deck Director** because it has the structure needed for distribution: trigger conditions, entry signal, player choice, gameplay objective, active feedback, and success/failure/ignore outcomes. Concrete events such as midnight race, intimidation ride, armored heist, and copilot command should be examples inside event pools, not the whole point of the case.
_Avoid_: isolated mission list, generic side quest, flat gameplay case catalog, T3-style sensory interaction

**Semantic-Gated Beat Director（语义门控 Beat 导演系统）**:
The intended broader structure for **Vehicle Deck Director**: structured world tags and player state are first analyzed for Beat suitability; Director policy then applies cooldown, repetition, intensity, blank-beat, and pacing constraints; only then does the system select from qualified Beat and event pools.
_Avoid_: pure random encounter deck, LLM-only mission generation, always-pick-best semantic matching

**Pure Deck Simulation MVP（纯 Deck 模拟 MVP）**:
The current 2D demo mode for **Vehicle Deck Director** when no real LLM Director is connected. It uses Deck draw, rules, and mock recommendations to approximate the distribution loop, but it should not be presented as the final LLM-enabled system architecture.
_Avoid_: final architecture, proof that random draw is the core value, pretending LLM is already driving selection

**Vehicle Production Scope（载具项目生产范围）**:
The truthful production-facing scope behind the portfolio case: planning the open-world vehicle gameplay hierarchy across T3/T2/T1 and pushing selected vehicle gameplay cases forward in an actual project context. It should not imply that the full semantic Deck/Director distribution system has already been implemented in production.
_Avoid_: claiming production implementation of the LLM Director, presenting personal prototypes as shipped project systems, vague "I built the whole system"

**Personal Distribution Prototype（个人分发验证原型）**:
The personal prototype scope behind **Vehicle Deck Director**: using a 2D MVP, Director Lab, and LLM-assisted reasoning to test player-centered vehicle event distribution, semantic Beat selection, and rule-bounded orchestration. It extends thinking from production vehicle gameplay planning but remains a validation prototype.
_Avoid_: production feature, shipped AI system, purely speculative design without prototype evidence

**LLM Orchestration Advisory Layer（LLM 编排建议层）**:
The LLM-facing layer in the intended **Vehicle Deck Director** system: it reads structured player/world context and recommends suitable **Vehicle Beat（载具 Beat）** categories and orchestration reasons. Director policy decides whether to accept the recommendation, while the concrete event remains selected or instantiated inside approved event pools and deterministic rule boundaries.
_Avoid_: autonomous world editing, freeform quest generation, LLM as final authority

**Connected District MVP（连通城区 MVP）**:
The map boundary for the current **Vehicle Deck Director** MVP: a bounded but meaningfully drivable city district built around connected road loops, clear city edges, wide readable roads, POIs, alleys, traffic lanes, and presentation anchors for **Vehicle Beat（载具 Beat）** signals. It should support continuous cruising without frequent dead ends or empty off-map driving.
_Avoid_: tiny intersection demo, infinite procedural city proof, decorative map, generic driving arena, POI-only semantic map

**Vehicle Beat Families（载具 Beat 事件族）**:
The four T2 event families used by **Vehicle Deck Director**: discovery opportunity, request entry, confrontation pressure, and escort/delivery. They adapt the older sandbox quest Beat approach to vehicle-centered open-world play.
_Avoid_: unrelated minigame list, flat random card pool, one-off mission types

**T1 Systemic Vehicle Challenge（T1 系统级载具挑战）**:
The rare top-tier vehicle-play chapter in **Vehicle Deck Director**. It calls on T3 physical interactions and T2 gameplay modules to organize a complete high-pressure experience arc, but it is not a normal random card in the distribution pool and should not be framed as simply "a bigger T2 event."
_Avoid_: frequent random event, upgraded T2 card, accidental emergent mission, ordinary task chain

**T3 Vehicle Sensory Layer（T3 载具感官层）**:
The atomic physical interaction layer in **Vehicle Deck Director**: low-friction, 1-10 second driving feedback such as rhythmic destruction, mischief, shortcuts, impact, and environmental response. T3 should not enter the event deck as a task; it can be read as environmental/physical semantics that modify or support T2/T1 play.
_Avoid_: mission card, pushed quest, standalone objective loop, LLM-generated event

**Vehicle Beat Access Modes（载具 Beat 接入模式）**:
The two entry patterns for T2 vehicle events in **Vehicle Deck Director**: player-initiated beats that the player accepts from a contact, POI, or pickup point before gameplay starts, and world-initiated beats that appear in the world first and pressure, chase, challenge, or interrupt the player without requiring the same initial accept step.
_Avoid_: one universal press-E signal, all events as pop-up missions, hidden random start

**District Traversal Boundary（城区通行边界）**:
The movement boundary for **Connected District MVP（连通城区 MVP）**: leaving a road is allowed and can remain part of vehicle play, but leaving the authored district boundary is not allowed. Off-road state should influence which **Vehicle Beat（载具 Beat）** is suitable, rather than shutting down the Director entirely.
_Avoid_: empty off-map driving, universal off-road lockout, road-only driving simulation

**District Layout Source of Truth（城区布局源事实）**:
The single authored data file for the **Vehicle Deck Director** MVP map. Roads, blocked buildings, POIs, player spawn, NPC spawn lanes, and event anchors must come from this layout data instead of being hard-coded separately in rendering, collision, director logic, or traffic spawning.
_Avoid_: visual-only map editor, duplicated map constants, hard-coded semanticDistrictDef

## Relationships

- **Document as Source of Truth** is the public-facing wording for **Design Source of Truth**.
- Chinese-facing pages should use Chinese terminology for core framework nodes, while keeping project names, repository names, and code identifiers in English where needed.
- **AI-Assisted Design Tooling** uses a **Design Source of Truth** to produce one or more **Derived Artifacts**.
- A **Productized Design Workflow** makes **AI-Assisted Design Tooling** usable beyond a single improvised chat session.
- **Derived Artifacts** must not replace the **Design Source of Truth**.
- **Human-in-the-Loop Design Control** defines how people lead a **Productized Design Workflow** instead of merely correcting AI output after the fact.
- **Existing Knowledge Injection** helps **AI-Assisted Design Tooling** produce designs aligned with project goals rather than merely well-formatted outputs.
- **Project Goal Alignment Layer** is the public explanation of **Existing Knowledge Injection**.
- **Discipline Interface File（职能接口文件）** turns a **Design Source of Truth** into role-specific requirements, questions, and readiness checks for downstream collaborators.
- **Interface Ownership（接口所有权）** prevents **Discipline Interface File（职能接口文件）** from becoming designer-guessed documentation.
- A **Provisional Interface Boundary（暂定接口边界）** may be used in the portfolio to explain the product idea, but it must not be presented as a validated production contract.
- **Discipline Interface File（职能接口文件）** reduces **Communication Friction（沟通摩擦）** by finding missing information before handoff.
- **Paperwork Reduction（文档事务负担降低）** and reducing **Communication Friction（沟通摩擦）** are complementary goals of the workflow.
- **Conversation-First Interaction（对话优先交互）** is the intended product form for **Human-in-the-Loop Design Control**.
- **项目专属蓝图 MCP** can act as both implementation capability and living interface contract for prototype work.
- **Capability Ownership（能力层所有权）** places **项目专属蓝图 MCP** maintenance with TD/GPP, while interface needs are calibrated by the usage chain that includes GD, TD, and GPP.
- A **GD to TD/GPP Standard Document（GD 到 TD/GPP 标准文档）** is a **Derived Artifact** generated from the **Design Source of Truth** using requirements from **项目专属蓝图 MCP** and **Discipline Interface File（职能接口文件）**.
- A **Product Vision Surface** can describe the intended experience of **Human-in-the-Loop Design Control**, while **Implementation Proof** must stay limited to what exists in the current GitHub project.
- **LLM Director Hitman** should be framed as a playable design research prototype: it uses a **Semantic Compilation Layer（语义编译层）**, **Deterministic Sandbox Layer（确定性沙盒层）**, and **Staged Presentation Layer（演出表现层）** to make natural-language planning feel open while keeping world changes bounded and visible.
- **Spindle Experience Line（纺锤体体验线）** is the experience shape produced by that three-layer structure: natural-language planning opens the middle of the experience, while deterministic rules and designed endpoints preserve authored control.
- **Credible Intermediate State（可信中间状态）** is how the widened middle of a **Spindle Experience Line（纺锤体体验线）** avoids feeling formulaic: the player sees plans partially succeed, fail for legible reasons, change NPC/world state, and create new next-step decisions.
- **Recovered Play Sweet Spot（被重新做回来的玩法甜区）** explains why **LLM Director Hitman** exists as an AI-native experiment rather than a generic AI feature: it uses LLMs to recover complex player planning that traditional stealth/sandbox missions often flatten into preset buttons.
- **Vehicle Deck Director** addresses the **Formulaic Open World Problem（公式化大世界问题）** by combining structured content (**Vehicle Beat（载具 Beat）**), pacing/distribution control (Deck and Director), and semantic prioritization (**LLM Orchestration Advisory Layer（LLM 编排建议层）**).
- **Vehicle Production Scope（载具项目生产范围）** and **Personal Distribution Prototype（个人分发验证原型）** must remain distinct in the portfolio: production work covers the vehicle gameplay hierarchy and selected case advancement; the player-centered Deck/LLM distribution system is an ongoing personal validation prototype.
- **Semantic-Gated Beat Director（语义门控 Beat 导演系统）** is the preferred explanation for why the design still uses Deck/Beat thinking in an LLM-enabled context: the project learns the controlled-distribution principle behind encounter decks, not the blind random draw form.
- In the intended system, **LLM Orchestration Advisory Layer（LLM 编排建议层）** recommends suitable Beat categories; Director policy handles cooldown, repetition, intensity, and blank-beat pacing; concrete events are selected or instantiated within approved event pools and rule boundaries.
- In the current 2D **Pure Deck Simulation MVP（纯 Deck 模拟 MVP）**, Deck draw and mock recommendations stand in for the missing LLM Director so the distribution loop remains testable without claiming final architecture parity.
- The broader **Vehicle Deck Director** case may discuss deeper LLM participation as a system direction, as long as authored design boundaries and deterministic execution remain explicit.
- **Connected District MVP（连通城区 MVP）** makes **Vehicle Beat（载具 Beat）** signals legible by giving events concrete POI, road, vehicle, and region context while also providing enough connected driving space for cruising, pursuit, and route choice.
- **Vehicle Beat Families（载具 Beat 事件族）** keeps the T2 layer expandable: existing cards such as midnight race, intimidation ride, armored heist, and copilot command should map into discovery, request, confrontation, or escort/delivery rather than remaining isolated minigames.
- **T2 Vehicle Beat Layer（T2 载具 Beat 层）** is the main showcase scope because it is structured enough to be selected, filtered, accepted, ignored, executed, and resolved; individual T2 events should serve as examples of the layer rather than the case's primary claim.
- **T1 Systemic Vehicle Challenge（T1 系统级载具挑战）** sits above the T2 distribution layer: it can use T3 interactions and T2 modules, but its design purpose is a complete rare challenge arc rather than routine event distribution.
- **T3 Vehicle Sensory Layer（T3 载具感官层）** sits below the T2 distribution layer: it should be authored into roads, POIs, and physical affordances rather than pushed as a mission, while still providing semantic context and possible solutions for T2/T1.
- **Vehicle Beat Access Modes（载具 Beat 接入模式）** prevents every T2 event from feeling like the same pop-up. Delivery, pickup, and intimidation rides are player-initiated; street races, police interception, gang retaliation, and similar pressure events are world-initiated.
- **District Traversal Boundary（城区通行边界）** means the Director can continue while the player is off-road inside the authored district, but Beat suitability must account for road state; a street race may be inappropriate off-road, while recovery, pursuit pressure, or opportunistic encounters may still be valid.
- **District Layout Source of Truth（城区布局源事实）** is required before improving the next playable MVP, because roads, buildings, NPC traffic, POI queries, and event anchors must agree on what space is actually drivable and meaningful.

## Example dialogue

> **Reader:** "Is this just an AI-generated level design document?"
> **Domain expert:** "No. The document is a **Derived Artifact**; the real claim is the **AI-Assisted Design Tooling** that maintains a **Design Source of Truth** and checks whether the design still holds together."

## Flagged ambiguities

- "AI workflow" was too broad and could mean prompt habits, coding automation, or design process; resolved as **AI-Assisted Design Tooling** for the portfolio context.
- "document" could mean either a rendered file or the authoritative design record; resolved by using **Document as Source of Truth** publicly and **Design Source of Truth** as the precise definition.
- The biggest risk is not **AI-Assisted Design Tooling** making isolated mistakes, but **Derived Artifacts** looking authoritative while the **Design Source of Truth** and **Human-in-the-Loop Design Control** are weak or missing.
- "knowledge injection" should not mean dumping references into context; resolved as **Existing Knowledge Injection**, where curated prior knowledge actively steers design toward project goals.
- "project goal alignment" must be explained as design guidance from accumulated project knowledge, not as a vague promise that AI output will match intent automatically.
- The personal homepage may present the intended mature product interaction model, but the GitHub project should be framed as the implemented proof of the parts already practiced and landed.
- "process acceleration" should not be framed as faster document generation alone; resolved as reducing **Communication Friction（沟通摩擦）** through **Discipline Interface File（职能接口文件）** checks.
- "faster documentation" and "lower communication friction" should not be framed as opposing claims; resolved as **Paperwork Reduction（文档事务负担降低）** plus **Communication Friction（沟通摩擦）** reduction.
- "discipline interface" must not imply that the level designer can fully define other disciplines' needs alone; resolved by **Interface Ownership（接口所有权）** and clearly labeled **Provisional Interface Boundary（暂定接口边界）** when needed.
- "prototype acceleration" should not mean bypassing implementation judgment; resolved as designers using a **项目专属蓝图 MCP** under human review, with technical collaborators maintaining the implementation interface and approving key logic.
