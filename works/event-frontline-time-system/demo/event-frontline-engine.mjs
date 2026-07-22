export const TICKS = [
  { id: "day1_day", label: "Day 1 白天" },
  { id: "day1_night", label: "Day 1 夜晚" },
  { id: "day2_day", label: "Day 2 白天" },
  { id: "day2_night", label: "Day 2 夜晚" },
  { id: "day3_day", label: "Day 3 白天" },
  { id: "day3_night", label: "Day 3 夜晚" },
];

export const MEDICINE_SCENE_PHASES = [
  {
    id: "approach",
    label: "逼近",
    text: "药车驶入狭路，山贼从林线向车队靠近。",
    idleText: "你没有动作。山贼抢先占住了药车前方。",
  },
  {
    id: "intercept",
    label: "拦截",
    text: "山贼切断去路，车夫在狭路上失去回旋空间。",
    idleText: "你没有动作。山贼砸开车厢，开始翻找货物。",
  },
  {
    id: "aftermath",
    label: "收束",
    text: "现场即将定局，最后的行动会决定什么被带离山路。",
    idleText: "你没有动作。现场按照既有力量关系走向结局。",
  },
];

const MEDICINE_EVENT_ID = "medicine_cart_ambush";
const MEDICINE_CRATE_ID = "medicine_crate";

export const ZONES = {
  A: {
    id: "A",
    name: "A 山路",
    role: "事件源头、药车、山贼活动",
    neighbors: ["B", "E"],
    x: 170,
    y: 200,
  },
  B: {
    id: "B",
    name: "B 桥市",
    role: "交通瓶颈、商队、价格变化",
    neighbors: ["A", "C"],
    x: 340,
    y: 180,
  },
  C: {
    id: "C",
    name: "C 市集",
    role: "谣言、黑市、重接入口",
    neighbors: ["B", "D", "F"],
    x: 520,
    y: 260,
  },
  D: {
    id: "D",
    name: "D 医馆",
    role: "短缺、救治、病人后果",
    neighbors: ["C"],
    x: 650,
    y: 125,
  },
  E: {
    id: "E",
    name: "E 山贼路",
    role: "暴力来源、绑架、埋伏",
    neighbors: ["A", "F"],
    x: 250,
    y: 410,
  },
  F: {
    id: "F",
    name: "F 官署",
    role: "公告、盘查、官差、腐败",
    neighbors: ["C", "E"],
    x: 570,
    y: 430,
  },
};

