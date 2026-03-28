function emitWorldEvent(eventType, data) {
  const pos = data.position || (data.source ? { x: data.source.x, y: data.source.y } : null);
  if (!pos) return;
  const radius = data.radius || CFG.eventBroadcastRadius;
  for (const entity of world.entities) {
    if (entity.dead || entity === data.source || entity === data.target) continue;
    if (_dist(entity, pos) > radius) continue;
    reactToWorldEvent(entity, eventType, data);
  }
}

function reactToWorldEvent(entity, evt, data) {
  if (entity.isDirected && entity.beatRole) return;
  if (entity === world.player) return;
  switch (entity.type) {
    case 'merchant': merchantReaction(entity, evt, data); break;
    case 'guard':    guardReaction(entity, evt, data); break;
    case 'bandit':   banditReaction(entity, evt, data); break;
    case 'boar':     boarReaction(entity, evt, data); break;
    case 'traveler': travelerReaction(entity, evt, data); break;
  }
}

function merchantReaction(e, evt, data) {
  const byPlayer = data.source === world.player, victim = data.target;
  if (evt === 'kill') {
    addMemory(e, 'witnessed_kill', { killer: data.source?.name, victim: victim?.name, victimHostile: victim?.tags?.includes('hostile') });
    if (byPlayer && victim?.tags?.includes('hostile')) { showFloatingText(e, pick(['太感谢你了！', '英雄！'])); log(`💬 ${e.name}: "太感谢你了！"`, 'reaction'); }
    else if (byPlayer && victim?.tags?.includes('civilian')) { showFloatingText(e, '杀人了！！'); fleeFrom(e, data.source, 5); log(`😱 ${e.name} 惊恐地逃跑了！`, 'reaction'); }
    else if (!byPlayer) { fleeFrom(e, data.position || data.source, 4); }
  }
  if (evt === 'combat_nearby' && !hasRecentMemory(e, 'fled_combat', 8)) { addMemory(e, 'fled_combat', {}); fleeFrom(e, data.position || data.source, 4); log(`🏃 ${e.name} 被战斗吓到，逃跑`, 'reaction'); }
  if (evt === 'gunshot') { addMemory(e, 'heard_gunshot', {}); showFloatingText(e, pick(['枪声！', '有人开枪！'])); fleeFrom(e, data.position, 5); log(`😱 ${e.name} 听到枪声，惊恐逃跑！`, 'reaction'); }
  if (evt === 'intimidate' && data.target === e) { showFloatingText(e, '不要！别对着我！', 2.5); log(`😰 ${e.name}: "不要！求你别开枪！"`, 'reaction'); fleeFrom(e, world.player, 4); }
}

function guardReaction(e, evt, data) {
  const byPlayer = data.source === world.player, victim = data.target;
  if (evt === 'kill') {
    addMemory(e, 'witnessed_kill', { killer: data.source?.name, victim: victim?.name });
    if (byPlayer && victim?.tags?.includes('hostile')) { showFloatingText(e, pick(['干得好！', '正义！'])); log(`💬 ${e.name}: "干得好，公民！"`, 'reaction'); }
    else if (byPlayer && victim?.tags?.includes('civilian')) { showFloatingText(e, '住手！你被捕了！'); e.state = 'chase'; e.targetEntity = world.player; e.aggroTarget = world.player; log(`🚨 ${e.name} 开始追捕你！`, 'reaction'); }
    else if (!byPlayer && data.source?.tags?.includes('hostile')) { e.state = 'chase'; e.targetEntity = data.source; e.aggroTarget = data.source; log(`🚨 ${e.name} 追捕凶手！`, 'reaction'); }
  }
  if (evt === 'combat_nearby' && data.involves_civilian && data.aggressor && !data.aggressor.dead && e.state !== 'chase') {
    e.state = 'chase'; e.targetEntity = data.aggressor; e.aggroTarget = data.aggressor; log(`🚨 ${e.name} 听到动静，前去调查！`, 'reaction');
  }
  if (evt === 'gunshot') {
    addMemory(e, 'heard_gunshot', { shooter: data.source?.name });
    showFloatingText(e, '什么情况！');
    log(`🚨 ${e.name} 听到枪声，前去调查！`, 'reaction');
    e.state = 'patrol'; e.targetX = data.position.x; e.targetY = data.position.y;
    if (data.source === world.player && world.player.reputation < 25) {
      e.state = 'chase'; e.targetEntity = world.player; e.aggroTarget = world.player;
      log(`🚨 ${e.name}: "那个人有前科！抓住他！"`, 'reaction');
    }
  }
  if (evt === 'crime_witnessed' && data.suspect === world.player) {
    showFloatingText(e, '站住！你被捕了！');
    e.state = 'chase'; e.targetEntity = world.player; e.aggroTarget = world.player;
    log(`🚨 ${e.name}: "抓住那个贼！"`, 'reaction');
  }
  if (evt === 'intimidate' && data.source === world.player) {
    showFloatingText(e, '放下武器！');
    log(`🚨 ${e.name}: "放下你的武器！否则后果自负！"`, 'reaction');
    if (e.state !== 'chase') { e.state = 'chase'; e.targetEntity = world.player; e.aggroTarget = world.player; }
  }
}

