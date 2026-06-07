// ═══════════════════════════════════════════
// config.js — 所有可调参数集中管理
// ═══════════════════════════════════════════
window.DS = window.DS || {};

DS.Config = {
  // ── 载具 ──
  vehicle: {
    maxSpeed: 200,          // km/h 最高速度
    acceleration: 130,      // km/h per second（更灵敏的加速）
    brakeForce: 180,        // km/h per second（更灵敏的刹车）
    reverseMaxSpeed: 40,    // km/h 倒车最高
    turnRateBase: 3.9,      // rad/s 基础转向速率（2D MVP 更强调可操作性）
    turnRateMinSpeed: 0.48, // 高速时转向衰减到此比例
    friction: 28,           // km/h per second 自然减速
    size: { w: 36, h: 20 }, // 车辆碰撞尺寸 (长×宽, 长轴沿行驶方向)
  },

  // ── 车辆原型 ──
  vehicleArchetypes: {
    standard: {
      name: '普通轿车',
      color: '#e8e8e0',
      maxSpeed: 200,
      accelerationMul: 1,
      brakeMul: 1,
      turnMul: 1,
      heatOnHijack: 18,
      bias: { midnight_race: 1, intimidation_ride: 1, armored_heist: 1, copilot_command: 1 },
      note: '默认驾驶体验，适合展示基础触发节奏。',
    },
    sport: {
      name: '跑车',
      color: '#ff4500',
      maxSpeed: 245,
      accelerationMul: 1.35,
      brakeMul: 1.15,
      turnMul: 1.08,
      heatOnHijack: 26,
      bias: { midnight_race: 1.45, intimidation_ride: 1.1, armored_heist: 0.85, copilot_command: 1 },
      note: '高速度更容易产生竞速、挑衅与高速驾驶事件。',
    },
    heavy: {
      name: '重型车',
      color: '#aa7755',
      maxSpeed: 155,
      accelerationMul: 0.72,
      brakeMul: 0.8,
      turnMul: 0.68,
      heatOnHijack: 22,
      bias: { midnight_race: 0.75, intimidation_ride: 1, armored_heist: 1.35, copilot_command: 0.9 },
      note: '强调碰撞质量感，适合拦截、冲撞与封路类任务。',
    },
    police: {
      name: '警车',
      color: '#4488ff',
      maxSpeed: 220,
      accelerationMul: 1.15,
      brakeMul: 1.2,
      turnMul: 1.05,
      heatOnHijack: 45,
      bias: { midnight_race: 1.15, intimidation_ride: 0.9, armored_heist: 1.25, copilot_command: 0.8 },
      note: '身份权限冲突最强，抢车后应触发高强度世界响应。',
    },
    gang: {
      name: '帮派车',
      color: '#aa66ff',
      maxSpeed: 205,
      accelerationMul: 1.05,
      brakeMul: 1,
      turnMul: 0.95,
      heatOnHijack: 34,
      bias: { midnight_race: 1.05, intimidation_ride: 1.25, armored_heist: 1.1, copilot_command: 0.75 },
      note: '更容易引出帮派追逐、报复和第三方介入。',
    },
  },

  worldResponse: {
    hijackRadius: 78,
    hijackMaxPlayerSpeed: 28,
    heatDecayPerSecond: 0.55,
    regionTag: 'commercial',
  },

  // ── 速度状态 ──
  speedGate: {
    threshold: 80,  // km/h 超过此值只作为高速状态/修饰器，不冻结计数器
  },

  // ── 触发系统 ──
  // 注意: 距离单位是像素(px)，视觉比例 ~4.5px/m
  trigger: {
    distanceMin: 1200,  // px 净位移触发下限
    distanceMax: 2200,  // px 净位移触发上限
    timeMin: 18,        // s 时间兜底下限
    timeMax: 32,        // s 时间兜底上限
  },

  // ── 牌组 ──
  deck: {
    composition: [
      { type: 'midnight_race',      count: 2 },
      { type: 'intimidation_ride',  count: 2 },
      { type: 'armored_heist',      count: 1 },
      { type: 'copilot_command',    count: 2 },
      { type: 'blank',              count: 4 },
    ],
    pendingTimeout: 16, // s Vehicle Beat signal 等待玩家接入
  },

  // ── T2 Vehicle Beat 元信息 ──
  beatFamilies: {
    discovery: {
      label: '发现机会',
      note: '玩家在移动中遇到可选择接入的驾驶机会。',
    },
    request: {
      label: '请求接入',
      note: 'NPC、电话或路边角色向玩家发出请求。',
    },
    confrontation: {
      label: '对峙压力',
      note: '世界根据玩家身份、热度或车辆行为施加压力。',
    },
    escort: {
      label: '护送运送',
      note: '围绕接送、保护、运送和路线选择形成复合目标。',
    },
  },

  beatDefs: {
    midnight_race: {
      family: 'discovery',
      signalType: 'road_challenge',
      signalLabel: '街头挑衅',
      naturalPrompt: '前方车辆闪灯挑衅，按 E 接入街头竞速',
      llmHint: '高速/跑车/商业区会提高竞速和挑衅类机会权重。',
      poiPreference: ['night_market', 'commercial_plaza', 'garage'],
    },
    intimidation_ride: {
      family: 'request',
      signalType: 'phone_request',
      signalLabel: '匿名来电',
      naturalPrompt: '有人请求专车服务，按 E 接单并前往接人点',
      llmHint: '低热度巡航或帮派街区更适合把请求包装成角色委托。',
      poiPreference: ['gang_block', 'night_market', 'cafe'],
    },
    armored_heist: {
      family: 'confrontation',
      signalType: 'world_pressure',
      signalLabel: '车队情报',
      naturalPrompt: '发现运钞车路线，按 E 直接开始追踪',
      llmHint: '重型车、警觉热度和金融/警局 POI 会提高拦截类事件权重。',
      poiPreference: ['bank_depot', 'police_precinct', 'gas_station'],
    },
    copilot_command: {
      family: 'escort',
      signalType: 'roadside_pickup',
      signalLabel: '路边求助',
      naturalPrompt: '路边有人招手求助，按 E 靠边接入',
      llmHint: '车库、咖啡店和小巷入口适合生成低门槛的护送/指挥事件。',
      poiPreference: ['garage', 'cafe', 'commercial_plaza'],
    },
  },

  // ── 玩法参数 ──
  encounters: {
    midnightRace: {
      checkpoints: 3,
      npcSpeedRatio: 0.88,     // NPC速度 = 玩家极速 × ratio
      acceptSpeedThreshold: 40, // km/h 加速到此即接受
      introTime: 8,            // s NPC闪灯时间
    },
    intimidationRide: {
      fearMax: 100,
      fearDecay: 1,            // /s 自然衰减
      fearFloor: 0.5,          // 不低于峰值的 50%
      fearOnWrongWay: 2,       // /s 逆行
      fearOnCollision: 15,     // 每次碰撞
      fearOnHighSpeed: 1,      // /s 超过 100km/h
      fearOnSharpTurn: 8,      // 每次急转
      highSpeedThreshold: 100, // km/h
      timeout: 180,            // s 超时失败
    },
    armoredHeist: {
      truckHP: 100,
      truckSpeed: 60,          // km/h
      damageMultiplier: 0.8,   // 伤害 = 撞击速度差 × multiplier
      escapeDistance: 2000,    // px 运钞车跑出此距离则失败
    },
    copilotCommand: {
      rounds: 5,
      responseWindow: 3,       // s 每轮响应窗口
      pickupSpeedThreshold: 10, // km/h 低于此速度可接人
    },
  },

  // ── 地图 ──
  map: {
    tileSize: 800,        // px 每个模板块尺寸
    roadWidth: 140,       // px 道路宽度
    viewTiles: 3,         // 视口范围 3x3 块
    obstacleCount: { min: 0, max: 3 }, // 每块障碍物数量
    npcTrafficCount: { min: 2, max: 4 }, // 每块NPC车数量
  },

  // ── 渲染 ──
  render: {
    canvasWidth: 900,
    canvasHeight: 700,
    cameraSmooth: 0.12,   // 摄像机插值系数（更紧跟）
    colors: {
      road: '#3a3a42',
      roadLine: '#555560',
      building: '#14141c',
      buildingLight: '#3d3020',
      sidewalk: '#1a1a22',
      grass: '#1a2418',
      poi: '#ffd166',
      poiRing: 'rgba(255, 209, 102, 0.22)',
      player: '#e8e8e0',
      playerTail: '#ff4400',
      npcCar: '#6688aa',
      obstacle: '#555560',
      checkpoint: '#ffcc00',
      pickup: '#00ccff',
      danger: '#ff2200',
    },
  },

  // ── UI ──
  ui: {
    resultDisplayTime: 2.5, // s 结果显示时长
    callPromptTime: 8,      // s 来电提示时长
    fontSize: {
      large: 48,
      medium: 24,
      small: 14,
    },
  },

  // ── 单位换算 ──
  // 视觉比例: ~4.5px/m，200km/h ≈ 250px/s（约3.5秒横穿屏幕）
  pixelsPerKmh: 1.25, // px/s per km/h（原0.278 × ~4.5倍放大）
};