export const EVENT_FRONTS = {
  medicine_cart_ambush: {
    id: "medicine_cart_ambush",
    title: "药车遇袭",
    sourceZone: "A",
    previewTick: "day1_day",
    previewZones: ["B", "D"],
    liveTick: "day1_night",
    liveZone: "A",
    missedTick: "day2_day",
    reentryTick: "day3_day",
    scarTick: "day3_night",
    missedTags: ["cart_missing", "medicine_shortage"],
    scarTags: ["clinic_price_up", "bandit_confidence_up"],
    previewText: "药师和商人都在等一辆今晚经过山路的药车。",
    liveText: "药车在山路遭到山贼袭击。",
    missedText: "山路只剩碎车、血迹和轮痕；医馆开始缺药。",
    previewLabel: "药师",
    liveLabel: "药车",
    missedLabel: "残骸",
    strongReentries: [
      {
        id: "medicine_cart_ambush.reentry.market",
        zoneId: "C",
        markerLabel: "药贩",
        title: "黑市药贩",
        text: "市集里有人低价兜售来路不明的药。",
        choices: ["查黑市药源", "买药", "设局抓药贩"],
      },
      {
        id: "medicine_cart_ambush.reentry.clinic",
        zoneId: "D",
        markerLabel: "病人",
        title: "病人恶化",
        text: "医馆药柜空了，几个病人撑不到明天。",
        choices: ["救病人", "分配有限药物", "追问药车路线"],
      },
      {
        id: "medicine_cart_ambush.reentry.office",
        zoneId: "F",
        markerLabel: "官差",
        title: "追查劫药案",
        text: "官署贴出告示，悬赏查清药车被劫。",
        choices: ["接悬赏", "嫁祸山贼", "告发黑市"],
      },
    ],
    weakReentries: [
      {
        id: "medicine_cart_ambush.reentry.rumor",
        zoneId: "C",
        markerLabel: "传闻",
        title: "药车传闻",
        text: "市集有人说山路昨夜出了事，但没人知道细节。",
        choices: ["打听传闻"],
      },
    ],
  },
  tax_collector_extortion: {
    id: "tax_collector_extortion",
    title: "税吏勒索",
    sourceZone: "F",
    previewTick: "day1_day",
    previewZones: ["B"],
    liveTick: "day1_night",
    liveZone: "F",
    missedTick: "day2_day",
    reentryTick: "day2_night",
    scarTick: "day3_night",
    missedTags: ["trade_slowdown", "market_price_up"],
    scarTags: ["corruption_normalized"],
    previewText: "桥市商人抱怨新税令，今晚税吏要去官署审账。",
    liveText: "税吏正在官署勒索商人。",
    missedText: "桥市商队变少，市集货价上涨。",
    previewLabel: "商人",
    liveLabel: "税吏",
    missedLabel: "涨价",
    strongReentries: [
      {
        id: "tax_collector_extortion.reentry.market",
        zoneId: "C",
        markerLabel: "商人",
        title: "商人求报复",
        text: "被勒索的商人想伪造账本反咬税吏。",
        choices: ["反勒索", "告密", "敲诈税吏"],
      },
    ],
    weakReentries: [
      {
        id: "tax_collector_extortion.reentry.rumor",
        zoneId: "C",
        markerLabel: "传闻",
        title: "黑税传言",
        text: "市集流传官署又加了不明税目。",
        choices: ["听传言"],
      },
    ],
  },
  bandit_abduction: {
    id: "bandit_abduction",
    title: "山贼绑人",
    sourceZone: "E",
    previewTick: "day2_day",
    previewZones: ["A"],
    liveTick: "day2_night",
    liveZone: "E",
    missedTick: "day3_day",
    reentryTick: "day3_night",
    scarTick: null,
    missedTags: ["road_fear", "wounded_witness"],
    scarTags: ["route_abandoned"],
    previewText: "山路旅人说 E 山贼路最近不太平。",
    liveText: "山贼正在拖走一个旅人。",
    missedText: "山路留下拖痕，医馆收进一个受伤逃人。",
    previewLabel: "旅人",
    liveLabel: "山贼",
    missedLabel: "拖痕",
    strongReentries: [
      {
        id: "bandit_abduction.reentry.market",
        zoneId: "C",
        markerLabel: "家属",
        title: "寻人告示",
        text: "市集家属贴出寻人告示，愿意出钱赎人。",
        choices: ["赎人", "追踪", "反设埋伏"],
      },
    ],
    weakReentries: [
      {
        id: "bandit_abduction.reentry.rumor",
        zoneId: "C",
        markerLabel: "传闻",
        title: "山路闲话",
        text: "有人说昨夜山路有哭喊声。",
        choices: ["追问"],
      },
    ],
  },
};

export function createGameState({ startZone = "C" } = {}) {
  const state = applyScheduledWrites({
    tickIndex: 0,
    zoneId: startZone,
    seenPreviews: new Set(),
    worldTags: new Set(),
    inventory: new Set(),
    activeScene: null,
    reentries: [],
    log: [],
    events: Object.fromEntries(
      Object.keys(EVENT_FRONTS).map((id) => [
        id,
        {
          id,
          status: "active",
          missedApplied: false,
          reentryApplied: false,
          scarApplied: false,
          witnessed: false,
          sceneResolved: false,
          sceneOutcome: null,
          deliveryApplied: false,
        },
      ]),
    ),
  });
  return activateVisibleScene(state);
}

