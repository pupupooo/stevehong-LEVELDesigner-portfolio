function manualTrigger(id) {
  if (world.activeBeat) { log('⚠️ 有活跃Beat', 'director'); return; }
  if (id === 'confrontation') {
    const ag = world.entities.find(e => e.tags.includes('hostile') && !e.dead);
    const vi = world.entities.find(e => e.tags.includes('civilian') && !e.dead && e.type === 'merchant');
    if (!ag || !vi) { log('⚠️ 无可用演员', 'director'); return; }
    log(`─────────────────────────────`, 'world'); log(`🔧 [手动] Beat [对峙]`, 'director');
    world.activeBeat = createBeat(BEAT_TEMPLATES.confrontation, { aggressor: ag, victim: vi }, null);
    world.tension = clamp(world.tension + 30, 0, 100);
  }
  if (id === 'discovery') {
    log(`─────────────────────────────`, 'world'); log(`🔧 [手动] Beat [发现]`, 'director');
    let m = null;
    if (world.antiPlotCooldown <= 0 && MODIFIERS.awkward_silence.condition()) m = MODIFIERS.awkward_silence;
    world.activeBeat = createBeat(BEAT_TEMPLATES.discovery, {}, m);
  }
  if (id === 'request') {
    const req = world.entities.find(e => (e.tags.includes('civilian') || e.tags.includes('traveler')) && !e.dead && !e.isDirected && e.type !== 'guard');
    if (!req) { log('⚠️ 无可用请求者', 'director'); return; }
    log(`─────────────────────────────`, 'world'); log(`🔧 [手动] Beat [请求]`, 'director');
    let m = null;
    if (world.antiPlotCooldown <= 0) {
      for (const mod of ['reversal', 'betrayal'].map(mid => MODIFIERS[mid]).filter(m => m.id !== world.lastAntiPlotType).sort((a, b) => b.priority - a.priority)) {
        if (mod.condition({ actors: { requester: req }, template: BEAT_TEMPLATES.request })) { m = mod; log(`🔮 预判修饰器: [${m.name}]`, 'director'); break; }
      }
    }
    if (!m) log(`📝 正常流程`, 'director');
    world.activeBeat = createBeat(BEAT_TEMPLATES.request, { requester: req }, m);
    world.tension = clamp(world.tension + 20, 0, 100);
  }
  if (id === 'escort') {
    const esc = world.entities.find(e => e.type === 'merchant' && !e.dead && !e.isDirected);
    if (!esc) { log('⚠️ 无可用商人', 'director'); return; }
    log(`─────────────────────────────`, 'world'); log(`🔧 [手动] Beat [护送]`, 'director');
    let m = null;
    if (world.antiPlotCooldown <= 0) {
      const mod = MODIFIERS.escort_betrayal;
      if (mod && mod.id !== world.lastAntiPlotType && mod.condition({ actors: { escortee: esc }, template: BEAT_TEMPLATES.escort })) {
        m = mod; log(`🔮 预判修饰器: [${m.name}]`, 'director');
      }
    }
    if (!m) log(`📝 正常流程`, 'director');
    world.activeBeat = createBeat(BEAT_TEMPLATES.escort, { escortee: esc }, m);
    world.tension = clamp(world.tension + 15, 0, 100);
  }
}

function manualInject(beatId, reason, priority) {
  injectDirectorBeat(beatId, { reason: reason || 'manual_debug' }, priority || 5, 120);
}

function forceCooldownClear() {
  world.beatCooldown = 0; world.antiPlotCooldown = 0; world.directorTimer = 0;
  log('🔧 冷却已清除', 'director');
}

function respawnAll() {
  for (const e of world.entities) if (e.dead && e !== world.player) respawnEntity(e);
  log('🔧 已复活所有', 'director');
}

