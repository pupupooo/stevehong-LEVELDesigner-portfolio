// ═══════════════════════════════════════════
// renderer.js — Canvas 渲染 + HUD
// ═══════════════════════════════════════════
(function() {
  const C = DS.Config;
  const RC = C.render;
  const MAP = C.map;
  const T = MAP.tileSize;

  DS.Renderer = {
    canvas: null,
    ctx: null,
    camX: 0,
    camY: 0,

    // HUD 消息队列
    hudMessages: [],    // [{text, color, timer, maxTimer}]
    encounterHUD: null, // 当前玩法的HUD数据

    init() {
      this.canvas = document.getElementById('game-canvas');
      this.ctx = this.canvas.getContext('2d');
      this._resize();
      window.addEventListener('resize', () => this._resize());
    },

    _resize() {
      const area = document.getElementById('game-area');
      this.canvas.width = area.clientWidth;
      this.canvas.height = area.clientHeight;
    },

    update(dt) {
      // 摄像机平滑跟随
      const targetX = DS.Vehicle.x;
      const targetY = DS.Vehicle.y;
      this.camX += (targetX - this.camX) * RC.cameraSmooth;
      this.camY += (targetY - this.camY) * RC.cameraSmooth;

      // 更新HUD消息
      for (let i = this.hudMessages.length - 1; i >= 0; i--) {
        this.hudMessages[i].timer -= dt;
        if (this.hudMessages[i].timer <= 0) {
          this.hudMessages.splice(i, 1);
        }
      }
    },

    render() {
      const ctx = this.ctx;
      const W = this.canvas.width;
      const H = this.canvas.height;

      // 清屏
      ctx.fillStyle = '#0a0a10';
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      // 摄像机变换
      ctx.translate(W / 2 - this.camX, H / 2 - this.camY);

      // 渲染地图
      this._renderMap(ctx);

      // 渲染障碍物
      this._renderObstacles(ctx);

      // 渲染NPC车辆
      this._renderNPCs(ctx);

      // 渲染玩法标记
      this._renderEncounterMarkers(ctx);

      // 渲染玩家车辆
      this._renderPlayer(ctx);

      ctx.restore();

      // HUD 层
      this._renderHUD(ctx, W, H);
    },

    _renderMap(ctx) {
      const tiles = DS.TileMap.ensureTilesAround(this.camX, this.camY);

      for (const tile of tiles) {
        const ox = tile.worldX;
        const oy = tile.worldY;
        const tileW = tile.width || T;
        const tileH = tile.height || T;

        // 地块背景（人行道/草地）
        ctx.fillStyle = RC.colors.sidewalk;
        ctx.fillRect(ox, oy, tileW, tileH);

        // 道路
        ctx.fillStyle = RC.colors.road;
        for (const road of tile.roads) {
          if (road.kind === 'segment') {
            ctx.save();
            ctx.strokeStyle = RC.colors.road;
            ctx.lineWidth = road.w;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(ox + road.x1, oy + road.y1);
            ctx.lineTo(ox + road.x2, oy + road.y2);
            ctx.stroke();
            ctx.restore();
          } else {
            ctx.fillRect(ox + road.x, oy + road.y, road.w, road.h);
          }
        }

        // 道路中线
        ctx.strokeStyle = RC.colors.roadLine;
        ctx.lineWidth = 1;
        ctx.setLineDash([12, 8]);
        for (const road of tile.roads) {
          ctx.beginPath();
          if (road.kind === 'segment') {
            ctx.moveTo(ox + road.x1, oy + road.y1);
            ctx.lineTo(ox + road.x2, oy + road.y2);
          } else if (road.w > road.h) {
            // 横向路
            const cy = oy + road.y + road.h / 2;
            ctx.moveTo(ox + road.x, cy);
            ctx.lineTo(ox + road.x + road.w, cy);
          } else {
            // 纵向路
            const cx = ox + road.x + road.w / 2;
            ctx.moveTo(cx, oy + road.y);
            ctx.lineTo(cx, oy + road.y + road.h);
          }
          ctx.stroke();
        }
        ctx.setLineDash([]);

        // 建筑
        for (const b of tile.buildings) {
          ctx.fillStyle = RC.colors.building;
          ctx.fillRect(ox + b.x, oy + b.y, b.w, b.h);

          // 建筑窗户灯光点缀
          ctx.fillStyle = RC.colors.buildingLight;
          const winSize = 4;
          const winGap = 16;
          for (let wx = b.x + 8; wx < b.x + b.w - 8; wx += winGap) {
            for (let wy = b.y + 8; wy < b.y + b.h - 8; wy += winGap) {
              if (Math.sin(wx * 13.7 + wy * 7.3) > 0.3) {
                ctx.fillRect(ox + wx, oy + wy, winSize, winSize);
              }
            }
          }

          if (b.label && b.w >= 150 && b.h >= 90) {
            ctx.save();
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const labelX = ox + b.x + b.w / 2;
            const labelY = oy + b.y + b.h / 2;
            const labelW = ctx.measureText(b.label).width + 14;
            ctx.fillStyle = 'rgba(0,0,0,0.56)';
            ctx.fillRect(labelX - labelW / 2, labelY - 10, labelW, 20);
            ctx.fillStyle = 'rgba(244,244,240,0.72)';
            ctx.fillText(b.label, labelX, labelY);
            ctx.restore();
          }
        }

        // POI 语义锚点
        for (const poi of tile.pois || []) {
          const px = poi.worldX;
          const py = poi.worldY;
          ctx.save();
          ctx.fillStyle = RC.colors.poiRing;
          ctx.beginPath();
          ctx.arc(px, py, 34, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = poi.color || RC.colors.poi;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(px, py, 18, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = poi.color || RC.colors.poi;
          ctx.beginPath();
          ctx.arc(px, py, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = 'rgba(0,0,0,0.72)';
          const labelW = ctx.measureText(poi.name).width + 16;
          ctx.fillRect(px - labelW / 2, py + 22, labelW, 20);
          ctx.fillStyle = poi.color || RC.colors.poi;
          ctx.fillText(poi.name, px, py + 26);
          ctx.restore();
        }

        // 地块边界（调试用，很淡）
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        ctx.strokeRect(ox, oy, tileW, tileH);
      }
    },

    _renderObstacles(ctx) {
      const px = DS.Vehicle.x;
      const py = DS.Vehicle.y;
      const obs = DS.TileMap.getObstaclesNear(px, py, 600);

      for (const o of obs) {
        ctx.fillStyle = o.type === 'cone' ? '#ff8822' : RC.colors.obstacle;
        ctx.fillRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
      }
    },

    _renderNPCs(ctx) {
      for (const npc of DS.NPCManager.npcs) {
        const candidate = DS.NPCManager.getHijackCandidate(DS.Config.worldResponse.hijackRadius);
        const isCandidate = candidate && candidate.npc === npc;
        const profile = DS.Config.vehicleArchetypes[npc.archetypeId] || DS.Config.vehicleArchetypes.standard;
        ctx.save();
        ctx.translate(npc.x, npc.y);
        ctx.rotate(npc.angle);

        // 长轴沿 X（行驶方向）
        const L = 14; // 半长
        const W = 8;  // 半宽

        // 车身
        ctx.fillStyle = npc.color || RC.colors.npcCar;
        ctx.fillRect(-L, -W, L * 2, W * 2);

        // 车头指示
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(L - 3, -W + 2, 3, W * 2 - 4);

        // 特殊标签车辆发光
        if (npc.special) {
          ctx.shadowColor = npc.color;
          ctx.shadowBlur = 12;
          ctx.fillStyle = npc.color;
          ctx.fillRect(-L, -W, L * 2, W * 2);
          ctx.shadowBlur = 0;
        }

        if (isCandidate && Math.abs(DS.Vehicle.speed) <= DS.Config.worldResponse.hijackMaxPlayerSpeed) {
          ctx.strokeStyle = '#ff4500';
          ctx.lineWidth = 2;
          ctx.strokeRect(-L - 4, -W - 4, L * 2 + 8, W * 2 + 8);
        }

        ctx.restore();

        if (isCandidate && Math.abs(DS.Vehicle.speed) <= DS.Config.worldResponse.hijackMaxPlayerSpeed) {
          ctx.save();
          ctx.fillStyle = 'rgba(0,0,0,0.72)';
          ctx.strokeStyle = '#ff4500';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const label = 'F 抢夺 ' + profile.name;
          const labelW = ctx.measureText(label).width + 18;
          ctx.fillRect(npc.x - labelW / 2, npc.y - 42, labelW, 22);
          ctx.strokeRect(npc.x - labelW / 2, npc.y - 42, labelW, 22);
          ctx.fillStyle = '#ffb199';
          ctx.fillText(label, npc.x, npc.y - 31);
          ctx.restore();
        }
      }
    },

    _renderPlayer(ctx) {
      const v = DS.Vehicle;
      ctx.save();
      ctx.translate(v.x, v.y);
      ctx.rotate(v.angle);

      // 车身长轴沿 X（行驶方向），短轴沿 Y
      // 车身: 36 长 × 20 宽，中心对齐
      const L = 18; // 半长
      const W = 10; // 半宽

      // 尾灯
      if (v.speed < -1 || DS.Input.isDown('KeyS') || DS.Input.isDown('ArrowDown')) {
        ctx.fillStyle = '#ff2200';
        ctx.shadowColor = '#ff2200';
        ctx.shadowBlur = 12;
        ctx.fillRect(-L, -W + 1, 4, 6);
        ctx.fillRect(-L, W - 7, 4, 6);
        ctx.shadowBlur = 0;
      }

      // 车身
      const profile = v.getArchetype();
      ctx.fillStyle = profile.color || RC.colors.player;
      ctx.fillRect(-L, -W, L * 2, W * 2);

      // 车头灯
      ctx.fillStyle = '#ffdd88';
      ctx.shadowColor = '#ffdd44';
      ctx.shadowBlur = v.speed > 20 ? 15 : 5;
      ctx.fillRect(L - 4, -W + 2, 4, W * 2 - 4);
      ctx.shadowBlur = 0;

      // 挡风玻璃（区分车头方向）
      ctx.fillStyle = 'rgba(100,180,255,0.3)';
      ctx.fillRect(L - 10, -W + 3, 8, W * 2 - 6);

      // 速度指示条（车顶上方）
      if (Math.abs(v.speed) > 0) {
        const speedRatio = Math.abs(v.speed) / (profile.maxSpeed || C.vehicle.maxSpeed);
        const barColor = speedRatio > 0.7 ? '#ff4400' : speedRatio > 0.4 ? '#ffaa22' : '#44cc66';
        ctx.fillStyle = barColor;
        ctx.fillRect(-L, -W - 4, L * 2 * speedRatio, 2);
      }

      ctx.restore();
    },

    _renderEncounterMarkers(ctx) {
      if (!this.encounterHUD) return;
      const hud = this.encounterHUD;

      // 检查点标记
      if (hud.checkpoints) {
        for (let i = 0; i < hud.checkpoints.length; i++) {
          const cp = hud.checkpoints[i];
          if (cp.reached) continue;
          ctx.save();
          ctx.translate(cp.x, cp.y);
          // 闪烁效果
          const pulse = 0.7 + 0.3 * Math.sin(performance.now() / 200);
          ctx.globalAlpha = pulse;
          ctx.fillStyle = RC.colors.checkpoint;
          ctx.beginPath();
          ctx.arc(0, 0, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(i + 1, 0, 0);
          ctx.restore();
        }
      }

      // 接人/目的地标记
      if (hud.marker) {
        ctx.save();
        ctx.translate(hud.marker.x, hud.marker.y);
        const pulse = 0.7 + 0.3 * Math.sin(performance.now() / 250);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = hud.marker.color || RC.colors.pickup;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hud.marker.label || '?', 0, 0);
        ctx.restore();
      }

      // 运钞车HP条
      if (hud.targetHP != null) {
        const target = hud.targetNPC;
        if (target) {
          ctx.save();
          ctx.translate(target.x, target.y - 25);
          const barW = 40;
          const ratio = hud.targetHP / hud.targetHPMax;
          ctx.fillStyle = '#333';
          ctx.fillRect(-barW / 2, 0, barW, 5);
          ctx.fillStyle = ratio > 0.5 ? '#44cc66' : ratio > 0.25 ? '#ffaa22' : '#ff2200';
          ctx.fillRect(-barW / 2, 0, barW * ratio, 5);
          ctx.restore();
        }
      }
    },

    _renderHUD(ctx, W, H) {
      // ── 速度表（左下角）──
      const v = DS.Vehicle;
      const speed = Math.abs(Math.round(v.speed));
      const vehicleProfile = v.getArchetype();
      const worldState = DS.WorldResponse ? DS.WorldResponse.getState() : null;
      const compactHud = W < 640;

      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(16, H - 106, 176, 90);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.strokeRect(16, H - 106, 176, 90);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 32px "Cascadia Code", Consolas, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(speed, 122, H - 66);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#888';
      ctx.fillText('km/h', 150, H - 66);

      ctx.textAlign = 'left';
      ctx.font = '11px sans-serif';
      ctx.fillStyle = vehicleProfile.color || '#e8e8e0';
      ctx.fillText(vehicleProfile.name, 24, H - 38);
      ctx.fillStyle = '#888';
      ctx.fillText('世界热度 ' + (worldState ? worldState.heat : 0) + '/100', 24, H - 22);

      // 速度状态：只作为调度上下文，不冻结计数器
      const fastState = speed > C.speedGate.threshold;
      if (fastState) {
        ctx.fillStyle = '#ffaa22';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('高速状态', 24, H - 82);
      }
      ctx.restore();

      // ── 操作提示（右下角）：窄屏隐藏长提示，避免压住速度表 ──
      if (!compactHud) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('WASD / 方向键 驾驶  |  E 接受  |  F 抢车  |  Esc 取消', W - 20, H - 16);
        ctx.restore();
      }

      const hijackCandidate = DS.NPCManager.getHijackCandidate(C.worldResponse.hijackRadius);
      if (hijackCandidate && speed <= C.worldResponse.hijackMaxPlayerSpeed) {
        const profile = C.vehicleArchetypes[hijackCandidate.npc.archetypeId] || C.vehicleArchetypes.standard;
        ctx.save();
        const promptW = compactHud ? W - 32 : 380;
        const promptH = compactHud ? 40 : 42;
        const promptY = compactHud ? H - 158 : H - 92;
        const promptText = compactHud ?
          ('按 F 抢夺 ' + profile.name) :
          ('按 F 抢夺 ' + profile.name + '：触发身份/权限/行为世界响应');
        ctx.fillStyle = 'rgba(0,0,0,0.76)';
        ctx.strokeStyle = '#ff4500';
        ctx.fillRect(W / 2 - promptW / 2, promptY, promptW, promptH);
        ctx.strokeRect(W / 2 - promptW / 2, promptY, promptW, promptH);
        ctx.fillStyle = '#ffb199';
        ctx.font = 'bold ' + (compactHud ? 13 : 14) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(promptText, W / 2, promptY + promptH / 2);
        ctx.restore();
      }

      const directorState = DS.Director ? DS.Director.getState() : null;
      if (directorState && directorState.pendingBeat) {
        const beat = directorState.pendingBeat;
        ctx.save();
        const boxW = Math.min(W - 48, 560);
        const boxH = 74;
        const bx = W / 2 - boxW / 2;
        const by = 92;
        ctx.fillStyle = 'rgba(8,8,12,0.82)';
        ctx.fillRect(bx, by, boxW, boxH);
        ctx.strokeStyle = beat.card.def.color || '#ff4500';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, boxW, boxH);

        ctx.fillStyle = beat.card.def.color || '#ff4500';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(beat.signalLabel + ' · ' + beat.poiName, bx + 18, by + 22);

        ctx.fillStyle = '#f4f4f0';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(beat.naturalPrompt, bx + 18, by + 46);

        ctx.fillStyle = '#9ca3af';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('E 接入 / Esc 忽略 · ' + directorState.pendingTimer + 's', bx + boxW - 18, by + 49);
        ctx.restore();
      }

      // ── 来电/事件提示（顶部中央）──
      if (this.hudMessages.length > 0 && !(directorState && directorState.pendingBeat)) {
        const msg = this.hudMessages[this.hudMessages.length - 1];
        const alpha = Math.min(1, msg.timer / 0.5); // 淡出
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        const tw = ctx.measureText(msg.text).width;
        const boxW = Math.max(tw + 40, 300);
        ctx.fillRect(W / 2 - boxW / 2, 30, boxW, 50);
        ctx.strokeStyle = msg.color || '#ff4500';
        ctx.lineWidth = 2;
        ctx.strokeRect(W / 2 - boxW / 2, 30, boxW, 50);
        ctx.fillStyle = msg.color || '#fff';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(msg.text, W / 2, 55);
        ctx.restore();
      }

      // ── 玩法专属HUD ──
      if (this.encounterHUD) {
        this._renderEncounterHUD(ctx, W, H);
        this._renderOffscreenIndicators(ctx, W, H);
      }
    },

    _getScreenPoint(point, W, H) {
      return {
        x: point.x - this.camX + W / 2,
        y: point.y - this.camY + H / 2,
      };
    },

    _getOffscreenIndicator(target, W, H, margin) {
      const edge = margin || 52;
      const screen = this._getScreenPoint(target, W, H);
      if (
        screen.x >= edge &&
        screen.x <= W - edge &&
        screen.y >= edge &&
        screen.y <= H - edge
      ) {
        return null;
      }

      const cx = W / 2;
      const cy = H / 2;
      const dx = screen.x - cx;
      const dy = screen.y - cy;
      if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return null;

      const halfW = W / 2 - edge;
      const halfH = H / 2 - edge;
      const scaleX = Math.abs(dx) < 0.001 ? Infinity : Math.abs(halfW / dx);
      const scaleY = Math.abs(dy) < 0.001 ? Infinity : Math.abs(halfH / dy);
      const scale = Math.min(scaleX, scaleY);
      const x = Math.max(edge, Math.min(W - edge, cx + dx * scale));
      const y = Math.max(edge, Math.min(H - edge, cy + dy * scale));
      const distance = DS.Vehicle ? Math.round(Math.hypot(target.x - DS.Vehicle.x, target.y - DS.Vehicle.y)) : 0;

      return {
        x,
        y,
        angle: Math.atan2(dy, dx),
        color: target.color || RC.colors.pickup,
        label: target.label || '?',
        distance,
      };
    },

    _collectOffscreenTargets(hud) {
      const targets = [];
      if (hud.marker) {
        targets.push(hud.marker);
      }

      if (hud.checkpoints) {
        const index = hud.checkpoints.findIndex(cp => !cp.reached);
        if (index >= 0) {
          const checkpoint = hud.checkpoints[index];
          targets.push({
            x: checkpoint.x,
            y: checkpoint.y,
            color: RC.colors.checkpoint,
            label: String(index + 1),
          });
        }
      }

      if (hud.targetNPC) {
        targets.push({
          x: hud.targetNPC.x,
          y: hud.targetNPC.y,
          color: '#aa66ff',
          label: '车',
        });
      }
      return targets;
    },

    _renderOffscreenIndicators(ctx, W, H) {
      const targets = this._collectOffscreenTargets(this.encounterHUD || {});
      for (const target of targets) {
        const indicator = this._getOffscreenIndicator(target, W, H, 52);
        if (!indicator) continue;

        ctx.save();
        ctx.translate(indicator.x, indicator.y);
        ctx.rotate(indicator.angle);
        ctx.fillStyle = indicator.color;
        ctx.shadowColor = indicator.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(-9, -11);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-9, 11);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.78)';
        ctx.strokeStyle = indicator.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(indicator.x, indicator.y, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = indicator.color;
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(indicator.label, indicator.x, indicator.y);

        if (indicator.distance > 0) {
          ctx.fillStyle = 'rgba(244,244,240,0.8)';
          ctx.font = '10px sans-serif';
          ctx.fillText(indicator.distance + 'm', indicator.x, indicator.y + 28);
        }
        ctx.restore();
      }
    },

    _renderEncounterHUD(ctx, W, H) {
      const hud = this.encounterHUD;

      // 恐惧值进度条
      if (hud.fearBar != null) {
        ctx.save();
        const barW = 240;
        const barH = 16;
        const bx = W / 2 - barW / 2;
        const by = 100;

        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(bx - 10, by - 24, barW + 20, barH + 34);

        ctx.fillStyle = '#888';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('NPC 恐惧值', W / 2, by - 8);

        ctx.fillStyle = '#222';
        ctx.fillRect(bx, by, barW, barH);

        const ratio = hud.fearBar / hud.fearMax;
        const fc = ratio > 0.8 ? '#ff2200' : ratio > 0.5 ? '#ff8822' : '#ffcc44';
        ctx.fillStyle = fc;
        ctx.fillRect(bx, by, barW * ratio, barH);

        // 下限标记
        if (hud.fearFloor > 0) {
          const floorX = bx + barW * (hud.fearFloor / hud.fearMax);
          ctx.strokeStyle = 'rgba(255,255,255,0.4)';
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(floorX, by);
          ctx.lineTo(floorX, by + barH);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(hud.fearBar) + ' / ' + hud.fearMax, W / 2, by + barH - 3);
        ctx.restore();
      }

      // 方向指令
      if (hud.directionCommand) {
        ctx.save();
        const pulse = 0.8 + 0.2 * Math.sin(performance.now() / 150);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(W / 2 - 120, H / 2 - 60, 240, 100);

        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hud.directionCommand.text, W / 2, H / 2 - 20);

        ctx.fillStyle = '#aaa';
        ctx.font = '14px sans-serif';
        ctx.fillText('第 ' + hud.directionCommand.round + ' / ' + hud.directionCommand.total + ' 轮', W / 2, H / 2 + 26);

        // 倒计时条
        const timeRatio = hud.directionCommand.timeLeft / hud.directionCommand.timeMax;
        ctx.fillStyle = '#333';
        ctx.fillRect(W / 2 - 80, H / 2 + 38, 160, 4);
        ctx.fillStyle = timeRatio > 0.3 ? '#44cc66' : '#ff4400';
        ctx.fillRect(W / 2 - 80, H / 2 + 38, 160 * timeRatio, 4);

        ctx.restore();
      }

      // 竞速检查点进度
      if (hud.raceProgress != null) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(W / 2 - 80, 90, 160, 30);
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('检查点 ' + hud.raceProgress + ' / ' + hud.raceTotal, W / 2, 105);
        ctx.restore();
      }

      // 运钞车距离提示
      if (hud.truckDistance != null) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(W / 2 - 80, 90, 160, 30);
        const dist = Math.round(hud.truckDistance);
        ctx.fillStyle = dist > 300 ? '#ff4400' : '#44cc66';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('距离: ' + dist + 'm', W / 2, 105);
        ctx.restore();
      }
    },

    // 显示HUD消息
    showMessage(text, color, duration) {
      this.hudMessages.push({
        text: text,
        color: color || '#fff',
        timer: duration || 3,
        maxTimer: duration || 3,
      });
    },

    clearMessages() {
      this.hudMessages = [];
    },

    // 设置玩法HUD数据
    setEncounterHUD(data) {
      this.encounterHUD = data;
    },

    clearEncounterHUD() {
      this.encounterHUD = null;
    },
  };
})();