export function performAction(state, action) {
  const next = cloneState(state);

  if (action.type === "observe") {
    observeCurrentZone(next);
    return next;
  }

  if (action.type === "move") {
    if (next.activeScene) leaveActiveScene(next);
    moveToZone(next, action.targetZone);
    advanceTick(next);
    return next;
  }

  if (action.type === "movePlayer") {
    if (next.activeScene) leaveActiveScene(next);
    moveToZone(next, action.targetZone);
    return activateVisibleScene(withCurrentTick(next));
  }

  if (action.type === "rest") {
    assertNoActiveScene(next, "rest");
    advanceTick(next);
    return next;
  }

  if (action.type === "worldStep") {
    assertNoActiveScene(next, "worldStep");
    advanceTick(next);
    return next;
  }

  if (action.type === "sceneAction") {
    applySceneAction(next, action.actionId);
    return withCurrentTick(next);
  }

  if (action.type === "sceneBeat") {
    applySceneAction(next, "wait");
    return withCurrentTick(next);
  }

  if (action.type === "leaveScene") {
    leaveActiveScene(next);
    return withCurrentTick(next);
  }

  if (action.type === "deliverToken") {
    deliverToken(next, action.tokenId);
    return withCurrentTick(next);
  }

  if (action.type === "intervene") {
    intervene(next, action.eventId);
    advanceTick(next);
    return next;
  }

  throw new Error(`Unknown action type: ${action.type}`);
}

export function getSceneActions(state) {
  const scene = state.activeScene;
  if (!scene || scene.eventId !== MEDICINE_EVENT_ID) return [];

  const actions = [];
  if (!scene.intentKnown) {
    actions.push({
      id: "inspect_intent",
      primitive: "inspect",
      label: "判断山贼意图",
      target: "bandit",
      text: "看清山贼真正盯着什么，并暴露可以转移的关键资源。",
    });
  }
  if (!scene.cartWarned) {
    actions.push({
      id: "warn_cart",
      primitive: "redirect",
      label: "警告车夫改道",
      target: "cart",
      text: "让药车提前偏离山贼的截击线。",
    });
  }
  if (scene.phaseIndex >= 1 && !scene.banditDelayed) {
    actions.push({
      id: "delay_bandit",
      primitive: "redirect",
      label: "拖住山贼",
      target: "bandit",
      text: "改变山贼抵达药车的时间。",
    });
  }
  if (scene.phaseIndex >= 1 && scene.intentKnown && !scene.medicineSecured) {
    actions.push({
      id: "secure_medicine",
      primitive: "transfer",
      label: "抢救药箱",
      target: "medicine",
      text: "把药箱从药车转移到玩家手中，之后可以带往医馆。",
    });
  }
  actions.push({
    id: "wait",
    primitive: "wait",
    label: "不行动",
    target: "scene",
    text: "让当前一拍按角色原有意图结算。",
  });
  return actions;
}

export function getVisibleEntries(state) {
  const tickId = state.currentTick.id;
  const zoneId = state.zoneId;
  const entries = [];

  for (const event of Object.values(EVENT_FRONTS)) {
    const eventState = state.events[event.id];
    if (eventState.status !== "active") continue;

    if (event.previewTick === tickId && event.previewZones.includes(zoneId)) {
      entries.push({
        id: `${event.id}.preview`,
        kind: "preview",
        eventId: event.id,
        title: event.title,
        text: event.previewText,
      });
    }

    if (
      event.liveTick === tickId
      && event.liveZone === zoneId
      && !eventState.sceneResolved
    ) {
      entries.push({
        id: `${event.id}.live`,
        kind: "live",
        eventId: event.id,
        title: event.title,
        text: event.liveText,
      });
    }
  }

  if (zoneId === "D" && state.inventory.has(MEDICINE_CRATE_ID)) {
    entries.push({
      id: "medicine_crate.delivery",
      kind: "transfer",
      tokenId: MEDICINE_CRATE_ID,
      title: "抢救出的药箱",
      text: "药箱已经抵达医馆。交付后，缺药后果会被改写，但被毁的药车不会复原。",
    });
  }

  for (const reentry of state.reentries) {
    if (reentry.zoneId !== zoneId) continue;
    entries.push({
      ...reentry,
      kind: "reentry",
    });
  }

  return entries;
}

export function getZone(state) {
  return ZONES[state.zoneId];
}

