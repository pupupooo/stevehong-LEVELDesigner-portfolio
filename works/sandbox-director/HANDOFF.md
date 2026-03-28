# Anti-Plot 开放世界原型 — 交接文档

> 版本: v0.5.0（模块化重构版） | 日期: 2026-03-28

---

## 一、项目概述

这是一个 **反情节（Anti-Plot）开放世界任务系统** 的 HTML5 原型，用于验证核心设计假设：

> **"同一个 Beat 模板 + 不同修饰器 + 玩家行为 = 不同的涌现叙事体验"**

灵感来源：Schedule I 的涌现式世界 × 科恩兄弟电影的荒诞叙事。

### 文件清单

```
SandBoxDirctor/
├── index.html          ← 可运行原型入口（HTML/CSS + 胶水代码，318 行）
├── js/
│   ├── config.js       ← 常量与地图数据                  (43 行)
│   ├── utils.js        ← 纯数学工具函数                  (24 行)
│   ├── world.js        ← 世界状态 + 实体基础操作          (94 行)
│   ├── events.js       ← 世界事件广播 + 5 种 NPC 反应    (107 行)
│   ├── ai.js           ← 5 种 NPC AI 状态机 + 闲聊感知   (161 行)
│   ├── beats.js        ← Beat 模板 + 修饰器 + 生命周期   (248 行)
│   ├── director.js     ← 导演扫描 + 触发逻辑             (64 行)
│   ├── gun.js          ← 射线检测 + 射击/瞄准/装弹       (87 行)
│   ├── render.js       ← Canvas 全部渲染逻辑             (137 行)
│   └── debug.js        ← 调试面板 + 手动触发 + 重置      (72 行)
├── design.html         ← 完整设计文档（带侧边导航，13 章节）
└── HANDOFF.md          ← 本交接文档
```

> **v0.5.0 重构说明**: 已完成从单文件（~989 行 JS）到 10 文件模块化架构的迁移。
> 使用 `<script>` 标签顺序加载，无需构建工具。所有跨模块调用通过全局作用域实现。

---

## 二、如何运行

直接双击 `index.html`，在浏览器中打开即可。无任何依赖。

### 操作方式

| 按键 | 功能 |
|------|------|
| `WASD` / 方向键 | 移动玩家 |
| `E` | 近距离交互（对话/近战攻击）/ **接受请求**（请求 Beat 中） |
| **左键按住** | **瞄准**（持续瞄准 NPC 触发威慑） |
| **右键** | **射击**（需要先瞄准，射线命中判定） |
| `R` | 装弹（6 发弹仓，1.5 秒装填）/ **拒绝请求**（请求 Beat 中） |
| `Q` | 切换天气（晴/雨） |
| `Tab` | 调试面板 |
| `H` | 帮助面板 |

---

## 三、系统架构

原型包含 **6 个核心系统**，全部在 `index.html` 单文件中实现：

### 3.1 实体系统（Entity System）

每个实体是一个 JS 对象，核心字段：

```
{
  id, name, type, x, y,           // 身份和位置
  tags[], faction,                 // 标签和阵营（用于导演选角）
  hp, maxHp, combatPower, speed,   // 属性
  state, stateTimer,               // AI 状态机
  isDirected, beatRole,            // 导演控制标志
  memory[],                        // 记忆（影响对话和行为）
  damageLog[],                     // 伤害来源追踪（归因系统）
}
```

实体类型和对应 AI 行为函数：

| type | AI 函数 | 状态机 |
|------|---------|--------|
| `merchant` | `merchantAI()` | idle → wander → (flee) |
| `guard` | `guardAI()` | idle → patrol → (chase) |
| `bandit` | `banditAI()` | idle → wander → chase → attack → (flee) |
| `boar` | `boarAI()` | idle → wander → (chase) → (flee) |
| `traveler` | `travelerAI()` | idle → wander → (flee) |

`isDirected = true` 时，正常 AI 被跳过，由 Beat 引擎接管行为。

### 3.2 导演系统（Director System）

核心函数：`updateDirector(dt)`

工作流程：
```
每 N 秒扫描（CFG.directorScanInterval）
  → 检查玩家周围 CFG.playerDetectionRadius 范围内的实体
  → 匹配 Beat 模板的 slots 条件
  → 评估可用修饰器（按 priority 排序）
  → 创建 Beat 实例
```

关键冷却机制：
- `world.beatCooldown`：两个 Beat 之间的间隔（默认 18s）
- `world.antiPlotCooldown`：两次反情节之间的间隔（默认 40s）
- `world.lastAntiPlotType`：记录上次反情节类型，避免连续重复

### 3.3 Beat 引擎（Beat Engine）

Beat 生命周期：`setup → active → resolving → done`

当前实现的模板：

**对峙（confrontation）**
- 槽位：`aggressor`（hostile 标签）+ `victim`（civilian 标签）
- setup 阶段：aggressor 向 victim 移动
- active 阶段：检查修饰器条件，执行修饰器或正常攻击流程
- 退出条件：任一方死亡 / 超时 25s / 玩家威慑介入

