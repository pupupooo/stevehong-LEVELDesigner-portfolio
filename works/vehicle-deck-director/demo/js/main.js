// ═══════════════════════════════════════════
// main.js — 启动入口 + 游戏循环
// ═══════════════════════════════════════════
(function() {
  const C = DS.Config;
  const T = C.map.tileSize;
  const ASSET_VERSION = '20260607-marker-guidance';

  let lastTime = 0;
  let debugRenderTimer = 0;
  const DEBUG_RENDER_INTERVAL = 0.1; // 100ms 更新一次面板

  async function init() {
    // 初始化输入
    DS.Input.init();

    // 加载地图源事实。localhost/线上优先读取 JSON；file:// 下 fetch 失败时使用内置镜像。
    try {
      if (window.location.protocol === 'file:') {
        DS.LayoutLoader.loadEmbedded();
      } else {
        await DS.LayoutLoader.load('data/district-layout.json?v=' + ASSET_VERSION);
      }
    } catch (error) {
      try {
        DS.LayoutLoader.loadEmbedded();
        console.warn('Using embedded district layout fallback:', error);
      } catch (fallbackError) {
        console.error(error);
        console.error(fallbackError);
        const message = fallbackError && fallbackError.message ? fallbackError.message : String(fallbackError);
        document.body.innerHTML = '<div style="max-width:640px;margin:80px auto;color:#eee;font:14px/1.7 sans-serif">' +
          '<h1 style="color:#ff4500">地图数据加载失败</h1>' +
          '<p style="color:#bbb">实际错误：<code>' + message.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])) + '</code></p>' +
          '<p>请通过本地服务器打开 demo，例如在项目根目录运行 <code>python3 -m http.server 4180</code>，再访问 <code>http://localhost:4180/works/vehicle-deck-director/demo/index.html</code>。</p>' +
          '</div>';
        return;
      }
    }

    // 初始化地图
    DS.TileMap.init(DS.LayoutData);

    // 初始化玩家（来自 district-layout.json）
    const spawn = DS.TileMap.getPlayerSpawn();
    const startX = spawn.x;
    const startY = spawn.y;
    DS.Vehicle.init(startX, startY);
    DS.Vehicle.angle = Number.isFinite(spawn.angle) ? spawn.angle : DS.Vehicle.angle;
    if (spawn.archetypeId) DS.Vehicle.applyArchetype(spawn.archetypeId);

    // 初始化NPC管理
    DS.NPCManager.init();

    // 初始化世界响应
    DS.WorldResponse.init();

    // 初始化渲染器
    DS.Renderer.init();
    DS.Renderer.camX = startX;
    DS.Renderer.camY = startY;

    // 初始化Deck
    DS.DeckManager.init();

    // 初始化触发系统
    DS.TriggerSystem.init();

    // 初始化导演
    DS.Director.init();

    // 初始化调试面板
    DS.DebugPanel.init();

    // 初始化 Echo Director Lab 层
    if (DS.EchoDirector) {
      DS.EchoDirector.init();
    }

    // Esc 拒绝/取消当前玩法
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        DS.Director.declineEncounter();
      }
    });

    const brief = document.getElementById('demo-brief');
    const briefStart = document.getElementById('brief-start');
    const closeBrief = () => {
      if (brief) brief.classList.add('hidden');
    };
    if (briefStart) briefStart.addEventListener('click', closeBrief);
    if (brief) brief.addEventListener('click', (e) => {
      if (e.target === brief) closeBrief();
    });
    window.addEventListener('keydown', closeBrief);

    function bindScenarioControls() {
      if (!DS.EchoDirector) return;

      const scenarioButtons = document.querySelectorAll('[data-echo-scenario]');
      const missionToggle = document.getElementById('mission-protect-toggle');

      for (const button of scenarioButtons) {
        button.addEventListener('click', () => {
          DS.EchoDirector.runScenario(button.dataset.echoScenario);
          for (const item of scenarioButtons) {
            item.classList.toggle('active', item === button);
          }
          if (DS.Renderer && DS.Renderer.showMessage) {
            DS.Renderer.showMessage('场景注入: ' + button.textContent, '#38bdf8', 2);
          }
        });
      }

      if (missionToggle) {
        missionToggle.addEventListener('click', () => {
          const state = DS.EchoDirector.toggleMissionProtected();
          missionToggle.classList.toggle('active', !!(state && state.mainMissionProtected));
          if (DS.Renderer && DS.Renderer.showMessage) {
            DS.Renderer.showMessage(
              state.mainMissionProtected ? '任务保护：拒绝新 T2 推送' : '任务保护关闭：恢复 Echo 分发',
              state.mainMissionProtected ? '#ffaa22' : '#44cc66',
              2
            );
          }
        });
      }

      const reset = document.getElementById('echo-reset');
      if (reset) {
        reset.addEventListener('click', () => {
          DS.EchoDirector.reset();
          if (DS.DebugPanel) {
            DS.DebugPanel.logEntries = [];
          }
          for (const item of scenarioButtons) {
            item.classList.remove('active');
          }
          if (missionToggle) missionToggle.classList.remove('active');
          if (DS.Renderer && DS.Renderer.showMessage) {
            DS.Renderer.showMessage('Echo Director 已重置', '#888899', 1.6);
          }
        });
      }
    }

    bindScenarioControls();

    // 启动欢迎消息
    DS.Renderer.showMessage('Vehicle Echo Director Lab', '#ff4500', 3);
    setTimeout(() => {
      DS.Renderer.showMessage('WASD 驾驶 | E 交互 | Esc 取消', '#888', 4);
    }, 3500);

    // 启动游戏循环
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }

  function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap at 50ms
    lastTime = timestamp;

    // 更新输入
    DS.Input.update();

    if (DS.Input.wasPressed('KeyF')) {
      DS.WorldResponse.tryHijackNearest();
    }

    if (DS.Input.wasPressed('KeyE') && DS.Director.state === 'pending') {
      if (DS.Director.acceptPendingBeat()) {
        DS.Input.consume('KeyE');
      }
    }

    // 更新载具
    DS.Vehicle.update(dt);

    // 确保地图块加载
    DS.TileMap.ensureTilesAround(DS.Vehicle.x, DS.Vehicle.y);

    // 更新NPC
    DS.NPCManager.update(dt);

    // 更新世界响应
    DS.WorldResponse.update(dt);

    // 更新触发系统
    DS.TriggerSystem.update(dt);

    // 更新导演
    DS.Director.update(dt);

    // 更新 Echo Director Lab 层
    if (DS.EchoDirector) {
      DS.EchoDirector.update(dt);
    }

    // 更新渲染器（摄像机等）
    DS.Renderer.update(dt);

    // 渲染
    DS.Renderer.render();

    // 调试面板（低频更新）
    debugRenderTimer += dt;
    if (debugRenderTimer >= DEBUG_RENDER_INTERVAL) {
      debugRenderTimer = 0;
      DS.DebugPanel.render();
    }

    requestAnimationFrame(gameLoop);
  }

  // DOM 加载后启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }
})();