export function getMapMarkers(state) {
  const tickId = state.currentTick.id;
  const markers = [
    {
      id: "player",
      kind: "player",
      zoneId: state.zoneId,
      label: "玩家",
      tone: "player",
    },
  ];

  if (state.inventory.has(MEDICINE_CRATE_ID)) {
    markers.push({
      id: MEDICINE_CRATE_ID,
      kind: "cargo",
      zoneId: state.zoneId,
      label: "药箱",
      title: "抢救出的药箱",
      tone: "resource",
    });
  }

  for (const event of Object.values(EVENT_FRONTS)) {
    const eventState = state.events[event.id];

    if (eventState.status === "active" && event.previewTick === tickId) {
      for (const zoneId of event.previewZones) {
        markers.push({
          id: `${event.id}.preview.${zoneId}`,
          kind: "preview",
          eventId: event.id,
          zoneId,
          label: event.previewLabel ?? "预兆",
          title: event.title,
          tone: "preview",
        });
      }
    }

    if (
      eventState.status === "active"
      && event.liveTick === tickId
      && !eventState.sceneResolved
    ) {
      markers.push({
        id: `${event.id}.live`,
        kind: "live",
        eventId: event.id,
        zoneId: event.liveZone,
        label: event.liveLabel ?? "现场",
        title: event.title,
        tone: "danger",
      });
    }

    if (eventState.missedApplied && eventState.status !== "resolved") {
      markers.push({
        id: `${event.id}.missed`,
        kind: "missed",
        eventId: event.id,
        zoneId: event.sourceZone,
        label: event.missedLabel ?? "痕迹",
        title: event.title,
        tone: "scar",
      });
    }
  }

  for (const entry of state.reentries) {
    markers.push({
      id: entry.id,
      kind: entry.strength === "strong" ? "reentry" : "rumor",
      eventId: entry.eventId,
      zoneId: entry.zoneId,
      label: entry.markerLabel ?? (entry.strength === "strong" ? "后果" : "传闻"),
      title: entry.title,
      tone: entry.strength === "strong" ? "reentry" : "rumor",
    });
  }

  return markers;
}

export function getWorldOutcome(state) {
  const medicine = state.events.medicine_cart_ambush;
  const medicineResolved = medicine.status === "resolved";
  const medicineCollapsed =
    state.worldTags.has("medicine_shortage") || state.worldTags.has("clinic_price_up");
  const corruptionSettled = state.worldTags.has("corruption_normalized");
  const fearSpreading = state.worldTags.has("road_fear") || state.worldTags.has("route_abandoned");

  if (state.inventory.has(MEDICINE_CRATE_ID)) {
    return {
      id: "medicine_in_hand",
      title: "收敛结果：药箱在你手里",
      text: "药车已经被毁，但关键药物被抢救出来。把药箱送到 D 医馆，才能真正改写缺药后果。",
      tone: "neutral",
    };
  }

  if (medicine.sceneOutcome === "medicine_recovered" && state.worldTags.has("medicine_delivered")) {
    return {
      id: "medicine_relay",
      title: "收敛结果：药物获救，山路失守",
      text: "玩家把抢出的药箱送到医馆，病人得到救治；但药车被毁，山贼控制力继续上升。",
      tone: "good",
    };
  }

  if (medicine.sceneOutcome === "cart_lost" && !medicineCollapsed) {
    return {
      id: "cart_lost_witnessed",
      title: "收敛结果：药车失守",
      text: "药车已经在你眼前被劫。损失会在下一个世界时段扩散到医馆、市集和官署，并生成新的追查入口。",
      tone: "bad",
    };
  }

  if (medicineResolved) {
    return {
      id: "relief_route",
      title: "收敛结果：救援路线保住",
      text: corruptionSettled
        ? "玩家保住药车，医馆没有崩盘；但官署黑税坐大，小镇进入“民生可救、权力腐坏”的局面。"
        : "玩家改变车夫与山贼的行动时序，药车脱离伏击并继续驶向医馆。",
      tone: "good",
    };
  }

  if (medicineCollapsed) {
    return {
      id: "black_market_town",
      title: "收敛结果：黑市接管民生",
      text: fearSpreading
        ? "药车被劫、山路恐惧扩散，市集和医馆只能依赖黑市药源；玩家错过的现场变成了新的地下秩序。"
        : "药车被劫后，药物流入市集黑市，医馆和官署都围绕这条后果链重新运转。",
      tone: "bad",
    };
  }

  return {
    id: "unstable_day",
    title: "收敛结果：尚未定局",
    text: "事件前线仍在成熟。玩家的下一次移动或介入会决定哪些现场变成后果。",
    tone: "neutral",
  };
}