**发现（discovery）**
- 触发条件：玩家进入洞穴区域
- 即时评估修饰器并结算

**请求（request）** — v0.4 新增
- 槽位：`requester`（civilian/traveler 标签）
- 触发条件：玩家附近有可请求帮助的平民/旅人
- setup 阶段：requester 向玩家移动并发起对话
- active 阶段：玩家选择接受(E)或拒绝(R)请求
- 请求类型：护送(escort)、寻找物品(find_item)、警告(warn)
- 退出条件：玩家做出选择 / 超时 15s / 修饰器触发

修饰器（Modifiers）：

| id | 名称 | 条件 | 效果 |
|----|------|------|------|
| `hijack` | 截胡 | 附近有 animal 标签实体 | 动物冲向 aggressor |
| `power_gap` | 实力悬殊 | 玩家声望≥65 或战力翻倍 | aggressor 投降逃跑 |
| `weather_slip` | 天气意外 | 正在下雨 | aggressor 滑倒受伤 |
| `awkward_silence` | 无声尴尬 | 洞穴已访问 或 40% 随机 | 洞穴里只有嘲讽纸条 |
| `reversal` | 立场反转 | 35% 概率 | 请求者是骗子，触发埋伏 |
| `betrayal` | 背叛 | 声望<30 且 50% 概率 | 请求者因玩家名声差而取消请求 |

### 3.4 世界事件系统（World Event Broadcast）

核心函数：`emitWorldEvent(eventType, data)`

当任何"有动静的事情"发生时，向半径内所有实体广播事件：

| 事件类型 | 触发时机 | 默认半径 |
|----------|---------|---------|
| `kill` | 实体被击杀 | 400px |
| `combat_nearby` | 战斗发生 | 300px |
| `gunshot` | 玩家开枪 | 500px |
| `intimidate` | 玩家持续瞄准某 NPC | 200px |

每种 NPC 类型有独立的反应函数：
- `merchantReaction()` — 感谢/逃跑/惊恐
- `guardReaction()` — 赞许/追捕/调查
- `banditReaction()` — 报仇/恐惧/逃跑
- `boarReaction()` — 受惊逃跑
- `travelerReaction()` — 崇拜/逃跑

### 3.5 枪械系统（Gun System）

核心状态：`gun` 对象

```
{
  ammo: 6,          // 当前弹药
  isAiming: false,   // 左键按住
  shootCooldown: 0,  // 射击冷却
  reloading: false,  // 装弹中
  aimTarget: null,   // 当前瞄准的实体
  aimDuration: 0,    // 持续瞄准时间
  intimidated: Set,  // 已被威慑的实体 ID
}
```

射击流程：
```
右键点击 → shoot()
  → 检查弹药 & 冷却 & 瞄准状态
  → raycast() 射线检测（lineCircleIntersect 数学）
  → 命中：扣 HP + 伤害日志 + 闪光效果
  → 未命中：检查近距离擦过的实体
  → 无论命中：emitWorldEvent('gunshot') 全局广播
  → 创建 tracer（弹道线）和 flash（枪口闪光）
```

威慑流程：
```
左键按住 → updateAim() 每帧运行
  → raycast 找到瞄准线上的实体
  → 持续瞄准同一实体 ≥ 0.8 秒
  → emitWorldEvent('intimidate')
  → 山贼可能投降（连接到 Beat 系统）
  → 守卫会警告并追捕
```

### 3.6 记忆与上下文感知

每个 NPC 有 `memory[]`（上限 10 条），记录目睹的事件：

```javascript
{ type: 'witnessed_kill', detail: { killer: '玩家', victim: '山贼大刘' }, time: 45.2 }
{ type: 'heard_gunshot', detail: {}, time: 50.1 }
{ type: 'player_is_dangerous', detail: {}, time: 50.1 }
```

记忆影响：
- 对话内容（`updateIdleAwareness` 根据记忆选择台词）
- AI 行为（山贼记住 `player_is_dangerous` → 自动回避玩家）
- 反馈循环（守卫记住 `chasing_player` → 后续见面仍然警惕）

---

## 四、NPC 列表

| 名称 | type | tags | HP | 战力 | 速度 | 驻区 | 角色 |
|------|------|------|----|------|------|------|------|
| 玩家 | player | player | 200 | 10 | 130 | — | 可控角色 |
| 商人老王 | merchant | civilian, merchant | 60 | 2 | 35 | 集市 | Beat 受害者候选 |
| 货郎小陈 | merchant | civilian, merchant | 50 | 1 | 30 | 集市 | 备用受害者 |
| 守卫阿强 | guard | civilian, guard, authority | 150 | 12 | 55 | 卫兵营 | 世界规则执行者 |
| 山贼大刘 | bandit | hostile, greedy | 80 | 8 | 50 | 森林 | Beat 攻击者候选 |
| 山贼二毛 | bandit | hostile, greedy | 70 | 6 | 45 | 森林 | 备用攻击者 |
| 野猪 | boar | animal, hungry | 90 | 15 | 40 | 森林 | [截胡] 修饰器执行者 |
| 旅人阿花 | traveler | civilian, traveler | 40 | 1 | 35 | 道路 | 氛围填充/旁观者 |

