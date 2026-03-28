const BEAT_TEMPLATES = {
  confrontation: {
    id: 'confrontation', name: '对峙', emoji: '⚔️',
    slots: { aggressor: { tagFilter: ['hostile'], minCount: 1 }, victim: { tagFilter: ['civilian'], minCount: 1 } },
    cooldown: CFG.beatCooldown,
    modifiers: ['hijack', 'power_gap', 'weather_slip']
  },
  discovery: {
    id: 'discovery', name: '发现', emoji: '🔍',
    slots: {}, cooldown: 30, triggerArea: AREAS.cave,
    modifiers: ['awkward_silence']
  },
  request: {
    id: 'request', name: '请求', emoji: '🙏',
    slots: { requester: { tagFilter: ['civilian', 'traveler'], minCount: 1 } },
    cooldown: CFG.beatCooldown * 1.2,
    modifiers: ['reversal', 'betrayal'], playerInteraction: true
  },
  escort: {
    id: 'escort', name: '护送', emoji: '🛡️',
    slots: { escortee: { tagFilter: ['merchant'], minCount: 1 } },
    cooldown: CFG.beatCooldown * 1.5,
    modifiers: ['escort_betrayal', 'weather_slip'], playerInteraction: true
  }
};

const MODIFIERS = {
  hijack: {
    id: 'hijack', name: '截胡', emoji: '🐗', priority: 10,
    condition(b) { return world.entities.some(e => e.tags.includes('animal') && !e.dead && !e.isDirected && _dist(e, b.actors.victim) < 250); },
    apply(b) {
      const a = world.entities.find(e => e.tags.includes('animal') && !e.dead && !e.isDirected && _dist(e, b.actors.victim) < 250);
      if (!a) return false;
      a.isDirected = true; a.beatRole = 'interruptor'; a.targetEntity = b.actors.aggressor; a.state = 'chase';
      b.actors.interruptor = a;
      log(`🐗 ${a.name} 注意到了 ${b.actors.aggressor.name}...`, 'modifier'); return true;
    }
  },
  power_gap: {
    id: 'power_gap', name: '实力悬殊', emoji: '😰', priority: 8,
    condition(b) { const p = world.player; return (p.reputation >= 65 || p.combatPower >= b.actors.aggressor.combatPower * 2) && _dist(p, b.actors.aggressor) < 200; },
    apply(b) {
      const a = b.actors.aggressor;
      a.state = 'flee'; a.targetX = a.homeX; a.targetY = a.homeY; a.stateTimer = 5;
      showFloatingText(a, '太强了！'); log(`😰 ${a.name} 感受到威压，逃跑了！`, 'modifier'); return true;
    }
  },
  weather_slip: {
    id: 'weather_slip', name: '天气意外', emoji: '🌧️', priority: 5,
    condition() { return world.isRaining; },
    apply(b) {
      const a = b.actors.aggressor;
      a.stunTimer = 4; a.hp -= 20; a.flashTimer = 0.5;
      showFloatingText(a, '滑倒了！'); log(`🌧️ ${a.name} 在雨中滑倒！`, 'modifier');
      if (a.hp <= 0) killEntity(a, null); return true;
    }
  },
  awkward_silence: {
    id: 'awkward_silence', name: '无声尴尬', emoji: '😐', priority: 10,
    condition() { return world.caveVisited || Math.random() < 0.4; },
    apply() {
      log(`😐 洞穴里只有一张纸条。`, 'modifier');
      log(`📜 "${pick(['"来晚了。—— 路过的冒险者"', '"禁止探险。—— 守卫协会"', '"你以为会有宝藏？天真。"', '"恭喜发现了……空气！"'])}"`, 'dialogue');
      return true;
    }
  },
  reversal: {
    id: 'reversal', name: '立场反转', emoji: '🎭', priority: 9,
    condition(b) { return b.template.id === 'request' && Math.random() < 0.35; },
    apply(b) {
      const r = b.actors.requester;
      r.isRevealed = true;
      log(`🎭 ${r.name} 的表情突然变了...`, 'modifier');
      log(`💀 "感谢你的信任，愚蠢的好心人。"`, 'dialogue');
      const ambush = world.entities.find(e => e.tags.includes('hostile') && !e.dead && !e.isDirected && _dist(e, r) < 400);
      if (ambush) {
        ambush.isDirected = true; ambush.beatRole = 'ambusher'; ambush.targetEntity = world.player; ambush.state = 'chase';
        b.actors.ambusher = ambush;
        log(`🗡️ ${ambush.name} 从阴影中出现！`, 'modifier');
      }
      r.isDirected = false; r.beatRole = null; r.state = 'flee';
      r.targetX = r.homeX; r.targetY = r.homeY; r.stateTimer = 8;
      showFloatingText(r, '哈哈！上当了吧！'); return true;
    }
  },
  betrayal: {
    id: 'betrayal', name: '背叛', emoji: '🔪', priority: 7,
    condition(b) { return b.template.id === 'request' && world.player.reputation < 30 && Math.random() < 0.5; },
    apply(b) {
      const r = b.actors.requester;
      log(`😈 ${r.name} 打量着你，眼中闪过一丝贪婪...`, 'modifier');
      log(`💬 "既然你名声不好，那这忙我就不必帮了。"`, 'dialogue');
      r.isDirected = false; r.beatRole = null; r.state = 'idle'; r.stateTimer = 3;
      world.player.reputation = clamp(world.player.reputation - 5, 0, 100);
      log(`📉 你的名声让 ${r.name} 取消了请求。声望-5`, 'result'); return true;
    }
  },
  escort_betrayal: {
    id: 'escort_betrayal', name: '商人反水', emoji: '🗡️', priority: 9,
    condition(b) { return b.template.id === 'escort' && Math.random() < 0.4; },
    apply(b) { b.deferredModifier = true; return true; }
  }
};