export function getActors(state) {
  const actors = [];
  const tick = state.tickIndex;
  const medicine = state.events.medicine_cart_ambush;
  const tax = state.events.tax_collector_extortion;
  const abduction = state.events.bandit_abduction;

  actors.push(actor("apothecary", "药师", "D", "医馆等药", "healer"));

  if (tick === 0) {
    actors.push(actor("merchant", "商人", "B", "抱怨税令", "civilian"));
    actors.push(actor("tax_collector", "税吏", "F", "准备审账", "authority"));
    actors.push(actor("bandit_scout", "山贼", "E", "山路踩点", "threat"));
    actors.push(actor("medicine_cart", "药车", "B", "即将上路", "resource"));
  }

  if (tick === 1) {
    actors.push(actor("merchant", "商人", "F", "被税吏审账", "civilian"));
    actors.push(actor("tax_collector", "税吏", "F", "勒索商人", "authority"));
    actors.push(actor("bandit_scout", "山贼", "A", "伏击药车", "threat"));
    if (!medicine.sceneResolved || medicine.sceneOutcome === "cart_saved") {
      actors.push(actor(
        "medicine_cart",
        "药车",
        "A",
        medicine.sceneOutcome === "cart_saved" ? "脱离伏击" : "遇袭现场",
        "resource",
      ));
    }
  }

  if (tick >= 2) {
    actors.push(actor("merchant", "商人", "C", tax.reentryApplied ? "请求报复" : "观望市价", "civilian"));
    actors.push(actor("tax_collector", "税吏", "F", tax.scarApplied ? "黑税坐大" : "封存账本", "authority"));
  }

  if (medicine.status === "resolved" && tick >= 2 && state.worldTags.has("medicine_delivered")) {
    if (medicine.sceneOutcome !== "medicine_recovered") {
      actors.push(actor("medicine_cart", "药车", "D", "药物送达", "resource"));
    }
    actors.push(actor("patient_group", "病人", "D", "得到救治", "relief"));
  }

  if (state.worldTags.has("medicine_shortage")) {
    actors.push(actor("patient_group", "病人", "D", "等待药物", "pressure"));
  }

  if (state.reentries.some((entry) => entry.id === "medicine_cart_ambush.reentry.market")) {
    actors.push(actor("black_market_dealer", "药贩", "C", "兜售黑市药", "black_market"));
  }

  if (state.reentries.some((entry) => entry.id === "medicine_cart_ambush.reentry.office")) {
    actors.push(actor("guard_investigator", "官差", "F", "追查劫药案", "authority"));
  }

  if (abduction.missedApplied) {
    actors.push(actor("wounded_witness", "伤者", "D", "从山路逃来", "pressure"));
  }

  if (abduction.reentryApplied) {
    actors.push(actor("missing_family", "家属", "C", "张贴寻人告示", "civilian"));
  }

  return actors;
}

export function getActorTracks(state) {
  const currentActors = getActors(state);
  const nextState = cloneState(state);
  advanceTick(nextState);
  const nextActors = getActors(nextState);
  const actorIds = new Set([
    ...currentActors.map((actorItem) => actorItem.id),
    ...nextActors.map((actorItem) => actorItem.id),
  ]);

  return [...actorIds].map((id) => {
    const from = currentActors.find((actorItem) => actorItem.id === id);
    const to = nextActors.find((actorItem) => actorItem.id === id);
    const actorItem = from ?? to;
    const fromZoneId = from?.zoneId ?? to.zoneId;
    const toZoneId = to?.zoneId ?? from.zoneId;
    return {
      ...actorItem,
      fromZoneId,
      toZoneId,
      fromIntent: from?.intent ?? actorItem.intent,
      toIntent: to?.intent ?? actorItem.intent,
      moving: fromZoneId !== toZoneId,
    };
  });
}