---

## 五、配置参数速查

所有可调参数集中在 `CFG` 对象中：

```javascript
const CFG = {
  beatCooldown: 18,           // Beat 之间最小间隔（秒）
  antiPlotCooldown: 40,       // 反情节之间最小间隔（秒）
  directorScanInterval: 4,    // 导演扫描间隔（秒）
  playerDetectionRadius: 350, // 导演扫描玩家周围的范围（px）
  eventBroadcastRadius: 300,  // 世界事件默认广播范围（px）
  idleChatCooldown: 12,       // NPC 闲聊冷却（秒）
  idleChatRadius: 100,        // NPC 感知玩家距离（px）
  gunDamage: 18,              // 枪械基础伤害
  gunRange: 600,              // 射程（px）
  shootCooldown: 0.35,        // 射击冷却（秒）
  reloadTime: 1.5,            // 装弹时间（秒）
  maxAmmo: 6,                 // 弹仓容量
  gunshotEventRadius: 500,    // 枪声广播范围（px）
  intimidateTime: 0.8,        // 持续瞄准多久触发威慑（秒）
  nearMissRadius: 45,         // "擦过"判定范围（px）
};
```

这些参数全部可以通过 **Tab 调试面板** 的滑块实时调整。

---

## 六、已知问题与限制

### 已修复/新增（v0.4）
- **新增 [请求] Beat 模板** — 旅人/平民向玩家发起求助请求
  - 3 种请求类型：护送(escort)、寻找物品(find_item)、警告(warn)
  - 玩家可选择接受（E）或拒绝（R）请求
  - 接受增加声望，拒绝降低声望
- **新增 2 个修饰器**：
  - `[立场反转]` (35% 概率) — 请求者是骗子，触发埋伏
  - `[背叛]` (声望<30 时 50% 概率) — 请求者因玩家名声差而取消请求
- **手动触发 [请求]** — 调试面板新增请求 Beat 按钮
- **Bug 修复**：
  - ~~对峙时受害者跑出地图~~：修复 victim 逃跑目标未限制边界的问题
  - ~~找包裹任务无法完成~~：新增可交互包裹物品，拾取后完成任务
- **架构更新**：
  - 创建 `js/` 目录，开始模块化拆分（config.js, utils.js）
  - 新增 `showcase.html` — 游戏+文档合并展示页面，支持布局切换

### 已修复（v0.3）
- ~~山贼和野猪开局卡住~~：导演系统第 1 帧就触发 Beat，已添加初始冷却 + 提高 wander 速度

### 当前限制
1. **单 Beat 并发**：同一时间只允许一个活跃 Beat
2. **无碰撞检测**：实体可以穿过建筑和树木
3. **无持久化**：刷新页面即重置
4. **玩家无 HP 损失**：被攻击有日志但不会死（方便测试）
5. **~~Beat 模板只有 2 个~~** → **现有 3 个 Beat 模板**：[对峙]、[发现]、[请求]
6. **无 Token 传递**：蝴蝶效应型反情节未实现

---

## 七、代码结构导航

`index.html` 内的 JavaScript 通过注释分隔为以下区段（搜索 `═══` 即可定位）：

| 区段 | 说明 | 大约行号 |
|------|------|---------|
| CONFIGURATION | 全局配置 CFG、地图区域、树木/建筑位置 | ~210 |
| UTILITIES | 数学工具函数、射线检测 | ~240 |
| EVENT LOG | 右侧日志面板操作 | ~260 |
| WORLD STATE | 全局状态 world 对象 | ~270 |
| GUN STATE | 枪械状态 gun 对象 | ~275 |
| ENTITY | 实体创建、记忆系统 | ~280 |
| WORLD EVENT BROADCAST | 事件广播 + 5 种 NPC 反应函数 | ~310 |
| IDLE AWARENESS | NPC 近距离感知对话 | ~390 |
| INPUT | 键盘/鼠标事件绑定 | ~430 |
| GUN SYSTEM | shoot()、startReload()、updateGun()、updateAim() | ~460 |
| PLAYER | updatePlayer()、tryInteract()、killEntity() | ~530 |
| AI BEHAVIORS | 5 种 NPC 的 AI 状态机 | ~590 |
| BEAT SYSTEM | 模板/修饰器数据 + Beat 生命周期 | ~615 |
| DIRECTOR | updateDirector()、tryConfrontation()、tryDiscovery() | ~685 |
| DEBUG | 手动触发、重置、调试面板同步 | ~710 |
| RENDERING | Canvas 渲染（世界/实体/瞄准线/弹道/UI） | ~740 |
| STATS UI | 右侧面板数据更新 | ~830 |
| INIT | 实体初始化 | ~840 |
| GAME LOOP | 主循环 requestAnimationFrame | ~860 |

---

## 八、扩展指南

### 添加新 NPC 类型