function createBeat(t, a, m) {
  return { template: t, actors: a, modifier: m, phase: 'setup', phaseTimer: 0, elapsed: 0, result: null };
}

function updateBeat(b, dt) {
  b.elapsed += dt;
  switch (b.phase) {
    case 'setup': updateBeatSetup(b, dt); break;
    case 'active': updateBeatActive(b, dt); break;
    case 'resolving': b.phaseTimer -= dt; if (b.phaseTimer <= 0) b.phase = 'done'; break;
  }
}

function updateBeatSetup(b, dt) {
  if (b.template.id === 'confrontation') {
    const ag = b.actors.aggressor, vi = b.actors.victim;
    if (!ag || ag.dead) { resolveBeat(b, 'aggressor_gone', '强盗消失了'); return; }
    if (!vi || vi.dead) { resolveBeat(b, 'victim_gone', '受害者不在了'); return; }
    ag.isDirected = true; ag.beatRole = 'aggressor'; vi.isDirected = true; vi.beatRole = 'victim';
    const arrived = moveToward(ag, vi.x, vi.y, dt, 0.8);
    b.phaseTimer += dt;
    if (b.phaseTimer > 2.5 || arrived) {
      log(`⚔️ ${ag.name} 逼近了 ${vi.name}！`, 'beat'); b.phase = 'active'; b.phaseTimer = 0;
      if (b.modifier) {
        log(`🔍 检查修饰器 [${b.modifier.name}]...`, 'director');
        if (b.modifier.condition(b)) { log(`✅ 修饰器 [${b.modifier.name}] 激活！`, 'modifier'); b.modifier.apply(b); b.result = b.modifier.id; world.lastAntiPlotType = b.modifier.id; world.antiPlotCooldown = CFG.antiPlotCooldown; }
        else { log(`❌ 修饰器条件不满足，正常流程`, 'director'); b.modifier = null; }
      }
      if (!b.modifier) {
        ag.targetEntity = vi; ag.state = 'chase'; ag.isDirected = false;
        vi.state = 'flee'; vi.targetX = clamp(vi.homeX + (vi.x - ag.x) * 2, 30, W - 30); vi.targetY = clamp(vi.homeY + (vi.y - ag.y) * 2, 30, H - 30); vi.stateTimer = 8; vi.isDirected = false;
        showFloatingText(vi, '救命啊！'); log(`🗡️ ${ag.name} 攻击 ${vi.name}！`, 'beat');
        emitWorldEvent('combat_nearby', { source: ag, target: vi, position: { x: ag.x, y: ag.y }, involves_civilian: true, aggressor: ag });
      }
    }
  }
  if (b.template.id === 'discovery') {
    b.phase = 'active'; b.phaseTimer = 0; log(`🔍 你发现了洞穴入口...`, 'beat');
    if (b.modifier && b.modifier.condition(b)) { log(`✅ 修饰器 [${b.modifier.name}] 激活！`, 'modifier'); b.modifier.apply(b); b.result = 'awkward_silence'; world.lastAntiPlotType = 'awkward_silence'; world.antiPlotCooldown = CFG.antiPlotCooldown; }
    else { log(`💎 你发现了有价值的东西！`, 'beat'); }
    world.caveVisited = true; resolveBeat(b, b.result || 'normal', '探索完成');
  }
  if (b.template.id === 'request') {
    const req = b.actors.requester;
    if (!req || req.dead) { resolveBeat(b, 'requester_gone', '请求者消失了'); return; }
    req.isDirected = true; req.beatRole = 'requester';
    const arrived = moveToward(req, world.player.x, world.player.y, dt, 0.9);
    b.phaseTimer += dt;
    if (b.phaseTimer > 3 || arrived || _dist(req, world.player) < 70) {
      log(`🙏 ${req.name} 向你求助！`, 'beat'); b.phase = 'active'; b.phaseTimer = 0;
      b.playerAccepted = false; b.playerDeclined = false;
      const requestTypes = ['escort', 'find_item', 'warn'];
      b.requestType = pick(requestTypes);
      const lines = { escort: '能护送我穿过森林吗？有强盗出没...', find_item: '我的包裹掉在森林里了，能帮我找找吗？', warn: '小心！前面有强盗埋伏！' };
      showFloatingText(req, lines[b.requestType], 4); log(`💬 ${req.name}: "${lines[b.requestType]}"`, 'dialogue');
      if (b.modifier) {
        if (b.requestType === 'find_item' && b.modifier.id === 'reversal') {
          b.deferredModifier = true;
          log(`🔍 修饰器 [${b.modifier.name}] 待命中...`, 'director');
        } else {
          log(`🔍 检查修饰器 [${b.modifier.name}]...`, 'director');
          if (b.modifier.condition(b)) { log(`✅ 修饰器 [${b.modifier.name}] 激活！`, 'modifier'); b.modifier.apply(b); b.result = b.modifier.id; world.lastAntiPlotType = b.modifier.id; world.antiPlotCooldown = CFG.antiPlotCooldown; }
          else { log(`❌ 修饰器条件不满足，正常流程`, 'director'); b.modifier = null; }
        }
      }
      if (!b.modifier || b.deferredModifier) { log(`⌨️ 按 [E] 接受请求，按 [R] 拒绝`, 'director'); }
      if (b.requestType === 'find_item') {
        const forestPos = randomPointInArea(AREAS.forest, 40);
        b.packageId = world.packages.length;
        world.packages.push({ id: b.packageId, x: forestPos.x, y: forestPos.y, found: false, requester: req.name });
        log(`📦 包裹掉落在森林某处...`, 'world');
      }
    }
  }
  if (b.template.id === 'escort') {
    const esc = b.actors.escortee;
    if (!esc || esc.dead) { resolveBeat(b, 'escortee_gone', '护送对象消失了'); return; }
    esc.isDirected = true; esc.beatRole = 'escortee';
    const arrived = moveToward(esc, world.player.x, world.player.y, dt, 0.9);
    b.phaseTimer += dt;
    if (b.phaseTimer > 3 || arrived || _dist(esc, world.player) < 70) {
      log(`🛡️ ${esc.name} 请求你护送他去驿站！`, 'beat');
      b.phase = 'active'; b.phaseTimer = 0;
      b.playerAccepted = false; b.playerDeclined = false;
      showFloatingText(esc, '能护送我去驿站吗？路上有山贼...', 4);
      log(`💬 ${esc.name}: "能护送我去驿站吗？路上有山贼出没..."`, 'dialogue');
      if (b.modifier) {
        if (b.modifier.id === 'escort_betrayal') {
          b.modifier.apply(b);
          log(`🔍 修饰器 [${b.modifier.name}] 待命中...`, 'director');
        } else {
          log(`🔍 检查修饰器 [${b.modifier.name}]...`, 'director');
          if (b.modifier.condition(b)) { log(`✅ 修饰器 [${b.modifier.name}] 激活！`, 'modifier'); b.modifier.apply(b); b.result = b.modifier.id; world.lastAntiPlotType = b.modifier.id; world.antiPlotCooldown = CFG.antiPlotCooldown; }
          else { log(`❌ 修饰器条件不满足，正常流程`, 'director'); b.modifier = null; }
        }
      }
      if (!b.modifier || b.deferredModifier) { log(`⌨️ 按 [E] 接受护送，按 [R] 拒绝`, 'director'); }
    }
  }
}

