function updateDirector(dt) {
  world.tension = clamp(world.tension - dt * 2, 0, 100);
  world.beatCooldown = Math.max(0, world.beatCooldown - dt);
  world.antiPlotCooldown = Math.max(0, world.antiPlotCooldown - dt);
  world.directorTimer -= dt;
  // ── 过期注入清理 ──
  while (world.injectedBeats.length > 0 && world.gameTime - world.injectedBeats[world.injectedBeats.length - 1].injectedAt > world.injectedBeats[world.injectedBeats.length - 1].ttl) {
    const expired = world.injectedBeats.pop();
    log(`🃏 注入 [${expired.beatId}] 已过期(${expired.context?.reason})，丢弃`, 'director');
  }
  if (world.activeBeat) { updateBeat(world.activeBeat, dt); if (world.activeBeat.phase === 'done') world.activeBeat = null; return; }
  if (world.directorTimer > 0 || world.beatCooldown > 0) return;
  world.directorTimer = CFG.directorScanInterval;
  // ── 张力门控（Tension Gate）──
  // 高紧张时抑制常规 Beat 触发（注入队列不受限，因为代表重要后果）
  if (world.tension > 70 && world.injectedBeats.length === 0 && Math.random() < 0.6) {
    log(`🎭 导演: 紧张度过高(${Math.round(world.tension)})，本轮暂缓`, 'director');
    return;
  }
  tryTriggerBeat();
}

function tryTriggerBeat() {
  // ── Inject Queue 优先消费 ──
  // 注入队列里的 Beat 代表世界事件的因果后果，优先于常规扫描
  for (let i = 0; i < world.injectedBeats.length; i++) {
    const inject = world.injectedBeats[i];
    // 再次检查 TTL（防御性）
    if (world.gameTime - inject.injectedAt > inject.ttl) {
      world.injectedBeats.splice(i, 1); i--;
      log(`🃏 注入 [${inject.beatId}] 已过期，丢弃`, 'director');
      continue;
    }
    // 尝试触发注入的 Beat 类型
    let triggered = false;
    switch (inject.beatId) {
      case 'discovery':      triggered = tryDiscovery(); break;
      case 'confrontation':  triggered = tryConfrontation(); break;
      case 'escort':         triggered = tryEscort(); break;
      case 'request':        triggered = tryRequest(); break;
    }
    if (triggered) {
      world.injectedBeats.splice(i, 1);
      log(`🃏 注入 [${inject.beatId}] 已消费 (${inject.context?.reason || '未知'})`, 'director');
      return;
    }
    // 当前无法触发（缺少合适演员），保留在队列中等待下次扫描
    break;
  }
  // ── 常规优先级链 ──
  if (tryDiscovery()) return;
  if (tryConfrontation()) return;
  if (tryEscort()) return;
  tryRequest();
}

function tryRequest() {
  const p = world.player, tpl = BEAT_TEMPLATES.request, r = CFG.playerDetectionRadius;
  const candidates = world.entities.filter(e => !e.dead && !e.isDirected && (e.tags.includes('civilian') || e.tags.includes('traveler')) && e.type !== 'guard' && _dist(e, p) < r && _dist(e, p) > 80);
  if (!candidates.length) return false;
  const req = candidates.reduce((a, b) => _dist(a, p) > _dist(b, p) ? a : b);
  log(`─────────────────────────────`, 'world'); log(`🎬 导演: ${req.name} 似乎有话要说`, 'director');
  log(`🎭 触发 Beat [${tpl.name}]`, 'beat');
  let mod = null;
  if (world.antiPlotCooldown <= 0) {
    for (const m of tpl.modifiers.map(id => MODIFIERS[id]).filter(m => m.id !== world.lastAntiPlotType).sort((a, b) => b.priority - a.priority)) {
      if (m.condition({ actors: { requester: req }, template: tpl })) { mod = m; log(`🔮 预判修饰器: [${m.name}]`, 'director'); break; }
    }
  }
  if (!mod) log(`📝 正常流程`, 'director');
  world.activeBeat = createBeat(tpl, { requester: req }, mod);
  world.tension = clamp(world.tension + 20, 0, 100);
  return true;
}

function tryConfrontation() {
  const p = world.player, tpl = BEAT_TEMPLATES.confrontation, r = CFG.playerDetectionRadius;
  const ags = world.entities.filter(e => !e.dead && !e.isDirected && e.tags.includes('hostile') && _dist(e, p) < r);
  const vis = world.entities.filter(e => !e.dead && !e.isDirected && e.tags.includes('civilian') && _dist(e, p) < r);
  if (!ags.length || !vis.length) return false;
  const ag = ags.reduce((a, b) => _dist(a, p) < _dist(b, p) ? a : b);
  const vi = vis.reduce((a, b) => _dist(a, ag) < _dist(b, ag) ? a : b);
  if (_dist(ag, vi) > 400) return false;
  log(`─────────────────────────────`, 'world'); log(`🎬 导演: 检测到 ${ag.name} 在 ${vi.name} 附近`, 'director');
  log(`🎭 触发 Beat [${tpl.name}]`, 'beat');
  let mod = null;
  if (world.antiPlotCooldown <= 0) {
    for (const m of tpl.modifiers.map(id => MODIFIERS[id]).filter(m => m.id !== world.lastAntiPlotType).sort((a, b) => b.priority - a.priority)) {
      if (m.condition({ actors: { aggressor: ag, victim: vi }, template: tpl })) { mod = m; log(`🔮 预判修饰器: [${m.name}]`, 'director'); break; }
    }
  }
  if (!mod) log(`📝 正常流程`, 'director');
  world.activeBeat = createBeat(tpl, { aggressor: ag, victim: vi }, mod);
  world.tension = clamp(world.tension + 30, 0, 100);
  return true;
}

function tryEscort() {
  const p = world.player, tpl = BEAT_TEMPLATES.escort, r = CFG.playerDetectionRadius;
  const candidates = world.entities.filter(e => !e.dead && !e.isDirected && e.type === 'merchant' && _dist(e, p) < r && _dist(e, p) > 60);
  if (!candidates.length) return false;
  if (Math.random() > 0.35) return false;
  const esc = pick(candidates);
  log(`─────────────────────────────`, 'world'); log(`🎬 导演: ${esc.name} 需要护送去驿站`, 'director');
  log(`🎭 触发 Beat [${tpl.name}]`, 'beat');
  let mod = null;
  if (world.antiPlotCooldown <= 0) {
    for (const m of tpl.modifiers.map(id => MODIFIERS[id]).filter(m => m.id !== world.lastAntiPlotType).sort((a, b) => b.priority - a.priority)) {
      if (m.condition({ actors: { escortee: esc }, template: tpl })) { mod = m; log(`🔮 预判修饰器: [${m.name}]`, 'director'); break; }
    }
  }
  if (!mod) log(`📝 正常流程`, 'director');
  world.activeBeat = createBeat(tpl, { escortee: esc }, mod);
  world.tension = clamp(world.tension + 15, 0, 100);
  return true;
}

function tryDiscovery() {
  const p = world.player, tpl = BEAT_TEMPLATES.discovery;
  if (!pointInArea(p.x, p.y, tpl.triggerArea)) return false;
  log(`─────────────────────────────`, 'world'); log(`🎬 导演: 玩家接近洞穴`, 'director');
  log(`🎭 触发 Beat [${tpl.name}]`, 'beat');
  let mod = null;
  if (world.antiPlotCooldown <= 0 && MODIFIERS.awkward_silence.condition()) { mod = MODIFIERS.awkward_silence; }
  world.activeBeat = createBeat(tpl, {}, mod);
  return true;
}