1. 在 `initWorld()` 中添加 `createEntity({...})`
2. 创建对应的 AI 函数 `xxxAI(e, dt)`
3. 在 `updateEntityAI()` 的 switch 中添加分支
4. 在 `reactToWorldEvent()` 的 switch 中添加反应函数
5. 在 `updateIdleAwareness()` 的 switch 中添加闲聊逻辑

### 添加新 Beat 模板

1. 在 `BEAT_TEMPLATES` 中添加模板定义（id, name, slots, modifiers）
2. 在 `updateBeatSetup()` 中添加 `if(b.template.id === 'xxx')` 分支
3. 在 `updateBeatActive()` 中添加对应的活跃阶段逻辑
4. 在 `tryTriggerBeat()` 中添加新的触发检查函数

### 添加新修饰器

1. 在 `MODIFIERS` 中添加修饰器定义：
   ```javascript
   new_modifier: {
     id: 'new_modifier',
     name: '名称',
     emoji: '🎭',
     priority: 7,            // 优先级，越高越先检查
     condition(beat) {...},   // 返回 bool
     apply(beat) {...},       // 执行修饰器效果，返回 bool
   }
   ```
2. 在对应 Beat 模板的 `modifiers` 数组中添加其 id

### 添加新世界事件类型

1. 在 `emitWorldEvent()` 调用处添加新事件类型
2. 在每个 NPC 的反应函数中添加 `if(evt === 'new_type')` 分支

---

## 九、MVP 调试复盘与核心发现

> 以下是内部开发过程中的关键问题和设计思考，供后续开发参考。

### 9.1 三个核心设计原则

这三条原则是在 5 轮原型迭代 + 12 个 bug 修复中被"逼"出来的。每一条都对应踩过的坑。

#### 原则 ①：以玩家为中心的导演系统

传统做法（GOAP / Utility AI）给每个 NPC 一个目标系统全局调度，世界到处在"演"，大部分事件发生在玩家看不见的地方。

我们的做法：导演系统**只在玩家附近**扫描候选实体，只在玩家可感知范围内触发 Beat。核心代码是 `director.js` 中以 `_dist(e, player) < radius` 过滤所有候选者。

关键教训：导演需要"启动缓冲期"。早期版本 `directorTimer=0`，第一帧就触发 Beat，锁住了山贼/野猪的自治 AI，导致开局卡住不动。

#### 原则 ②：宽进严出的 Beat 触发

触发条件尽量宽松（只需 hostile + civilian 在附近），退出跃迁才做细分（8+ 种结局通过修饰器实现）。

关键教训：位置触发型 Beat（洞穴发现）必须优先于人物触发型（对峙/请求），否则常见事件会永远抢先。修复后的优先级：发现 → 对峙 → 护送 → 请求。

#### 原则 ③：结构化自顶向下的 Beat 设计

四层结构（模板 → 槽位 → 修饰器 → 退出条件）确保增加内容不增加架构复杂度。从 v0.1（2 Beat + 4 修饰器）到 v0.5（4 Beat + 8 修饰器），核心架构零改动。

关键教训：多阶段 Beat（搜索 → 返还 → 结算）必须在 `updateBeatActive` 内部用子状态机管理。早期"接受即结算"的做法导致找包裹任务无法完成。

### 9.2 调试过程实录

| # | 问题 | 根因 | 修复 | 设计启示 |
|---|------|------|------|---------|
| 1 | 山贼/野猪开局卡住 | directorTimer=0，首帧触发 Beat 锁住实体 | 初始冷却 + 增加 wander 速度 + Beat 结束后重置 AI 状态 | 导演需要"启动缓冲" |
| 2 | 守卫在玩家帮忙时追杀玩家 | gunshot 事件无差别让守卫追捕射击者 | 守卫枪声反应改为"巡逻调查"，只有低声望才直接追捕；新增 `crime_witnessed` 事件 | NPC 反应需要**上下文**，不能只看事件类型 |
| 3 | 找包裹任务无法完成 | 接受时 Beat 立刻 resolve | find_item 用 searchPhase 子状态机管理多阶段流程 | 多阶段 Beat 需要在 active 内管理生命周期 |
| 4 | 洞穴发现从不触发 | 优先级排序：对峙抢先 | 位置触发型 Beat 优先 | Beat 有类型差异，不应一视同仁排序 |
| 5 | 玩家浮动文字不消失 | gameLoop 不对玩家执行 timer 递减 | 在 updatePlayer 中显式递减 timer | 玩家实体也有 NPC 属性，不能完全跳过 |
| 6 | 护送任务秒完成 | 无真实目的地 + 接受即结算 | 新增驿站 + 护送行走阶段 + 反转修饰器 | Beat 必须有**空间距离**来承载戏剧性 |
| 7 | 玩家无法死亡 | 从未检查 player.hp ≤ 0 | 死亡检测 + 倒地画面 + 集市复活 + 声望惩罚 | 没有负反馈的世界没有紧张感 |

### 9.3 范围控制反思

