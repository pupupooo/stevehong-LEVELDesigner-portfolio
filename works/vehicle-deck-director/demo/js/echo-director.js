// ═══════════════════════════════════════════
// echo-director.js — 行为回响导演层：Snapshot → Episode → Echo → Beat Bias
// ═══════════════════════════════════════════
(function() {
  window.DS = window.DS || {};

  const BEAT_ZERO = {
    street_challenge: 0,
    passenger_pressure: 0,
    armored_pressure: 0,
    escort_command: 0,
    blank: 0,
  };

  const SCENARIOS = {
    police_high_speed: {
      label: '高速掠过警局',
      vehicle: 'sport',
      speed: 118,
      heat: 24,
      poiId: 'police_precinct',
      region: 'authority',
      episode: {
        id: 'episode.police_high_speed',
        label: '高速掠过警局',
        evidence: ['速度 > 100km/h', 'POI = 警局', '玩家没有接入任务但持续制造压力'],
        echoTag: 'Echo.Recent.PoliceProvoker',
        beatBias: { armored_pressure: 28, street_challenge: 12, blank: -10 },
      },
    },
    bank_heavy_block: {
      label: '重卡堵银行入口',
      vehicle: 'heavy',
      speed: 8,
      heat: 46,
      poiId: 'bank_depot',
      region: 'finance',
      episode: {
        id: 'episode.bank_heavy_block',
        label: '重卡堵银行入口',
        evidence: ['车辆身份 = 重型车', 'POI = 金融押运区', '低速停留形成封堵语义'],
        echoTag: 'Echo.Recent.RobberySetup',
        beatBias: { armored_pressure: 38, passenger_pressure: 8, blank: -12 },
      },
    },
    residential_danger: {
      label: '居民区危险驾驶',
      vehicle: 'gang',
      speed: 96,
      heat: 34,
      poiId: 'residential_gate',
      region: 'residential',
      episode: {
        id: 'episode.residential_danger',
        label: '居民区连续危险驾驶',
        evidence: ['连续高速', '高风险车辆身份', '居民/商业混合区热度上升'],
        echoTag: 'Echo.District.HostilityUp',
        beatBias: { passenger_pressure: 20, armored_pressure: 18, blank: -8 },
      },
    },
  };

  function cloneBeatZero() {
    return Object.assign({}, BEAT_ZERO);
  }

  function now() {
    return DS.Director ? DS.Director.gameTime : 0;
  }

  function makeEpisode(id, label, evidence, echoTag, beatBias, source) {
    return {
      id,
      label,
      evidence: evidence.slice(),
      echoTag,
      beatBias: Object.assign({}, beatBias),
      source: source || 'live',
      createdAt: now(),
      lastSeenAt: now(),
      seenCount: 1,
    };
  }

  function pushLog(state, text) {
    state.log.push(text);
    if (state.log.length > 8) state.log.shift();
  }

  function rememberEpisode(state, episode) {
    if (!episode) return;
    const existing = state.episodes.find(item => item.id === episode.id);
    if (existing) {
      existing.lastSeenAt = now();
      existing.seenCount += 1;
      existing.evidence = episode.evidence.slice();
      return;
    }

    state.episodes.push(episode);
    if (state.episodes.length > 6) state.episodes.shift();
    pushLog(state, 'Episode: ' + episode.label + ' → ' + episode.echoTag);

    if (DS.Events) {
      DS.Events.emit('director_log', {
        time: now(),
        message: 'Echo Episode: ' + episode.label + ' → ' + episode.echoTag,
        type: 'director',
      });
    }
  }

  function collectEchoTags(episodes) {
    const tags = [];
    for (const episode of episodes) {
      if (episode.echoTag && !tags.includes(episode.echoTag)) tags.push(episode.echoTag);
    }
    return tags;
  }

  function collectBias(episodes) {
    const bias = cloneBeatZero();
    for (const episode of episodes) {
      for (const key of Object.keys(episode.beatBias || {})) {
        bias[key] = (bias[key] || 0) + episode.beatBias[key];
      }
    }
    return bias;
  }

  function getPoiById(id) {
    const layout = DS.TileMap && DS.TileMap.layout ? DS.TileMap.layout : null;
    const pois = layout && layout.pois ? layout.pois : [];
    return pois.find(item => item.id === id) || null;
  }

  function moveVehicleToPoi(poi, speed) {
    if (!poi || !DS.Vehicle) return;
    DS.Vehicle.x = poi.x;
    DS.Vehicle.y = poi.y;
    DS.Vehicle.prevX = poi.x;
    DS.Vehicle.prevY = poi.y;
    DS.Vehicle.speed = speed || 0;
    DS.Vehicle.angle = poi.id === 'bank_depot' ? Math.PI / 2 : 0;
    if (DS.Renderer) {
      DS.Renderer.camX = poi.x;
      DS.Renderer.camY = poi.y;
    }
    if (DS.TriggerSystem && DS.TriggerSystem.unlock) {
      DS.TriggerSystem.unlock();
    }
  }

  function applyScenario(controller, id) {
    const scenario = SCENARIOS[id];
    if (!scenario) return;

    if (DS.Director && DS.Director.state !== 'idle' && DS.Director.declineEncounter) {
      DS.Director.declineEncounter();
    }

    controller.reset({ preserveMissionProtected: true });
    controller.state.mode = 'scenario';
    controller.state.activeScenario = id;

    const poi = getPoiById(scenario.poiId);
    if (DS.Vehicle && DS.Vehicle.applyArchetype) {
      DS.Vehicle.applyArchetype(scenario.vehicle);
    }
    moveVehicleToPoi(poi, scenario.speed);

    const vehicleDef = DS.Config.vehicleArchetypes[scenario.vehicle] || DS.Config.vehicleArchetypes.standard;
    controller.state.scenarioContext = {
      label: scenario.label,
      speed: scenario.speed,
      speedState: scenario.speed > DS.Config.speedGate.threshold ? 'fast' : 'cruise',
      heat: scenario.heat,
      vehicleArchetypeId: scenario.vehicle,
      vehicleName: vehicleDef.name,
      regionTag: scenario.region,
      nearbyPoi: poi,
    };

    if (DS.WorldResponse) {
      DS.WorldResponse.heat = scenario.heat;
      DS.WorldResponse.lastAction = scenario.label;
      DS.WorldResponse._push('场景注入: ' + scenario.label + '，用于验证 Echo Director 闭环。');
    }

    const episode = makeEpisode(
      scenario.episode.id,
      scenario.episode.label,
      scenario.episode.evidence,
      scenario.episode.echoTag,
      scenario.episode.beatBias,
      'scene'
    );
    rememberEpisode(controller.state, episode);
  }

  function buildSnapshot(controller, reason) {
    const world = DS.WorldResponse ? DS.WorldResponse.getState() : {};
    const deck = DS.DeckManager ? DS.DeckManager.getState() : {};
    const vehicle = DS.Vehicle && DS.Vehicle.getArchetype ?
      DS.Vehicle.getArchetype() :
      { name: '未知车辆' };
    const speed = DS.Vehicle ? Math.abs(Math.round(DS.Vehicle.speed)) : 0;
    const nearestPoi = world.nearestPoi || null;
    const scenario = controller.state.mode === 'scenario' ?
      controller.state.scenarioContext :
      null;

    return {
      reason,
      speed: scenario ? scenario.speed : speed,
      speedState: scenario ? scenario.speedState : (speed > DS.Config.speedGate.threshold ? 'fast' : 'cruise'),
      heat: scenario ? scenario.heat : (world.heat || 0),
      vehicleArchetypeId: scenario ? scenario.vehicleArchetypeId : (DS.Vehicle ? DS.Vehicle.archetypeId : 'standard'),
      vehicleName: scenario ? scenario.vehicleName : vehicle.name,
      regionTag: scenario ? scenario.regionTag : (world.regionTag || 'commercial'),
      nearbyPoi: scenario ? scenario.nearbyPoi : nearestPoi,
      mainMissionProtected: controller.state.mainMissionProtected,
      recentEpisodes: controller.state.episodes.slice(-3),
      deckState: deck,
      recentBeats: controller.state.nextBeatPool.slice(0, 2).map(item => item.family),
      isOffroad: DS.TileMap && DS.Vehicle ? !DS.TileMap.isOnRoad(DS.Vehicle.x, DS.Vehicle.y) : false,
    };
  }

  function detectLiveEpisode(snapshot) {
    const poiId = snapshot.nearbyPoi && snapshot.nearbyPoi.id;

    if (snapshot.speed > 100 && poiId === 'police_precinct') {
      return makeEpisode('episode.police_high_speed', '高速掠过警局', [
        '速度 > 100km/h',
        '附近 POI = 警局',
        '玩家正在制造执法压力',
      ], 'Echo.Recent.PoliceProvoker', { armored_pressure: 28, street_challenge: 12, blank: -10 });
    }

    if (snapshot.vehicleArchetypeId === 'heavy' && poiId === 'bank_depot' && snapshot.speed < 20) {
      return makeEpisode('episode.bank_heavy_block', '重卡堵银行入口', [
        '车辆身份 = 重型车',
        '附近 POI = 金融押运区',
        '低速停留接近封堵语义',
      ], 'Echo.Recent.RobberySetup', { armored_pressure: 38, passenger_pressure: 8, blank: -12 });
    }

    if (snapshot.speed > 90 && snapshot.heat >= 30 && ['commercial', 'residential'].includes(snapshot.regionTag)) {
      return makeEpisode('episode.residential_danger', '居民区连续危险驾驶', [
        '速度 > 90km/h',
        '热度 >= 30',
        '公共区域风险上升',
      ], 'Echo.District.HostilityUp', { passenger_pressure: 20, armored_pressure: 18, blank: -8 });
    }

    return null;
  }

  function buildPolicy(state, advisorResult) {
    const selected = advisorResult && advisorResult.beatSelection ?
      advisorResult.beatSelection.cnLabel :
      '无';

    if (state.mainMissionProtected) {
      return {
        selected,
        blocked: true,
        reason: '任务保护中：拒绝实例化新 T2，只记录 Echo 偏置。',
        checks: [
          { label: '任务保护', pass: false },
          { label: '语义可记录', pass: true },
          { label: '延后推送', pass: true },
        ],
      };
    }

    if (!state.episodes.length) {
      return {
        selected,
        blocked: false,
        reason: '暂无 Episode，使用常规 Deck 节奏。',
        checks: [
          { label: '任务保护', pass: true },
          { label: 'Episode 可选', pass: true },
          { label: '允许常规分发', pass: true },
        ],
      };
    }

    return {
      selected,
      blocked: false,
      reason: '规则放行：Echo 偏置可影响下一次 Vehicle Beat 分发。',
      checks: [
        { label: '任务保护', pass: true },
        { label: 'Episode 已记录', pass: true },
        { label: 'Beat 池可筛选', pass: true },
      ],
    };
  }

  function familyBiasForCardType(cardType, bias) {
    if (cardType === 'midnight_race') return bias.street_challenge || 0;
    if (cardType === 'intimidation_ride') return bias.passenger_pressure || 0;
    if (cardType === 'armored_heist') return bias.armored_pressure || 0;
    if (cardType === 'copilot_command') return bias.escort_command || 0;
    if (cardType === 'blank') return bias.blank || 0;
    return 0;
  }

  function buildDeckWeights(state) {
    const weights = {
      midnight_race: 1,
      intimidation_ride: 1,
      armored_heist: 1,
      copilot_command: 1,
      blank: 1,
    };

    if (!state) return weights;

    if (state.mainMissionProtected) {
      return {
        midnight_race: 0,
        intimidation_ride: 0,
        armored_heist: 0,
        copilot_command: 0,
        blank: 99,
      };
    }

    const bias = state.directorBias || BEAT_ZERO;
    weights.midnight_race += Math.max(0, bias.street_challenge || 0) / 10;
    weights.intimidation_ride += Math.max(0, bias.passenger_pressure || 0) / 10;
    weights.armored_heist += Math.max(0, bias.armored_pressure || 0) / 10;
    weights.copilot_command += Math.max(0, bias.escort_command || 0) / 10;
    weights.blank = Math.max(0.2, weights.blank + Math.max(-0.8, (bias.blank || 0) / 20));

    return weights;
  }

  function buildNextBeatPool(state, advisorResult) {
    const weights = buildDeckWeights(state);
    const cards = [
      { type: 'midnight_race', label: '午夜竞速', family: 'street_challenge' },
      { type: 'intimidation_ride', label: '恐吓专车', family: 'passenger_pressure' },
      { type: 'armored_heist', label: '拦截运钞车', family: 'armored_pressure' },
      { type: 'copilot_command', label: '副驾指挥', family: 'escort_command' },
      { type: 'blank', label: '空牌呼吸', family: 'blank' },
    ];

    const semanticScores = {};
    if (advisorResult && advisorResult.policy && advisorResult.policy.adjusted) {
      for (const item of advisorResult.policy.adjusted) {
        semanticScores[item.type] = item.policyScore || item.score || 0;
      }
    }

    return cards.map(card => ({
      type: card.type,
      label: card.label,
      family: card.family,
      semanticScore: semanticScores[card.family] || 0,
      echoBias: familyBiasForCardType(card.type, state.directorBias || BEAT_ZERO),
      drawWeight: weights[card.type],
    })).sort((a, b) => b.drawWeight - a.drawWeight);
  }

  DS.EchoDirector = {
    state: null,

    init() {
      this.reset();
    },

    reset(options) {
      const opts = options || {};
      const keepProtected = opts.preserveMissionProtected && this.state ?
        this.state.mainMissionProtected :
        false;
      this.state = {
        mode: 'live',
        activeScenario: null,
        mainMissionProtected: keepProtected,
        observed: {
          highSpeedAuthoritySec: 0,
          heavyBankBlockSec: 0,
          residentialDangerSec: 0,
          offroadSec: 0,
          recentHighSpeed: false,
        },
        latestSnapshot: null,
        scenarioContext: null,
        episodes: [],
        semanticCandidates: [],
        policy: {
          selected: null,
          blocked: false,
          reason: '等待玩家行为形成 Episode',
          checks: [],
        },
        echoTags: [],
        directorBias: cloneBeatZero(),
        nextBeatPool: [],
        deckWeights: buildDeckWeights(null),
        log: ['Echo Director 待机：观察玩家驾驶行为。'],
      };
      this.recompute('reset');
    },

    update(dt) {
      this.observeLive(dt);
      this.recompute('live_tick');
    },

    runScenario(id) {
      applyScenario(this, id);
      this.recompute('scenario:' + id);
      return this.state;
    },

    toggleMissionProtected() {
      this.state.mainMissionProtected = !this.state.mainMissionProtected;
      pushLog(this.state, this.state.mainMissionProtected ? '任务保护开启：非空 Beat 将被拒绝实例化。' : '任务保护关闭：恢复 Echo 加权分发。');
      this.recompute('mission_protect_toggle');
      return this.state;
    },

    observeLive(dt) {
      if (!this.state || this.state.mode === 'scenario') return;
      const snapshot = buildSnapshot(this, 'observe_live');
      const poiId = snapshot.nearbyPoi && snapshot.nearbyPoi.id;

      this.state.observed.highSpeedAuthoritySec = snapshot.speed > 100 && poiId === 'police_precinct' ?
        this.state.observed.highSpeedAuthoritySec + dt :
        0;
      this.state.observed.heavyBankBlockSec = snapshot.vehicleArchetypeId === 'heavy' && poiId === 'bank_depot' && snapshot.speed < 20 ?
        this.state.observed.heavyBankBlockSec + dt :
        0;
      this.state.observed.residentialDangerSec = snapshot.speed > 90 && snapshot.heat >= 30 && ['commercial', 'residential'].includes(snapshot.regionTag) ?
        this.state.observed.residentialDangerSec + dt :
        0;
      this.state.observed.offroadSec = snapshot.isOffroad ? this.state.observed.offroadSec + dt : 0;
      this.state.observed.recentHighSpeed = snapshot.speed > 100;
    },

    recompute(reason) {
      if (!this.state || !DS.Config) return;
      const snapshot = buildSnapshot(this, reason);
      const observed = this.state.observed;
      const liveEpisode = (
        observed.highSpeedAuthoritySec >= 0.6 ||
        observed.heavyBankBlockSec >= 0.6 ||
        observed.residentialDangerSec >= 0.6 ||
        reason.indexOf('scenario:') === 0
      ) ? detectLiveEpisode(snapshot) : null;
      if (liveEpisode) rememberEpisode(this.state, liveEpisode);

      const advisorResult = DS.DirectorAdvisor ?
        DS.DirectorAdvisor.evaluate(snapshot) :
        null;

      this.state.latestSnapshot = snapshot;
      this.state.semanticCandidates = advisorResult ? advisorResult.semanticFit.slice(0, 4) : [];
      this.state.policy = buildPolicy(this.state, advisorResult);
      this.state.echoTags = collectEchoTags(this.state.episodes);
      this.state.directorBias = collectBias(this.state.episodes);
      this.state.deckWeights = buildDeckWeights(this.state);
      this.state.nextBeatPool = buildNextBeatPool(this.state, advisorResult);
    },

    getState() {
      return this.state;
    },

    getDeckWeights() {
      return buildDeckWeights(this.state);
    },

    shouldBlockCard(cardType) {
      return !!(this.state && this.state.mainMissionProtected && cardType !== 'blank');
    },

    getBlockReason() {
      return this.state && this.state.policy ? this.state.policy.reason : '规则拒绝实例化。';
    },

    getScenarioLabels() {
      return Object.keys(SCENARIOS).reduce((labels, id) => {
        labels[id] = SCENARIOS[id].label;
        return labels;
      }, {});
    },
  };
})();
