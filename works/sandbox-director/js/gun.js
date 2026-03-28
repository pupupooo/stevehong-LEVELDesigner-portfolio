const gun = {
  ammo: 6, isAiming: false, shootCooldown: 0, reloading: false,
  reloadTimer: 0, aimTarget: null, aimDuration: 0, intimidated: new Set(),
};
let mouseX = W / 2, mouseY = H / 2;

function raycast(sx, sy, dx, dy, maxDist, ignore) {
  const len = Math.hypot(dx, dy);
  if (len < 1) return null;
  const ndx = dx / len, ndy = dy / len;
  let closest = null, closestT = maxDist;
  for (const e of world.entities) {
    if (e === ignore || e.dead || !e.visible) continue;
    const t = lineCircleIntersect(sx, sy, ndx, ndy, e.x, e.y, 13);
    if (t !== null && t > 10 && t < closestT) { closestT = t; closest = e; }
  }
  return { entity: closest, dist: closestT, hitX: sx + ndx * closestT, hitY: sy + ndy * closestT, dirX: ndx, dirY: ndy };
}

function shoot() {
  if (!gun.isAiming) return;
  if (gun.reloading) { showFloatingText(world.player, '装弹中...'); return; }
  if (gun.ammo <= 0) { showFloatingText(world.player, '没子弹了！[R]装弹'); log('🔫 弹仓空了！按 R 装弹', 'gun'); return; }
  if (gun.shootCooldown > 0) return;

  gun.ammo--; gun.shootCooldown = CFG.shootCooldown;
  const p = world.player;
  const dx = mouseX - p.x, dy = mouseY - p.y;
  const hit = raycast(p.x, p.y, dx, dy, CFG.gunRange, p);
  if (!hit) return;

  flashes.push({ x: p.x, y: p.y, life: 0.15 });
  tracers.push({ x1: p.x, y1: p.y, x2: hit.hitX, y2: hit.hitY, life: 0.25 });
  world.tension = clamp(world.tension + 20, 0, 100);
  emitWorldEvent('gunshot', { source: p, position: { x: p.x, y: p.y }, radius: CFG.gunshotEventRadius });

  if (hit.entity) {
    const e = hit.entity;
    const dmg = CFG.gunDamage + randInt(3, 12);
    e.hp -= dmg; e.flashTimer = 0.3;
    e.damageLog.push({ source: 'player', amount: dmg, time: world.gameTime });
    showFloatingText(e, `-${dmg} 🔫`);
    log(`🔫 射中了 ${e.name}！造成 ${dmg} 伤害`, 'gun');

    if (e.hp <= 0) {
      killEntity(e, p);
      if (e.tags.includes('hostile')) { p.reputation = clamp(p.reputation + 8, 0, 100); log(`💀 ${e.name} 被你一枪击倒！声望+8`, 'combat'); }
      else if (e.tags.includes('civilian')) { p.reputation = clamp(p.reputation - 20, 0, 100); log(`💀 你射杀了平民 ${e.name}！声望-20`, 'combat'); }
      else { log(`💀 ${e.name} 倒下了`, 'combat'); }
    } else {
      if (e.tags.includes('hostile') && e.state !== 'chase') { e.state = 'chase'; e.targetEntity = p; e.aggroTarget = p; }
      if (e.tags.includes('civilian')) { p.reputation = clamp(p.reputation - 10, 0, 100); log(`⚠️ 你射伤了平民！声望-10`, 'combat'); }
    }
  } else {
    log(`🔫 子弹飞出，没有命中任何人`, 'gun');
    for (const e of world.entities) {
      if (e.dead || e === p) continue;
      if (_dist(e, { x: hit.hitX, y: hit.hitY }) < CFG.nearMissRadius) {
        showFloatingText(e, '！！！');
        if (e.tags.includes('hostile')) addMemory(e, 'player_is_dangerous', {});
      }
    }
  }
}

function startReload() {
  if (gun.reloading || gun.ammo >= CFG.maxAmmo) return;
  gun.reloading = true; gun.reloadTimer = CFG.reloadTime;
  showFloatingText(world.player, '装弹中...');
  log('🔫 开始装弹...', 'gun');
}

function updateGun(dt) {
  gun.shootCooldown = Math.max(0, gun.shootCooldown - dt);
  if (gun.reloading) {
    gun.reloadTimer -= dt;
    if (gun.reloadTimer <= 0) { gun.reloading = false; gun.ammo = CFG.maxAmmo; log('🔫 装弹完成！', 'gun'); }
  }
  for (let i = tracers.length - 1; i >= 0; i--) { tracers[i].life -= dt; if (tracers[i].life <= 0) tracers.splice(i, 1); }
  for (let i = flashes.length - 1; i >= 0; i--) { flashes[i].life -= dt; if (flashes[i].life <= 0) flashes.splice(i, 1); }
}

function updateAim(dt) {
  if (!gun.isAiming) { gun.aimDuration = 0; gun.aimTarget = null; return; }
  const p = world.player, dx = mouseX - p.x, dy = mouseY - p.y;
  const hit = raycast(p.x, p.y, dx, dy, CFG.gunRange, p);
  const newTarget = hit?.entity || null;

  if (newTarget !== gun.aimTarget) { gun.aimTarget = newTarget; gun.aimDuration = 0; }
  if (!gun.aimTarget) return;

  gun.aimDuration += dt;
  if (gun.aimDuration >= CFG.intimidateTime && !gun.intimidated.has(gun.aimTarget.id)) {
    gun.intimidated.add(gun.aimTarget.id);
    emitWorldEvent('intimidate', { source: p, target: gun.aimTarget, position: { x: gun.aimTarget.x, y: gun.aimTarget.y }, radius: 200 });
    log(`🔫 你持续瞄准了 ${gun.aimTarget.name}...威慑生效！`, 'gun');
  }
}