开发过程中一度出现"偏离设计初衷、收不住"的风险。每次新增功能都要问：**这是在加深已有的反情节体验，还是在横向扩展新功能？** 延迟反转修饰器（找包裹反转、商人反水）属于前者——它们深化了已有 Beat 的涌现可能性，没有增加系统复杂度。

---

## 十、下一步开发建议

按优先级排序：

1. ~~**新增 [请求] Beat 模板**~~ ✅ v0.4 已完成
2. ~~**扩展 Beat + 延迟反转修饰器**~~ ✅ v0.5 已完成
3. **Token 传递机制** — 实现蝴蝶效应型：小交互生成 Token，后续 Beat 消费 Token 放大后果
4. **旁观者效应** — 玩家在 Beat 范围内不作为 → 记录 bystander Token → 后续被 NPC 引用
5. **公平补偿机制** — 反情节后的非对称补偿机会
6. **更多玩家动词** — 推搡、给予物品、威吓喊话等非暴力交互
7. **考虑迁移至 Godot 4.x** — 当 Beat 模板超过 5 个时，评估引擎迁移

### 待讨论问题

1. **Tension Graph 衰减模型**：线性衰减 vs 指数衰减 vs 事件驱动阶梯式？MVP 使用线性衰减，正式版建议混合模型。
2. **Beat 配置格式**：MVP 硬编码在 JS 中；Godot 版本建议用 Resource 文件（.tres）在编辑器中可视化编辑。
3. **NPC "演员模式"切换**：当前硬切换。正式版需要行为队列压栈/弹栈——导演行为结束后恢复自治行为。
4. **反情节的"公平补偿"**：具体的补偿路径如何设计？需要新的 Beat 模板还是在现有模板上加修饰器？
5. **多 Beat 并发**：当前每次只允许一个活跃 Beat。正式版是否需要支持同时运行 2-3 个不同区域的 Beat？
6. **玩家的交互深度**：除了攻击和对话，是否需要"给予物品""推搡""威吓"等更多交互动词？

---

## 十一、设计文档入口

`design.html` 包含面向外部的系统设计文档（12 章节，带侧边导航），涵盖：
- 设计目标与灵感来源
- Beat 三层架构（模板 + 槽位 + 修饰器）
- 7 种反情节模式工具箱
- 导演系统 6 条准则
- 系统架构与 MVP 裁剪
- NPC 图鉴（每个 NPC 的完整反应规则）
- 世界事件系统原理
- 三个核心设计原则（MVP 验证）
- 已完成里程碑

---

## 附录：重构执行方案

> 状态: **待执行** | 评估日期: 2026-03-28
> 原则: 实用主义 — 10 个平面文件 + `<script>` 顺序加载，不上打包工具，保留"双击打开"体验

---

### A1. 目标架构

```
SandBoxDirctor/
├── index.html          ← HTML/CSS + <script> 标签 + 胶水代码（~100 行 JS）
└── js/
    ├── config.js       ← [已存在] 常量与地图数据             ~60 行
    ├── utils.js        ← [已存在] 纯数学工具函数             ~35 行
    ├── world.js        ← 世界状态 + 实体基础操作             ~80 行
    ├── events.js       ← 世界事件广播 + 5 种 NPC 反应       ~100 行
    ├── ai.js           ← 5 种 NPC AI 状态机 + 闲聊感知      ~100 行
    ├── beats.js        ← Beat 模板 + 修饰器 + 生命周期      ~150 行
    ├── director.js     ← 导演扫描 + 触发逻辑                ~50 行
    ├── gun.js          ← 射线检测 + 射击/瞄准/装弹          ~90 行
    ├── render.js       ← Canvas 全部渲染逻辑                ~120 行
    └── debug.js        ← 调试面板 + 手动触发 + 重置         ~50 行
```

估算总量: ~935 行格式化代码，单文件最大 150 行。

---

### A2. 每个文件的精确内容

#### config.js — 已存在，无需修改
```
拥有全局: W, H, CFG, COLORS, AREAS, TREES, BUILDINGS
函数: 无
依赖: 无
```

#### utils.js — 已存在，删除 module.exports 包装
```
拥有全局: 无（全为函数）
函数: _dist, clamp, randRange, randInt, pick,
       pointInArea, randomPointInArea, lineCircleIntersect
依赖: 无（纯函数）
```

#### world.js — 基础层，所有系统的地基
```
拥有全局: world, tracers, flashes, nextId
DOM引用: logEl (document.getElementById('log'))
函数:
  log(text, type)           ← 写入右侧日志面板
  createEntity(cfg)         ← 生成实体对象
  showFloatingText(e,t,dur) ← 设置浮动文字
  addMemory(e, type, detail)← 写入 NPC 记忆
  hasRecentMemory(e,t,w)    ← 查询 NPC 记忆
  moveToward(e,tx,ty,dt,sm) ← 实体移动原语
  pickWanderTarget(e)       ← 随机漫步目标
  fleeFrom(e, source, dur)  ← 逃跑行为原语
  killEntity(e, killer)     ← 击杀 → 调用 emitWorldEvent [events.js]
  respawnEntity(e)          ← 重生

运行时前向引用:
  killEntity() → emitWorldEvent() [events.js，加载在后面，运行时已存在]
```

