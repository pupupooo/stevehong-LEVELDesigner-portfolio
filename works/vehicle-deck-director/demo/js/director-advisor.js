// ═══════════════════════════════════════════
// director-advisor.js — 语义门控 Beat 导演系统 mock
// ═══════════════════════════════════════════
(function() {
  window.DS = window.DS || {};

  const C = DS.Config;

  const ACCESS_LABELS = {
    'world-initiated': '世界主动找上门',
    'world-pressure': '世界压力接入',
    'player-initiated': '玩家接取',
    breathing: '空牌呼吸',
  };

  const BEAT_CONTRACTS = {
    street_challenge: {
      label: 'Street Challenge Beat',
      cnLabel: '街头挑战 Beat',
      familyLabel: '发现机会',
      accessMode: 'world-initiated',
      baseScore: 30,
      events: [
        {
          type: 'midnight_race',
          name: '午夜竞速',
          accessSignal: '闪灯挑衅',
          contract: '挑战车辆贴近玩家，玩家加速即进入检查点竞速。',
        },
        {
          type: 'lane_challenge',
          name: '并线挑衅',
          accessSignal: '近距离并线',
          contract: '短距离压迫玩家路线，要求玩家在限定路段内摆脱对手。',
        },
        {
          type: 'short_chase',
          name: '短程追逐',
          accessSignal: '后车逼近',
          contract: '挑战车追随玩家一段距离，玩家通过路线选择拉开距离。',
        },
      ],
    },
    passenger_pressure: {
      label: 'Passenger Pressure Beat',
      cnLabel: '乘客压力 Beat',
      familyLabel: '请求接入',
      accessMode: 'player-initiated',
      baseScore: 30,
      events: [
        {
          type: 'intimidation_ride',
          name: '恐吓专车',
          accessSignal: '匿名来电',
          contract: '玩家接乘客，通过高速、急转和碰撞把恐惧值推到目标。',
        },
        {
          type: 'escape_tail',
          name: '摆脱跟踪',
          accessSignal: '乘客求助',
          contract: '乘客声称被跟踪，玩家需要用路线和速度摆脱尾车。',
        },
        {
          type: 'thrill_request',
          name: '刺激驾驶',
          accessSignal: '夜店乘客',
          contract: '乘客要求刺激体验，玩家在风险和失控之间维持压力值。',
        },
      ],
    },
    armored_pressure: {
      label: 'Armored Pressure Beat',
      cnLabel: '车队压力 Beat',
      familyLabel: '对峙压力',
      accessMode: 'world-pressure',
      baseScore: 28,
      events: [
        {
          type: 'armored_heist',
          name: '拦截运钞车',
          accessSignal: '车队情报',
          contract: '目标车队进入附近道路，玩家追上并撞停目标车辆。',
        },
        {
          type: 'police_convoy',
          name: '警用押运',
          accessSignal: '临时封控',
          contract: '警用车辆形成移动压力，玩家需要选择绕行、冲破或跟随。',
        },
        {
          type: 'gang_convoy',
          name: '帮派车队',
          accessSignal: '区域威胁',
          contract: '帮派车队控制道路，玩家行为决定其追击或让路。',
        },
      ],
    },
    escort_command: {
      label: 'Escort Command Beat',
      cnLabel: '护送指挥 Beat',
      familyLabel: '护送运送',
      accessMode: 'player-initiated',
      baseScore: 28,
      events: [
        {
          type: 'copilot_command',
          name: '副驾指挥',
          accessSignal: '路边招手',
          contract: '玩家接上 NPC 后，根据副驾即时指令完成路线判断。',
        },
        {
          type: 'priority_pickup',
          name: '紧急接送',
          accessSignal: '路边请求',
          contract: '玩家在有限时间内接送目标，路线稳定性决定评价。',
        },
        {
          type: 'fragile_delivery',
          name: '易碎运送',
          accessSignal: '临时委托',
          contract: '玩家需要在速度和碰撞风险之间完成运送。',
        },
      ],
    },
    blank: {
      label: 'Blank Beat',
      cnLabel: '空牌呼吸',
      familyLabel: '空牌呼吸',
      accessMode: 'breathing',
      baseScore: 22,
      events: [
        {
          type: 'ambient_breath',
          name: '城市呼吸',
          accessSignal: '无任务推送',
          contract: '暂不推送玩法，只保留环境、车流和 POI 氛围反馈。',
        },
      ],
    },
  };

  const BEAT_TYPES = Object.keys(BEAT_CONTRACTS);

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeSnapshot(input) {
    const snapshot = input || {};
    const vehicleId = snapshot.vehicleArchetypeId || 'standard';
    const vehicleDef = C.vehicleArchetypes && C.vehicleArchetypes[vehicleId] ?
      C.vehicleArchetypes[vehicleId] :
      { name: snapshot.vehicleName || '标准车' };
    const deckState = snapshot.deckState || {};
    return {
      speed: Number(snapshot.speed || 0),
      speedState: snapshot.speedState || (Number(snapshot.speed || 0) > C.speedGate.threshold ? 'fast' : 'cruise'),
      heat: Number(snapshot.heat || 0),
      vehicleArchetypeId: vehicleId,
      vehicleName: snapshot.vehicleName || vehicleDef.name || '标准车',
      regionTag: snapshot.regionTag || 'commercial',
      nearbyPoi: snapshot.nearbyPoi || null,
      deckState: {
        remainingByType: deckState.remainingByType || countCardsByType(deckState.drawPile || []),
      },
      recentBeats: snapshot.recentBeats || [],
      isOffroad: !!snapshot.isOffroad,
      triggerReason: snapshot.triggerReason || 'manual_lab',
    };
  }

  function countCardsByType(cards) {
    const counts = {};
    for (const card of cards) {
      counts[card.type] = (counts[card.type] || 0) + 1;
    }
    return counts;
  }

  function addScore(item, amount, reason) {
    item.score += amount;
    if (reason) item.reasons.push(reason);
  }

  function getPlayableCount(snapshot, beatType) {
    const contract = BEAT_CONTRACTS[beatType];
    if (!contract) return 0;
    if (beatType === 'blank') return snapshot.deckState.remainingByType.blank ?? 1;
    let count = 0;
    for (const event of contract.events) {
      count += snapshot.deckState.remainingByType[event.type] ?? 0;
    }
    return count;
  }

  function scoreSemanticFit(beatType, snapshot) {
    const contract = BEAT_CONTRACTS[beatType];
    const fit = {
      type: beatType,
      label: contract.label,
      cnLabel: contract.cnLabel,
      familyLabel: contract.familyLabel,
      accessMode: contract.accessMode,
      accessLabel: ACCESS_LABELS[contract.accessMode],
      score: contract.baseScore,
      reasons: [],
      llmAdvice: '',
    };

    if (beatType === 'street_challenge') {
      if (snapshot.speedState === 'fast') addScore(fit, 30, '高速状态适合街头挑战');
      if (snapshot.vehicleArchetypeId === 'sport') addScore(fit, 24, '跑车身份强化竞速期待');
      if (['nightlife', 'commercial', 'service'].includes(snapshot.regionTag)) addScore(fit, 12, '区域适合车辆挑衅和短程追逐');
      if (snapshot.heat >= 70) addScore(fit, -8, '高热度下街头挑战容易被更强世界压力覆盖');
      fit.llmAdvice = '推荐 Street Challenge Beat；表现上可用闪灯、并线、后车逼近包装，但不直接指定最终事件。';
    }

    if (beatType === 'passenger_pressure') {
      if (snapshot.heat < 40) addScore(fit, 20, '低/中热度适合接入角色请求');
      if (['nightlife', 'gang', 'commercial'].includes(snapshot.regionTag)) addScore(fit, 18, '区域适合乘客委托、匿名来电或路边请求');
      if (snapshot.vehicleArchetypeId === 'police') addScore(fit, -16, '警车身份不适合普通乘客压力包装');
      fit.llmAdvice = '推荐 Passenger Pressure Beat；LLM 可建议乘客身份和来电语气，底层压力规则不变。';
    }

    if (beatType === 'armored_pressure') {
      if (snapshot.heat >= 40) addScore(fit, 24, '警觉热度适合推世界压力');
      if (snapshot.heat >= 70) addScore(fit, 24, '高热度需要回应玩家行为后果');
      if (snapshot.vehicleArchetypeId === 'heavy' || snapshot.vehicleArchetypeId === 'police') {
        addScore(fit, 20, snapshot.vehicleName + ' 身份适合拦截、押运或冲撞压力');
      }
      if (snapshot.nearbyPoi && ['bank_depot', 'police_precinct'].includes(snapshot.nearbyPoi.id)) {
        addScore(fit, 16, '附近 POI 适合车队/押运类压力');
      }
      fit.llmAdvice = '推荐 Armored Pressure Beat；LLM 可解释压力来源，实际车辆和目标由事件池与规则层生成。';
    }

    if (beatType === 'escort_command') {
      if (snapshot.speedState === 'cruise') addScore(fit, 18, '巡航状态适合接人、护送和路线指挥');
      if (snapshot.heat < 40) addScore(fit, 16, '低热度适合低门槛护送事件');
      if (['cafe', 'garage', 'commercial', 'service'].includes(snapshot.regionTag)) addScore(fit, 10, '当前区域适合路边求助或临时接送');
      if (snapshot.heat >= 70) addScore(fit, -26, '高热度下普通护送会削弱世界回应');
      fit.llmAdvice = '推荐 Escort Command Beat；LLM 可建议目的语义，路线指令和完成判定仍由玩法规则生成。';
    }

    if (beatType === 'blank') {
      if (snapshot.heat < 15 && snapshot.speedState === 'cruise') addScore(fit, 16, '低热度巡航需要保留城市呼吸');
      if (snapshot.recentBeats.length >= 2) addScore(fit, 18, '近期事件密集，空牌用于降噪');
      if (snapshot.heat >= 70) addScore(fit, -18, '高热度下不应过度沉默');
      fit.llmAdvice = '推荐暂不推新玩法，只保留环境、车流或 POI 氛围。';
    }

    fit.score = Math.round(clamp(fit.score, 0, 100));
    return fit;
  }

  function applyDirectorPolicy(semanticFit, snapshot) {
    const adjustments = [];
    const adjusted = semanticFit.map((fit) => {
      const next = Object.assign({}, fit, {
        policyScore: fit.score,
        policyReasons: [],
        ruleChecks: buildBeatRuleChecks(fit.type, snapshot),
        status: 'viable',
      });
      const playableCount = getPlayableCount(snapshot, fit.type);

      if (fit.type !== 'blank' && playableCount <= 0) {
        next.policyScore -= 100;
        next.status = 'blocked';
        next.policyReasons.push('事件池没有可用事件');
        adjustments.push({ beatType: fit.type, effect: 'block', reason: '事件池没有可用事件' });
      }

      if (fit.type === 'street_challenge' && snapshot.isOffroad) {
        next.policyScore -= 100;
        next.status = 'blocked';
        next.policyReasons.push('离路状态下不推街头挑战');
        adjustments.push({ beatType: fit.type, effect: 'block', reason: '离路状态不适合街头挑战' });
      }

      if (snapshot.recentBeats.includes(fit.type)) {
        next.policyScore -= 26;
        next.policyReasons.push('近期已出现该 Beat，降低重复感');
        adjustments.push({ beatType: fit.type, effect: 'downweight', reason: '近期重复' });
      }

      if (fit.type === 'blank' && snapshot.recentBeats.includes('blank')) {
        next.policyScore -= 38;
        next.policyReasons.push('上一轮刚空牌，避免连续沉默');
        adjustments.push({ beatType: fit.type, effect: 'downweight', reason: '避免连续空牌' });
      }

      if (fit.type === 'blank' && snapshot.recentBeats.length >= 2 && !snapshot.recentBeats.includes('blank')) {
        next.policyScore += 12;
        next.policyReasons.push('近期事件密集，允许空牌降噪');
        adjustments.push({ beatType: fit.type, effect: 'upweight', reason: '近期事件密集' });
      }

      next.policyScore = Math.round(clamp(next.policyScore, 0, 100));
      if (next.status !== 'blocked' && next.ruleChecks.some(check => !check.pass)) {
        next.status = 'blocked';
      }
      return next;
    }).sort((a, b) => {
      if (a.status === 'blocked' && b.status !== 'blocked') return 1;
      if (a.status !== 'blocked' && b.status === 'blocked') return -1;
      return b.policyScore - a.policyScore;
    });

    return {
      adjustments,
      adjusted,
    };
  }

  function buildBeatRuleChecks(beatType, snapshot) {
    return [
      { label: 'Beat 契约存在', pass: !!BEAT_CONTRACTS[beatType] },
      { label: '事件池可用', pass: beatType === 'blank' || getPlayableCount(snapshot, beatType) > 0 },
      { label: '道路状态可读', pass: beatType === 'street_challenge' ? !snapshot.isOffroad : true },
    ];
  }

  function chooseBeat(policy) {
    return policy.adjusted.find(item => item.status !== 'blocked') || policy.adjusted[0];
  }

  function scoreEvent(event, beat, snapshot) {
    let score = 40;
    const reasons = [];

    const remaining = snapshot.deckState.remainingByType[event.type] ?? 0;
    score += remaining * 5;
    if (remaining > 0) reasons.push('事件池中有 ' + remaining + ' 张可用事件');

    if (event.type === 'midnight_race') {
      if (snapshot.speedState === 'fast') {
        score += 24;
        reasons.push('高速状态适合竞速实例');
      }
      if (snapshot.vehicleArchetypeId === 'sport') {
        score += 18;
        reasons.push('跑车身份适合竞速实例');
      }
    }

    if (event.type === 'intimidation_ride') {
      if (snapshot.heat < 40) {
        score += 18;
        reasons.push('低/中热度适合接入匿名乘客');
      }
      if (['nightlife', 'gang'].includes(snapshot.regionTag)) {
        score += 14;
        reasons.push('区域适合压力乘客包装');
      }
    }

    if (event.type === 'armored_heist') {
      if (snapshot.heat >= 40) {
        score += 18;
        reasons.push('热度适合拦截压力实例');
      }
      if (snapshot.nearbyPoi && snapshot.nearbyPoi.id === 'bank_depot') {
        score += 24;
        reasons.push('金融押运区适合运钞车实例');
      }
    }

    if (event.type === 'copilot_command') {
      if (snapshot.speedState === 'cruise') {
        score += 16;
        reasons.push('巡航状态适合副驾指挥实例');
      }
      if (snapshot.heat < 40) {
        score += 10;
        reasons.push('低热度适合接送/指挥实例');
      }
    }

    if (event.type === 'ambient_breath') {
      if (snapshot.heat < 15) {
        score += 16;
        reasons.push('低热度允许城市呼吸');
      }
      if (snapshot.recentBeats.includes('blank')) {
        score -= 34;
        reasons.push('上一轮刚空牌，降低连续沉默');
      }
    }

    return Object.assign({}, event, {
      beatType: beat.type,
      beatLabel: beat.cnLabel,
      score: Math.round(clamp(score, 0, 100)),
      reasons: reasons.length ? reasons : ['作为 ' + beat.cnLabel + ' 的默认实例候选'],
      status: remaining > 0 || event.type === 'ambient_breath' ? 'viable' : 'blocked',
    });
  }

  function chooseEvent(beat, snapshot) {
    const contract = BEAT_CONTRACTS[beat.type];
    const eventPool = contract.events
      .map(event => scoreEvent(event, beat, snapshot))
      .sort((a, b) => {
        if (a.status === 'blocked' && b.status !== 'blocked') return 1;
        if (a.status !== 'blocked' && b.status === 'blocked') return -1;
        return b.score - a.score;
      });
    const selected = eventPool.find(event => event.status !== 'blocked') || eventPool[0];
    return { eventPool, selected };
  }

  function buildInputSummary(snapshot) {
    return [
      { label: 'player_action', value: snapshot.speedState === 'fast' ? '高速驾驶' : '巡航驾驶' },
      { label: 'vehicle_identity', value: snapshot.vehicleName },
      { label: 'heat', value: Math.round(snapshot.heat) + ' / 100' },
      { label: 'region_tag', value: snapshot.regionTag },
      { label: 'nearby_poi', value: snapshot.nearbyPoi ? snapshot.nearbyPoi.name : '无' },
      { label: 'road_state', value: snapshot.isOffroad ? '离路' : '道路内' },
    ];
  }

  function buildLlmRecommendation(semanticFit) {
    const top = semanticFit[0];
    return {
      recommendedBeatType: top.type,
      recommendedBeatLabel: top.cnLabel,
      reason: top.reasons.slice(0, 3).join('；') || top.llmAdvice,
      advisoryText: top.llmAdvice,
      boundary: 'LLM 只推荐 Beat 类型和理由；Director Policy 与事件池决定最终事件。',
    };
  }

  function buildFinal(beat, eventChoice, llmRecommendation) {
    const selected = eventChoice.selected;
    return {
      type: selected.type,
      name: selected.name,
      beatType: beat.type,
      beatLabel: beat.cnLabel,
      familyLabel: beat.familyLabel,
      accessMode: beat.accessMode,
      accessLabel: beat.accessLabel,
      score: selected.score,
      reason: selected.reasons.slice(0, 3).join('；'),
      accessSignal: selected.accessSignal,
      gameplayContract: selected.contract,
      ruleChecks: beat.ruleChecks,
      llmOutput: {
        allowed: [
          '推荐 Beat 类型',
          '解释推荐理由',
          '建议接入信号和表现语气',
          '提出修饰器与后果编排建议',
        ],
        forbidden: [
          '直接创建新玩法',
          '绕过规则层生成目标',
          '直接修改世界状态',
          '忽略策划定义的事件边界',
        ],
        advisoryText: llmRecommendation.advisoryText,
      },
    };
  }

  DS.DirectorAdvisor = {
    evaluate(input) {
      const snapshot = normalizeSnapshot(input);
      const semanticFit = BEAT_TYPES
        .map(type => scoreSemanticFit(type, snapshot))
        .sort((a, b) => b.score - a.score);
      const llmRecommendation = buildLlmRecommendation(semanticFit);
      const policy = applyDirectorPolicy(semanticFit, snapshot);
      const beatSelection = chooseBeat(policy);
      const eventChoice = chooseEvent(beatSelection, snapshot);
      const final = buildFinal(beatSelection, eventChoice, llmRecommendation);

      return {
        snapshot,
        inputSummary: buildInputSummary(snapshot),
        semanticFit,
        llmRecommendation,
        policy,
        beatSelection,
        eventPool: eventChoice.eventPool,
        eventSelection: eventChoice.selected,
        final,
      };
    },

    getAccessLabel(mode) {
      return ACCESS_LABELS[mode] || mode;
    },
  };
})();