export function getZoneConditions(state) {
  const conditions = Object.fromEntries(Object.keys(ZONES).map((zoneId) => [zoneId, []]));
  const hasReentry = (id) => state.reentries.some((entry) => entry.id === id);

  if (state.worldTags.has("cart_missing")) {
    conditions.A.push(condition("cart_missing", "药车残骸", "scar"));
  }
  if (state.worldTags.has("road_fear")) {
    conditions.A.push(condition("road_fear", "山路恐惧", "danger"));
    conditions.E.push(condition("bandit_pressure", "山贼气焰", "danger"));
  }
  if (state.worldTags.has("bandit_confidence_up") && !state.worldTags.has("road_fear")) {
    conditions.E.push(condition("bandit_confidence_up", "山贼气焰", "danger"));
  }
  if (state.worldTags.has("medicine_shortage")) {
    conditions.D.push(condition("medicine_shortage", "医馆缺药", "pressure"));
  }
  if (state.worldTags.has("medicine_delivered")) {
    conditions.D.push(condition("medicine_delivered", "药物送达", "relief"));
  }
  if (state.worldTags.has("wounded_witness")) {
    conditions.D.push(condition("wounded_witness", "伤者逃来", "pressure"));
  }
  if (state.worldTags.has("trade_slowdown")) {
    conditions.B.push(condition("trade_slowdown", "商队减少", "pressure"));
  }
  if (state.worldTags.has("market_price_up")) {
    conditions.C.push(condition("market_price_up", "市价上涨", "pressure"));
  }
  if (state.worldTags.has("corruption_normalized")) {
    conditions.F.push(condition("corruption_normalized", "黑税常态", "danger"));
  }
  if (hasReentry("medicine_cart_ambush.reentry.market")) {
    conditions.C.push(condition("black_market", "黑市药源", "black_market"));
  }
  if (hasReentry("medicine_cart_ambush.reentry.clinic")) {
    conditions.D.push(condition("clinic_crisis", "病情恶化", "danger"));
  }
  if (hasReentry("medicine_cart_ambush.reentry.office")) {
    conditions.F.push(condition("investigation", "官署追查", "authority"));
  }
  if (hasReentry("tax_collector_extortion.reentry.market")) {
    conditions.C.push(condition("merchant_revenge", "商人报复", "black_market"));
  }

  return conditions;
}

function actor(id, label, zoneId, intent, tone) {
  return { id, label, zoneId, intent, tone };
}

function condition(id, label, tone) {
  return { id, label, tone };
}

function cloneState(state) {
  return {
    tickIndex: state.tickIndex,
    zoneId: state.zoneId,
    seenPreviews: new Set(state.seenPreviews),
    worldTags: new Set(state.worldTags),
    inventory: new Set(state.inventory),
    activeScene: state.activeScene
      ? {
          ...state.activeScene,
          actionHistory: state.activeScene.actionHistory.map((entry) => ({ ...entry })),
        }
      : null,
    reentries: state.reentries.map((entry) => ({ ...entry, choices: [...entry.choices] })),
    log: state.log.map((entry) => ({ ...entry })),
    events: Object.fromEntries(
      Object.entries(state.events).map(([id, eventState]) => [id, { ...eventState }]),
    ),
  };
}

function observeCurrentZone(state) {
  const entries = getVisibleEntries(withCurrentTick(state)).filter(
    (entry) => entry.kind === "preview",
  );

  for (const entry of entries) {
    if (state.seenPreviews.has(entry.eventId)) continue;
    state.seenPreviews.add(entry.eventId);
    writeLog(state, entry.eventId, "preview_seen", [], entry.text);
  }
}

function moveToZone(state, targetZone) {
  if (!targetZone || !ZONES[targetZone]) {
    throw new Error(`Unknown target zone: ${targetZone}`);
  }

  const zone = ZONES[state.zoneId];
  if (!zone.neighbors.includes(targetZone)) {
    throw new Error(`${targetZone} is not adjacent to ${state.zoneId}`);
  }

  state.zoneId = targetZone;
}

function assertNoActiveScene(state, actionType) {
  if (!state.activeScene) return;
  throw new Error(`${actionType} is unavailable while a live scene is resolving`);
}

function activateVisibleScene(state) {
  withCurrentTick(state);
  const event = EVENT_FRONTS[MEDICINE_EVENT_ID];
  const eventState = state.events[MEDICINE_EVENT_ID];
  if (
    state.activeScene
    || state.currentTick.id !== event.liveTick
    || state.zoneId !== event.liveZone
    || eventState.status !== "active"
    || eventState.sceneResolved
  ) {
    return state;
  }

  eventState.witnessed = true;
  state.activeScene = {
    eventId: MEDICINE_EVENT_ID,
    phaseIndex: 0,
    intentKnown: false,
    cartWarned: false,
    banditDelayed: false,
    medicineSecured: false,
    actionHistory: [],
    lastFeedback: "世界时间已经暂停；角色会在你选择行动后结算这一拍。",
  };
  writeLog(
    state,
    MEDICINE_EVENT_ID,
    "scene_started",
    [],
    "你亲历了药车伏击。现场开始按局部节拍推进。",
  );
  return state;
}