#### events.js — 世界事件广播
```
拥有全局: 无
函数:
  emitWorldEvent(eventType, data) ← 向半径内实体广播
  reactToWorldEvent(entity, evt, data) ← 调度到具体反应函数
  merchantReaction(e, evt, data)
  guardReaction(e, evt, data)
  banditReaction(e, evt, data)   ← 调用 resolveBeat [beats.js]
  boarReaction(e, evt, data)
  travelerReaction(e, evt, data)

向后引用（安全）:
  所有 *Reaction → addMemory, showFloatingText, fleeFrom, log, hasRecentMemory [world.js]
运行时前向引用:
  banditReaction() → resolveBeat() [beats.js，运行时已存在]
```

#### ai.js — NPC 行为
```
拥有全局: 无
函数:
  updateEntityAI(e, dt)       ← 调度入口
  updateIdleAwareness(e, dt)  ← 近距离闲聊感知
  merchantAI(e, dt)
  guardAI(e, dt)              ← 调用 killEntity, showFloatingText
  banditAI(e, dt)             ← 调用 hasRecentMemory, fleeFrom, emitWorldEvent
  boarAI(e, dt)
  travelerAI(e, dt)

向后引用（安全）:
  全部 → world.js 的移动/记忆函数，events.js 的 emitWorldEvent
```

#### beats.js — Beat 引擎
```
拥有全局: BEAT_TEMPLATES, MODIFIERS
函数:
  createBeat(t, a, m)
  updateBeat(b, dt)
  updateBeatSetup(b, dt)     ← 对峙/发现/请求三个分支
  updateBeatActive(b, dt)    ← 对峙/请求的活跃阶段
  resolveBeat(b, result, desc)

向后引用（安全）:
  → moveToward, showFloatingText, log, killEntity, pickWanderTarget, fleeFrom [world.js]
  → emitWorldEvent [events.js]
加载时引用:
  BEAT_TEMPLATES 读取 CFG, AREAS [config.js，已先加载] ✓
```

#### director.js — 导演系统
```
拥有全局: 无
函数:
  updateDirector(dt)
  tryTriggerBeat()
  tryConfrontation()
  tryRequest()
  tryDiscovery()

向后引用（安全）:
  → createBeat, BEAT_TEMPLATES, MODIFIERS, updateBeat [beats.js]
  → log [world.js]
```

#### gun.js — 枪械系统
```
拥有全局: gun, mouseX, mouseY
函数:
  raycast(sx,sy,dx,dy,range,ignore) ← 读取 world.entities
  shoot()
  startReload()
  updateGun(dt)              ← 更新冷却/弹道/闪光
  updateAim(dt)              ← 持续瞄准 → 威慑

向后引用（安全）:
  → showFloatingText, log, killEntity, addMemory [world.js]
  → emitWorldEvent [events.js]
```

#### render.js — 渲染层
```
拥有全局: 无
DOM引用: canvas, ctx (document.getElementById('canvas'))
函数:
  render()                   ← 主渲染入口
  renderWorld()              ← 地图/建筑/树木
  renderRain()               ← 雨滴
  updateRain(dt)             ← 雨滴物理更新
  renderAimLine()            ← 瞄准线 + 准心
  renderTracers()            ← 子弹弹道
  renderFlashes()            ← 枪口闪光
  renderEntities()           ← 实体排序绘制
  renderPackages()           ← 包裹物品
  renderEntity(e)            ← 单个实体绘制
  renderBeatIndicators()     ← Beat 视觉指示
  renderPlayerUI()           ← 玩家头顶 UI

只读引用:
  world, gun, mouseX, mouseY, tracers, flashes [world.js, gun.js]
  W, H, CFG, COLORS, AREAS, TREES, BUILDINGS [config.js]
```

#### debug.js — 调试工具
```
拥有全局: 无
函数:
  manualTrigger(id)          ← 手动触发 Beat
  forceCooldownClear()       ← 清除冷却
  respawnAll()               ← 复活所有
  resetWorld()               ← 重置世界（调用 initWorld 重建）
  setupDebugPanel()          ← 初始化滑块绑定
  updateDebugPanel()         ← 同步实体状态显示

向后引用（安全）:
  → createBeat, BEAT_TEMPLATES, MODIFIERS [beats.js]
  → respawnEntity, log [world.js]
  → gun [gun.js]
运行时前向引用:
  resetWorld() 内需调用 initWorld() [index.html 内联，运行时已存在]
```

#### index.html 内联 `<script>` — 胶水代码
```
拥有全局: keys, lastTime, statsTimer, debugTimer
DOM引用: 无额外（canvas/ctx 在 render.js，logEl 在 world.js）
函数:
  initRainDrops()            ← 初始化雨滴数组
  toggleRain()               ← 切换天气
  updatePlayer(dt)           ← WASD 移动
  tryRequestInteract()       ← E 键接受请求
  tryRequestDecline()        ← R 键拒绝请求
  tryInteract()              ← E 键交互（近战/对话/拾取）
  updateStatsUI()            ← 更新右侧面板数据
  initWorld()                ← 创建所有实体
  gameLoop(ts)               ← 主循环
  + 键盘/鼠标事件监听器绑定
```

