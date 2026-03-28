function updateDirector(dt) {
  world.tension = clamp(world.tension - dt * 2, 0, 100);
  world.beatCooldown = Math.max(0, world.beatCooldown - dt);
  world.antiPlotCooldown = Math.max(0, world.antiPlotCooldown - dt);
  world.directorTimer -= dt;
  if (world.activeBeat) { updateBeat(world.activeBeat, dt); if (world.activeBeat.phase === 'done') world.activeBeat = null; return; }
  if (world.directorTimer > 0 || world.beatCooldown > 0) return;
  world.directorTimer = CFG.directorScanInterval;
  tryTriggerBeat();
}

function tryTriggerBeat() {
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
