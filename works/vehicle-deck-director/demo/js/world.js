// ═══════════════════════════════════════════
// world.js — 程序化地图 + 载具物理 + NPC
// ═══════════════════════════════════════════
(function() {
  const C = DS.Config;
  const MAP = C.map;
  const VEH = C.vehicle;
  const PPK = C.pixelsPerKmh;

  // ── 事件总线 ──
  DS.Events = {
    _listeners: {},
    on(evt, fn) {
      (this._listeners[evt] = this._listeners[evt] || []).push(fn);
    },
    off(evt, fn) {
      const arr = this._listeners[evt];
      if (arr) this._listeners[evt] = arr.filter(f => f !== fn);
    },
    emit(evt, data) {
      (this._listeners[evt] || []).forEach(fn => fn(data));
    }
  };

  // ── 输入管理 ──
  DS.Input = {
    keys: {},
    justPressed: {},
    _prevKeys: {},
    _pressedQueue: {},
    init() {
      window.addEventListener('keydown', e => {
        if (!this.keys[e.code]) this._pressedQueue[e.code] = true;
        this.keys[e.code] = true;
        e.preventDefault();
      });
      window.addEventListener('keyup', e => {
        this.keys[e.code] = false;
        e.preventDefault();
      });
    },
    update() {
      for (const k in this.keys) {
        this.justPressed[k] = !!this._pressedQueue[k] || (this.keys[k] && !this._prevKeys[k]);
      }
      this._pressedQueue = {};
      Object.assign(this._prevKeys, this.keys);
    },
    isDown(code) { return !!this.keys[code]; },
    wasPressed(code) { return !!this.justPressed[code]; },
    consume(code) {
      this.justPressed[code] = false;
      this._pressedQueue[code] = false;
    },
  };

  // ═══════════════════════════════════════
  // 地图模板系统
  // ═══════════════════════════════════════
  // 每个模板是 tileSize × tileSize，用数据描述道路布局
  // 道路出口：每条边中央有出口，宽度 = roadWidth
  // 模板类型决定内部道路连接方式

  const T = MAP.tileSize;
  const RW = MAP.roadWidth;
  const HALF = T / 2;
  const ROAD_HALF = RW / 2;

  function rectRoad(x, y, w, h, tag) {
    return { kind: 'rect', x, y, w, h, tag: tag || 'street' };
  }

  function segmentRoad(x1, y1, x2, y2, w, tag) {
    return { kind: 'segment', x1, y1, x2, y2, w: w || RW, tag: tag || 'street' };
  }

  function distToSegment(px, py, x1, y1, x2, y2) {
    const vx = x2 - x1;
    const vy = y2 - y1;
    const wx = px - x1;
    const wy = py - y1;
    const lenSq = vx * vx + vy * vy;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, (wx * vx + wy * vy) / lenSq));
    const cx = x1 + vx * t;
    const cy = y1 + vy * t;
    return Math.hypot(px - cx, py - cy);
  }

  function roadContains(road, x, y) {
    if (road.kind === 'segment') {
      return distToSegment(x, y, road.x1, road.y1, road.x2, road.y2) <= road.w / 2;
    }
    return x >= road.x && x <= road.x + road.w && y >= road.y && y <= road.y + road.h;
  }

  function roadAngle(road) {
    if (road.kind === 'segment') return Math.atan2(road.y2 - road.y1, road.x2 - road.x1);
    return road.w >= road.h ? 0 : Math.PI / 2;
  }

  function randomPointOnRoad(road, rng) {
    if (road.kind === 'segment') {
      const t = 0.08 + rng() * 0.84;
      const x = road.x1 + (road.x2 - road.x1) * t;
      const y = road.y1 + (road.y2 - road.y1) * t;
      const angle = roadAngle(road);
      const side = (rng() - 0.5) * road.w * 0.48;
      return {
        x: x + Math.cos(angle + Math.PI / 2) * side,
        y: y + Math.sin(angle + Math.PI / 2) * side,
        angle,
      };
    }
    return {
      x: road.x + road.w * (0.18 + rng() * 0.64),
      y: road.y + road.h * (0.18 + rng() * 0.64),
      angle: roadAngle(road),
    };
  }

  function poi(id, name, x, y, type, region, color) {
    return { id, name, x, y, type, region, color };
  }

  function baseWideRoads(extra) {
    return [
      rectRoad(0, HALF - ROAD_HALF, T, RW, 'main_ew'),
      rectRoad(HALF - ROAD_HALF, 0, RW, T, 'main_ns'),
    ].concat(extra || []);
  }

  function cornerBlocks(options) {
    const opt = options || {};
    const margin = opt.margin || 28;
    const inset = opt.inset || 0;
    const leftW = HALF - ROAD_HALF - margin * 2 - inset;
    const rightX = HALF + ROAD_HALF + margin + inset;
    const rightW = HALF - ROAD_HALF - margin * 2 - inset;
    const topH = HALF - ROAD_HALF - margin * 2 - inset;
    const bottomY = HALF + ROAD_HALF + margin + inset;
    const bottomH = HALF - ROAD_HALF - margin * 2 - inset;
    const blocks = [];
    if (leftW > 50 && topH > 50) blocks.push({ x: margin, y: margin, w: leftW, h: topH });
    if (rightW > 50 && topH > 50) blocks.push({ x: rightX, y: margin, w: rightW, h: topH });
    if (leftW > 50 && bottomH > 50) blocks.push({ x: margin, y: bottomY, w: leftW, h: bottomH });
    if (rightW > 50 && bottomH > 50) blocks.push({ x: rightX, y: bottomY, w: rightW, h: bottomH });
    return blocks;
  }

  function semanticDistrictDef(tx, ty) {
    const key = tx + ',' + ty;
    const defs = {
      '0,0': {
        name: '商业广场',
        region: 'commercial',
        roads: baseWideRoads([
          rectRoad(HALF - 170, HALF - 170, 340, 340, 'plaza_loop'),
          segmentRoad(120, 680, 680, 120, 96, 'diagonal_cut'),
        ]),
        buildings: cornerBlocks({ inset: 44 }),
        pois: [
          poi('commercial_plaza', '商业广场', 400, 400, 'plaza', 'commercial', '#ffd166'),
          poi('cafe', '咖啡店', 220, 230, 'social', 'commercial', '#f4a261'),
        ],
      },
      '1,0': {
        name: '警局大道',
        region: 'authority',
        roads: baseWideRoads([
          rectRoad(520, 130, 170, 540, 'station_drive'),
        ]),
        buildings: [
          { x: 42, y: 42, w: 230, h: 210 },
          { x: 42, y: 548, w: 230, h: 210 },
          { x: 560, y: 58, w: 178, h: 190 },
          { x: 560, y: 552, w: 178, h: 190 },
        ],
        pois: [
          poi('police_precinct', '警局', 610, 260, 'authority', 'authority', '#7db2ff'),
        ],
      },
      '-1,0': {
        name: '帮派街区',
        region: 'gang',
        roads: baseWideRoads([
          segmentRoad(95, 160, 705, 640, 104, 'alley_diagonal'),
          rectRoad(70, 565, 255, 92, 'back_alley'),
        ]),
        buildings: [
          { x: 40, y: 42, w: 220, h: 100 },
          { x: 555, y: 55, w: 188, h: 220 },
          { x: 52, y: 520, w: 180, h: 70 },
          { x: 525, y: 585, w: 210, h: 150 },
        ],
        pois: [
          poi('gang_block', '帮派街区', 230, 585, 'gang', 'gang', '#b48cff'),
        ],
      },
      '0,1': {
        name: '车库与加油站',
        region: 'service',
        roads: baseWideRoads([
          rectRoad(118, 585, 560, 112, 'service_loop'),
          segmentRoad(115, 610, 330, 300, 86, 'service_cut'),
        ]),
        buildings: [
          { x: 45, y: 48, w: 230, h: 210 },
          { x: 545, y: 45, w: 210, h: 220 },
          { x: 55, y: 690, w: 230, h: 68 },
          { x: 540, y: 692, w: 210, h: 66 },
        ],
        pois: [
          poi('garage', '改装车库', 210, 610, 'service', 'service', '#6ee7b7'),
          poi('gas_station', '加油站', 590, 610, 'service', 'service', '#f9c74f'),
        ],
      },
      '0,-1': {
        name: '金融押运区',
        region: 'finance',
        roads: baseWideRoads([
          rectRoad(115, 104, 570, 118, 'depot_ring'),
          segmentRoad(160, 150, 650, 360, 92, 'depot_cut'),
        ]),
        buildings: [
          { x: 50, y: 40, w: 220, h: 70 },
          { x: 542, y: 42, w: 210, h: 80 },
          { x: 45, y: 550, w: 230, h: 210 },
          { x: 548, y: 548, w: 205, h: 210 },
        ],
        pois: [
          poi('bank_depot', '押运仓库', 590, 170, 'finance', 'finance', '#c084fc'),
        ],
      },
      '1,-1': {
        name: '夜市弯道',
        region: 'nightlife',
        roads: baseWideRoads([
          segmentRoad(105, 690, 695, 145, 112, 'night_curve'),
        ]),
        buildings: cornerBlocks({ inset: 34 }),
        pois: [
          poi('night_market', '夜市弯道', 585, 205, 'social', 'nightlife', '#fb7185'),
        ],
      },
      '-1,1': {
        name: '旧工业巷',
        region: 'industrial',
        roads: baseWideRoads([
          rectRoad(95, 110, 118, 580, 'industrial_lane'),
          segmentRoad(160, 650, 640, 500, 88, 'yard_cut'),
        ]),
        buildings: [
          { x: 245, y: 55, w: 235, h: 225 },
          { x: 520, y: 50, w: 220, h: 225 },
          { x: 250, y: 555, w: 230, h: 190 },
          { x: 550, y: 615, w: 180, h: 120 },
        ],
        pois: [
          poi('industrial_yard', '旧工业巷', 175, 610, 'industrial', 'industrial', '#94a3b8'),
        ],
      },
    };
    return defs[key] || {
      name: '城市外环',
      region: 'outer',
      roads: baseWideRoads(),
      buildings: cornerBlocks(),
      pois: [],
    };
  }

  // 道路段定义：每个段是一个矩形 {x, y, w, h}
  // 所有模板保证四条边中央都有出口可接
  function makeTemplates() {
    // 公共：四条边的出口段
    const exitTop    = { x: HALF - ROAD_HALF, y: 0, w: RW, h: HALF };
    const exitBottom = { x: HALF - ROAD_HALF, y: HALF, w: RW, h: HALF };
    const exitLeft   = { x: 0, y: HALF - ROAD_HALF, w: HALF, h: RW };
    const exitRight  = { x: HALF, y: HALF - ROAD_HALF, w: HALF, h: RW };

    return [
      // 0: 十字路口 — 四通
      {
        name: 'crossroad',
        roads: [exitTop, exitBottom, exitLeft, exitRight],
        buildings: generateBuildings('crossroad'),
      },
      // 1: T字路口（上缺）— 下左右通
      {
        name: 't_junction_top',
        roads: [exitBottom, exitLeft, exitRight],
        buildings: generateBuildings('t_top'),
      },
      // 2: 直道（纵向）— 上下通
      {
        name: 'straight_v',
        roads: [exitTop, exitBottom],
        buildings: generateBuildings('straight_v'),
      },
      // 3: 直道（横向）— 左右通
      {
        name: 'straight_h',
        roads: [exitLeft, exitRight],
        buildings: generateBuildings('straight_h'),
      },
      // 4: 弯道（左下）— 下左通
      {
        name: 'curve_bl',
        roads: [exitBottom, exitLeft,
          // 连接弯道
          { x: 0, y: HALF - ROAD_HALF, w: HALF + ROAD_HALF, h: RW },
          { x: HALF - ROAD_HALF, y: HALF - ROAD_HALF, w: RW, h: HALF + ROAD_HALF },
        ],
        buildings: generateBuildings('curve'),
      },
    ];
  }

  function generateBuildings(type) {
    const blocks = [];
    const margin = 20;
    const roadZone = HALF - ROAD_HALF - margin;

    switch(type) {
      case 'crossroad':
        // 四个角落放建筑群
        for (let qx = 0; qx < 2; qx++) {
          for (let qy = 0; qy < 2; qy++) {
            const bx = qx === 0 ? margin : HALF + ROAD_HALF + margin;
            const by = qy === 0 ? margin : HALF + ROAD_HALF + margin;
            const bw = roadZone - margin;
            const bh = roadZone - margin;
            if (bw > 40 && bh > 40) {
              blocks.push({ x: bx, y: by, w: bw, h: bh });
            }
          }
        }
        break;
      case 't_top':
        // 上方两个大块，下方两个角落
        blocks.push({ x: margin, y: margin, w: HALF - ROAD_HALF - margin * 2, h: HALF - ROAD_HALF - margin * 2 });
        blocks.push({ x: HALF + ROAD_HALF + margin, y: margin, w: HALF - ROAD_HALF - margin * 2, h: HALF - ROAD_HALF - margin * 2 });
        blocks.push({ x: margin, y: HALF + ROAD_HALF + margin, w: HALF - ROAD_HALF - margin * 2, h: HALF - ROAD_HALF - margin * 2 });
        blocks.push({ x: HALF + ROAD_HALF + margin, y: HALF + ROAD_HALF + margin, w: HALF - ROAD_HALF - margin * 2, h: HALF - ROAD_HALF - margin * 2 });
        break;
      case 'straight_v':
        // 左右两个长条建筑
        blocks.push({ x: margin, y: margin, w: HALF - ROAD_HALF - margin * 2, h: T - margin * 2 });
        blocks.push({ x: HALF + ROAD_HALF + margin, y: margin, w: HALF - ROAD_HALF - margin * 2, h: T - margin * 2 });
        break;
      case 'straight_h':
        // 上下两个长条建筑
        blocks.push({ x: margin, y: margin, w: T - margin * 2, h: HALF - ROAD_HALF - margin * 2 });
        blocks.push({ x: margin, y: HALF + ROAD_HALF + margin, w: T - margin * 2, h: HALF - ROAD_HALF - margin * 2 });
        break;
      case 'curve':
        // 弯道内外侧
        blocks.push({ x: HALF + ROAD_HALF + margin, y: margin, w: HALF - ROAD_HALF - margin * 2, h: HALF - ROAD_HALF - margin * 2 });
        blocks.push({ x: margin, y: margin, w: HALF - ROAD_HALF - margin * 2, h: HALF - ROAD_HALF - margin * 2 });
        break;
    }
    return blocks;
  }

  // 伪随机（基于种子的确定性随机，同一 tile 坐标始终生成相同内容）
  function seededRandom(seed) {
    let s = Math.abs(seed % 2147483647) || 1; // 保证正整数
    return function() {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  // ═══════════════════════════════════════
  // TileMap
  // ═══════════════════════════════════════
  DS.TileMap = {
    templates: null,
    layout: null,
    layoutTile: null,
    tiles: {},        // key: "tx,ty" → tile data
    obstacles: {},    // key: "tx,ty" → [{x,y,w,h}]
    npcSpawns: {},    // key: "tx,ty" → [{x,y,angle}]

    init(layout) {
      this.templates = makeTemplates();
      const sourceLayout = layout || DS.LayoutData;
      if (!sourceLayout) {
        throw new Error('DS.TileMap requires district-layout.json as the map source of truth.');
      }
      this.layout = DS.LayoutLoader ? DS.LayoutLoader.normalize(sourceLayout) : sourceLayout;
      if (this.layout && DS.LayoutLoader) DS.LayoutLoader.validate(this.layout);
      this.layoutTile = null;
      this.tiles = {};
      this.obstacles = {};
      this.npcSpawns = {};
    },

    getPlayerSpawn() {
      return this.layout && this.layout.playerSpawn ?
        Object.assign({}, this.layout.playerSpawn) :
        { x: T / 2, y: T / 2, angle: -Math.PI / 2, archetypeId: 'standard' };
    },

    _getLayoutTile() {
      if (this.layoutTile) return this.layoutTile;
      const layout = this.layout;
      if (!layout) return null;

      this.layoutTile = {
        tx: 0,
        ty: 0,
        template: layout.name || 'authored_layout',
        worldX: 0,
        worldY: 0,
        width: layout.size.width,
        height: layout.size.height,
        roads: layout.roads,
        buildings: layout.blocked,
        pois: (layout.pois || []).map(item => Object.assign({}, item, {
          worldX: item.x,
          worldY: item.y,
        })),
        region: 'authored',
        districtName: layout.name || '手工测试城区',
        isSemanticDistrict: true,
      };
      return this.layoutTile;
    },

    getTile(tx, ty) {
      if (this.layout) return this._getLayoutTile();
      throw new Error('TileMap has no district layout loaded.');
    },

    _generateObstacles(tile, rng) {
      const obs = [];
      const count = MAP.obstacleCount.min + Math.floor(rng() * (MAP.obstacleCount.max - MAP.obstacleCount.min + 1));
      const roads = tile.roads;

      for (let i = 0; i < count; i++) {
        // 在道路边缘放置障碍物
        const road = roads[Math.floor(rng() * roads.length)];
        const point = randomPointOnRoad(road, rng);
        // 放在道路边缘而非中央
        const size = 6 + rng() * 8;
        obs.push({
          x: tile.worldX + point.x,
          y: tile.worldY + point.y,
          w: size,
          h: size,
          type: rng() > 0.5 ? 'cone' : 'barrel',
        });
      }
      return obs;
    },

    _generateNpcSpawns(tile, rng) {
      const spawns = [];
      const count = MAP.npcTrafficCount.min + Math.floor(rng() * (MAP.npcTrafficCount.max - MAP.npcTrafficCount.min + 1));
      const roads = tile.roads;

      for (let i = 0; i < count; i++) {
        const road = roads[Math.floor(rng() * roads.length)];
        const point = randomPointOnRoad(road, rng);
        spawns.push({
          x: tile.worldX + point.x,
          y: tile.worldY + point.y,
          angle: point.angle + (rng() > 0.5 ? Math.PI : 0),
          speed: 20 + rng() * 30,
        });
      }
      return spawns;
    },

    // 确保玩家周围的 tiles 都已生成
    ensureTilesAround(worldX, worldY) {
      if (this.layout) return [this._getLayoutTile()];

      const ctx = Math.floor(worldX / T);
      const cty = Math.floor(worldY / T);
      const radius = Math.floor(MAP.viewTiles / 2) + 1;
      const loaded = [];
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          loaded.push(this.getTile(ctx + dx, cty + dy));
        }
      }
      return loaded;
    },

    // 判断世界坐标点是否在道路上
    isOnRoad(worldX, worldY) {
      if (this.layout) {
        const tile = this._getLayoutTile();
        return tile.roads.some(road => roadContains(road, worldX, worldY));
      }

      const tx = Math.floor(worldX / T);
      const ty = Math.floor(worldY / T);
      const tile = this.getTile(tx, ty);
      const localX = worldX - tile.worldX;
      const localY = worldY - tile.worldY;

      for (const road of tile.roads) {
        if (roadContains(road, localX, localY)) {
          return true;
        }
      }
      return false;
    },

    // 判断世界坐标点是否在建筑内
    isInBuilding(worldX, worldY) {
      if (this.layout) {
        const tile = this._getLayoutTile();
        return tile.buildings.some(b =>
          worldX >= b.x && worldX <= b.x + b.w &&
          worldY >= b.y && worldY <= b.y + b.h
        );
      }

      const tx = Math.floor(worldX / T);
      const ty = Math.floor(worldY / T);
      const tile = this.getTile(tx, ty);
      const localX = worldX - tile.worldX;
      const localY = worldY - tile.worldY;

      for (const b of tile.buildings) {
        if (localX >= b.x && localX <= b.x + b.w &&
            localY >= b.y && localY <= b.y + b.h) {
          return true;
        }
      }
      return false;
    },

    isOutOfBounds(worldX, worldY) {
      if (!this.layout || !this.layout.size) return false;
      return worldX < 0 ||
        worldY < 0 ||
        worldX > this.layout.size.width ||
        worldY > this.layout.size.height;
    },

    // 获取附近的障碍物
    getObstaclesNear(worldX, worldY, radius) {
      if (this.layout) return [];

      const tx = Math.floor(worldX / T);
      const ty = Math.floor(worldY / T);
      const result = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const key = (tx + dx) + ',' + (ty + dy);
          const obs = this.obstacles[key] || [];
          for (const o of obs) {
            const dist = Math.hypot(o.x - worldX, o.y - worldY);
            if (dist < radius) result.push(o);
          }
        }
      }
      return result;
    },

    getPoisNear(worldX, worldY, radius) {
      if (this.layout) {
        const result = (this.layout.pois || []).map(item => Object.assign({
          distance: Math.hypot(item.x - worldX, item.y - worldY),
          worldX: item.x,
          worldY: item.y,
        }, item)).filter(item => item.distance <= radius);
        result.sort((a, b) => a.distance - b.distance);
        return result;
      }

      const tx = Math.floor(worldX / T);
      const ty = Math.floor(worldY / T);
      const result = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const tile = this.getTile(tx + dx, ty + dy);
          for (const poiItem of tile.pois || []) {
            const dist = Math.hypot(poiItem.worldX - worldX, poiItem.worldY - worldY);
            if (dist <= radius) result.push(Object.assign({ distance: dist }, poiItem));
          }
        }
      }
      result.sort((a, b) => a.distance - b.distance);
      return result;
    },

    getNearestPoi(worldX, worldY, radius, preferredIds) {
      const pois = this.getPoisNear(worldX, worldY, radius || 900);
      if (preferredIds && preferredIds.length) {
        const preferred = pois.find(item => preferredIds.includes(item.id));
        if (preferred) return preferred;
      }
      return pois[0] || null;
    },

    getDistrictContext(worldX, worldY) {
      if (this.layout) {
        const nearestPoi = this.getNearestPoi(worldX, worldY, 900);
        return {
          districtName: this.layout.name || '手工测试城区',
          region: nearestPoi ? nearestPoi.region : 'authored',
          nearestPoi,
          nearbyPois: this.getPoisNear(worldX, worldY, 900).slice(0, 4),
        };
      }

      const tx = Math.floor(worldX / T);
      const ty = Math.floor(worldY / T);
      const tile = this.getTile(tx, ty);
      const nearestPoi = this.getNearestPoi(worldX, worldY, 900);
      return {
        districtName: tile.districtName,
        region: tile.region,
        nearestPoi,
        nearbyPois: this.getPoisNear(worldX, worldY, 900).slice(0, 4),
      };
    },

    getEventAnchorsNear(worldX, worldY, radius, beatType) {
      if (!this.layout) return [];
      const anchors = (this.layout.eventAnchors || []).map(item => Object.assign({
        distance: Math.hypot(item.x - worldX, item.y - worldY),
      }, item)).filter(item => {
        if (item.distance > radius) return false;
        return !beatType || !item.beatTypes || item.beatTypes.includes(beatType);
      });
      anchors.sort((a, b) => a.distance - b.distance);
      return anchors;
    },
  };

  // ═══════════════════════════════════════
  // 载具（玩家）
  // ═══════════════════════════════════════
  DS.Vehicle = {
    x: 0,
    y: 0,
    angle: -Math.PI / 2, // 初始朝上
    speed: 0,            // km/h
    archetypeId: 'standard',
    prevX: 0,
    prevY: 0,

    // 碰撞事件
    lastCollisionTime: 0,
    collisionCooldown: 0.3, // s

    // 漂移/急转检测
    lastAngle: 0,
    angularVelocity: 0,

    init(x, y) {
      this.x = x;
      this.y = y;
      this.prevX = x;
      this.prevY = y;
      this.speed = 0;
      this.angle = -Math.PI / 2;
      this.archetypeId = 'standard';
      this.lastAngle = this.angle;
    },

    getArchetype() {
      return C.vehicleArchetypes[this.archetypeId] || C.vehicleArchetypes.standard;
    },

    applyArchetype(archetypeId) {
      if (!C.vehicleArchetypes[archetypeId]) return;
      this.archetypeId = archetypeId;
      const profile = this.getArchetype();
      if (Math.abs(this.speed) > profile.maxSpeed) {
        this.speed = Math.sign(this.speed) * profile.maxSpeed;
      }
    },

    update(dt) {
      const input = DS.Input;
      const profile = this.getArchetype();
      const maxSpeed = profile.maxSpeed || VEH.maxSpeed;
      const acceleration = VEH.acceleration * (profile.accelerationMul || 1);
      const brakeForce = VEH.brakeForce * (profile.brakeMul || 1);
      const turnMul = profile.turnMul || 1;

      // 记录上一帧位置
      this.prevX = this.x;
      this.prevY = this.y;
      this.lastAngle = this.angle;

      // 加速 / 刹车
      const accelInput = (input.isDown('KeyW') || input.isDown('ArrowUp')) ? 1 : 0;
      const brakeInput = (input.isDown('KeyS') || input.isDown('ArrowDown')) ? 1 : 0;

      if (accelInput) {
        this.speed += acceleration * dt;
      }
      if (brakeInput) {
        if (this.speed > 0) {
          this.speed -= brakeForce * dt;
          if (this.speed < 0) this.speed = 0;
        } else {
          this.speed -= acceleration * 0.5 * dt;
        }
      }

      // 自然摩擦
      if (!accelInput && !brakeInput) {
        if (this.speed > 0) {
          this.speed -= VEH.friction * dt;
          if (this.speed < 0) this.speed = 0;
        } else if (this.speed < 0) {
          this.speed += VEH.friction * dt;
          if (this.speed > 0) this.speed = 0;
        }
      }

      // 限速
      if (this.speed > maxSpeed) this.speed = maxSpeed;
      if (this.speed < -VEH.reverseMaxSpeed) this.speed = -VEH.reverseMaxSpeed;

      // 转向
      const turnInput = (input.isDown('KeyA') || input.isDown('ArrowLeft')) ? -1 :
                         (input.isDown('KeyD') || input.isDown('ArrowRight')) ? 1 : 0;

      if (turnInput && Math.abs(this.speed) > 1) {
        // 转向率随速度变化
        const speedFactor = 1 - (Math.abs(this.speed) / maxSpeed) * (1 - VEH.turnRateMinSpeed);
        const turnRate = VEH.turnRateBase * speedFactor * turnMul;
        const dir = this.speed >= 0 ? 1 : -1;
        this.angle += turnInput * turnRate * dir * dt;
      }

      // 角速度（用于急转检测）
      this.angularVelocity = (this.angle - this.lastAngle) / dt;

      // 移动
      const pxSpeed = this.speed * PPK;
      this.x += Math.cos(this.angle) * pxSpeed * dt;
      this.y += Math.sin(this.angle) * pxSpeed * dt;

      // 碰撞检测
      this._checkCollisions(dt);
    },

    _checkCollisions(dt) {
      const hl = VEH.size.w / 2;  // 半长（沿行驶方向）
      const hw = VEH.size.h / 2;  // 半宽（垂直行驶方向）

      // 获取车辆四角（hl沿angle方向, hw垂直于angle）
      const cos = Math.cos(this.angle);
      const sin = Math.sin(this.angle);
      const corners = [
        { x: this.x + cos * hl - sin * hw, y: this.y + sin * hl + cos * hw },
        { x: this.x + cos * hl + sin * hw, y: this.y + sin * hl - cos * hw },
        { x: this.x - cos * hl + sin * hw, y: this.y - sin * hl - cos * hw },
        { x: this.x - cos * hl - sin * hw, y: this.y - sin * hl + cos * hw },
      ];

      // 与建筑碰撞
      let collided = false;
      for (const corner of corners) {
        if (DS.TileMap.isInBuilding(corner.x, corner.y) || DS.TileMap.isOutOfBounds(corner.x, corner.y)) {
          collided = true;
          break;
        }
      }

      if (collided) {
        // 弹回
        this.x = this.prevX;
        this.y = this.prevY;
        const impactSpeed = Math.abs(this.speed);
        this.speed *= -0.3;

        // 碰撞事件
        const now = performance.now() / 1000;
        if (now - this.lastCollisionTime > this.collisionCooldown) {
          this.lastCollisionTime = now;
          DS.Events.emit('collision', { speed: impactSpeed, type: 'building' });
        }
      }

      // 与障碍物碰撞
      const nearObs = DS.TileMap.getObstaclesNear(this.x, this.y, 60);
      for (const obs of nearObs) {
        if (this._aabbOverlap(this.x - hl, this.y - hw, VEH.size.w, VEH.size.h,
                              obs.x - obs.w/2, obs.y - obs.h/2, obs.w, obs.h)) {
          const now = performance.now() / 1000;
          if (now - this.lastCollisionTime > this.collisionCooldown) {
            this.lastCollisionTime = now;
            DS.Events.emit('collision', { speed: Math.abs(this.speed), type: 'obstacle', obstacle: obs });
          }
          // 障碍物被撞飞（从列表移除）
          const tx = Math.floor(obs.x / T);
          const ty = Math.floor(obs.y / T);
          const key = tx + ',' + ty;
          const arr = DS.TileMap.obstacles[key];
          if (arr) {
            const idx = arr.indexOf(obs);
            if (idx >= 0) arr.splice(idx, 1);
          }
        }
      }
    },

    _aabbOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
      return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    },

    // 获取帧间净位移
    getDisplacement() {
      return Math.hypot(this.x - this.prevX, this.y - this.prevY);
    },

    // 判断是否在逆行（基于道路方向）
    isWrongWay() {
      // 简化：如果速度>30且在道路上，判断车头朝向与道路方向
      // MVP简化：用当前tile的道路方向判断
      if (Math.abs(this.speed) < 30) return false;
      const tx = Math.floor(this.x / T);
      const ty = Math.floor(this.y / T);
      const tile = DS.TileMap.getTile(tx, ty);
      const localX = this.x - tile.worldX;
      const localY = this.y - tile.worldY;

      // 在横向道路上
      for (const road of tile.roads) {
        if (roadContains(road, localX, localY)) {
          if (road.kind === 'segment') {
            const diff = Math.abs(Math.atan2(Math.sin(this.angle - roadAngle(road)), Math.cos(this.angle - roadAngle(road))));
            return diff > Math.PI * 0.6 && diff < Math.PI * 1.4;
          }
          if (road.w > road.h) {
            // 横向道路：上半为右行，下半为左行
            const inUpper = localY < road.y + road.h / 2;
            const goingRight = Math.cos(this.angle) > 0;
            if (inUpper && !goingRight) return true;
            if (!inUpper && goingRight) return true;
          } else {
            // 纵向道路：左半为下行，右半为上行
            const inLeft = localX < road.x + road.w / 2;
            const goingDown = Math.sin(this.angle) > 0;
            if (inLeft && !goingDown) return true;
            if (!inLeft && goingDown) return true;
          }
          return false;
        }
      }
      return false;
    },

    // 是否急转弯
    isSharpTurn() {
      return Math.abs(this.angularVelocity) > 2.5;
    },
  };

  // ═══════════════════════════════════════
  // NPC 车辆管理
  // ═══════════════════════════════════════
  DS.NPCManager = {
    npcs: [],
    maxNpcs: 20,

    init() {
      this.npcs = [];
      this._spawnDemoVehicles();
    },

    update(dt) {
      const playerX = DS.Vehicle.x;
      const playerY = DS.Vehicle.y;

      // 生成新NPC（在玩家周围的tiles）
      this._spawnAround(playerX, playerY);

      // 更新每个NPC
      for (let i = this.npcs.length - 1; i >= 0; i--) {
        const npc = this.npcs[i];

        // 简单AI：沿当前方向行驶
        const pxSpeed = npc.speed * PPK;
        const oldX = npc.x;
        const oldY = npc.y;
        npc.x += Math.cos(npc.angle) * pxSpeed * dt;
        npc.y += Math.sin(npc.angle) * pxSpeed * dt;

        // 布局白盒里，NPC 只作为可抢车/交通压力信号，不需要复杂寻路。
        // 离开可驾驶区域时回退并换向，避免视觉上卡进建筑或人行道。
        if (DS.TileMap.isInBuilding(npc.x, npc.y) || !DS.TileMap.isOnRoad(npc.x, npc.y)) {
          npc.x = oldX;
          npc.y = oldY;
          npc.angle += Math.PI / 2 + (Math.random() - 0.5);
        }

        // 太远的NPC移除
        const dist = Math.hypot(npc.x - playerX, npc.y - playerY);
        if (dist > T * 3) {
          this.npcs.splice(i, 1);
          continue;
        }

        // 与玩家碰撞（含速度补偿：高速时沿运动方向延伸检测）
        const playerDist = Math.hypot(npc.x - playerX, npc.y - playerY);
        const playerSpeed = Math.abs(DS.Vehicle.speed);
        // 基础碰撞半径 + 速度补偿（高速时扩大检测范围防穿透）
        const collisionRadius = 40 + playerSpeed * PPK * 0.02;
        if (playerDist < collisionRadius && !npc.hitCooldown) {
          DS.Events.emit('collision', {
            speed: Math.abs(DS.Vehicle.speed - npc.speed),
            type: 'npc_car',
            npc: npc,
          });
          npc.hitCooldown = 0.8;
          // 碰撞反馈：双方减速 + 弹开
          const pushAngle = Math.atan2(npc.y - playerY, npc.x - playerX);
          const pushForce = 3 + playerSpeed * 0.05;
          npc.x += Math.cos(pushAngle) * pushForce;
          npc.y += Math.sin(pushAngle) * pushForce;
          DS.Vehicle.speed *= 0.5;
          npc.speed *= 0.3;
        }

        if (npc.hitCooldown) {
          npc.hitCooldown -= dt;
          if (npc.hitCooldown < 0) npc.hitCooldown = 0;
        }
      }
    },

    _spawnAround(px, py) {
      if (this.npcs.length >= this.maxNpcs) return;
      if (DS.TileMap.layout) {
        this._spawnFromLayoutLanes(px, py);
        return;
      }

      const tx = Math.floor(px / T);
      const ty = Math.floor(py / T);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const key = (tx + dx) + ',' + (ty + dy);
          const spawns = DS.TileMap.npcSpawns[key];
          if (!spawns) continue;

          for (const sp of spawns) {
            // 不在玩家太近处生成
            const dist = Math.hypot(sp.x - px, sp.y - py);
            if (dist < 200 || dist > T * 2) continue;

            // 检查是否已有NPC在附近
            const tooClose = this.npcs.some(n => Math.hypot(n.x - sp.x, n.y - sp.y) < 100);
            if (tooClose) continue;

            if (this.npcs.length < this.maxNpcs && Math.random() < 0.08) {
              const archetypeId = this._pickTrafficArchetype();
              const profile = C.vehicleArchetypes[archetypeId];
              this.npcs.push({
                x: sp.x,
                y: sp.y,
                angle: sp.angle,
                speed: sp.speed,
                archetypeId: archetypeId,
                color: profile.color,
                hitCooldown: 0,
                id: Math.random().toString(36).substr(2, 6),
              });
            }
          }
        }
      }
    },

    _spawnFromLayoutLanes(px, py) {
      const lanes = DS.TileMap.layout.npcSpawnLanes || [];
      for (const lane of lanes) {
        if (this.npcs.length >= this.maxNpcs) return;
        if (Math.random() > 0.035) continue;

        const point = this._randomPointOnLane(lane);
        const dist = Math.hypot(point.x - px, point.y - py);
        if (dist < 220 || dist > T * 2.6) continue;
        if (!DS.TileMap.isOnRoad(point.x, point.y) || DS.TileMap.isInBuilding(point.x, point.y)) continue;

        const tooClose = this.npcs.some(n => Math.hypot(n.x - point.x, n.y - point.y) < 120);
        if (tooClose) continue;

        const archetypeId = this._pickLaneArchetype(lane);
        const profile = C.vehicleArchetypes[archetypeId] || C.vehicleArchetypes.standard;
        this.npcs.push({
          x: point.x,
          y: point.y,
          angle: point.angle + (Math.random() > 0.5 ? Math.PI : 0),
          speed: lane.speedMin + Math.random() * (lane.speedMax - lane.speedMin),
          archetypeId: archetypeId,
          color: profile.color,
          hitCooldown: 0,
          id: Math.random().toString(36).substr(2, 6),
        });
      }
    },

    _randomPointOnLane(lane) {
      const t = 0.08 + Math.random() * 0.84;
      const x = lane.x1 + (lane.x2 - lane.x1) * t;
      const y = lane.y1 + (lane.y2 - lane.y1) * t;
      const angle = Math.atan2(lane.y2 - lane.y1, lane.x2 - lane.x1);
      const side = (Math.random() - 0.5) * (lane.w || 96) * 0.45;
      return {
        x: x + Math.cos(angle + Math.PI / 2) * side,
        y: y + Math.sin(angle + Math.PI / 2) * side,
        angle,
      };
    },

    _pickLaneArchetype(lane) {
      const list = lane.archetypes && lane.archetypes.length ? lane.archetypes : ['standard'];
      return list[Math.floor(Math.random() * list.length)];
    },

    _pickTrafficArchetype() {
      const roll = Math.random();
      if (roll > 0.94) return 'police';
      if (roll > 0.84) return 'gang';
      if (roll > 0.64) return 'heavy';
      if (roll > 0.44) return 'sport';
      return 'standard';
    },

    _spawnDemoVehicles() {
      const v = DS.Vehicle;
      const demo = [
        { dx: 76, dy: -10, archetypeId: 'sport', angle: 0 },
        { dx: -260, dy: -18, archetypeId: 'heavy', angle: Math.PI },
        { dx: -130, dy: 250, archetypeId: 'police', angle: Math.PI / 2 },
      ];
      for (const item of demo) {
        const profile = C.vehicleArchetypes[item.archetypeId];
        this.npcs.push({
          x: v.x + item.dx,
          y: v.y + item.dy,
          angle: item.angle,
          speed: 0,
          archetypeId: item.archetypeId,
          color: profile.color,
          hitCooldown: 0,
          id: 'demo_' + item.archetypeId,
          demoVehicle: true,
        });
      }
    },

    getHijackCandidate(radius) {
      const maxRadius = radius || C.worldResponse.hijackRadius;
      const v = DS.Vehicle;
      let best = null;
      let bestDist = Infinity;
      for (const npc of this.npcs) {
        if (npc.special) continue;
        const dist = Math.hypot(npc.x - v.x, npc.y - v.y);
        if (dist < maxRadius && dist < bestDist) {
          best = npc;
          bestDist = dist;
        }
      }
      return best ? { npc: best, distance: bestDist } : null;
    },

    claimChallengeVehicle(radius, tag, color) {
      const maxRadius = radius || 900;
      const v = DS.Vehicle;
      let best = null;
      let bestScore = Infinity;
      for (const npc of this.npcs) {
        if (npc.special) continue;
        if (!DS.TileMap.isOnRoad(npc.x, npc.y) || DS.TileMap.isInBuilding(npc.x, npc.y)) continue;
        const dx = npc.x - v.x;
        const dy = npc.y - v.y;
        const dist = Math.hypot(dx, dy);
        if (dist > maxRadius || dist < 80) continue;
        const ahead = dx * Math.cos(v.angle) + dy * Math.sin(v.angle);
        const score = dist + (ahead < 0 ? 220 : 0);
        if (score < bestScore) {
          best = npc;
          bestScore = score;
        }
      }
      if (!best) return null;
      best.special = true;
      best.tag = tag || 'challenge_vehicle';
      best.color = color || best.color;
      best.speed = Math.max(Math.abs(v.speed) + 10, Math.abs(best.speed || 0), 35);
      return best;
    },

    // 创建特殊NPC（用于玩法）
    spawnSpecial(x, y, angle, speed, color, tag) {
      const npc = {
        x, y, angle, speed, color,
        archetypeId: 'sport',
        tag: tag,
        hitCooldown: 0,
        id: 'special_' + Math.random().toString(36).substr(2, 6),
        special: true,
      };
      this.npcs.push(npc);
      return npc;
    },

    removeSpecial(tag) {
      this.npcs = this.npcs.filter(n => n.tag !== tag);
    },

    getByTag(tag) {
      return this.npcs.find(n => n.tag === tag);
    },
  };

  // ═══════════════════════════════════════
  // 世界响应：抢车后的身份/行为反馈
  // ═══════════════════════════════════════
  DS.WorldResponse = {
    heat: 0,
    lastAction: '暂无',
    responseLog: [],
    stolenVehicleName: '无',

    init() {
      this.heat = 0;
      this.lastAction = '暂无';
      this.responseLog = [];
      this.stolenVehicleName = '无';
      this._push('系统待机：导演仅观察驾驶行为。');

      DS.Events.on('encounter_finished', (data) => {
        const delta = data.result && data.result.success ? 6 : 3;
        this._addHeat(delta, '玩法结算改变世界关注度');
      });
    },

    update(dt) {
      if (this.heat > 0) {
        this.heat = Math.max(0, this.heat - C.worldResponse.heatDecayPerSecond * dt);
      }
    },

    tryHijackNearest() {
      const candidate = DS.NPCManager.getHijackCandidate(C.worldResponse.hijackRadius);
      if (!candidate) {
        DS.Renderer.showMessage('附近没有可夺取车辆', '#888899', 1.6);
        return false;
      }

      if (Math.abs(DS.Vehicle.speed) > C.worldResponse.hijackMaxPlayerSpeed) {
        DS.Renderer.showMessage('车速过高，无法抢车', '#ffaa22', 1.6);
        return false;
      }

      const npc = candidate.npc;
      const archetypeId = npc.archetypeId || 'standard';
      const profile = C.vehicleArchetypes[archetypeId] || C.vehicleArchetypes.standard;

      DS.Vehicle.x = npc.x;
      DS.Vehicle.y = npc.y;
      DS.Vehicle.angle = npc.angle;
      DS.Vehicle.speed = Math.max(18, Math.abs(npc.speed));
      DS.Vehicle.applyArchetype(archetypeId);

      DS.NPCManager.npcs = DS.NPCManager.npcs.filter(item => item !== npc);
      this.stolenVehicleName = profile.name;
      this.lastAction = '抢夺' + profile.name;
      this._addHeat(profile.heatOnHijack, this.lastAction);
      this._push('玩家抢夺' + profile.name + '：世界响应升级，Deck 上下文权重发生变化。');

      DS.Events.emit('director_log', {
        time: DS.Director ? DS.Director.gameTime : 0,
        message: '世界响应: ' + this.lastAction + '，热度 +' + profile.heatOnHijack,
        type: 'system',
      });
      DS.Renderer.showMessage('已抢夺: ' + profile.name + ' | 世界开始响应', profile.color, 2.4);
      return true;
    },

    _addHeat(amount, reason) {
      this.heat = Math.min(100, this.heat + amount);
      this._push(reason + '，当前热度 ' + Math.round(this.heat) + '/100。');
    },

    _push(text) {
      this.responseLog.push(text);
      if (this.responseLog.length > 6) this.responseLog.shift();
    },

    getHeatTier() {
      if (this.heat >= 70) return '高压响应';
      if (this.heat >= 40) return '警觉响应';
      if (this.heat >= 15) return '轻度关注';
      return '低关注';
    },

    getDeckBias() {
      const profile = DS.Vehicle.getArchetype();
      const bias = Object.assign({}, profile.bias);
      if (this.heat >= 40) {
        bias.armored_heist = (bias.armored_heist || 1) + 0.25;
        bias.midnight_race = (bias.midnight_race || 1) + 0.15;
      }
      if (this.heat >= 70) {
        bias.copilot_command = Math.max(0.55, (bias.copilot_command || 1) - 0.2);
      }
      return bias;
    },

    getDirectorRecommendation() {
      const profile = DS.Vehicle.getArchetype();
      const speed = Math.abs(Math.round(DS.Vehicle.speed));
      const district = DS.TileMap.getDistrictContext(DS.Vehicle.x, DS.Vehicle.y);
      const poiName = district.nearestPoi ? district.nearestPoi.name : district.districtName;
      if (this.heat >= 70 || DS.Vehicle.archetypeId === 'police') {
        return {
          title: '高热度响应：推送追逐/拦截类事件',
          reason: '玩家身份冲突明显，' + poiName + ' 附近应先回应抢车行为，再进入常规 T2 分发。',
        };
      }
      if (DS.Vehicle.archetypeId === 'sport' || speed > 90) {
        return {
          title: '速度状态：提高竞速/挑衅接入权重',
          reason: '玩家正在主动追求高速驾驶，导演不冻结计数器，而是把高速作为竞速/挑衅类 Vehicle Beat 修饰器。',
        };
      }
      if (DS.Vehicle.archetypeId === 'heavy') {
        return {
          title: '重型车辆：提高冲撞/拦截类事件权重',
          reason: '车辆质量感适合在 ' + poiName + ' 附近制造拦截、撞停、封路等系统挑战。',
        };
      }
      return {
        title: '常规巡航：维持 T2 主牌组与空牌呼吸',
        reason: '当前状态适合按距离/时间混合触发，并根据附近 POI 选择自然接入信号。',
      };
    },

    getState() {
      const district = DS.TileMap.getDistrictContext(DS.Vehicle.x, DS.Vehicle.y);
      return {
        heat: Math.round(this.heat),
        heatTier: this.getHeatTier(),
        lastAction: this.lastAction,
        regionTag: district.region || C.worldResponse.regionTag,
        districtName: district.districtName,
        nearestPoi: district.nearestPoi,
        nearbyPois: district.nearbyPois,
        stolenVehicleName: this.stolenVehicleName,
        deckBias: this.getDeckBias(),
        recommendation: this.getDirectorRecommendation(),
        responseLog: this.responseLog.slice(),
      };
    },
  };
})();