---

### A3. `<script>` 加载顺序

```html
<!-- 在 </body> 之前，所有 HTML 元素之后 -->
<script src="js/config.js"></script>      <!-- 1 纯常量 -->
<script src="js/utils.js"></script>       <!-- 2 纯函数 -->
<script src="js/world.js"></script>       <!-- 3 状态 + 实体操作 -->
<script src="js/events.js"></script>      <!-- 4 事件广播 + NPC 反应 -->
<script src="js/ai.js"></script>          <!-- 5 AI 行为 -->
<script src="js/beats.js"></script>       <!-- 6 Beat 模板 + 生命周期 -->
<script src="js/director.js"></script>    <!-- 7 导演逻辑 -->
<script src="js/gun.js"></script>         <!-- 8 枪械系统 -->
<script src="js/render.js"></script>      <!-- 9 渲染 -->
<script src="js/debug.js"></script>       <!-- 10 调试 -->
<script>
  // 胶水代码：input + player + init + game loop
</script>
```

**加载时依赖保证**：每个文件在加载时只引用之前已加载的文件的全局变量。
**运行时前向引用**：函数 A 调用函数 B（B 在后面的文件中定义）是安全的，因为调用发生在游戏循环启动之后，此时所有文件都已加载。

---

### A4. 跨模块调用矩阵

被调用方 →（列），调用方 ↓（行）：

| | config | utils | world | events | ai | beats | director | gun | render | debug | index |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **world** | R | R | — | **F** | | | | | | | |
| **events** | R | R | R | — | | **F** | | | | | |
| **ai** | R | R | R | R | — | | | | | | |
| **beats** | R | R | R | R | | — | | | | | |
| **director** | R | R | R | | | R | — | | | | |
| **gun** | R | R | R | R | | | | — | | | |
| **render** | R | R | R | | | | | R | — | | |
| **debug** | R | | R | | | R | | R | | — | **F** |
| **index** | R | R | R | | | R | R | R | R | R | — |

- **R** = 向后引用（被调用文件已先加载，始终安全）
- **F** = 运行时前向引用（被调用文件在后面加载，但调用只在运行时发生，安全）

3 处前向引用：
1. `killEntity()` [world.js] → `emitWorldEvent()` [events.js]
2. `banditReaction()` [events.js] → `resolveBeat()` [beats.js]
3. `resetWorld()` [debug.js] → `initWorld()` [index.html]

全部在运行时调用，加载顺序不影响。

---

### A5. 迁移步骤（10 步）

每步：提取 → 浏览器刷新测试 → 确认无报错再进下一步。

#### Step 1: 接入已有文件
- 在 index.html 底部（`</body>` 前）添加 `<script src="js/config.js">` 和 `<script src="js/utils.js">`
- 从 index.html 的 `<script>` 中**删除** `W, H, CFG, COLORS, AREAS, TREES, BUILDINGS` 的定义
- 从 index.html 的 `<script>` 中**删除** `_dist, clamp, randRange, randInt, pick, pointInArea, randomPointInArea, lineCircleIntersect` 的定义
- 删除 config.js 和 utils.js 中的 `module.exports` 包装
- **测试**: 打开游戏，全部功能正常

#### Step 2: 提取 world.js
- 创建 `js/world.js`
- 移入: `world` 对象, `tracers`, `flashes`, `nextId`
- 移入函数: `log`, `createEntity`, `showFloatingText`, `addMemory`, `hasRecentMemory`, `moveToward`, `pickWanderTarget`, `fleeFrom`, `killEntity`, `respawnEntity`
- 文件顶部添加: `const logEl = document.getElementById('log'); let logCount = 0;`
- **测试**: 打开游戏，日志输出正常，实体生成正常

#### Step 3: 提取 events.js
- 创建 `js/events.js`
- 移入函数: `emitWorldEvent`, `reactToWorldEvent`, `merchantReaction`, `guardReaction`, `banditReaction`, `boarReaction`, `travelerReaction`
- **测试**: 杀一个山贼，确认其他 NPC 有反应

#### Step 4: 提取 ai.js
- 创建 `js/ai.js`
- 移入函数: `updateEntityAI`, `updateIdleAwareness`, `merchantAI`, `guardAI`, `banditAI`, `boarAI`, `travelerAI`
- **测试**: NPC 正常巡逻、闲聊、追击

#### Step 5: 提取 beats.js
- 创建 `js/beats.js`
- 移入: `BEAT_TEMPLATES`, `MODIFIERS`
- 移入函数: `createBeat`, `updateBeat`, `updateBeatSetup`, `updateBeatActive`, `resolveBeat`
- **测试**: 等待 Beat 自动触发 / 用 Tab 面板手动触发