function applySceneAction(state, actionId) {
  const scene = state.activeScene;
  if (!scene || scene.eventId !== MEDICINE_EVENT_ID) {
    throw new Error("No active medicine cart scene");
  }
  const action = getSceneActions(state).find((candidate) => candidate.id === actionId);
  if (!action) {
    throw new Error(`Scene action is unavailable: ${actionId}`);
  }

  const phase = MEDICINE_SCENE_PHASES[scene.phaseIndex];
  if (actionId === "inspect_intent") {
    scene.intentKnown = true;
    scene.lastFeedback = "你看清山贼避开车夫，真正盯着的是车厢里的药箱。";
  } else if (actionId === "warn_cart") {
    scene.cartWarned = true;
    scene.lastFeedback = "车夫收到警告，提前把车头转向狭路外沿。";
  } else if (actionId === "delay_bandit") {
    scene.banditDelayed = true;
    scene.lastFeedback = "你截断山贼的逼近路线，为药车争取到脱离时间。";
  } else if (actionId === "secure_medicine") {
    scene.medicineSecured = true;
    scene.lastFeedback = "你从破开的车厢里抢出药箱，把它转移到自己手中。";
  } else {
    scene.lastFeedback = phase.idleText;
  }

  scene.actionHistory.push({
    phaseId: phase.id,
    actionId,
    primitive: action.primitive,
  });
  writeLog(
    state,
    MEDICINE_EVENT_ID,
    `scene_${action.primitive}`,
    [],
    scene.lastFeedback,
  );

  if (scene.phaseIndex >= MEDICINE_SCENE_PHASES.length - 1) {
    finalizeMedicineScene(state);
  } else {
    scene.phaseIndex += 1;
  }
}

function leaveActiveScene(state) {
  if (!state.activeScene) return;
  writeLog(
    state,
    state.activeScene.eventId,
    "scene_left",
    [],
    "玩家离开现场，剩余局部节拍在场外折叠结算。",
  );
  while (state.activeScene) {
    applySceneAction(state, "wait");
  }
}

function finalizeMedicineScene(state) {
  const scene = state.activeScene;
  if (!scene) return;
  const eventState = state.events[MEDICINE_EVENT_ID];
  const outcome = scene.cartWarned && scene.banditDelayed
    ? "cart_saved"
    : scene.medicineSecured ? "medicine_recovered" : "cart_lost";

  eventState.sceneResolved = true;
  eventState.sceneOutcome = outcome;
  state.activeScene = null;

  if (outcome === "cart_saved") {
    eventState.status = "resolved";
    writeLog(
      state,
      MEDICINE_EVENT_ID,
      "scene_cart_saved",
      [],
      "车夫及时改道，山贼又被拖住；药车脱离伏击，继续驶向医馆。",
    );
    return;
  }

  if (outcome === "medicine_recovered") {
    eventState.status = "partial";
    state.inventory.add(MEDICINE_CRATE_ID);
    state.worldTags.add("cart_missing");
    state.worldTags.add("bandit_confidence_up");
    writeLog(
      state,
      MEDICINE_EVENT_ID,
      "scene_medicine_recovered",
      ["cart_missing", "bandit_confidence_up", MEDICINE_CRATE_ID],
      "药车被毁，但玩家抢出了药箱；药物能否抵达医馆仍未确定。",
    );
    return;
  }

  writeLog(
    state,
    MEDICINE_EVENT_ID,
    "scene_cart_lost",
    [],
    "玩家亲历了药车被劫。后果会在下一个世界时段写回各地点。",
  );
}

function deliverToken(state, tokenId) {
  if (tokenId !== MEDICINE_CRATE_ID || !state.inventory.has(tokenId)) {
    throw new Error(`Token is unavailable: ${tokenId}`);
  }
  if (state.zoneId !== "D") {
    throw new Error("The medicine crate can only be delivered at D clinic");
  }

  const eventState = state.events[MEDICINE_EVENT_ID];
  state.inventory.delete(tokenId);
  state.worldTags.add("medicine_delivered");
  state.worldTags.delete("medicine_shortage");
  state.worldTags.delete("clinic_price_up");
  state.reentries = state.reentries.filter((entry) => entry.eventId !== MEDICINE_EVENT_ID);
  eventState.status = "resolved";
  eventState.deliveryApplied = true;
  writeLog(
    state,
    MEDICINE_EVENT_ID,
    "medicine_delivered",
    ["medicine_delivered", "medicine_shortage:removed"],
    "玩家把抢救出的药箱交给医馆。缺药后果被改写，但药车损失仍留在山路。",
  );
}

