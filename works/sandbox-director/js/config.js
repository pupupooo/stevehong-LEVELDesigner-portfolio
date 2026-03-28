const W = 900, H = 650;

const CFG = {
  beatCooldown: 18,
  antiPlotCooldown: 40,
  directorScanInterval: 4,
  playerDetectionRadius: 350,
  eventBroadcastRadius: 300,
  idleChatCooldown: 12,
  idleChatRadius: 100,
  gunDamage: 18,
  gunRange: 600,
  shootCooldown: 0.35,
  reloadTime: 1.5,
  maxAmmo: 6,
  gunshotEventRadius: 500,
  intimidateTime: 0.8,
  nearMissRadius: 45,
};

const COLORS = {
  grass: '#3d6b3d', forest: '#2a4f2a', market: '#8b7355',
  road: '#7a6b55', guardPost: '#5a5a6a', cave: '#2a2a35',
  tree: '#2d5a27', treeDark: '#1a3a15', station: '#6a5a4a'
};

const AREAS = {
  forest:    { x: 0,   y: 0,   w: 280, h: 420, color: COLORS.forest },
  station:   { x: 0,   y: 0,   w: 100, h: 80,  color: COLORS.station },
  market:    { x: 370, y: 140, w: 220, h: 220, color: COLORS.market },
  guardPost: { x: 710, y: 30,  w: 170, h: 170, color: COLORS.guardPost },
  road:      { x: 0,   y: 430, w: 900, h: 70,  color: COLORS.road },
  cave:      { x: 20,  y: 530, w: 120, h: 100, color: COLORS.cave }
};

const TREES = [
  { x: 60, y: 80 },  { x: 140, y: 50 },  { x: 200, y: 120 },
  { x: 80, y: 180 }, { x: 180, y: 230 }, { x: 50, y: 300 },
  { x: 160, y: 340 },{ x: 240, y: 280 }, { x: 100, y: 390 },
  { x: 220, y: 400 },{ x: 40, y: 200 },  { x: 250, y: 160 },
  { x: 130, y: 130 }
];

const BUILDINGS = [
  { x: 390, y: 160, w: 50, h: 45 }, { x: 460, y: 160, w: 60, h: 40 },
  { x: 540, y: 180, w: 40, h: 50 }, { x: 400, y: 290, w: 55, h: 45 },
  { x: 490, y: 310, w: 50, h: 40 }, { x: 730, y: 50,  w: 70, h: 60 },
  { x: 820, y: 80,  w: 55, h: 50 }
];