#### Step 6: 提取 director.js
- 创建 `js/director.js`
- 移入函数: `updateDirector`, `tryTriggerBeat`, `tryConfrontation`, `tryRequest`, `tryDiscovery`
- **测试**: 导演正常扫描和触发

#### Step 7: 提取 gun.js
- 创建 `js/gun.js`
- 移入: `gun` 对象, `mouseX`, `mouseY`
- 移入函数: `raycast`, `shoot`, `startReload`, `updateGun`, `updateAim`
- **注意**: index.html 的 mousemove 监听器写入 `mouseX/mouseY`，这些变量用 `let` 声明以允许跨文件写入
- **测试**: 左键瞄准，右键射击，R 装弹

#### Step 8: 提取 render.js
- 创建 `js/render.js`
- 文件顶部: `const canvas = document.getElementById('canvas'); const ctx = canvas.getContext('2d');`
- 移入函数: `render`, `renderWorld`, `renderRain`, `updateRain`, `renderAimLine`, `renderTracers`, `renderFlashes`, `renderEntities`, `renderPackages`, `renderEntity`, `renderBeatIndicators`, `renderPlayerUI`
- 从 index.html 中**删除** `const canvas = ...` 和 `const ctx = ...`（如果有的话）
- **测试**: 画面渲染正常

#### Step 9: 提取 debug.js
- 创建 `js/debug.js`
- 移入函数: `manualTrigger`, `forceCooldownClear`, `respawnAll`, `resetWorld`, `setupDebugPanel`, `updateDebugPanel`
- **测试**: Tab 打开调试面板，滑块/按钮工作正常

#### Step 10: 清理 index.html
- 确认 `<script>` 内只剩: `keys`, 事件监听器, `initRainDrops`, `toggleRain`, `updatePlayer`, `tryRequestInteract`, `tryRequestDecline`, `tryInteract`, `updateStatsUI`, `initWorld`, `gameLoop`, 启动代码
- 格式化代码（不再需要压成单行）
- **最终测试**: 完整游玩 2 分钟，覆盖所有交互

---

### A6. 容易踩的坑

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| `ReferenceError: emitWorldEvent is not defined` | killEntity 在 world.js，emitWorldEvent 在 events.js（后加载） | 确认是加载时报错还是运行时。如果是加载时 → 代码写在了全局作用域的立即执行语句中，需要移到函数内 |
| `mouseX/mouseY` 跨文件写入 | gun.js 用 `const` 声明，index.html 无法写入 | 在 gun.js 中用 `let` 声明 |
| `canvas` 重复声明 | render.js 和 index.html 都声明了 | render.js 拥有 canvas/ctx，index.html 不再声明，事件监听用 `document.getElementById` 直接获取 |
| 调试面板的 `onclick="manualTrigger('xxx')"` | HTML 内联事件需要函数在全局作用域 | `<script>` 标签加载的顶层函数自动在全局作用域，无问题 |
| `resetWorld()` 调用 `initWorld()` | initWorld 在 index.html（最后加载） | 运行时调用，无问题。但如果需要在 debug.js 加载时引用 initWorld，会报错 |

---

### A7. 验证清单

重构完成后逐项确认：

- [ ] 双击 index.html 能直接打开，无 404 错误
- [ ] 控制台无 `ReferenceError` 或 `TypeError`
- [ ] WASD 移动正常
- [ ] E 键近战/对话/接受请求正常
- [ ] 左键瞄准 + 右键射击正常
- [ ] R 键装弹正常
- [ ] NPC 正常巡逻和闲聊
- [ ] Beat 自动触发（等 ~20 秒）
- [ ] 修饰器激活（切换天气后触发对峙 → 天气意外）
- [ ] 杀死山贼后其他 NPC 有反应
- [ ] 枪声广播（射击后守卫追来）
- [ ] 威慑生效（持续瞄准山贼 → 投降或挑衅）
- [ ] Tab 调试面板正常打开
- [ ] 调试面板手动触发三种 Beat 均正常
- [ ] 调试面板滑块实时生效
- [ ] Q 切换天气正常
- [ ] H 帮助面板正常
- [ ] 包裹拾取正常（请求 Beat 的 find_item 类型）

---

### A8. 重构后扩展对比

| 操作 | 重构前（改几处） | 重构后（改几个文件） |
|------|-----------------|-------------------|
| 新增 NPC 类型 | 5 处同一文件 | ai.js + events.js + index.html(initWorld) |
| 新增 Beat 模板 | 4 处同一文件 | beats.js + director.js |
| 新增修饰器 | 2 处同一文件 | beats.js |
| 新增世界事件类型 | N 处同一文件 | events.js |
| 新增玩家动词 | index.html 内联 | index.html(tryInteract) |
| 调整渲染效果 | 在 886 行文件里找 | render.js（最大 120 行）|
| P2: Token 系统 | 痛苦 | 新建 js/tokens.js + 修改 beats.js |

改动的**文件数**增加了，但每个文件**找代码的成本**从"在 886 行里搜"降到"在 ≤150 行里看"。
