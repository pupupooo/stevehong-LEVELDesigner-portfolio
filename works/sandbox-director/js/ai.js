function updateIdleAwareness(e, dt) {
  if (e.dead || e === world.player || e.isDirected) return;
  if (e.state === 'chase' || e.state === 'flee' || e.state === 'attack') return;
  e.chatCooldown -= dt;
  if (e.chatCooldown > 0) return;
  const p = world.player;
  if (_dist(e, p) > CFG.idleChatRadius) return;
  e.chatCooldown = CFG.idleChatCooldown + randRange(-3, 3);
  switch (e.type) {
    case 'merchant':
      if (hasRecentMemory(e, 'heard_gunshot', 20)) { showFloatingText(e, pick(['刚才的枪声好吓人...', '你...你有枪？'])); break; }
      if (hasRecentMemory(e, 'witnessed_kill', 30)) { showFloatingText(e, pick(['多谢你之前出手！', '恩人你又来了！'])); break; }
      if (p.reputation >= 60) showFloatingText(e, pick(['欢迎！大英雄！', '生意兴隆，多亏了你']));
      else if (p.reputation <= 20) showFloatingText(e, pick(['别...别过来...', '我没钱...']));
      else showFloatingText(e, pick(['今天天气不错', '要买点什么吗？']));
      break;
    case 'guard':
      if (hasRecentMemory(e, 'heard_gunshot', 20)) { showFloatingText(e, '我在注意你...'); break; }
      if (p.reputation >= 60) showFloatingText(e, pick(['辛苦了，英雄', '一切安好']));
      else if (p.reputation <= 20) showFloatingText(e, pick(['你很可疑...', '别惹事']));
      else showFloatingText(e, pick(['公民，注意安全', '一切正常']));
      break;
    case 'bandit':
      if (hasRecentMemory(e, 'player_is_dangerous', 60) || p.reputation >= 65) { showFloatingText(e, pick(['我没找事...', '别看我...'])); if (_dist(e, p) < 60) fleeFrom(e, p, 3); break; }
      if (p.reputation <= 25) showFloatingText(e, pick(['把值钱的交出来', '找死的']));
      else showFloatingText(e, pick(['看什么看', '识相的快走']));
      break;
    case 'boar':
      if (p.reputation > 50 || hasRecentMemory(e, 'fled_danger', 30)) { showFloatingText(e, '！'); fleeFrom(e, p, 3); }
      break;
    case 'traveler':
      if (hasRecentMemory(e, 'heard_gunshot', 20)) { showFloatingText(e, '你...有枪的人...'); break; }
      if (p.reputation >= 50) showFloatingText(e, pick(['你好！', '旅途愉快！']));
      else showFloatingText(e, pick(['你好...', '路不好走啊']));
      break;
  }
}

function updateEntityAI(e, dt) {
  if (e.dead) { e.respawnTimer -= dt; if (e.respawnTimer <= 0) respawnEntity(e); return; }
  if (e.stunTimer > 0) { e.stunTimer -= dt; return; }
  if (e.isDirected) return;
  if (e.floatingTextTimer > 0) e.floatingTextTimer -= dt;
  if (e.flashTimer > 0) e.flashTimer -= dt;
  e.bobOffset += dt * 2;
  updateIdleAwareness(e, dt);
  switch (e.type) {
    case 'merchant': merchantAI(e, dt); break;
    case 'guard':    guardAI(e, dt); break;
    case 'bandit':   banditAI(e, dt); break;
    case 'boar':     boarAI(e, dt); break;
    case 'traveler': travelerAI(e, dt); break;
  }
}

function merchantAI(e, dt) {
  switch (e.state) {
    case 'idle': e.stateTimer -= dt; if (e.stateTimer <= 0) { e.state = 'wander'; pickWanderTarget(e); } break;
    case 'wander': if (moveToward(e, e.targetX, e.targetY, dt, 0.6)) { e.state = 'idle'; e.stateTimer = randRange(3, 7); } break;
    case 'flee': moveToward(e, e.targetX, e.targetY, dt, 1.5); e.stateTimer -= dt; if (e.stateTimer <= 0) { e.state = 'idle'; e.stateTimer = randRange(2, 4); } break;
  }
}

