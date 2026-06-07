// ═══════════════════════════════════════════
// trigger.js — 距离+时间混合触发 + 速度状态
// ═══════════════════════════════════════════
(function() {
  const C = DS.Config;
  const TC = C.trigger;
  const SC = C.speedGate;

  DS.TriggerSystem = {
    distanceAccum: 0,   // m 累计净位移
    timeAccum: 0,       // s 累计时间
    distanceThreshold: 0, // 当前阈值（随机化）
    timeThreshold: 0,     // 当前阈值（随机化）

    isFrozen: false,    // 兼容旧面板：仅在玩法/信号锁定时为 true
    isLocked: false,    // 玩法进行中锁定
    freezeReason: '',   // 冻结原因
    speedState: 'cruise', // cruise | fast

    // 记录触发点位置（用于计算净位移）
    triggerOriginX: 0,
    triggerOriginY: 0,

    init() {
      this.distanceAccum = 0;
      this.timeAccum = 0;
      this.isFrozen = false;
      this.isLocked = false;
      this.freezeReason = '';
      this.speedState = 'cruise';
      this._rollThresholds();
      this._setOrigin();
    },

    _rollThresholds() {
      this.distanceThreshold = TC.distanceMin + Math.random() * (TC.distanceMax - TC.distanceMin);
      this.timeThreshold = TC.timeMin + Math.random() * (TC.timeMax - TC.timeMin);
    },

    _setOrigin() {
      this.triggerOriginX = DS.Vehicle.x;
      this.triggerOriginY = DS.Vehicle.y;
    },

    update(dt) {
      const v = DS.Vehicle;
      const speed = Math.abs(v.speed);

      // 速度只作为调度上下文，不冻结 2D MVP 的计数器。
      const nextSpeedState = speed > SC.threshold ? 'fast' : 'cruise';
      if (nextSpeedState !== this.speedState) {
        this.speedState = nextSpeedState;
        DS.Events.emit('speed_state_changed', {
          speed: Math.round(speed),
          state: this.speedState,
        });
      }

      // 只有玩法/信号等待期间锁定计数器。
      if (this.isLocked) return;

      // 累计时间
      this.timeAccum += dt;

      // 累计净位移（displacement，非路程）
      this.distanceAccum = Math.hypot(
        v.x - this.triggerOriginX,
        v.y - this.triggerOriginY
      );

      // 检查触发条件
      let triggered = false;
      let reason = '';

      if (this.distanceAccum >= this.distanceThreshold) {
        triggered = true;
        reason = 'distance';
      } else if (this.timeAccum >= this.timeThreshold) {
        triggered = true;
        reason = 'time';
      }

      if (triggered) {
        DS.Events.emit('trigger_fire', {
          reason: reason,
          distance: Math.round(this.distanceAccum),
          time: Math.round(this.timeAccum * 10) / 10,
          distanceThreshold: Math.round(this.distanceThreshold),
          timeThreshold: Math.round(this.timeThreshold * 10) / 10,
        });

        // 归零
        this.distanceAccum = 0;
        this.timeAccum = 0;
        this._rollThresholds();
        this._setOrigin();
      }
    },

    // 玩法开始：锁定计数器
    lock(reason) {
      this.isLocked = true;
      this.isFrozen = true;
      this.freezeReason = reason || 'encounter_active';
      DS.Events.emit('gate_frozen', { reason: this.freezeReason });
    },

    // 玩法结束：解锁计数器
    unlock() {
      this.isLocked = false;
      this.isFrozen = false;
      this.freezeReason = '';
      // 重置计数器
      this.distanceAccum = 0;
      this.timeAccum = 0;
      this._setOrigin();
      DS.Events.emit('gate_unfrozen', { reason: 'encounter_ended' });
    },

    // 状态查询
    getState() {
      return {
        distance: Math.round(this.distanceAccum),
        distanceThreshold: Math.round(this.distanceThreshold),
        distanceRatio: this.distanceAccum / this.distanceThreshold,
        time: Math.round(this.timeAccum * 10) / 10,
        timeThreshold: Math.round(this.timeThreshold * 10) / 10,
        timeRatio: this.timeAccum / this.timeThreshold,
        isFrozen: this.isFrozen,
        isLocked: this.isLocked,
        freezeReason: this.freezeReason,
        speedState: this.speedState,
        speedThreshold: SC.threshold,
      };
    },
  };
})();
