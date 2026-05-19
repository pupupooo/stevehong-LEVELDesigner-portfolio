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