function resetWorld() {
  world.activeBeat = null; world.beatCooldown = 0; world.antiPlotCooldown = 0;
  world.tension = 0; world.caveVisited = false; world.lastAntiPlotType = null;
  world.injectedBeats = [];
  world.player.reputation = 50; world.player.combatPower = 10; world.player.hp = 200;
  gun.ammo = 6; gun.reloading = false; world.packages = [];
  world.playerDead = false; world.playerRespawnTimer = 0;
  for (const e of world.entities) {
    if (e === world.player) continue;
    respawnEntity(e); e.memory = [];
    if (e.type === 'merchant') {
      e.tags = e.tags.filter(t => t !== 'hostile');
      if (!e.tags.includes('civilian')) e.tags.push('civilian');
      e.combatPower = e.type === 'merchant' ? 2 : 1;
    }
  }
  log('🔧 世界已重置', 'director');
}

function setupDebugPanel() {
  const sl = [
    { id: 'dbg-beat-cd', p: () => CFG, k: 'beatCooldown', s: 's' },
    { id: 'dbg-ap-cd', p: () => CFG, k: 'antiPlotCooldown', s: 's' },
    { id: 'dbg-scan', p: () => CFG, k: 'directorScanInterval', s: 's' },
    { id: 'dbg-rep', p: () => world.player, k: 'reputation', s: '' },
    { id: 'dbg-pow', p: () => world.player, k: 'combatPower', s: '' },
    { id: 'dbg-radius', p: () => CFG, k: 'playerDetectionRadius', s: '' }
  ];
  for (const s of sl) {
    const el = document.getElementById(s.id), v = document.getElementById(s.id + '-v');
    el.addEventListener('input', () => { const val = parseInt(el.value); s.p()[s.k] = val; v.textContent = val + s.s; });
  }
}

function updateDebugPanel() {
  let h = '';
  for (const e of world.entities) {
    if (e === world.player) continue;
    h += `<div class="dbg-entity"><span class="dot" style="background:${e.color}"></span><span class="e-name">${e.emoji}${e.name}${e.dead ? ' ☠️' : ''}</span><span class="e-state">${e.dead ? 'dead' : e.state}${e.isDirected ? ' [' + e.beatRole + ']' : ''}</span><span class="e-hp">${e.dead ? '—' : Math.round(e.hp)}</span></div>`;
  }
  document.getElementById('dbg-entities').innerHTML = h;
  document.getElementById('dbg-status').innerHTML = `Beat冷却:${Math.ceil(world.beatCooldown)}s<br>反情节冷却:${Math.ceil(world.antiPlotCooldown)}s<br>扫描:${Math.ceil(world.directorTimer)}s<br>紧张度:${Math.round(world.tension)}${world.tension > 70 ? ' ⚠️高' : ''}<br>Beat:${world.activeBeat ? world.activeBeat.template.name + '(' + world.activeBeat.phase + ')' : '无'}<br>弹药:${gun.ammo}/${CFG.maxAmmo}${gun.reloading ? ' [装弹中]' : ''}`;
  // ── 注入队列显示 ──
  const iqEl = document.getElementById('dbg-inject-queue');
  if (iqEl) {
    if (world.injectedBeats.length === 0) {
      iqEl.innerHTML = '队列为空';
    } else {
      iqEl.innerHTML = world.injectedBeats.map((b, i) => {
        const remaining = Math.max(0, Math.round(b.ttl - (world.gameTime - b.injectedAt)));
        return `${i + 1}. 🃏[${b.beatId}] P:${b.priority} TTL:${remaining}s <span style="color:#7a8aaa">${b.context?.reason || ''}</span>`;
      }).join('<br>');
    }
  }
  document.getElementById('dbg-rep').value = world.player.reputation; document.getElementById('dbg-rep-v').textContent = Math.round(world.player.reputation);
  document.getElementById('dbg-pow').value = world.player.combatPower; document.getElementById('dbg-pow-v').textContent = world.player.combatPower;
}
