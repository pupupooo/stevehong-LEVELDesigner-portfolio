// ═══════════════════════════════════════════
// encounters.js — 4 种可玩玩法实现
// ═══════════════════════════════════════════
// 每个玩法统一生命周期：pending → intro → active → result → cleanup
// 统一接口：start(), update(dt), isFinished(), getResult(), cleanup(), getDebugData()
(function() {
  const C = DS.Config;
  const PPK = C.pixelsPerKmh;
  const T = C.map.tileSize;
  const MARKER_SAFE_RADIUS = 34;

  DS.Encounters = {};

  function isPlayableRoadPoint(x, y) {
    return DS.TileMap.isOnRoad(x, y) &&
      !DS.TileMap.isInBuilding(x, y) &&
      !(DS.TileMap.isOutOfBounds && DS.TileMap.isOutOfBounds(x, y));
  }

  function clamp(value, min, max) {
    if (min > max) return (min + max) / 2;
    return Math.max(min, Math.min(max, value));
  }

  function isSafeRoadPoint(x, y, radius) {
    const r = radius || MARKER_SAFE_RADIUS;
    const d = r * 0.7;
    const samples = [
      [0, 0],
      [r, 0],
      [-r, 0],
      [0, r],
      [0, -r],
      [d, d],
      [-d, d],
      [d, -d],
      [-d, -d],
    ];
    return samples.every(([dx, dy]) => isPlayableRoadPoint(x + dx, y + dy));
  }

  function projectToRoad(road, x, y, safeRadius) {
    const margin = Math.max((safeRadius || 0) + 4, 24);
    if (road.kind === 'segment' || road.type === 'segment') {
      const vx = road.x2 - road.x1;
      const vy = road.y2 - road.y1;
      const wx = x - road.x1;
      const wy = y - road.y1;
      const lenSq = vx * vx + vy * vy;
      const len = Math.sqrt(lenSq);
      const endMargin = len > 0 ? Math.min(0.42, margin / len) : 0;
      const rawT = lenSq === 0 ? 0 : (wx * vx + wy * vy) / lenSq;
      const t = clamp(rawT, endMargin, 1 - endMargin);
      return {
        x: road.x1 + vx * t,
        y: road.y1 + vy * t,
        angle: Math.atan2(vy, vx),
      };
    }

    if (road.w >= road.h) {
      return {
        x: clamp(x, road.x + margin, road.x + road.w - margin),
        y: road.y + road.h / 2,
        angle: 0,
      };
    }

    return {
      x: road.x + road.w / 2,
      y: clamp(y, road.y + margin, road.y + road.h - margin),
      angle: Math.PI / 2,
    };
  }

  function nearestRoadPoint(x, y, options) {
    const opts = options || {};
    const safeRadius = opts.safeRadius || 0;
    const minPlayerDist = opts.minPlayerDist || 0;
    const layout = DS.TileMap.layout;
    if (!layout || !layout.roads) return { x, y, angle: 0 };

    function findBest(requiredPlayerDist) {
      let best = null;
      let bestScore = Infinity;
      for (const road of layout.roads) {
        const point = projectToRoad(road, x, y, safeRadius);
        if (safeRadius > 0 && !isSafeRoadPoint(point.x, point.y, safeRadius)) continue;
        if (safeRadius === 0 && !isPlayableRoadPoint(point.x, point.y)) continue;
        if (requiredPlayerDist > 0 && DS.Vehicle) {
          const playerDist = Math.hypot(point.x - DS.Vehicle.x, point.y - DS.Vehicle.y);
          if (playerDist < requiredPlayerDist) continue;
        }
        const score = Math.hypot(point.x - x, point.y - y);
        if (score < bestScore) {
          bestScore = score;
          best = point;
        }
      }
      return best;
    }

    const best = findBest(minPlayerDist) || findBest(0);
    return best || { x, y, angle: 0 };
  }

  function findPlayableRoadPointAhead(minDist, maxDist, lateralRange, safeRadius) {
    const v = DS.Vehicle;
    const forward = v.angle;
    const sideAngle = forward + Math.PI / 2;
    const markerRadius = safeRadius || MARKER_SAFE_RADIUS;
    const lateralValues = [0, -0.35, 0.35, -0.7, 0.7, -1, 1].map(n => n * (lateralRange || 240));
    for (let dist = minDist; dist <= maxDist; dist += 80) {
      for (const lateral of lateralValues) {
        const x = v.x + Math.cos(forward) * dist + Math.cos(sideAngle) * lateral;
        const y = v.y + Math.sin(forward) * dist + Math.sin(sideAngle) * lateral;
        if (isSafeRoadPoint(x, y, markerRadius)) return { x, y, angle: forward };
        const projected = nearestRoadPoint(x, y, {
          safeRadius: markerRadius,
          minPlayerDist: minDist * 0.65,
        });
        if (isSafeRoadPoint(projected.x, projected.y, markerRadius)) return projected;
      }
    }
    return nearestRoadPoint(
      v.x + Math.cos(forward) * ((minDist + maxDist) / 2),
      v.y + Math.sin(forward) * ((minDist + maxDist) / 2),
      {
        safeRadius: markerRadius,
        minPlayerDist: minDist * 0.5,
      }
    );
  }

  // ═══════════════════════════════════════
  // 基类
  // ═══════════════════════════════════════
  class BaseEncounter {
    constructor(card) {
      this.card = card;
      this.phase = 'pending';  // pending → intro → active → result → done
      this.finished = false;
      this.success = false;
      this.resultDetail = '';
      this.resultTimer = 0;
      this.isAccepted = false;
    }
    start() { this.phase = 'intro'; }
    update(dt) {}
    isFinished() { return this.finished; }
    getResult() { return { success: this.success, detail: this.resultDetail }; }
    cleanup() {}
    getDebugData() { return {}; }

    _showResult(success, detail, duration) {
      this.phase = 'result';
      this.success = success;
      this.resultDetail = detail || '';
      this.resultTimer = duration || C.ui.resultDisplayTime;
      const color = success ? '#44cc66' : '#ff4400';
      const text = success ?
        '任务完成: ' + this.card.def.name :
        '任务失败: ' + this.card.def.name;
      DS.Renderer.showMessage(text + (detail ? ' — ' + detail : ''), color, this.resultTimer);
    }

    _updateResult(dt) {
      if (this.phase === 'result') {
        this.resultTimer -= dt;
        if (this.resultTimer <= 0) {
          this.finished = true;
        }
      }
    }
  }

  // ═══════════════════════════════════════
  // 1. 午夜竞速 MidnightRace
  // ═══════════════════════════════════════
  DS.Encounters.midnight_race = class MidnightRace extends BaseEncounter {
    constructor(card) {
      super(card);
      this.cfg = C.encounters.midnightRace;
      this.npc = null;
      this.checkpoints = [];
      this.currentCP = 0;
      this.npcCurrentCP = 0;
      this.introTimer = 0;
      this.raceStarted = false;
    }

    start() {
      super.start();
      this.introTimer = this.cfg.introTime;

      const v = DS.Vehicle;
      this.npc = DS.NPCManager.claimChallengeVehicle(900, 'racer', '#ff2200');
      if (!this.npc) {
        const point = findPlayableRoadPointAhead(180, 460, 260);
        this.npc = DS.NPCManager.spawnSpecial(
          point.x, point.y, point.angle,
          Math.abs(v.speed) + 10,
          '#ff2200', 'racer'
        );
      }

      DS.Renderer.showMessage('有人在挑衅你...', '#ff4500', 3);
    }

    update(dt) {
      if (this.phase === 'result') {
        this._updateResult(dt);
        return;
      }

      const v = DS.Vehicle;

      if (this.phase === 'intro') {
        // NPC追上来闪灯
        this.introTimer -= dt;
        this._chasePlayer(dt);

        // 闪灯效果（通过颜色切换模拟）
        if (this.npc) {
          this.npc.color = Math.sin(performance.now() / 100) > 0 ? '#ff2200' : '#ff8800';
        }

        // 玩家加速即接受
        if (Math.abs(v.speed) >= this.cfg.acceptSpeedThreshold) {
          this.isAccepted = true;
          this._startRace();
        }

        // 超时未接受
        if (this.introTimer <= 0 && !this.isAccepted) {
          this._showResult(false, '未接受挑战');
          DS.NPCManager.removeSpecial('racer');
          return;
        }
        return;
      }

      if (this.phase === 'active') {
        this._updateRace(dt);
      }
    }

    _chasePlayer(dt) {
      if (!this.npc) return;
      const v = DS.Vehicle;
      const dx = v.x - this.npc.x;
      const dy = v.y - this.npc.y;
      const dist = Math.hypot(dx, dy);

      // 追向玩家身后
      const targetAngle = Math.atan2(dy, dx);
      this.npc.angle = targetAngle;

      // 保持距离 40-80
      if (dist > 80) {
        this.npc.speed = Math.abs(v.speed) + 20;
      } else if (dist < 40) {
        this.npc.speed = Math.abs(v.speed) - 10;
      } else {
        this.npc.speed = Math.abs(v.speed);
      }

      this.npc.x += Math.cos(this.npc.angle) * this.npc.speed * PPK * dt;
      this.npc.y += Math.sin(this.npc.angle) * this.npc.speed * PPK * dt;
    }

    _startRace() {
      this.phase = 'active';
      this.raceStarted = true;

      DS.Renderer.showMessage('竞速开始!', '#ffcc00', 2);
      DS.Events.emit('director_log', {
        time: DS.Director.gameTime,
        message: '午夜竞速: 玩家接受挑战',
        type: 'encounter',
      });

      // 在玩家前方道路上生成检查点
      const v = DS.Vehicle;
      const cpCount = this.cfg.checkpoints;
      this.checkpoints = [];

      for (let i = 0; i < cpCount; i++) {
        const minDist = 280 + i * 300;
        const point = findPlayableRoadPointAhead(minDist, minDist + 220, 420, MARKER_SAFE_RADIUS);
        this.checkpoints.push({ x: point.x, y: point.y, reached: false, reachedByNpc: false });
      }

      // 更新HUD
      DS.Renderer.setEncounterHUD({
        checkpoints: this.checkpoints,
        raceProgress: 0,
        raceTotal: cpCount,
      });
    }

    _updateRace(dt) {
      const v = DS.Vehicle;
      const npc = this.npc;
      if (!npc) return;

      // NPC AI: 朝下一个未达检查点开
      const npcTarget = this.checkpoints[this.npcCurrentCP];
      if (npcTarget && !npcTarget.reachedByNpc) {
        const dx = npcTarget.x - npc.x;
        const dy = npcTarget.y - npc.y;
        npc.angle = Math.atan2(dy, dx);
        npc.speed = C.vehicle.maxSpeed * this.cfg.npcSpeedRatio;
        npc.x += Math.cos(npc.angle) * npc.speed * PPK * dt;
        npc.y += Math.sin(npc.angle) * npc.speed * PPK * dt;

        // NPC到达检查点
        if (Math.hypot(dx, dy) < 30) {
          npcTarget.reachedByNpc = true;
          this.npcCurrentCP++;
        }
      }

      // 玩家检查点检测
      for (let i = this.currentCP; i < this.checkpoints.length; i++) {
        const cp = this.checkpoints[i];
        if (cp.reached) continue;
        const dist = Math.hypot(v.x - cp.x, v.y - cp.y);
        if (dist < 35) {
          cp.reached = true;
          this.currentCP = i + 1;
          DS.Renderer.setEncounterHUD({
            checkpoints: this.checkpoints,
            raceProgress: this.currentCP,
            raceTotal: this.cfg.checkpoints,
          });
          break;
        }
      }

      // 判定：谁先完成所有检查点
      const playerDone = this.currentCP >= this.checkpoints.length;
      const npcDone = this.npcCurrentCP >= this.checkpoints.length;

      if (playerDone) {
        this._showResult(true, '你赢了!');
      } else if (npcDone) {
        this._showResult(false, '对手先到了');
      }
    }

    cleanup() {
      DS.NPCManager.removeSpecial('racer');
      DS.Renderer.clearEncounterHUD();
    }

    getDebugData() {
      return {
        '检查点': this.currentCP + '/' + this.checkpoints.length,
        'NPC检查点': this.npcCurrentCP + '/' + this.checkpoints.length,
        '阶段': this.phase,
      };
    }
  };

  // ═══════════════════════════════════════
  // 2. 恐吓专车 IntimidationRide
  // ═══════════════════════════════════════
  DS.Encounters.intimidation_ride = class IntimidationRide extends BaseEncounter {
    constructor(card) {
      super(card);
      this.cfg = C.encounters.intimidationRide;
      this.fear = 0;
      this.fearPeak = 0;       // 历史峰值
      this.fearFloor = 0;      // 当前下限
      this.pickupMarker = null;
      this.hasPassenger = false;
      this.timer = 0;
      this.callTimer = 0;
      this._collisionHandler = null;
    }

    start() {
      super.start();
      this.callTimer = C.ui.callPromptTime;
      this.isAccepted = true;
      this._acceptCall();
    }

    update(dt) {
      if (this.phase === 'result') {
        this._updateResult(dt);
        return;
      }

      if (this.phase === 'intro') {
        this.callTimer -= dt;

        if (this.callTimer <= 0) {
          this._showResult(false, '未接听');
          return;
        }
        return;
      }

      if (this.phase === 'pickup') {
        // 等玩家到达接人点
        const v = DS.Vehicle;
        const dist = Math.hypot(v.x - this.pickupMarker.x, v.y - this.pickupMarker.y);
        if (dist < 40 && Math.abs(v.speed) < 15) {
          this._pickupPassenger();
        }
        return;
      }

      if (this.phase === 'active') {
        this._updateScaring(dt);
      }
    }

    _acceptCall() {
      this.phase = 'pickup';

      DS.Events.emit('director_log', {
        time: DS.Director.gameTime,
        message: '恐吓专车: 玩家接单',
        type: 'encounter',
      });

      const point = findPlayableRoadPointAhead(220, 520, 260);
      this.pickupMarker = { x: point.x, y: point.y };

      DS.Renderer.showMessage('前往接人点', '#00ccff', 3);
      DS.Renderer.setEncounterHUD({
        marker: { x: point.x, y: point.y, color: '#00ccff', label: '接' },
      });
    }

    _pickupPassenger() {
      this.phase = 'active';
      this.hasPassenger = true;
      this.timer = this.cfg.timeout;

      DS.Renderer.showMessage('乘客上车 — 用高速、急转、碰撞或逆行把恐惧值推到 100', '#ffaa22', 3);
      DS.Events.emit('director_log', {
        time: DS.Director.gameTime,
        message: '恐吓专车: 乘客上车，开始恐吓',
        type: 'encounter',
      });

      // 监听碰撞事件
      this._collisionHandler = (data) => {
        if (this.hasPassenger && this.phase === 'active') {
          this._addFear(this.cfg.fearOnCollision, '碰撞 +' + this.cfg.fearOnCollision);
        }
      };
      DS.Events.on('collision', this._collisionHandler);

      this._updateHUD();
    }

    _updateScaring(dt) {
      const v = DS.Vehicle;

      // 超时检测
      this.timer -= dt;
      if (this.timer <= 0) {
        this._showResult(false, '乘客镇定下来了');
        return;
      }

      if (this._tryFinishByFearMax()) return;

      // 各种危险驾驶检测
      // 逆行
      if (v.isWrongWay()) {
        this._addFear(this.cfg.fearOnWrongWay * dt, null);
      }

      // 高速
      if (Math.abs(v.speed) > this.cfg.highSpeedThreshold) {
        this._addFear(this.cfg.fearOnHighSpeed * dt, null);
      }

      // 急转弯
      if (v.isSharpTurn()) {
        this._addFear(this.cfg.fearOnSharpTurn * dt, null);
      }

      if (this._tryFinishByFearMax()) return;

      // 自然衰减（不低于峰值的50%）
      this.fearFloor = this.fearPeak * this.cfg.fearFloor;
      if (this.fear > this.fearFloor) {
        this.fear -= this.cfg.fearDecay * dt;
        if (this.fear < this.fearFloor) this.fear = this.fearFloor;
      }

      this._updateHUD();
    }

    _tryFinishByFearMax() {
      if (this.fear < this.cfg.fearMax) return false;
      this.fear = this.cfg.fearMax;
      this._passengerBailOut();
      return true;
    }

    _addFear(amount, logMsg) {
      this.fear += amount;
      if (this.fear > this.fearPeak) {
        this.fearPeak = this.fear;
      }
      if (this.fear > this.cfg.fearMax) this.fear = this.cfg.fearMax;
    }

    _passengerBailOut() {
      // 强制减速
      DS.Vehicle.speed *= 0.2;

      DS.Renderer.showMessage('乘客吓坏了，夺门而出!', '#44cc66', 2);
      DS.Events.emit('director_log', {
        time: DS.Director.gameTime,
        message: '恐吓专车: NPC恐惧值已满，下车',
        type: 'encounter',
      });

      this.hasPassenger = false;
      this._showResult(true, '恐惧值已满');
    }

    _updateHUD() {
      DS.Renderer.setEncounterHUD({
        fearBar: this.fear,
        fearMax: this.cfg.fearMax,
        fearFloor: this.fearFloor,
      });
    }

    cleanup() {
      if (this._collisionHandler) {
        DS.Events.off('collision', this._collisionHandler);
      }
      DS.Renderer.clearEncounterHUD();
    }

    getDebugData() {
      return {
        '恐惧值': Math.round(this.fear) + '/' + this.cfg.fearMax,
        '峰值': Math.round(this.fearPeak),
        '下限': Math.round(this.fearFloor),
        '剩余时间': Math.round(this.timer) + 's',
      };
    }
  };

  // ═══════════════════════════════════════
  // 3. 拦截运钞车 ArmoredHeist
  // ═══════════════════════════════════════
  DS.Encounters.armored_heist = class ArmoredHeist extends BaseEncounter {
    constructor(card) {
      super(card);
      this.cfg = C.encounters.armoredHeist;
      this.truck = null;
      this.truckHP = this.cfg.truckHP;
      this.callTimer = 0;
      this._collisionHandler = null;
    }

    start() {
      super.start();
      this.callTimer = C.ui.callPromptTime;
      this.isAccepted = true;
      this._acceptMission();
    }

    update(dt) {
      if (this.phase === 'result') {
        this._updateResult(dt);
        return;
      }

      if (this.phase === 'intro') {
        this.callTimer -= dt;
        if (this.callTimer <= 0) {
          this._showResult(false, '未接听');
          return;
        }
        return;
      }

      if (this.phase === 'active') {
        this._updateChase(dt);
      }
    }

    _acceptMission() {
      this.phase = 'active';

      DS.Events.emit('director_log', {
        time: DS.Director.gameTime,
        message: '拦截运钞车: 玩家接受任务',
        type: 'encounter',
      });

      const v = DS.Vehicle;
      const point = findPlayableRoadPointAhead(300, 620, 300);

      this.truck = DS.NPCManager.spawnSpecial(
        point.x, point.y, point.angle,
        this.cfg.truckSpeed, '#887744', 'armored_truck'
      );

      DS.Renderer.showMessage('追上运钞车并撞停它!', '#aa66ff', 3);

      // 监听碰撞
      this._collisionHandler = (data) => {
        if (data.npc && data.npc.tag === 'armored_truck') {
          const damage = Math.max(5, data.speed * this.cfg.damageMultiplier);
          this.truckHP -= damage;
          if (this.truckHP < 0) this.truckHP = 0;

          DS.Events.emit('director_log', {
            time: DS.Director.gameTime,
            message: '运钞车受损: -' + Math.round(damage) + ' HP (剩余 ' + Math.round(this.truckHP) + ')',
            type: 'encounter',
          });
        }
      };
      DS.Events.on('collision', this._collisionHandler);

      this._updateHUD();
    }

    _updateChase(dt) {
      const v = DS.Vehicle;
      const truck = this.truck;
      if (!truck) return;

      // 运钞车AI：向前逃跑，偶尔拐弯
      truck.x += Math.cos(truck.angle) * truck.speed * PPK * dt;
      truck.y += Math.sin(truck.angle) * truck.speed * PPK * dt;

      // 避免撞墙：检测前方是否有建筑
      const aheadX = truck.x + Math.cos(truck.angle) * 50;
      const aheadY = truck.y + Math.sin(truck.angle) * 50;
      if (DS.TileMap.isInBuilding(aheadX, aheadY)) {
        truck.angle += Math.PI / 3 + (Math.random() - 0.5) * 0.5;
      }

      // 被玩家接近时尝试躲避
      const dist = Math.hypot(v.x - truck.x, v.y - truck.y);
      if (dist < 100) {
        // 加速
        truck.speed = Math.min(this.cfg.truckSpeed * 1.5, C.vehicle.maxSpeed * 0.7);
      } else {
        truck.speed = this.cfg.truckSpeed;
      }

      // HP 归零
      if (this.truckHP <= 0) {
        truck.speed = 0;
        this._showResult(true, '运钞车被撞停!');
        return;
      }

      // 距离太远 → 失败
      if (dist > this.cfg.escapeDistance) {
        this._showResult(false, '运钞车逃脱了');
        return;
      }

      this._updateHUD();
    }

    _updateHUD() {
      DS.Renderer.setEncounterHUD({
        targetHP: this.truckHP,
        targetHPMax: this.cfg.truckHP,
        targetNPC: this.truck,
        truckDistance: this.truck ?
          Math.hypot(DS.Vehicle.x - this.truck.x, DS.Vehicle.y - this.truck.y) : 0,
      });
    }

    cleanup() {
      if (this._collisionHandler) {
        DS.Events.off('collision', this._collisionHandler);
      }
      DS.NPCManager.removeSpecial('armored_truck');
      DS.Renderer.clearEncounterHUD();
    }

    getDebugData() {
      return {
        '运钞车HP': Math.round(this.truckHP) + '/' + this.cfg.truckHP,
        '距离': this.truck ?
          Math.round(Math.hypot(DS.Vehicle.x - this.truck.x, DS.Vehicle.y - this.truck.y)) + 'm' : '—',
      };
    }
  };

  // ═══════════════════════════════════════
  // 4. 副驾指挥 CopilotCommand
  // ═══════════════════════════════════════
  DS.Encounters.copilot_command = class CopilotCommand extends BaseEncounter {
    constructor(card) {
      super(card);
      this.cfg = C.encounters.copilotCommand;
      this.npcMarker = null;
      this.hasPassenger = false;
      this.currentRound = 0;
      this.correctCount = 0;
      this.currentCommand = null;
      this.commandTimer = 0;
      this.waitingForCommand = false;
      this.commandResult = null; // 'correct' | 'wrong' | null
      this.commandResultTimer = 0;
      this.destinationMarker = null;
      this.commandsFinished = false;
    }

    start() {
      super.start();

      const point = findPlayableRoadPointAhead(120, 340, 220);
      this.npcMarker = { x: point.x, y: point.y };

      DS.Renderer.showMessage('有人在路边招手', '#4488ff', 3);
      DS.Renderer.setEncounterHUD({
        marker: { x: point.x, y: point.y, color: '#4488ff', label: '人' },
      });
    }

    update(dt) {
      if (this.phase === 'result') {
        this._updateResult(dt);
        return;
      }

      if (this.phase === 'intro') {
        // 等玩家靠近并减速
        const v = DS.Vehicle;
        const dist = Math.hypot(v.x - this.npcMarker.x, v.y - this.npcMarker.y);
        if (dist < 50 && Math.abs(v.speed) < this.cfg.pickupSpeedThreshold) {
          this.isAccepted = true;
          this._pickupNPC();
        }

        // 如果玩家开走太远，取消
        if (dist > 600) {
          this._showResult(false, 'NPC太远了');
        }
        return;
      }

      if (this.phase === 'active') {
        this._updateCommands(dt);
      }

      if (this.phase === 'destination') {
        this._updateDestination(dt);
      }
    }

    _pickupNPC() {
      this.phase = 'active';
      this.hasPassenger = true;

      DS.Events.emit('director_log', {
        time: DS.Director.gameTime,
        message: '副驾指挥: NPC上车',
        type: 'encounter',
      });

      DS.Renderer.showMessage('NPC上车: "我来指路，按我说的开!"', '#4488ff', 2.5);

      // 开始第一轮指令
      setTimeout(() => this._issueCommand(), 1500);
    }

    _issueCommand() {
      if (this.currentRound >= this.cfg.rounds) {
        this._finishCommands();
        return;
      }

      const commands = [
        { text: '← 左转!', key: 'ArrowLeft', altKey: 'KeyA' },
        { text: '→ 右转!', key: 'ArrowRight', altKey: 'KeyD' },
        { text: '↑ 直行!', key: 'ArrowUp', altKey: 'KeyW' },
      ];

      this.currentCommand = commands[Math.floor(Math.random() * commands.length)];
      this.commandTimer = this.cfg.responseWindow;
      this.waitingForCommand = true;
      this.commandResult = null;
      this.currentRound++;

      DS.Renderer.setEncounterHUD({
        directionCommand: {
          text: this.currentCommand.text,
          round: this.currentRound,
          total: this.cfg.rounds,
          timeLeft: this.commandTimer,
          timeMax: this.cfg.responseWindow,
        },
      });
    }

    _updateCommands(dt) {
      if (this.commandResultTimer > 0) {
        this.commandResultTimer -= dt;
        if (this.commandResultTimer <= 0) {
          this._issueCommand();
        }
        return;
      }

      if (!this.waitingForCommand) return;

      this.commandTimer -= dt;

      // 检测玩家输入
      const input = DS.Input;
      const cmd = this.currentCommand;

      if (input.wasPressed(cmd.key) || input.wasPressed(cmd.altKey)) {
        // 正确
        this.correctCount++;
        this.commandResult = 'correct';
        this.waitingForCommand = false;
        DS.Renderer.showMessage('正确!', '#44cc66', 0.8);
        this.commandResultTimer = 1.0;
        DS.Renderer.setEncounterHUD({
          directionCommand: null,
        });
      } else {
        // 检查是否按了错误的方向键
        const wrongKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyA', 'KeyD', 'KeyW'];
        for (const wk of wrongKeys) {
          if (wk !== cmd.key && wk !== cmd.altKey && input.wasPressed(wk)) {
            this.commandResult = 'wrong';
            this.waitingForCommand = false;
            DS.Renderer.showMessage('方向错误!', '#ff4400', 0.8);
            this.commandResultTimer = 1.0;
            DS.Renderer.setEncounterHUD({
              directionCommand: null,
            });
            break;
          }
        }
      }

      // 超时
      if (this.waitingForCommand && this.commandTimer <= 0) {
        this.commandResult = 'wrong';
        this.waitingForCommand = false;
        DS.Renderer.showMessage('超时!', '#ff4400', 0.8);
        this.commandResultTimer = 1.0;
        DS.Renderer.setEncounterHUD({
          directionCommand: null,
        });
      }

      // 更新HUD倒计时
      if (this.waitingForCommand) {
        DS.Renderer.setEncounterHUD({
          directionCommand: {
            text: this.currentCommand.text,
            round: this.currentRound,
            total: this.cfg.rounds,
            timeLeft: this.commandTimer,
            timeMax: this.cfg.responseWindow,
          },
        });
      }
    }

    _finishCommands() {
      this.commandsFinished = true;
      this.phase = 'destination';

      // 生成目的地
      const point = findPlayableRoadPointAhead(260, 620, 360, MARKER_SAFE_RADIUS);
      this.destinationMarker = { x: point.x, y: point.y };

      DS.Renderer.showMessage('开到目的地停车 (' + this.correctCount + '/' + this.cfg.rounds + ' 正确)', '#4488ff', 3);
      DS.Renderer.setEncounterHUD({
        marker: { x: point.x, y: point.y, color: '#44cc66', label: '停' },
      });
    }

    _updateDestination(dt) {
      const v = DS.Vehicle;
      const dist = Math.hypot(v.x - this.destinationMarker.x, v.y - this.destinationMarker.y);
      if (dist < 40 && Math.abs(v.speed) < 10) {
        this._showResult(true, this.correctCount + '/' + this.cfg.rounds + ' 指令完成');
      }
    }

    cleanup() {
      DS.Renderer.clearEncounterHUD();
    }

    getDebugData() {
      return {
        '轮次': this.currentRound + '/' + this.cfg.rounds,
        '正确': this.correctCount,
        '当前指令': this.currentCommand ? this.currentCommand.text : '—',
        '阶段': this.phase,
      };
    }
  };

})();