function banditReaction(e, evt, data) {
  const byPlayer = data.source === world.player, victim = data.target;
  if (evt === 'kill') {
    addMemory(e, 'witnessed_kill', { killer: data.source?.name });
    if (byPlayer && victim?.tags?.includes('hostile')) {
      if (world.player.reputation > 60 || world.player.combatPower > e.combatPower * 1.5) { showFloatingText(e, pick(['饶命！', '我不想死！'])); fleeFrom(e, world.player, 6); log(`😰 ${e.name} 看到同伴被杀，逃跑了！`, 'reaction'); }
      else { showFloatingText(e, '给大哥报仇！'); e.state = 'chase'; e.targetEntity = world.player; e.aggroTarget = world.player; log(`😡 ${e.name} 冲向你报仇！`, 'reaction'); }
    }
  }
  if (evt === 'gunshot') {
    addMemory(e, 'player_is_dangerous', {});
    if (data.source === world.player && _dist(e, data.position) < 300) {
      showFloatingText(e, pick(['有枪！', '快躲！'])); fleeFrom(e, data.position, 4); log(`😰 ${e.name} 听到枪声，仓皇逃窜！`, 'reaction');
    }
  }
  if (evt === 'intimidate' && data.target === e) {
    addMemory(e, 'player_is_dangerous', {});
    if (world.player.reputation > 50 || world.player.combatPower > e.combatPower) {
      showFloatingText(e, pick(['别开枪！我投降！', '大哥饶命！']));
      log(`😰 ${e.name} 被你的枪口吓住了: "别开枪！我投降！"`, 'gun');
      fleeFrom(e, world.player, 6);
      if (e.beatRole === 'aggressor' && world.activeBeat) {
        log(`📊 玩家威慑改变了对峙走向！`, 'result');
        log(`🏷️ 情感标签: [反高潮] [枪口下的和平]`, 'result');
        resolveBeat(world.activeBeat, 'player_intimidation', '玩家举枪威慑');
      }
    } else {
      showFloatingText(e, pick(['你吓不到我！', '有种就开枪！']));
      log(`😤 ${e.name}: "你吓不到我！有种就开枪！"`, 'gun');
    }
  }
  if (evt === 'combat_nearby' && data.source === world.player) { addMemory(e, 'player_is_dangerous', {}); }
}

function boarReaction(e, evt, data) {
  if (evt === 'kill' || evt === 'combat_nearby' || evt === 'gunshot') {
    if (!hasRecentMemory(e, 'fled_danger', 8)) { addMemory(e, 'fled_danger', {}); showFloatingText(e, '！！'); fleeFrom(e, data.position || data.source, 5); }
  }
}

function travelerReaction(e, evt, data) {
  const byPlayer = data.source === world.player, victim = data.target;
  if (evt === 'kill') {
    addMemory(e, 'witnessed_kill', { killer: data.source?.name, victim: victim?.name });
    if (byPlayer && victim?.tags?.includes('hostile')) { showFloatingText(e, '好厉害！'); log(`💬 ${e.name}: "好厉害！"`, 'reaction'); }
    else if (byPlayer && victim?.tags?.includes('civilian')) { showFloatingText(e, '杀人犯！'); fleeFrom(e, data.source, 6); }
    else { fleeFrom(e, data.position || data.source, 4); }
  }
  if (evt === 'combat_nearby' && !hasRecentMemory(e, 'fled_combat', 8)) { addMemory(e, 'fled_combat', {}); fleeFrom(e, data.position || data.source, 4); }
  if (evt === 'gunshot') { addMemory(e, 'heard_gunshot', {}); showFloatingText(e, '有枪声！'); fleeFrom(e, data.position, 5); log(`🏃 ${e.name} 听到枪声逃跑了！`, 'reaction'); }
  if (evt === 'intimidate' && data.target === e) { showFloatingText(e, '请别伤害我！'); fleeFrom(e, world.player, 5); log(`😰 ${e.name}: "请别伤害我！"`, 'reaction'); }
}
