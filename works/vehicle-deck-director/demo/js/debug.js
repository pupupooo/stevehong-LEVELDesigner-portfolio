// ═══════════════════════════════════════════
// debug.js — 导演透视广播面板
// ═══════════════════════════════════════════
(function() {

  DS.DebugPanel = {
    logEntries: [],
    maxLogEntries: 100,

    init() {
      // 监听日志事件
      DS.Events.on('director_log', (data) => this._addLog(data));
      DS.Events.on('card_drawn', (data) => {
        this._addLog({
          time: DS.Director.gameTime,
          message: '抽牌: ' + data.card.def.name + ' (剩余 ' + data.remaining + ')',
          type: 'draw',
        });
      });
      DS.Events.on('deck_reshuffled', (data) => {
        this._addLog({
          time: DS.Director.gameTime,
          message: '牌组重洗 (第 ' + data.count + ' 次)',
          type: 'system',
        });
      });
      DS.Events.on('gate_frozen', (data) => {
        this._addLog({
          time: DS.Director.gameTime,
          message: '计数器冻结: ' + (data.reason || data.speed + 'km/h'),
          type: 'gate',
        });
      });
      DS.Events.on('gate_unfrozen', (data) => {
        this._addLog({
          time: DS.Director.gameTime,
          message: '计数器解冻' + (data.reason ? ': ' + data.reason : ''),
          type: 'gate',
        });
      });
      DS.Events.on('speed_state_changed', (data) => {
        this._addLog({
          time: DS.Director.gameTime,
          message: '速度状态: ' + (data.state === 'fast' ? '高速' : '巡航') + ' (' + data.speed + 'km/h)',
          type: 'system',
        });
      });
      DS.Events.on('vehicle_beat_pending', (data) => {
        this._addLog({
          time: DS.Director.gameTime,
          message: 'Vehicle Beat signal: ' + data.beat.familyLabel + ' / ' + data.beat.poiName,
          type: 'director',
        });
      });
    },

    _addLog(data) {
      this.logEntries.push(data);
      if (this.logEntries.length > this.maxLogEntries) {
        this.logEntries.shift();
      }
    },

    render() {
      const content = document.getElementById('debug-content');
      const logEl = document.getElementById('event-log');
      if (!content || !logEl) return;

      // ── 牌组状态 ──
      const deckState = DS.DeckManager.getState();
      const triggerState = DS.TriggerSystem.getState();
      const directorState = DS.Director.getState();
      const worldState = DS.WorldResponse.getState();
      const vehicleProfile = DS.Vehicle.getArchetype();
      const speed = Math.abs(Math.round(DS.Vehicle.speed));

      let html = '';
      html += this._renderEchoDirector();

      // 速度状态
      html += '<div class="debug-section">';
      html += '<h3>速度状态</h3>';
      html += this._row('当前速度', speed + ' km/h', triggerState.speedState === 'fast' ? 'accent' : '');
      html += this._row('高速阈值', DS.Config.speedGate.threshold + ' km/h');
      html += this._row('调度状态',
        triggerState.speedState === 'fast' ?
          '<span class="status-tag frozen">高速修饰器</span>' :
          '<span class="status-tag running">巡航</span>');
      html += this._row('计数器',
        triggerState.isLocked ?
          '<span class="status-tag frozen">事件等待/进行中</span>' :
          '<span class="status-tag running">持续累计</span>');
      if (triggerState.freezeReason) {
        html += this._row('锁定原因', triggerState.freezeReason);
      }
      html += '</div>';

      // 当前车辆与世界响应
      html += '<div class="debug-section">';
      html += '<h3>世界响应</h3>';
      html += this._row('当前车辆', vehicleProfile.name, 'accent');
      html += this._row('区域标签', worldState.regionTag);
      html += this._row('热度', worldState.heat + ' / 100', worldState.heat >= 40 ? 'yellow' : '');
      html += this._row('响应级别', worldState.heatTier);
      html += this._row('最近行为', worldState.lastAction);
      html += this._row('附近 POI', worldState.nearestPoi ? worldState.nearestPoi.name : '无');
      html += '<div class="debug-note">' + vehicleProfile.note + '</div>';
      html += '</div>';

      // 触发计数器
      html += '<div class="debug-section">';
      html += '<h3>触发计数器</h3>';
      html += this._row('距离',
        triggerState.distance + 'm / ' + triggerState.distanceThreshold + 'm',
        triggerState.distanceRatio > 0.8 ? 'yellow' : '');
      html += '<div class="progress-bar"><div class="progress-fill accent" style="width:' +
        Math.min(100, triggerState.distanceRatio * 100) + '%"></div></div>';
      html += this._row('时间',
        triggerState.time + 's / ' + triggerState.timeThreshold + 's',
        triggerState.timeRatio > 0.8 ? 'yellow' : '');
      html += '<div class="progress-bar"><div class="progress-fill blue" style="width:' +
        Math.min(100, triggerState.timeRatio * 100) + '%"></div></div>';
      html += '</div>';

      // LLM-ready 调度接口
      html += '<div class="debug-section">';
      html += '<h3>LLM-ready Director</h3>';
      html += this._row('输入快照', 'world_state + player_action');
      html += this._row('推荐', worldState.recommendation.title, 'green');
      html += '<div class="debug-note">' + worldState.recommendation.reason + '</div>';
      html += '<div class="weight-list">';
      for (const key of Object.keys(worldState.deckBias)) {
        html += '<div class="weight-item"><span>' + key + '</span><strong>x' +
          worldState.deckBias[key].toFixed(2) + '</strong></div>';
      }
      html += '</div>';
      html += '<div class="debug-note">当前为 mock 调度层：LLM 只提出编排建议，实际接入仍由 Deck / Director / 规则层校验。</div>';
      html += '</div>';

      // 牌组
      html += '<div class="debug-section">';
      html += '<h3>牌组状态</h3>';
      html += this._row('剩余', deckState.remaining + ' / ' + deckState.total);
      html += this._row('弃牌堆', deckState.discarded + ' 张');
      html += this._row('重洗次数', deckState.reshuffleCount + ' 次');

      // 牌组卡片可视化
      html += '<div class="deck-cards">';
      // 弃牌堆（已用）
      for (const card of deckState.discardPile) {
        html += '<div class="deck-card used ' + card.def.cssClass + '">' + card.def.shortName + '</div>';
      }
      // 牌组（未抽）
      for (const card of deckState.drawPile) {
        html += '<div class="deck-card ' + card.def.cssClass + '">?</div>';
      }
      html += '</div>';
      html += '</div>';

      // 导演状态
      html += '<div class="debug-section">';
      html += '<h3>导演状态</h3>';
      html += this._row('状态',
        directorState.state === 'idle' ? '<span class="status-tag idle">空闲</span>' :
        directorState.state === 'pending' ? '<span class="status-tag frozen">待触发</span>' :
        '<span class="status-tag active">玩法进行中</span>');

      if (directorState.pendingBeat) {
        const beat = directorState.pendingBeat;
        html += this._row('待接入', beat.card.def.name, 'accent');
        html += this._row('事件族', beat.familyLabel);
        html += this._row('信号', beat.signalLabel);
        html += this._row('POI 来源', beat.poiName);
        html += this._row('修饰器', beat.modifiers.join(' / '));
        html += '<div class="debug-note">' + beat.recommendation.reason + '</div>';
        html += '<div class="weight-list">';
        for (const check of beat.ruleChecks) {
          html += '<div class="weight-item"><span>' + check.label + '</span><strong>' +
            (check.pass ? 'PASS' : 'FAIL') + '</strong></div>';
        }
        html += '</div>';
      }

      if (directorState.activeEncounter) {
        const enc = directorState.activeEncounter;
        html += this._row('当前玩法', enc.name, 'accent');
        html += this._row('阶段', enc.phase);
        if (directorState.activeBeat) {
          html += this._row('事件族', directorState.activeBeat.familyLabel);
          html += this._row('来源 POI', directorState.activeBeat.poiName);
        }
        if (enc.data) {
          for (const key in enc.data) {
            html += this._row(key, enc.data[key]);
          }
        }
      }

      html += this._row('游戏时间', this._formatTime(directorState.gameTime));
      html += '</div>';

      content.innerHTML = html;

      // 事件日志
      let logHtml = '';
      const recent = this.logEntries.slice(-30).reverse();
      for (const entry of recent) {
        const timeStr = this._formatTime(entry.time);
        logHtml += '<div class="log-entry ' + (entry.type || '') + '">';
        logHtml += '<span class="time">[' + timeStr + ']</span>';
        logHtml += entry.message;
        logHtml += '</div>';
      }
      logEl.innerHTML = logHtml;
    },

    _row(label, value, colorClass) {
      return '<div class="debug-row"><span class="label">' + label +
        '</span><span class="value ' + (colorClass || '') + '">' + value + '</span></div>';
    },

    _renderEchoDirector() {
      if (!DS.EchoDirector) return '';
      const state = DS.EchoDirector.getState();
      if (!state) return '';

      const snapshot = state.latestSnapshot || {};
      const latestEpisode = state.episodes[state.episodes.length - 1];
      const topCandidate = state.semanticCandidates && state.semanticCandidates.length ?
        state.semanticCandidates[0] :
        null;
      const policy = state.policy || {};
      const echoTags = state.echoTags || [];
      const nextBeatPool = state.nextBeatPool || [];

      let html = '<div class="debug-section">';
      html += '<h3>Echo Director 闭环</h3>';
      html += '<div class="echo-stage">';

      html += '<div class="echo-card"><strong>1 Snapshot</strong>';
      html += '<p>' + [
        snapshot.vehicleName || '未知车辆',
        (snapshot.speed || 0) + 'km/h',
        snapshot.regionTag || '未知区域',
        snapshot.nearbyPoi ? snapshot.nearbyPoi.name : '无 POI',
        'heat ' + (snapshot.heat || 0),
      ].join(' / ') + '</p></div>';

      html += '<div class="echo-card"><strong>2 Episode Detector</strong>';
      if (latestEpisode) {
        html += '<p>' + latestEpisode.label + ' <span class="echo-tag">' + latestEpisode.source + '</span></p>';
        html += '<ul>' + latestEpisode.evidence.map(item => '<li>' + item + '</li>').join('') + '</ul>';
      } else {
        html += '<p>暂未形成可记录 Episode。可驾驶到警局/银行附近，或使用上方场景注入。</p>';
      }
      html += '</div>';

      html += '<div class="echo-card"><strong>3 Semantic Candidate</strong>';
      if (topCandidate) {
        html += '<p>' + topCandidate.cnLabel + ' / score ' + topCandidate.score + '</p>';
        if (topCandidate.reasons && topCandidate.reasons.length) {
          html += '<ul>' + topCandidate.reasons.slice(0, 2).map(item => '<li>' + item + '</li>').join('') + '</ul>';
        }
      } else {
        html += '<p>等待 LLM-ready mock 产出语义候选。</p>';
      }
      html += '</div>';

      html += '<div class="echo-card"><strong>4 Rule Arbiter</strong>';
      html += '<p><span class="status-tag ' + (policy.blocked ? 'blocked' : 'running') + '">' +
        (policy.blocked ? 'BLOCKED' : 'PASS') + '</span> ' + (policy.reason || '等待裁决') + '</p>';
      if (policy.checks && policy.checks.length) {
        html += '<div class="weight-list">' + policy.checks.map(check =>
          '<div class="weight-item"><span>' + check.label + '</span><strong>' +
          (check.pass ? 'PASS' : 'FAIL') + '</strong></div>'
        ).join('') + '</div>';
      }
      html += '</div>';

      html += '<div class="echo-card"><strong>5 Echo / Next Bias</strong>';
      html += '<div class="echo-tags">' + (echoTags.length ?
        echoTags.map(tag => '<span class="echo-tag">' + tag + '</span>').join('') :
        '<span class="echo-tag">No Echo</span>') + '</div>';
      html += '<div class="weight-list">';
      for (const key of Object.keys(state.directorBias || {})) {
        const value = state.directorBias[key];
        html += '<div class="weight-item"><span>' + key + '</span><strong>' +
          (value > 0 ? '+' : '') + value + '</strong></div>';
      }
      html += '</div></div>';

      html += '<div class="echo-card"><strong>6 Actual Next Draw Weights</strong>';
      html += '<div class="weight-list">' + nextBeatPool.map(item =>
        '<div class="weight-item"><span>' + item.label + '</span><strong>x' +
        item.drawWeight.toFixed(2) + '</strong></div>'
      ).join('') + '</div>';
      html += '<p>这里是真正传给 Deck draw 的权重，不只是解释面板。</p>';
      html += '</div>';

      html += '</div></div>';
      return html;
    },

    _formatTime(seconds) {
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    },
  };
})();
