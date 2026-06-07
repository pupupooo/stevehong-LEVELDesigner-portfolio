// ═══════════════════════════════════════════
// layout.js — district-layout.json loader + validator
// ═══════════════════════════════════════════
(function() {
  window.DS = window.DS || {};

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function normalizeRoad(road) {
    const type = road.type || road.kind || 'rect';
    if (type === 'segment') {
      return {
        id: road.id,
        kind: 'segment',
        type: 'segment',
        x1: Number(road.x1),
        y1: Number(road.y1),
        x2: Number(road.x2),
        y2: Number(road.y2),
        w: Number(road.w || 96),
        tag: road.tag || 'street',
      };
    }
    return {
      id: road.id,
      kind: 'rect',
      type: 'rect',
      x: Number(road.x),
      y: Number(road.y),
      w: Number(road.w),
      h: Number(road.h),
      tag: road.tag || 'street',
    };
  }

  function normalizeRect(rect) {
    return {
      id: rect.id,
      x: Number(rect.x),
      y: Number(rect.y),
      w: Number(rect.w),
      h: Number(rect.h),
      label: rect.label || rect.id || 'blocked',
    };
  }

  function normalizePoint(item) {
    return Object.assign({}, item, {
      x: Number(item.x),
      y: Number(item.y),
    });
  }

  function normalizeLane(lane) {
    return Object.assign({}, lane, {
      x1: Number(lane.x1),
      y1: Number(lane.y1),
      x2: Number(lane.x2),
      y2: Number(lane.y2),
      w: Number(lane.w || 96),
      speedMin: Number(lane.speedMin || 18),
      speedMax: Number(lane.speedMax || 42),
      archetypes: lane.archetypes && lane.archetypes.length ? lane.archetypes : ['standard'],
    });
  }

  function normalizeLayout(layout) {
    const data = clone(layout);
    data.version = data.version || 1;
    data.size = data.size || { width: 2200, height: 1400 };
    data.playerSpawn = data.playerSpawn || { x: 400, y: 400, angle: 0, archetypeId: 'standard' };
    data.roads = (data.roads || []).map(normalizeRoad);
    data.blocked = (data.blocked || []).map(normalizeRect);
    data.pois = (data.pois || []).map(normalizePoint);
    data.npcSpawnLanes = (data.npcSpawnLanes || []).map(normalizeLane);
    data.eventAnchors = (data.eventAnchors || []).map(normalizePoint);
    return data;
  }

  function validateLayout(layout) {
    const errors = [];
    if (!layout || typeof layout !== 'object') errors.push('layout must be an object');
    if (!layout.size || !layout.size.width || !layout.size.height) errors.push('size.width/height is required');
    if (!layout.playerSpawn) errors.push('playerSpawn is required');
    if (!layout.roads || layout.roads.length === 0) errors.push('at least one road is required');
    if (!layout.blocked || layout.blocked.length === 0) errors.push('at least one blocked area is required');
    if (!layout.pois || layout.pois.length === 0) errors.push('at least one POI is required');
    if (!layout.npcSpawnLanes || layout.npcSpawnLanes.length === 0) errors.push('at least one NPC spawn lane is required');
    if (!layout.eventAnchors || layout.eventAnchors.length === 0) errors.push('at least one event anchor is required');

    for (const road of layout.roads || []) {
      if (!road.id) errors.push('road is missing id');
      if (road.type === 'segment' || road.kind === 'segment') {
        for (const key of ['x1', 'y1', 'x2', 'y2']) {
          if (!Number.isFinite(Number(road[key]))) errors.push('segment road ' + road.id + ' has invalid ' + key);
        }
      } else {
        for (const key of ['x', 'y', 'w', 'h']) {
          if (!Number.isFinite(Number(road[key]))) errors.push('rect road ' + road.id + ' has invalid ' + key);
        }
      }
    }

    if (errors.length) {
      throw new Error('Invalid district layout:\n' + errors.join('\n'));
    }
  }

  DS.LayoutLoader = {
    normalize: normalizeLayout,
    validate: validateLayout,

    async load(url) {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to load layout: ' + response.status + ' ' + response.statusText);
      }
      const layout = normalizeLayout(await response.json());
      validateLayout(layout);
      DS.LayoutData = layout;
      return layout;
    },

    loadEmbedded() {
      if (!window.DS_EMBEDDED_DISTRICT_LAYOUT) {
        throw new Error('Embedded district layout is not available.');
      }
      const layout = normalizeLayout(window.DS_EMBEDDED_DISTRICT_LAYOUT);
      validateLayout(layout);
      DS.LayoutData = layout;
      return layout;
    },
  };
})();