function updateBeatActive(b, dt) {
  if (b.template.id === 'confrontation') {
    const ag = b.actors.aggressor, vi = b.actors.victim;
    b.phaseTimer += dt;
    if (b.result) {
      if (b.result === 'hijack') {
        const int = b.actors.interruptor;
        if (!int || int.dead) { resolveBeat(b, 'hijack', '野猪介入'); return; }
        if (ag && !ag.dead && _dist(int, ag) < 40) {
          const dmg = 25 + randInt(5, 15); ag.hp -= dmg; ag.flashTimer = 0.3;
          showFloatingText(ag, `-${dmg}🐗`);
          ag.state = 'flee'; ag.targetX = ag.homeX; ag.targetY = ag.homeY; ag.stateTimer = 6; ag.isDirected = false;
          if (ag.hp <= 0) killEntity(ag, int);
          int.isDirected = false; int.beatRole = null; int.state = 'wander'; pickWanderTarget(int);
          showFloatingText(vi, '啊...?');
          log(`📊 反情节: [截胡型]`, 'result'); log(`🏷️ [荒诞感] [拔剑四顾心茫然]`, 'result');
          resolveBeat(b, 'hijack', '被野猪截胡'); return;
        }
      } else if (b.result === 'power_gap' || b.result === 'weather_slip') {
        b.phaseTimer += dt;
        if (b.phaseTimer > 3) {
          if (vi) { vi.isDirected = false; vi.beatRole = null; vi.state = 'idle'; vi.stateTimer = 3; }
          log(`📊 反情节: [${b.result === 'power_gap' ? '实力悬殊' : '天气意外'}]`, 'result');
          resolveBeat(b, b.result, '反情节解决'); return;
        }
      } else { return; }
    }
    if (ag && ag.dead) {
      if (vi) { vi.isDirected = false; vi.beatRole = null; }
      const pk = ag.damageLog.some(d => d.source === 'player');
      if (pk) { log(`📊 玩家击败了 ${ag.name}！`, 'result'); world.player.reputation = clamp(world.player.reputation + 8, 0, 100); }
      resolveBeat(b, 'aggressor_dead', '威胁解除'); return;
    }
    if (vi && vi.dead) {
      if (ag) { ag.isDirected = false; ag.beatRole = null; ag.state = 'idle'; ag.stateTimer = 3; }
      if (_dist(world.player, vi) < 300) { world.player.reputation = clamp(world.player.reputation - 3, 0, 100); log(`👁️ 你没能阻止悲剧。声望-3`, 'result'); }
      resolveBeat(b, 'victim_dead', '受害者倒下'); return;
    }
    if (b.phaseTimer > 25) {
      if (ag) { ag.isDirected = false; ag.beatRole = null; ag.state = 'idle'; ag.stateTimer = 3; }
      if (vi) { vi.isDirected = false; vi.beatRole = null; vi.state = 'idle'; vi.stateTimer = 3; }
      resolveBeat(b, 'timeout', '超时'); return;
    }
  }
  if (b.template.id === 'request') {
    const req = b.actors.requester; b.phaseTimer += dt;
    if (b.result === 'reversal') {
      const amb = b.actors.ambusher;
      if (amb && !amb.dead) {
        if (amb.hp <= 0) { log(`📊 你击败了埋伏者！`, 'result'); world.player.reputation = clamp(world.player.reputation + 10, 0, 100); resolveBeat(b, 'ambusher_defeated', '识破骗局并反击'); return; }
        if (_dist(amb, world.player) < 50) { const dmg = amb.combatPower + randInt(3, 8); world.player.hp -= dmg; showFloatingText(world.player, `-${dmg}`); log(`⚔️ ${amb.name} 攻击了你！`, 'combat'); }
      } else { resolveBeat(b, 'ambusher_fled', '埋伏者逃离'); return; }
      if (b.phaseTimer > 20) { resolveBeat(b, 'timeout', '超时'); return; }
      return;
    }
    if (b.result === 'betrayal') { resolveBeat(b, 'betrayal', '请求被拒绝（名声太差）'); return; }
    if (req && req.dead) { resolveBeat(b, 'requester_dead', '请求者死亡'); return; }
    if (b.playerAccepted) {
      if (b.requestType === 'find_item') {
        if (!b.searchPhase) {
          b.searchPhase = 'searching';
          log(`✅ 你接受了 ${req.name} 的请求！`, 'result');
          log(`🔍 去森林里找包裹吧`, 'beat');
          world.player.reputation = clamp(world.player.reputation + 3, 0, 100);
          req.isDirected = false; req.beatRole = null;
          req.state = 'idle'; req.stateTimer = 999;
        }
        const pkg = world.packages.find(pk => pk.id === b.packageId);
        if (pkg && pkg.found && b.searchPhase === 'searching') {
          b.searchPhase = 'returning';
          log(`📦 包裹已找到！带回给 ${req.name}`, 'beat');
        }
        if (b.searchPhase === 'returning' && req && !req.dead && _dist(world.player, req) < 70) {
          const nearbyGuard = world.entities.find(e => e.type === 'guard' && !e.dead && _dist(e, req) < 300);
          if (b.deferredModifier && nearbyGuard) {
            showFloatingText(req, '长官！就是这个人偷了包裹！', 3);
            log(`🎭 ${req.name} 的表情突然变了...`, 'modifier');
            log(`💬 "${req.name}: 长官！就是这个人偷了包裹！我当场抓获！"`, 'dialogue');
            emitWorldEvent('crime_witnessed', { source: req, suspect: world.player, position: { x: req.x, y: req.y }, radius: 400 });
            req.isDirected = false; req.beatRole = null;
            req.state = 'flee'; req.targetX = req.homeX; req.targetY = req.homeY; req.stateTimer = 8;
            showFloatingText(req, '哈哈！上当了吧！');
            world.player.reputation = clamp(world.player.reputation - 15, 0, 100);
            world.lastAntiPlotType = 'reversal'; world.antiPlotCooldown = CFG.antiPlotCooldown;
            log(`📊 反情节: [好心没好报]`, 'result');
            log(`🏷️ 情感标签: [好心没好报] [信任危机]`, 'result');
            resolveBeat(b, 'find_item_betrayal', '旅人栽赃嫁祸');
          } else {
            showFloatingText(req, pick(['太感谢你了！', '你真是好人！']), 3);
            log(`✅ 任务完成！${req.name} 收到了包裹`, 'result');
            world.player.reputation = clamp(world.player.reputation + 10, 0, 100);
            req.isDirected = false; req.beatRole = null;
            req.state = 'wander'; pickWanderTarget(req);
            resolveBeat(b, 'package_delivered', '包裹已送达');
          }
          return;
        }
        if (b.phaseTimer > 120) {
          req.isDirected = false; req.beatRole = null; req.state = 'idle'; req.stateTimer = 3;
          resolveBeat(b, 'timeout', '搜寻超时');
        }
        return;
      }
      log(`✅ 你接受了 ${req.name} 的请求！`, 'result'); world.player.reputation = clamp(world.player.reputation + 5, 0, 100);
      req.isDirected = false; req.beatRole = null; req.state = 'wander'; pickWanderTarget(req);
      if (b.requestType === 'escort') { log(`🛡️ 护送任务：保护 ${req.name} 到安全区域`, 'beat'); }
      else if (b.requestType === 'warn') { log(`⚠️ 警告已收到：小心埋伏！`, 'beat'); }
      resolveBeat(b, 'accepted', '请求已接受'); return;
    }
    if (b.playerDeclined) {
      log(`❌ 你拒绝了 ${req.name} 的请求`, 'result'); world.player.reputation = clamp(world.player.reputation - 3, 0, 100);
      req.isDirected = false; req.beatRole = null; req.state = 'flee'; req.targetX = req.homeX; req.targetY = req.homeY; req.stateTimer = 5;
      showFloatingText(req, '果然谁都靠不住...'); resolveBeat(b, 'declined', '请求被拒绝'); return;
    }
    if (b.phaseTimer > 15) { req.isDirected = false; req.beatRole = null; req.state = 'idle'; req.stateTimer = 3; resolveBeat(b, 'timeout', '玩家无响应，请求超时'); return; }
  }
  if (b.template.id === 'escort') {
    const esc = b.actors.escortee; b.phaseTimer += dt;
    if (esc && esc.dead) {
      log(`💀 ${esc.name} 在护送途中倒下了！`, 'result');
      world.player.reputation = clamp(world.player.reputation - 5, 0, 100);
      resolveBeat(b, 'escortee_dead', '护送失败'); return;
    }
    if (b.playerAccepted) {
      if (!b.escortPhase) {
        b.escortPhase = 'walking';
        log(`✅ 你接受了护送任务！保护 ${esc.name} 前往驿站`, 'result');
        world.player.reputation = clamp(world.player.reputation + 3, 0, 100);
        esc.isDirected = true; esc.beatRole = 'escortee';
      }
      if (b.escortPhase === 'walking') {
        const dest = AREAS.station;
        const destX = dest.x + dest.w / 2, destY = dest.y + dest.h / 2;
        const playerNear = _dist(world.player, esc) < 150;
        if (playerNear) {
          moveToward(esc, destX, destY, dt, 0.5);
        } else {
          showFloatingText(esc, '等等我！', 1);
        }
        if (b.deferredModifier && !b.betrayalTriggered) {
          const nearBandits = world.entities.filter(e => e.tags.includes('hostile') && !e.dead && _dist(e, esc) < 200);
          if (nearBandits.length >= 2) {
            b.betrayalTriggered = true;
            b.escortPhase = 'betrayal';
            showFloatingText(esc, '兄弟们！就是这个冤大头！', 3);
            log(`🎭 ${esc.name} 的表情突然变了...`, 'modifier');
            log(`💬 "${esc.name}: 兄弟们！动手！"`, 'dialogue');
            esc.isDirected = false; esc.beatRole = null;
            esc.state = 'chase'; esc.targetEntity = world.player; esc.aggroTarget = world.player;
            esc.tags = esc.tags.filter(t => t !== 'civilian');
            esc.tags.push('hostile');
            esc.combatPower = 6;
            for (const ban of nearBandits) {
              ban.state = 'chase'; ban.targetEntity = world.player; ban.aggroTarget = world.player;
              showFloatingText(ban, '上！');
            }
            world.player.reputation = clamp(world.player.reputation - 10, 0, 100);
            world.lastAntiPlotType = 'escort_betrayal'; world.antiPlotCooldown = CFG.antiPlotCooldown;
            log(`📊 反情节: [商人反水]`, 'result');
            log(`🏷️ 情感标签: [引狼入室] [好心没好报]`, 'result');
            resolveBeat(b, 'escort_betrayal', '商人反水，三打一');
            return;
          }
        }
        if (pointInArea(esc.x, esc.y, AREAS.station)) {
          showFloatingText(esc, pick(['太感谢了！', '总算到了！']), 3);
          log(`✅ 护送成功！${esc.name} 安全到达驿站`, 'result');
          world.player.reputation = clamp(world.player.reputation + 12, 0, 100);
          log(`📈 声望 +12`, 'result');
          esc.isDirected = false; esc.beatRole = null;
          esc.state = 'idle'; esc.stateTimer = randRange(5, 10);
          esc.x = AREAS.station.x + 50; esc.y = AREAS.station.y + 40;
          resolveBeat(b, 'escort_success', '护送成功'); return;
        }
      }
      if (b.phaseTimer > 180) {
        esc.isDirected = false; esc.beatRole = null; esc.state = 'idle'; esc.stateTimer = 3;
        resolveBeat(b, 'timeout', '护送超时'); return;
      }
      return;
    }
    if (b.playerDeclined) {
      log(`❌ 你拒绝了护送请求`, 'result'); world.player.reputation = clamp(world.player.reputation - 3, 0, 100);
      esc.isDirected = false; esc.beatRole = null; esc.state = 'idle'; esc.stateTimer = 3;
      showFloatingText(esc, '唉...'); resolveBeat(b, 'declined', '护送被拒绝'); return;
    }
    if (b.phaseTimer > 15) { esc.isDirected = false; esc.beatRole = null; esc.state = 'idle'; esc.stateTimer = 3; resolveBeat(b, 'timeout', '玩家无响应'); return; }
  }
}

function resolveBeat(b, result, desc) {
  b.result = result; b.phase = 'resolving'; b.phaseTimer = 2;
  for (const r in b.actors) {
    const e = b.actors[r];
    if (e && !e.dead) {
      e.isDirected = false; e.beatRole = null;
      if (e.state === 'chase' && e.targetEntity && e.targetEntity !== world.player) {
        e.state = 'idle'; e.stateTimer = randRange(1, 3); e.targetEntity = null;
      }
    }
  }
  world.beatCooldown = b.template.cooldown;
  world.tension = clamp(world.tension - 20, 0, 100);
  log(`🎬 Beat [${b.template.name}] 结束: ${desc}`, 'beat');
  log(`─────────────────────────────`, 'world');
}
