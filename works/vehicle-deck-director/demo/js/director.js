// ═══════════════════════════════════════════
// director.js — 导演层：抽牌 → Vehicle Beat signal → 玩家接入 → 演出调度
// ═══════════════════════════════════════════
(function() {
  const C = DS.Config;

  DS.Director = {
    state: 'idle',       // idle | pending | active
    pendingCard: null,   // 待触发的牌
    pendingBeat: null,   // 待玩家接入的 Vehicle Beat signal
    pendingTimer: 0,     // 待触发倒计时
    activeEncounter: null, // 当前活跃玩法
    activeBeat: null,    // 当前玩法的 Beat 元信息
    gameTime: 0,         // 游戏总时间

    init() {
      this.state = 'idle';
      this.pendingCard = null;
      this.pendingBeat = null;
      this.pendingTimer = 0;
      this.activeEncounter = null;
      this.activeBeat = null;
      this.gameTime = 0;

      // 监听触发事件
      DS.Events.on('trigger_fire', (data) => this._onTriggerFire(data));
    },

    update(dt) {
      this.gameTime += dt;

      switch (this.state) {
        case 'idle':
          // 等待触发系统
          break;

        case 'pending':
          // 待触发倒计时
          this.pendingTimer -= dt;
          if (this.pendingTimer <= 0) {
            // 超时作废
            DS.Events.emit('encounter_expired', {
              card: this.pendingCard,
              beat: this.pendingBeat,
              time: this.gameTime,
            });
            this._log('Vehicle Beat 超时: ' + this.pendingCard.def.name + ' → 玩家忽略', 'system');
            if (DS.Renderer && DS.Renderer.showMessage) {
              DS.Renderer.showMessage(this.pendingCard.def.name + ' 已错过', '#888899', 1.6);
            }
            this.pendingCard = null;
            this.pendingBeat = null;
            this.state = 'idle';
            DS.TriggerSystem.unlock();
          }
          break;

        case 'active':
          // 更新当前玩法
          if (this.activeEncounter) {
            this.activeEncounter.update(dt);

            // 检查玩法是否结束
            if (this.activeEncounter.isFinished()) {
              this._onEncounterFinished();
            }
          }
          break;
      }
    },

    _onTriggerFire(triggerData) {
      if (this.state !== 'idle') return;

      // 抽牌
      const card = DS.DeckManager.draw();
      if (!card) return;

      if (card.type === 'blank') {
        // 空牌：静默处理
        this._log('抽牌: 空牌 — 世界呼吸中', 'draw');
        // 不锁定计数器，继续下一轮
        return;
      }

      // 玩法牌：进入 Vehicle Beat signal，等待玩家接入
      const beat = this._createVehicleBeat(card, triggerData || {});
      this._log('抽牌: ' + card.def.name + ' → 生成 ' + beat.familyLabel + ' signal', 'draw');
      this.pendingCard = card;
      this.pendingBeat = beat;
      this.pendingTimer = C.deck.pendingTimeout;
      this.state = 'pending';

      // 锁定触发系统
      DS.TriggerSystem.lock('pending_vehicle_beat');

      DS.Events.emit('vehicle_beat_pending', {
        card: card,
        beat: beat,
        time: this.gameTime,
      });

      if (DS.Renderer && DS.Renderer.showMessage) {
        DS.Renderer.showMessage(beat.naturalPrompt, card.def.color, C.deck.pendingTimeout);
      }
    },

    _createVehicleBeat(card, triggerData) {
      const meta = C.beatDefs[card.type] || {};
      const family = meta.family || 'discovery';
      const familyDef = C.beatFamilies[family] || C.beatFamilies.discovery;
      const poi = DS.TileMap && DS.TileMap.getNearestPoi ?
        DS.TileMap.getNearestPoi(DS.Vehicle.x, DS.Vehicle.y, 900, meta.poiPreference) : null;
      const worldState = DS.WorldResponse && DS.WorldResponse.getState ?
        DS.WorldResponse.getState() : {};
      const speed = Math.abs(Math.round(DS.Vehicle.speed));
      const speedState = speed > C.speedGate.threshold ? 'fast' : 'cruise';
      const vehicleProfile = DS.Vehicle.getArchetype ? DS.Vehicle.getArchetype() : C.vehicleArchetypes.standard;
      const poiName = poi ? poi.name : '当前街区';
      const ruleChecks = [
        { label: '玩法已实现', pass: !!DS.Encounters[card.type] },
        { label: '未处于其他事件', pass: this.state === 'idle' },
        { label: '接入点可读', pass: !!poi || !!meta.signalType },
      ];

      return {
        id: 'beat_' + Math.random().toString(36).slice(2, 8),
        card: card,
        family: family,
        familyLabel: familyDef.label,
        familyNote: familyDef.note,
        signalType: meta.signalType || 'road_signal',
        signalLabel: meta.signalLabel || card.def.name,
        naturalPrompt: meta.naturalPrompt || ('附近出现 ' + card.def.name + '，按 E 接入'),
        poi: poi,
        poiName: poiName,
        triggerReason: triggerData.reason || 'unknown',
        modifiers: this._buildBeatModifiers(card, speedState, worldState, vehicleProfile, poi),
        recommendation: {
          title: card.def.name + ' / ' + familyDef.label,
          reason: this._buildRecommendationReason(meta, worldState, vehicleProfile, poiName, speedState),
        },
        ruleChecks: ruleChecks,
        createdAt: this.gameTime,
      };
    },

    _buildBeatModifiers(card, speedState, worldState, vehicleProfile, poi) {
      const modifiers = [];
      if (speedState === 'fast') modifiers.push('高速状态');
      if ((worldState.heat || 0) >= 40) modifiers.push('警觉热度');
      if (DS.Vehicle.archetypeId && DS.Vehicle.archetypeId !== 'standard') modifiers.push(vehicleProfile.name);
      if (poi) modifiers.push(poi.name);
      if (card.type === 'armored_heist' && DS.Vehicle.archetypeId === 'heavy') modifiers.push('重型车适配');
      if (card.type === 'midnight_race' && DS.Vehicle.archetypeId === 'sport') modifiers.push('跑车适配');
      return modifiers.length ? modifiers : ['常规巡航'];
    },

    _buildRecommendationReason(meta, worldState, vehicleProfile, poiName, speedState) {
      const heatText = worldState.heatTier || '低关注';
      const speedText = speedState === 'fast' ? '高速驾驶' : '巡航驾驶';
      return (meta.llmHint || '基于当前世界上下文选择可接入事件。') +
        ' 当前上下文: ' + vehicleProfile.name + ' / ' + speedText + ' / ' + heatText + ' / ' + poiName + '。';
    },

    acceptPendingBeat() {
      if (this.state !== 'pending' || !this.pendingCard) return false;
      this._log(this.pendingCard.def.name + ': 玩家接入 Vehicle Beat', 'system');
      this._startEncounter(this.pendingCard, this.pendingBeat);
      return true;
    },

    _startEncounter(card, beat) {
      const encounterClass = DS.Encounters[card.type];
      if (!encounterClass) {
        this._log('未实现的玩法: ' + card.type, 'system');
        this.state = 'idle';
        this.pendingCard = null;
        this.pendingBeat = null;
        DS.TriggerSystem.unlock();
        return;
      }

      this.activeEncounter = new encounterClass(card);
      this.activeBeat = beat || null;
      this.pendingBeat = null;
      this.pendingCard = null;
      if (DS.Renderer && DS.Renderer.clearMessages) DS.Renderer.clearMessages();
      this.activeEncounter.start(this.activeBeat);
      this.state = 'active';

      this._log(card.def.name + ': 开始', 'encounter');
      DS.Events.emit('encounter_started', {
        card: card,
        beat: this.activeBeat,
        time: this.gameTime,
      });
    },

    _onEncounterFinished() {
      const enc = this.activeEncounter;
      const result = enc.getResult();

      this._log(enc.card.def.name + ': ' + (result.success ? '成功' : '失败') +
                (result.detail ? ' (' + result.detail + ')' : ''), 'encounter');

      DS.Events.emit('encounter_finished', {
        card: enc.card,
        result: result,
        time: this.gameTime,
      });

      // 清理
      enc.cleanup();
      DS.Renderer.clearEncounterHUD();
      this.activeEncounter = null;
      this.pendingCard = null;
      this.pendingBeat = null;
      this.activeBeat = null;
      this.state = 'idle';

      // 解锁触发系统
      DS.TriggerSystem.unlock();
    },

    // 玩家拒绝/忽视（按 Esc）
    declineEncounter() {
      if (this.state === 'pending' || (this.state === 'active' && this.activeEncounter && !this.activeEncounter.isAccepted)) {
        this._log((this.pendingCard || this.activeEncounter.card).def.name + ': 玩家忽略/拒绝', 'system');
        if (this.activeEncounter) {
          this.activeEncounter.cleanup();
        }
        DS.Renderer.clearEncounterHUD();
        this.activeEncounter = null;
        this.pendingCard = null;
        this.pendingBeat = null;
        this.activeBeat = null;
        this.state = 'idle';
        DS.TriggerSystem.unlock();
      }
    },

    _log(message, type) {
      DS.Events.emit('director_log', {
        time: this.gameTime,
        message: message,
        type: type || 'system',
      });
    },

    getState() {
      return {
        state: this.state,
        pendingCard: this.pendingCard,
        pendingBeat: this.pendingBeat,
        pendingTimer: Math.round(this.pendingTimer),
        activeEncounter: this.activeEncounter ? {
          name: this.activeEncounter.card.def.name,
          phase: this.activeEncounter.phase,
          data: this.activeEncounter.getDebugData ? this.activeEncounter.getDebugData() : {},
        } : null,
        activeBeat: this.activeBeat,
        gameTime: this.gameTime,
      };
    },
  };
})();
