const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function render() {
  ctx.clearRect(0, 0, W, H);
  renderWorld(); renderRain(); renderEntities(); renderPackages();
  renderBeatIndicators(); renderAimLine(); renderTracers(); renderFlashes(); renderPlayerUI();
  renderPlayerHP();
  if (world.playerDead) {
    ctx.fillStyle = 'rgba(20,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e94560'; ctx.font = 'bold 28px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('你倒下了', W / 2, H / 2 - 20);
    ctx.fillStyle = '#7a8aaa'; ctx.font = '14px "Microsoft YaHei",sans-serif';
    const sec = Math.ceil(world.playerRespawnTimer);
    ctx.fillText(`${sec} 秒后在集市苏醒...`, W / 2, H / 2 + 15);
  }
  if (world.godMode) {
    ctx.fillStyle = 'rgba(255,215,0,0.6)'; ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('GOD MODE', 10, H - 16);
  }
}

function renderWorld() {
  ctx.fillStyle = COLORS.grass; ctx.fillRect(0, 0, W, H);
  for (const k in AREAS) { const a = AREAS[k]; ctx.fillStyle = a.color; ctx.fillRect(a.x, a.y, a.w, a.h); ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 1; ctx.strokeRect(a.x, a.y, a.w, a.h); }
  ctx.fillStyle = '#5a5040'; ctx.fillRect(280, 250, 90, 12); ctx.fillRect(590, 250, 120, 12);
  for (const b of BUILDINGS) { ctx.fillStyle = '#6a6050'; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.fillStyle = '#5a5040'; ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4); ctx.fillStyle = '#7a7060'; ctx.fillRect(b.x + b.w * 0.3, b.y + b.h - 12, 10, 12); }
  for (const t of TREES) { ctx.fillStyle = COLORS.treeDark; ctx.beginPath(); ctx.arc(t.x, t.y, 16, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = COLORS.tree; ctx.beginPath(); ctx.arc(t.x, t.y - 3, 13, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#1a1a25'; ctx.fillRect(AREAS.cave.x + 20, AREAS.cave.y + 10, 60, 50); ctx.fillStyle = '#2a2a35'; ctx.beginPath(); ctx.arc(AREAS.cave.x + 50, AREAS.cave.y + 10, 35, Math.PI, 0); ctx.fill();
  const st = AREAS.station;
  ctx.fillStyle = '#5a4a3a'; ctx.fillRect(st.x + 15, st.y + 15, 55, 40);
  ctx.fillStyle = '#4a3a2a'; ctx.fillRect(st.x + 17, st.y + 17, 51, 36);
  ctx.fillStyle = '#6a5a4a'; ctx.fillRect(st.x + 35, st.y + 40, 12, 15);
  ctx.font = '10px monospace'; ctx.textAlign = 'center';
  ctx.fillStyle = '#9a8a7a'; ctx.fillText('驿 站', st.x + st.w / 2, st.y + st.h + 10);
  ctx.fillStyle = '#6a7a5a'; ctx.fillText('森 林', 140, AREAS.forest.h + 15);
  ctx.fillStyle = '#8a7a6a'; ctx.fillText('集 市', AREAS.market.x + AREAS.market.w / 2, AREAS.market.y - 8);
  ctx.fillStyle = '#7a7a8a'; ctx.fillText('卫兵营', AREAS.guardPost.x + AREAS.guardPost.w / 2, AREAS.guardPost.y - 8);
  ctx.fillStyle = '#7a6a5a'; ctx.fillText('道 路', W / 2, AREAS.road.y + AREAS.road.h + 15);
  ctx.fillStyle = '#aaa'; ctx.fillText('洞穴', AREAS.cave.x + 50, AREAS.cave.y + 80);
}

function renderRain() {
  if (!world.isRaining) return;
  ctx.strokeStyle = 'rgba(130,170,255,.35)'; ctx.lineWidth = 1;
  for (const d of world.rainDrops) { ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 1.5, d.y + d.len); ctx.stroke(); }
}

function updateRain(dt) {
  if (!world.isRaining) return;
  for (const d of world.rainDrops) { d.y += d.speed * dt; d.x -= 30 * dt; if (d.y > H) { d.y = -d.len; d.x = Math.random() * (W + 50); } if (d.x < -10) d.x = W + 10; }
}

function renderAimLine() {
  if (!gun.isAiming) return;
  const p = world.player;
  const dx = mouseX - p.x, dy = mouseY - p.y, len = Math.hypot(dx, dy);
  if (len < 5) return;
  const ndx = dx / len, ndy = dy / len;
  const endX = p.x + ndx * CFG.gunRange, endY = p.y + ndy * CFG.gunRange;

  const hasTarget = gun.aimTarget && !gun.aimTarget.dead;
  const col = hasTarget ? 'rgba(233,69,96,' : 'rgba(200,200,200,';
  const alpha = hasTarget ? (0.4 + Math.sin(world.gameTime * 6) * 0.15) : 0.2;

  ctx.strokeStyle = col + alpha + ')'; ctx.lineWidth = hasTarget ? 2 : 1; ctx.setLineDash([8, 6]);
  ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(endX, endY); ctx.stroke(); ctx.setLineDash([]);

  const sz = hasTarget ? 8 : 5;
  ctx.strokeStyle = col + (0.6) + ')'; ctx.lineWidth = hasTarget ? 2 : 1;
  ctx.beginPath(); ctx.moveTo(mouseX - sz, mouseY); ctx.lineTo(mouseX + sz, mouseY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(mouseX, mouseY - sz); ctx.lineTo(mouseX, mouseY + sz); ctx.stroke();
  if (hasTarget) { ctx.beginPath(); ctx.arc(mouseX, mouseY, sz + 2, 0, Math.PI * 2); ctx.stroke(); }

  if (hasTarget && gun.aimDuration > 0) {
    const prog = Math.min(gun.aimDuration / CFG.intimidateTime, 1);
    ctx.strokeStyle = `rgba(233,69,96,${prog * 0.6})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(gun.aimTarget.x, gun.aimTarget.y, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog); ctx.stroke();
  }
}

function renderTracers() {
  for (const t of tracers) {
    const a = t.life / 0.25;
    ctx.strokeStyle = `rgba(255,200,60,${a})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(t.x1, t.y1); ctx.lineTo(t.x2, t.y2); ctx.stroke();
  }
}

function renderFlashes() {
  for (const f of flashes) {
    const a = f.life / 0.15;
    ctx.fillStyle = `rgba(255,240,180,${a * 0.6})`; ctx.beginPath(); ctx.arc(f.x, f.y, 12 * a, 0, Math.PI * 2); ctx.fill();
  }
}

function renderEntities() {
  const sorted = [...world.entities].sort((a, b) => a.y - b.y);
  for (const e of sorted) if (e.visible) renderEntity(e);
}

function renderPackages() {
  for (const pkg of world.packages) {
    if (pkg.found) continue;
    const pulse = (Math.sin(world.gameTime * 3) + 1) / 2;
    ctx.fillStyle = `rgba(139,69,19,${0.7 + pulse * 0.3})`; ctx.fillRect(pkg.x - 8, pkg.y - 6, 16, 12);
    ctx.strokeStyle = `rgba(160,82,45,${0.8 + pulse * 0.2})`; ctx.lineWidth = 2; ctx.strokeRect(pkg.x - 8, pkg.y - 6, 16, 12);
    ctx.fillStyle = '#d4a574'; ctx.fillRect(pkg.x - 2, pkg.y - 6, 4, 12);
    ctx.font = '10px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('📦', pkg.x, pkg.y - 14);
    if (_dist(world.player, pkg) < 60) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = '10px "Microsoft YaHei",sans-serif'; ctx.fillText('[E] 拾取包裹', pkg.x, pkg.y + 20); }
  }
}

function renderEntity(e) {
  const isP = e === world.player, bobY = Math.sin(e.bobOffset) * (isP ? 1 : 2), dx = e.x, dy = e.y + bobY, r = isP ? 14 : 11;
  if (e.flashTimer > 0) { ctx.fillStyle = 'rgba(255,60,60,.4)'; ctx.beginPath(); ctx.arc(dx, dy, r + 6, 0, Math.PI * 2); ctx.fill(); }
  if (e.beatRole) { ctx.strokeStyle = e.beatRole === 'aggressor' ? '#e94560' : e.beatRole === 'victim' ? '#50e080' : '#f0a030'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(dx, dy, r + 8, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  if (isP) { ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.beginPath(); ctx.arc(dx, dy, 55, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = e.stunTimer > 0 ? '#888' : e.color; ctx.beginPath(); ctx.arc(dx, dy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = isP ? '#fff' : 'rgba(0,0,0,.3)'; ctx.lineWidth = isP ? 2.5 : 1.5; ctx.beginPath(); ctx.arc(dx, dy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = `${isP ? 16 : 14}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(isP && gun.isAiming ? '🔫' : e.emoji, dx, dy);
  ctx.fillStyle = isP ? '#fff' : '#ccc'; ctx.font = '10px "Microsoft YaHei",sans-serif'; ctx.textBaseline = 'top'; ctx.fillText(e.name, dx, dy + r + 4);
  if (!isP && e.hp < e.maxHp) { const bw = 24, bh = 3, bx = dx - bw / 2, by = dy + r + 16; ctx.fillStyle = '#333'; ctx.fillRect(bx, by, bw, bh); ctx.fillStyle = e.hp > e.maxHp * 0.5 ? '#4c4' : e.hp > e.maxHp * 0.25 ? '#cc4' : '#c44'; ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh); }
  if (e.stunTimer > 0) { ctx.fillStyle = '#ff0'; ctx.font = '12px serif'; ctx.textBaseline = 'bottom'; ctx.fillText('💫', dx + 10, dy - r); }
  if (!isP) { ctx.fillStyle = 'rgba(150,150,150,.4)'; ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(e.state, dx, dy + r + (e.hp < e.maxHp ? 22 : 16)); }
  if (e.floatingTextTimer > 0 && e.floatingText) {
    const al = Math.min(1, e.floatingTextTimer), oY = (2 - e.floatingTextTimer) * 15;
    ctx.globalAlpha = al; ctx.font = 'bold 11px "Microsoft YaHei",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const tw = ctx.measureText(e.floatingText).width;
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(dx - tw / 2 - 4, dy - r - 20 - oY - 14, tw + 8, 18);
    ctx.fillStyle = '#fff'; ctx.fillText(e.floatingText, dx, dy - r - 20 - oY);
    ctx.globalAlpha = 1;
  }
}

function renderBeatIndicators() {
  const b = world.activeBeat; if (!b || b.phase === 'done') return;
  if (b.template.id === 'confrontation') {
    const ag = b.actors.aggressor, vi = b.actors.victim;
    if (ag && vi && !ag.dead && !vi.dead) { ctx.strokeStyle = 'rgba(233,69,96,.4)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(ag.x, ag.y); ctx.lineTo(vi.x, vi.y); ctx.stroke(); ctx.setLineDash([]); }
    if (b.actors.interruptor && !b.actors.interruptor.dead) { const i = b.actors.interruptor; ctx.strokeStyle = 'rgba(240,160,48,.5)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(i.x, i.y); ctx.lineTo(ag ? ag.x : vi.x, ag ? ag.y : vi.y); ctx.stroke(); ctx.setLineDash([]); }
  }
  if (b.template.id === 'discovery') { const c = AREAS.cave, pulse = (Math.sin(world.gameTime * 3) + 1) / 2; ctx.strokeStyle = `rgba(160,128,224,${0.3 + pulse * 0.3})`; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(c.x + c.w / 2, c.y + c.h / 2, 60 + pulse * 10, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  if (b.template.id === 'request') {
    const req = b.actors.requester;
    if (req && !req.dead) {
      const pulse = (Math.sin(world.gameTime * 4) + 1) / 2;
      ctx.strokeStyle = `rgba(80,224,128,${0.4 + pulse * 0.3})`; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(req.x, req.y, 25 + pulse * 8, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(80,224,128,.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(req.x, req.y); ctx.lineTo(world.player.x, world.player.y); ctx.stroke();
      if (b.searchPhase === 'returning') {
        ctx.fillStyle = 'rgba(80,224,128,0.9)'; ctx.font = 'bold 10px "Microsoft YaHei",sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText('📦 交付包裹', req.x, req.y - 25);
      }
    }
    if (b.actors.ambusher && !b.actors.ambusher.dead) { const amb = b.actors.ambusher; ctx.strokeStyle = 'rgba(233,69,96,.5)'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(amb.x, amb.y, 20, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  }
  if (b.template.id === 'escort') {
    const esc = b.actors.escortee;
    if (esc && !esc.dead) {
      const pulse = (Math.sin(world.gameTime * 3) + 1) / 2;
      ctx.strokeStyle = `rgba(200,180,80,${0.4 + pulse * 0.3})`; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(esc.x, esc.y, 22 + pulse * 6, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      if (b.escortPhase === 'walking') {
        const dest = AREAS.station;
        ctx.strokeStyle = 'rgba(200,180,80,.25)'; ctx.lineWidth = 1; ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.moveTo(esc.x, esc.y); ctx.lineTo(dest.x + dest.w / 2, dest.y + dest.h / 2); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(200,180,80,0.9)'; ctx.font = 'bold 10px "Microsoft YaHei",sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText('🛡️ 护送中 → 驿站', esc.x, esc.y - 22);
      }
    }
  }
}

function renderPlayerUI() {
  const p = world.player;
  const b = world.activeBeat;
  if (b && (b.template.id === 'request' || b.template.id === 'escort') && b.phase === 'active' && !b.playerAccepted && !b.playerDeclined) {
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(p.x - 60, p.y - 50, 120, 36);
    ctx.fillStyle = '#50e080'; ctx.font = 'bold 12px "Microsoft YaHei",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const isEscort = b.template.id === 'escort';
    ctx.fillText(isEscort ? `[E] 接受护送` : `[E] 接受请求`, p.x, p.y - 32);
    ctx.fillStyle = '#e94560';
    ctx.fillText(isEscort ? `[R] 拒绝护送` : `[R] 拒绝请求`, p.x, p.y - 18);
    return;
  }
  const near = world.entities.filter(e => e !== p && !e.dead && _dist(e, p) < 55).sort((a, b) => _dist(a, p) - _dist(b, p))[0];
  if (near && !gun.isAiming) { ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = '11px "Microsoft YaHei",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; const act = near.tags.includes('hostile') || near.tags.includes('animal') ? '攻击' : '交谈'; ctx.fillText(`[E] ${act}: ${near.name}`, p.x, p.y - 28); }

  if (gun.isAiming) {
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(p.x - 30, p.y + 20, 60, 14);
    ctx.fillStyle = gun.ammo > 2 ? '#50e080' : gun.ammo > 0 ? '#f0a030' : '#e94560';
    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(gun.reloading ? '装弹中...' : `🔫 ${gun.ammo}/${CFG.maxAmmo}`, p.x, p.y + 22);
  }
}

function renderPlayerHP() {
  const p = world.player;
  if (p.hp >= p.maxHp && !world.playerDead) return;
  const bw = 36, bh = 4, bx = p.x - bw / 2, by = p.y + 18;
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
  ctx.fillStyle = '#333'; ctx.fillRect(bx, by, bw, bh);
  const ratio = Math.max(0, p.hp / p.maxHp);
  ctx.fillStyle = ratio > 0.5 ? '#4c4' : ratio > 0.25 ? '#cc4' : '#c44';
  ctx.fillRect(bx, by, bw * ratio, bh);
}