function intervene(state, eventId) {
  if (eventId === MEDICINE_EVENT_ID) {
    throw new Error("Medicine cart intervention must resolve through scene actions");
  }
  const visibleLive = getVisibleEntries(withCurrentTick(state)).find(
    (entry) => entry.kind === "live" && entry.eventId === eventId,
  );
  if (!visibleLive) {
    throw new Error(`No live event available for intervention: ${eventId}`);
  }

  state.events[eventId].status = "resolved";
  writeLog(state, eventId, "resolved", [], "玩家介入现场，事件不再转成后果入口。");
}

function advanceTick(state) {
  if (state.activeScene) return withCurrentTick(state);
  state.tickIndex = Math.min(state.tickIndex + 1, TICKS.length - 1);
  applyScheduledWrites(state);
  activateVisibleScene(state);
}

function applyScheduledWrites(state) {
  const tickId = TICKS[state.tickIndex].id;

  for (const event of Object.values(EVENT_FRONTS)) {
    const eventState = state.events[event.id];

    if (
      event.id === MEDICINE_EVENT_ID
      && eventState.sceneOutcome === "cart_saved"
      && !eventState.deliveryApplied
      && tickReached(tickId, "day2_day")
    ) {
      eventState.deliveryApplied = true;
      state.worldTags.add("medicine_delivered");
      writeLog(
        state,
        event.id,
        "medicine_delivered",
        ["medicine_delivered"],
        "获救的药车抵达医馆，药物开始分发给病人。",
      );
    }

    if (eventState.status === "resolved") continue;

    if (!eventState.missedApplied && tickReached(tickId, event.missedTick)) {
      if (event.id === MEDICINE_EVENT_ID && !eventState.sceneResolved) {
        eventState.sceneResolved = true;
        eventState.sceneOutcome = "cart_lost";
      }
      eventState.missedApplied = true;
      for (const tag of event.missedTags) state.worldTags.add(tag);
      writeLog(state, event.id, "missed", event.missedTags, event.missedText);
    }

    if (!eventState.reentryApplied && tickReached(tickId, event.reentryTick)) {
      eventState.reentryApplied = true;
      const hasContext = state.seenPreviews.has(event.id) || eventState.witnessed;
      const entries = hasContext ? event.strongReentries : event.weakReentries;
      for (const entry of entries) {
        state.reentries.push({
          ...entry,
          eventId: event.id,
          strength: hasContext ? "strong" : "weak",
        });
      }
      eventState.status = "transformed";
      writeLog(
        state,
        event.id,
        hasContext ? "strong_reentry" : "weak_reentry",
        entries.map((entry) => entry.zoneId),
        hasContext ? "玩家掌握事件上下文，生成强后果入口。" : "玩家没见过预兆，只生成弱传闻。",
      );
    }

    if (event.scarTick && !eventState.scarApplied && tickReached(tickId, event.scarTick)) {
      eventState.scarApplied = true;
      for (const tag of event.scarTags) state.worldTags.add(tag);
      eventState.status = eventState.status === "active" ? "scarred" : eventState.status;
      writeLog(state, event.id, "scar", event.scarTags, "事件进入定局伤痕。");
    }
  }

  return withCurrentTick(state);
}

function tickReached(currentTickId, targetTickId) {
  if (!targetTickId) return false;
  return tickIndex(currentTickId) >= tickIndex(targetTickId);
}

function tickIndex(tickId) {
  return TICKS.findIndex((tick) => tick.id === tickId);
}

function writeLog(state, eventId, stage, worldWrite, visibleFeedback) {
  state.log.push({
    tick: TICKS[state.tickIndex].id,
    zone: state.zoneId,
    eventId,
    stage,
    worldWrite,
    visibleFeedback,
  });
}

function withCurrentTick(state) {
  state.currentTick = TICKS[state.tickIndex];
  return state;
}