function guardAI(e, dt) {
  switch (e.state) {
    case 'idle':
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.state = 'patrol';
        const pt = pick([{ x: 750, y: 100 }, { x: 500, y: 250 }, { x: 600, y: 400 }, { x: 800, y: 200 }, { x: 450, y: 350 }]);
        e.targetX = pt.x; e.targetY = pt.y;
      }
      break;
    case 'patrol': if (moveToward(e, e.targetX, e.targetY, dt, 0.7)) { e.state = 'idle'; e.stateTimer = randRange(3, 6); } break;
    case 'chase':
      if (e.targetEntity && !e.targetEntity.dead) {
        if (moveToward(e, e.targetEntity.x, e.targetEntity.y, dt, 1.2)) {
          if (e.targetEntity === world.player) {
            showFloatingText(e, '你被逮捕了！');
            world.player.reputation = clamp(world.player.reputation - 15, 0, 100);
            log(`🚨 ${e.name} 抓住了你！声望-15`, 'combat');
            e.state = 'idle'; e.stateTimer = 5; e.aggroTarget = null; e.targetEntity = null;
          } else {
            const dmg = e.combatPower + randInt(3, 8);
            e.targetEntity.hp -= dmg; e.targetEntity.flashTimer = 0.2;
            showFloatingText(e.targetEntity, `-${dmg}`);
            if (e.targetEntity.hp <= 0) { killEntity(e.targetEntity, e); }
            e.state = 'idle'; e.stateTimer = 3; e.aggroTarget = null; e.targetEntity = null;
          }
        }
      } else { e.state = 'idle'; e.stateTimer = 2; e.aggroTarget = null; }
      break;
  }
}

function banditAI(e, dt) {
  const p = world.player;
  if (e.state !== 'flee' && e.state !== 'chase' && hasRecentMemory(e, 'player_is_dangerous', 60) && _dist(e, p) < 120) {
    fleeFrom(e, p, 3); return;
  }
  switch (e.state) {
    case 'idle': e.stateTimer -= dt; if (e.stateTimer <= 0) { e.state = 'wander'; pickWanderTarget(e); } break;
    case 'wander': if (moveToward(e, e.targetX, e.targetY, dt, 0.7)) { e.state = 'idle'; e.stateTimer = randRange(2, 4); } break;
    case 'chase':
      if (e.targetEntity && !e.targetEntity.dead) {
        if (moveToward(e, e.targetEntity.x, e.targetEntity.y, dt, 1)) { e.state = 'attack'; e.attackTimer = 0; }
      } else { e.state = 'idle'; e.stateTimer = 2; e.aggroTarget = null; }
      break;
    case 'attack':
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        const t = e.targetEntity;
        if (t && !t.dead && _dist(e, t) < 50) {
          const dmg = e.combatPower + randInt(1, 5);
          t.hp -= dmg; t.flashTimer = 0.2;
          t.damageLog.push({ source: e.name, amount: dmg, time: world.gameTime });
          showFloatingText(t, `-${dmg}`);
          if (t !== world.player) emitWorldEvent('combat_nearby', { source: e, target: t, position: { x: e.x, y: e.y }, involves_civilian: t.tags.includes('civilian'), aggressor: e });
          if (t.hp <= 0) { killEntity(t, e); e.state = 'idle'; e.stateTimer = 3; }
          e.attackTimer = 1.5;
        } else { e.state = 'idle'; e.stateTimer = 2; e.aggroTarget = null; }
      }
      break;
    case 'flee':
      moveToward(e, e.targetX, e.targetY, dt, 1.8); e.stateTimer -= dt;
      if (e.stateTimer <= 0) { e.state = 'idle'; e.stateTimer = randRange(3, 5); }
      break;
  }
}

function boarAI(e, dt) {
  switch (e.state) {
    case 'idle': e.stateTimer -= dt; if (e.stateTimer <= 0) { e.state = 'wander'; pickWanderTarget(e); } break;
    case 'wander': if (moveToward(e, e.targetX, e.targetY, dt, 0.7)) { e.state = 'idle'; e.stateTimer = randRange(1.5, 4); } break;
    case 'chase':
      if (e.targetEntity && !e.targetEntity.dead) {
        if (moveToward(e, e.targetEntity.x, e.targetEntity.y, dt, 1.4)) {
          const dmg = 20 + randInt(5, 15);
          e.targetEntity.hp -= dmg; e.targetEntity.flashTimer = 0.3;
          showFloatingText(e.targetEntity, `-${dmg}🐗`);
          e.targetEntity.damageLog.push({ source: 'boar', amount: dmg, time: world.gameTime });
          if (e.targetEntity.hp <= 0) killEntity(e.targetEntity, e);
          e.state = 'wander'; pickWanderTarget(e);
        }
      } else { e.state = 'idle'; e.stateTimer = 2; }
      break;
    case 'flee':
      moveToward(e, e.targetX, e.targetY, dt, 1.6); e.stateTimer -= dt;
      if (e.stateTimer <= 0) { e.state = 'idle'; e.stateTimer = 3; }
      break;
  }
}

function travelerAI(e, dt) {
  switch (e.state) {
    case 'idle':
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.state = 'wander';
        e.targetX = e.x < W / 2 ? randRange(600, 860) : randRange(40, 300);
        e.targetY = randRange(AREAS.road.y + 10, AREAS.road.y + AREAS.road.h - 10);
      }
      break;
    case 'wander': if (moveToward(e, e.targetX, e.targetY, dt, 0.5)) { e.state = 'idle'; e.stateTimer = randRange(4, 8); } break;
    case 'flee': moveToward(e, e.targetX, e.targetY, dt, 1.3); e.stateTimer -= dt; if (e.stateTimer <= 0) { e.state = 'idle'; e.stateTimer = 3; } break;
  }
}
