const logEl = document.getElementById('log');
let logCount = 0;

function log(text, type = 'world') {
  const e = document.createElement('div');
  e.className = 'log-entry';
  const n = new Date();
  const ts = `${String(n.getMinutes()).padStart(2, '0')}:${String(n.getSeconds()).padStart(2, '0')}`;
  e.innerHTML = `<span class="log-t">${ts}</span><span class="log-${type}">${text}</span>`;
  logEl.appendChild(e);
  logEl.scrollTop = logEl.scrollHeight;
  if (++logCount > 300) { logEl.removeChild(logEl.firstChild); logCount--; }
}

const world = {
  isRaining: false, rainDrops: [], entities: [], player: null,
  activeBeat: null, packages: [],
  beatCooldown: 5, antiPlotCooldown: 0, tension: 0,
  directorTimer: 6, gameTime: 0,
  caveVisited: false, lastAntiPlotType: null,
  godMode: false, playerDead: false, playerRespawnTimer: 0
};
const tracers = [];
const flashes = [];

let nextId = 0;
function createEntity(cfg) {
  return {
    id: nextId++, name: cfg.name, type: cfg.type, x: cfg.x, y: cfg.y,
    homeX: cfg.x, homeY: cfg.y, homeArea: cfg.homeArea || null,
    tags: cfg.tags || [], faction: cfg.faction || 'neutral',
    hp: cfg.hp || 100, maxHp: cfg.hp || 100,
    speed: cfg.speed || 50, combatPower: cfg.combatPower || 5,
    color: cfg.color, emoji: cfg.emoji || '?',
    state: 'idle', stateTimer: randRange(0.3, 1.5),
    targetX: cfg.x, targetY: cfg.y, targetEntity: null,
    isDirected: false, beatRole: null, visible: true, dead: false,
    respawnTimer: 0, stunTimer: 0, attackTimer: 0,
    bobOffset: Math.random() * Math.PI * 2,
    damageLog: [], flashTimer: 0,
    floatingText: null, floatingTextTimer: 0,
    chatCooldown: randRange(2, 8), memory: [], aggroTarget: null
  };
}

function showFloatingText(e, text, dur = 2) {
  e.floatingText = text;
  e.floatingTextTimer = dur;
}

function addMemory(e, type, detail) {
  e.memory.push({ type, detail, time: world.gameTime });
  if (e.memory.length > 10) e.memory.shift();
}

function hasRecentMemory(e, type, within = 60) {
  return e.memory.some(m => m.type === type && (world.gameTime - m.time) < within);
}

function moveToward(e, tx, ty, dt, sm = 1) {
  const d = Math.hypot(tx - e.x, ty - e.y);
  if (d < 3) return true;
  const s = e.speed * sm * (world.isRaining ? 0.8 : 1) * dt;
  e.x += ((tx - e.x) / d) * Math.min(s, d);
  e.y += ((ty - e.y) / d) * Math.min(s, d);
  return d < 8;
}

function pickWanderTarget(e) {
  const a = e.homeArea ? AREAS[e.homeArea] : null;
  if (a) {
    const p = randomPointInArea(a, 30);
    e.targetX = p.x; e.targetY = p.y;
  } else {
    e.targetX = e.homeX + randRange(-80, 80);
    e.targetY = e.homeY + randRange(-80, 80);
  }
  e.targetX = clamp(e.targetX, 20, W - 20);
  e.targetY = clamp(e.targetY, 20, H - 20);
}

function fleeFrom(e, source, dur) {
  const sx = source.x !== undefined ? source.x : source.x;
  const sy = source.y !== undefined ? source.y : source.y;
  const dx = e.x - sx, dy = e.y - sy, len = Math.hypot(dx, dy) || 1;
  e.state = 'flee';
  e.targetX = clamp(e.x + (dx / len) * 200, 30, W - 30);
  e.targetY = clamp(e.y + (dy / len) * 200, 30, H - 30);
  e.stateTimer = dur;
}

function killEntity(e, killer) {
  e.dead = true; e.visible = false;
  e.respawnTimer = randRange(18, 30);
  e.isDirected = false; e.beatRole = null;
  emitWorldEvent('kill', { source: killer || null, target: e, position: { x: e.x, y: e.y }, radius: 400 });
}

function respawnEntity(e) {
  const a = e.homeArea ? AREAS[e.homeArea] : null;
  if (a) { const p = randomPointInArea(a); e.x = p.x; e.y = p.y; }
  else { e.x = e.homeX; e.y = e.homeY; }
  e.hp = e.maxHp; e.dead = false; e.visible = true;
  e.state = 'idle'; e.stateTimer = randRange(2, 4);
  e.stunTimer = 0; e.damageLog = []; e.aggroTarget = null;
}

function checkPlayerDeath() {
  const p = world.player;
  if (world.godMode || world.playerDead || p.hp > 0) return;
  world.playerDead = true;
  world.playerRespawnTimer = 3;
  p.hp = 0;
  showFloatingText(p, '你倒下了...', 3);
  log(`💀 你被击倒了！`, 'combat');
  p.reputation = clamp(p.reputation - 10, 0, 100);
  log(`📉 声望 -10（丢了面子）`, 'result');
  if (world.activeBeat) {
    resolveBeat(world.activeBeat, 'player_dead', '玩家倒下');
  }
  for (const e of world.entities) {
    if (e === p || e.dead) continue;
    if (_dist(e, p) < 200) {
      if (e.tags.includes('hostile')) showFloatingText(e, pick(['哈哈！', '不自量力！', '弱鸡！']));
      else if (e.tags.includes('civilian')) showFloatingText(e, pick(['天哪！', '快跑！']));
      if (e.state === 'chase' && e.aggroTarget === p) {
        e.state = 'idle'; e.stateTimer = randRange(2, 4);
        e.aggroTarget = null; e.targetEntity = null;
      }
    }
  }
}

function updatePlayerRespawn(dt) {
  if (!world.playerDead) return;
  world.playerRespawnTimer -= dt;
  if (world.playerRespawnTimer <= 0) {
    world.playerDead = false;
    const p = world.player;
    p.hp = p.maxHp;
    p.x = 450; p.y = 380;
    p.flashTimer = 0; p.stunTimer = 0;
    showFloatingText(p, '在集市醒来...', 2);
    log(`🔄 你在集市苏醒了...`, 'world');
  }
}
