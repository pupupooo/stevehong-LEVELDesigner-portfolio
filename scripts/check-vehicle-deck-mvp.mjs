import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';

const root = process.cwd();

function loadScript(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  vm.runInThisContext(source, { filename: relativePath });
}

function resetGlobals() {
  globalThis.window = globalThis;
  globalThis.performance = performance;
  globalThis.DS = {};
}

function loadCore() {
  loadScript('works/vehicle-deck-director/demo/js/config.js');
  loadScript('works/vehicle-deck-director/demo/js/director-advisor.js');
  loadScript('works/vehicle-deck-director/demo/js/layout.js');
  loadScript('works/vehicle-deck-director/demo/js/world.js');
  loadScript('works/vehicle-deck-director/demo/js/deck.js');
  loadScript('works/vehicle-deck-director/demo/js/trigger.js');
  loadScript('works/vehicle-deck-director/demo/js/director.js');
  loadScript('works/vehicle-deck-director/demo/js/encounters.js');
}

function readLayout() {
  const layoutPath = path.join(root, 'works/vehicle-deck-director/demo/data/district-layout.json');
  return JSON.parse(fs.readFileSync(layoutPath, 'utf8'));
}

function testDistrictLayoutFilesExistAndDescribeGameplaySpace() {
  const layout = readLayout();
  const editorPath = path.join(root, 'works/vehicle-deck-director/map-editor.html');

  assert.equal(fs.existsSync(editorPath), true, 'map-editor.html should exist next to the case page');
  assert.equal(layout.version, 1, 'district layout should have a stable schema version');
  assert.equal(layout.size.width >= 7200, true, 'connected district should be wide enough for multi-minute cruising');
  assert.equal(layout.size.height >= 4800, true, 'connected district should be tall enough for route choice');
  assert.equal(Array.isArray(layout.roads) && layout.roads.length >= 18, true, 'layout should author multiple connected road loops');
  assert.equal(Array.isArray(layout.blocked) && layout.blocked.length >= 16, true, 'layout should author visible buildings and city edge blocks');
  assert.equal(Array.isArray(layout.pois) && layout.pois.length >= 18, true, 'layout should author dense readable POIs');
  assert.equal(Array.isArray(layout.npcSpawnLanes) && layout.npcSpawnLanes.length >= 12, true, 'layout should author enough NPC spawn lanes');
  assert.equal(Array.isArray(layout.eventAnchors) && layout.eventAnchors.length >= 16, true, 'layout should author enough event anchors');
  assert.equal(typeof layout.playerSpawn?.x, 'number', 'layout should author player spawn x');
  assert.equal(typeof layout.playerSpawn?.y, 'number', 'layout should author player spawn y');
  assert.equal(layout.roads.some((road) => road.id === 'outer_ring_north'), true, 'layout should expose a named outer loop');
  assert.equal(layout.roads.some((road) => road.id === 'middle_ring_north'), true, 'layout should expose a named middle loop');
  assert.equal(layout.roads.some((road) => road.id === 'inner_ring_north'), true, 'layout should expose a named inner loop');
  assert.equal(layout.blocked.some((block) => block.id === 'boundary_north'), true, 'layout should use visible boundary blocks');
  assert.equal(layout.blocked.some((block) => block.id === 'boundary_south'), true, 'layout should use visible boundary blocks');
  assert.equal(layout.blocked.some((block) => block.id === 'boundary_west'), true, 'layout should use visible boundary blocks');
  assert.equal(layout.blocked.some((block) => block.id === 'boundary_east'), true, 'layout should use visible boundary blocks');
}

function testSpeedStateDoesNotFreezeTriggerCounter() {
  resetGlobals();
  loadCore();
  DS.LayoutData = readLayout();

  DS.TileMap.init(DS.LayoutData);
  const spawn = DS.TileMap.getPlayerSpawn();
  DS.Vehicle.x = spawn.x;
  DS.Vehicle.y = spawn.y;
  DS.Vehicle.speed = DS.Config.speedGate.threshold + 40;
  DS.TriggerSystem.init();
  DS.TriggerSystem.update(1);

  assert.equal(DS.TriggerSystem.isFrozen, false, 'high speed should not freeze the trigger counter in the 2D MVP');
  assert.equal(DS.TriggerSystem.freezeReason, '', 'speed state should not write a freeze reason');
  assert.equal(DS.TriggerSystem.timeAccum > 0, true, 'time accumulation should continue at high speed');
}

function testDrawCreatesPendingVehicleBeatSignal() {
  resetGlobals();
  loadCore();
  DS.LayoutData = readLayout();

  let started = false;
  DS.Renderer = {
    showMessage() {},
    clearEncounterHUD() {},
  };
  DS.Encounters = {
    midnight_race: class {
      constructor(card) {
        this.card = card;
        this.phase = 'intro';
        this.isAccepted = false;
      }
      start() { started = true; }
      update() {}
      isFinished() { return false; }
      cleanup() {}
      getResult() { return { success: false }; }
    },
  };
  DS.WorldResponse = {
    getState() {
      return {
        heat: 0,
        heatTier: '低关注',
        lastAction: '巡航',
        regionTag: 'commercial',
        recommendation: { title: '常规巡航', reason: '测试推荐' },
      };
    },
  };
  DS.TileMap.init(DS.LayoutData);
  const spawn = DS.TileMap.getPlayerSpawn();
  DS.Vehicle.init(spawn.x, spawn.y);
  DS.TriggerSystem.init();
  DS.Director.init();
  DS.DeckManager.draw = () => ({
    type: 'midnight_race',
    id: 'test_card',
    def: DS.CardDefs.midnight_race,
  });

  DS.Events.emit('trigger_fire', { reason: 'time' });

  assert.equal(DS.Director.state, 'pending', 'drawn gameplay cards should wait as a pending Vehicle Beat signal');
  assert.equal(started, false, 'encounter should not start until the player accepts the signal');
  assert.equal(DS.Director.activeEncounter, null, 'pending Vehicle Beat should not allocate an active encounter');
  assert.equal(DS.Director.pendingBeat.card.type, 'midnight_race');
  assert.equal(DS.Director.pendingBeat.family, 'discovery');
  assert.equal(DS.Director.pendingBeat.poi.id, 'commercial_plaza');
  assert.equal(DS.Director.pendingBeat.poiName, layoutPoiName('commercial_plaza'));
  assert.equal(DS.TriggerSystem.isLocked, true, 'trigger counter should lock while a pending signal is awaiting player choice');
}

function testAcceptingPendingBeatClearsStalePromptMessages() {
  resetGlobals();
  loadCore();
  DS.LayoutData = readLayout();
  DS.TileMap.init(DS.LayoutData);
  const spawn = DS.TileMap.getPlayerSpawn();
  DS.Vehicle.init(spawn.x, spawn.y);
  DS.TriggerSystem.init();
  DS.Director.init();
  let cleared = false;
  DS.Renderer = {
    hudMessages: [],
    showMessage(text) { this.hudMessages.push({ text }); },
    clearMessages() { cleared = true; this.hudMessages = []; },
    setEncounterHUD() {},
    clearEncounterHUD() {},
  };
  DS.DeckManager.draw = () => ({
    type: 'intimidation_ride',
    id: 'test_intimidation',
    def: DS.CardDefs.intimidation_ride,
  });

  DS.Events.emit('trigger_fire', { reason: 'time' });
  assert.equal(DS.Renderer.hudMessages.length, 1, 'pending beat currently writes a timed prompt message');

  DS.Director.acceptPendingBeat();

  assert.equal(cleared, true, 'accepting a pending beat should clear stale E prompt messages');
  assert.equal(DS.Renderer.hudMessages.length, 1, 'only the new encounter instruction should remain after accepting');
  assert.equal(DS.Renderer.hudMessages[0].text, '前往接人点');
}

function testRequestBeatStartsAfterOnePlayerConfirmation() {
  resetGlobals();
  loadCore();
  DS.LayoutData = readLayout();
  DS.TileMap.init(DS.LayoutData);
  const spawn = DS.TileMap.getPlayerSpawn();
  DS.Vehicle.init(spawn.x, spawn.y);
  DS.TriggerSystem.init();
  DS.Director.init();
  DS.Renderer = {
    showMessage() {},
    setEncounterHUD() {},
    clearEncounterHUD() {},
  };
  DS.Input = { wasPressed() { return false; } };

  DS.DeckManager.draw = () => ({
    type: 'intimidation_ride',
    id: 'test_intimidation',
    def: DS.CardDefs.intimidation_ride,
  });

  DS.Events.emit('trigger_fire', { reason: 'time' });
  assert.equal(DS.Director.state, 'pending', 'request beat should first wait for the Director-level confirmation');

  DS.Director.acceptPendingBeat();

  assert.equal(DS.Director.state, 'active', 'one E confirmation should start the encounter lifecycle');
  assert.equal(DS.Director.activeEncounter.phase, 'pickup', 'intimidation ride should go directly to pickup after Director confirmation');
  assert.equal(DS.Director.activeEncounter.isAccepted, true, 'encounter should inherit the accepted state from the Director');
  assert.equal(!!DS.Director.activeEncounter.pickupMarker, true, 'pickup marker should be created without a second E press');
}

function testMidnightRaceUsesNearbyTrafficVehicleAsChallenger() {
  resetGlobals();
  loadCore();
  DS.LayoutData = readLayout();
  DS.TileMap.init(DS.LayoutData);
  const spawn = DS.TileMap.getPlayerSpawn();
  DS.Vehicle.init(spawn.x, spawn.y);
  DS.Vehicle.angle = 0;
  DS.Vehicle.speed = 20;
  DS.Renderer = {
    showMessage() {},
    setEncounterHUD() {},
    clearEncounterHUD() {},
  };
  const nearbyNpc = {
    x: spawn.x + 180,
    y: spawn.y,
    angle: 0,
    speed: 25,
    archetypeId: 'sport',
    color: '#e8e8e0',
    hitCooldown: 0,
    id: 'nearby_traffic',
  };
  DS.NPCManager.npcs = [nearbyNpc];

  const encounter = new DS.Encounters.midnight_race({
    type: 'midnight_race',
    def: DS.CardDefs.midnight_race,
  });
  encounter.start();

  assert.equal(encounter.npc, nearbyNpc, 'midnight race should claim a nearby traffic vehicle before spawning a new one');
  assert.equal(nearbyNpc.special, true, 'claimed challenger should be marked special');
  assert.equal(nearbyNpc.tag, 'racer', 'claimed challenger should use racer tag');
  assert.equal(DS.NPCManager.npcs.length, 1, 'claiming a challenger should not add an extra spawned vehicle');
}

function testArmoredTruckSpawnsOnRoad() {
  resetGlobals();
  loadCore();
  DS.LayoutData = readLayout();
  DS.TileMap.init(DS.LayoutData);
  DS.Vehicle.init(1000, 630);
  DS.Vehicle.angle = Math.PI / 2;
  DS.Vehicle.speed = 0;
  DS.Renderer = {
    showMessage() {},
    setEncounterHUD() {},
    clearEncounterHUD() {},
  };

  const encounter = new DS.Encounters.armored_heist({
    type: 'armored_heist',
    def: DS.CardDefs.armored_heist,
  });
  encounter.start();

  assert.equal(DS.TileMap.isOnRoad(encounter.truck.x, encounter.truck.y), true, 'armored truck should spawn on a road');
  assert.equal(DS.TileMap.isInBuilding(encounter.truck.x, encounter.truck.y), false, 'armored truck should not spawn in a building');
}

function testCopilotPickupMarkerSpawnsOnReachableRoad() {
  resetGlobals();
  loadCore();
  DS.LayoutData = readLayout();
  DS.TileMap.init(DS.LayoutData);
  DS.Vehicle.init(1000, 630);
  DS.Vehicle.angle = Math.PI / 2;
  DS.Vehicle.speed = 0;
  DS.Renderer = {
    showMessage() {},
    setEncounterHUD() {},
    clearEncounterHUD() {},
  };
  const originalRandom = Math.random;
  Math.random = () => 0.5;
  try {
    const encounter = new DS.Encounters.copilot_command({
      type: 'copilot_command',
      def: DS.CardDefs.copilot_command,
    });
    encounter.start();

    assert.equal(DS.TileMap.isOnRoad(encounter.npcMarker.x, encounter.npcMarker.y), true, 'copilot pickup marker should spawn on a road');
    assert.equal(DS.TileMap.isInBuilding(encounter.npcMarker.x, encounter.npcMarker.y), false, 'copilot pickup marker should not spawn in a building');
  } finally {
    Math.random = originalRandom;
  }
}

function assertMarkerPointHasRoadClearance(point, message) {
  const radius = 34;
  const samples = [
    [0, 0],
    [radius, 0],
    [-radius, 0],
    [0, radius],
    [0, -radius],
    [radius * 0.7, radius * 0.7],
    [-radius * 0.7, radius * 0.7],
    [radius * 0.7, -radius * 0.7],
    [-radius * 0.7, -radius * 0.7],
  ];
  for (const [dx, dy] of samples) {
    const x = point.x + dx;
    const y = point.y + dy;
    assert.equal(DS.TileMap.isOnRoad(x, y), true, message + ' should keep marker radius on a road');
    assert.equal(DS.TileMap.isInBuilding(x, y), false, message + ' should keep marker radius out of buildings');
    assert.equal(DS.TileMap.isOutOfBounds(x, y), false, message + ' should keep marker radius inside authored bounds');
  }
}

function testCopilotDestinationMarkerSpawnsWithRoadClearance() {
  resetGlobals();
  loadCore();
  DS.LayoutData = readLayout();
  DS.TileMap.init(DS.LayoutData);
  DS.Vehicle.init(900, 630);
  DS.Vehicle.angle = -Math.PI / 2;
  DS.Vehicle.speed = 0;
  DS.Renderer = {
    showMessage() {},
    setEncounterHUD() {},
    clearEncounterHUD() {},
  };
  const originalRandom = Math.random;
  Math.random = () => 0.5;
  try {
    const encounter = new DS.Encounters.copilot_command({
      type: 'copilot_command',
      def: DS.CardDefs.copilot_command,
    });
    encounter.correctCount = DS.Config.encounters.copilotCommand.rounds;
    encounter._finishCommands();

    assertMarkerPointHasRoadClearance(encounter.destinationMarker, 'copilot destination marker');
  } finally {
    Math.random = originalRandom;
  }
}

function testRendererCreatesOffscreenMarkerIndicator() {
  resetGlobals();
  loadScript('works/vehicle-deck-director/demo/js/config.js');
  loadScript('works/vehicle-deck-director/demo/js/renderer.js');

  DS.Renderer.camX = 1000;
  DS.Renderer.camY = 1000;
  const indicator = DS.Renderer._getOffscreenIndicator(
    { x: 1000, y: 100, color: '#44cc66', label: '停' },
    800,
    600,
    48
  );
  const inside = DS.Renderer._getOffscreenIndicator(
    { x: 1020, y: 1010, color: '#44cc66', label: '停' },
    800,
    600,
    48
  );

  assert.equal(!!indicator, true, 'offscreen marker should produce a HUD edge indicator');
  assert.equal(indicator.label, '停', 'offscreen indicator should preserve marker label');
  assert.equal(indicator.y, 48, 'offscreen marker above the camera should clamp to the top HUD edge');
  assert.equal(inside, null, 'onscreen marker should not produce a HUD edge indicator');
}

function testDirectorAdvisorUsesSemanticBeatGateBeforeEventSelection() {
  resetGlobals();
  loadScript('works/vehicle-deck-director/demo/js/config.js');
  loadScript('works/vehicle-deck-director/demo/js/director-advisor.js');

  const result = DS.DirectorAdvisor.evaluate({
    speed: 112,
    speedState: 'fast',
    heat: 18,
    vehicleArchetypeId: 'sport',
    vehicleName: '跑车',
    regionTag: 'nightlife',
    nearbyPoi: { id: 'night_market', name: '夜生活街', region: 'nightlife' },
    deckState: { remainingByType: { midnight_race: 2, intimidation_ride: 2, armored_heist: 1, copilot_command: 2, blank: 4 } },
    recentBeats: [],
    isOffroad: false,
  });

  assert.equal(result.semanticFit[0].type, 'street_challenge', 'LLM semantic fit should first recommend a Street Challenge Beat');
  assert.equal(result.beatSelection.type, 'street_challenge', 'Director policy should accept the street challenge beat');
  assert.equal(result.eventSelection.type, 'midnight_race', 'event pool selection should instantiate midnight race under street challenge');
  assert.equal(result.final.type, 'midnight_race', 'final executable event should remain a concrete gameplay event');
  assert.equal(result.final.beatType, 'street_challenge', 'final event should retain its abstract Beat contract');
  assert.equal(result.semanticFit[0].reasons.some(reason => reason.includes('高速')), true, 'semantic fit should explain the speed factor');
  assert.equal(result.semanticFit[0].reasons.some(reason => reason.includes('跑车')), true, 'semantic fit should explain the vehicle identity factor');
}

function testDirectorPolicyBlocksStreetChallengeOffroad() {
  resetGlobals();
  loadScript('works/vehicle-deck-director/demo/js/config.js');
  loadScript('works/vehicle-deck-director/demo/js/director-advisor.js');

  const result = DS.DirectorAdvisor.evaluate({
    speed: 104,
    speedState: 'fast',
    heat: 12,
    vehicleArchetypeId: 'sport',
    vehicleName: '跑车',
    regionTag: 'commercial',
    nearbyPoi: { id: 'commercial_plaza', name: '商业广场', region: 'commercial' },
    deckState: { remainingByType: { midnight_race: 2, intimidation_ride: 2, armored_heist: 1, copilot_command: 2, blank: 4 } },
    recentBeats: [],
    isOffroad: true,
  });
  const streetBeat = result.semanticFit.find(candidate => candidate.type === 'street_challenge');
  const streetAdjustment = result.policy.adjustments.find(item => item.beatType === 'street_challenge');

  assert.equal(streetBeat.score > 60, true, 'semantic analysis may still consider street challenge attractive from speed and vehicle tags');
  assert.equal(streetAdjustment.effect, 'block', 'Director policy should block street challenge after semantic analysis when offroad');
  assert.notEqual(result.beatSelection.type, 'street_challenge', 'Director policy should not select street challenge while offroad');
}

function testDirectorAdvisorKeepsLlmAsAdvisoryBoundary() {
  resetGlobals();
  loadScript('works/vehicle-deck-director/demo/js/config.js');
  loadScript('works/vehicle-deck-director/demo/js/director-advisor.js');

  const result = DS.DirectorAdvisor.evaluate({
    speed: 54,
    speedState: 'cruise',
    heat: 76,
    vehicleArchetypeId: 'police',
    vehicleName: '警车',
    regionTag: 'finance',
    nearbyPoi: { id: 'bank_depot', name: '金融押运区', region: 'finance' },
    deckState: { remainingByType: { midnight_race: 2, intimidation_ride: 2, armored_heist: 1, copilot_command: 2, blank: 4 } },
    recentBeats: ['copilot_command'],
    isOffroad: false,
  });

  assert.equal(result.llmRecommendation.recommendedBeatType, 'armored_pressure', 'LLM should recommend a Beat category, not directly own the final event');
  assert.equal(result.beatSelection.type, 'armored_pressure', 'Director policy should accept armored pressure beat under high heat finance context');
  assert.equal(result.final.type, 'armored_heist', 'high heat near finance should prioritize armored heist pressure');
  assert.equal(result.final.beatType, 'armored_pressure', 'final event should retain the armored pressure Beat contract');
  assert.equal(result.final.llmOutput.allowed.length > 0, true, 'LLM output should list allowed advisory fields');
  assert.equal(result.final.llmOutput.forbidden.includes('直接创建新玩法'), true, 'LLM output should forbid direct mechanic creation');
  assert.equal(result.final.ruleChecks.every(check => check.pass), true, 'final decision should pass deterministic rule checks');
}

function testWorldPressureBeatStartsAfterOnePlayerConfirmation() {
  resetGlobals();
  loadCore();
  DS.LayoutData = readLayout();
  DS.TileMap.init(DS.LayoutData);
  const spawn = DS.TileMap.getPlayerSpawn();
  DS.Vehicle.init(spawn.x, spawn.y);
  DS.TriggerSystem.init();
  DS.Director.init();
  DS.Renderer = {
    showMessage() {},
    setEncounterHUD() {},
    clearEncounterHUD() {},
  };
  DS.Input = { wasPressed() { return false; } };

  DS.DeckManager.draw = () => ({
    type: 'armored_heist',
    id: 'test_armored',
    def: DS.CardDefs.armored_heist,
  });

  DS.Events.emit('trigger_fire', { reason: 'time' });
  DS.Director.acceptPendingBeat();

  assert.equal(DS.Director.state, 'active', 'world pressure beat should start after the Director-level confirmation');
  assert.equal(DS.Director.activeEncounter.phase, 'active', 'armored heist should go directly to chase after one E press');
  assert.equal(DS.Director.activeEncounter.isAccepted, true, 'encounter should inherit the accepted state from the Director');
  assert.equal(!!DS.Director.activeEncounter.truck, true, 'target truck should be created without a second E press');
}

function testRaceStillRequiresDrivingAcceptanceAfterSignal() {
  resetGlobals();
  loadCore();
  DS.LayoutData = readLayout();
  DS.TileMap.init(DS.LayoutData);
  const spawn = DS.TileMap.getPlayerSpawn();
  DS.Vehicle.init(spawn.x, spawn.y);
  DS.Vehicle.speed = 0;
  DS.TriggerSystem.init();
  DS.Director.init();
  DS.Renderer = {
    showMessage() {},
    setEncounterHUD() {},
    clearEncounterHUD() {},
  };

  DS.DeckManager.draw = () => ({
    type: 'midnight_race',
    id: 'test_race',
    def: DS.CardDefs.midnight_race,
  });

  DS.Events.emit('trigger_fire', { reason: 'time' });
  DS.Director.acceptPendingBeat();

  assert.equal(DS.Director.state, 'active', 'race beat should enter encounter lifecycle after E');
  assert.equal(DS.Director.activeEncounter.phase, 'intro', 'race should still start as an in-world challenge intro');
  assert.equal(DS.Director.activeEncounter.isAccepted, false, 'race should require acceleration before it becomes accepted');
}

function testIntimidationRideCanFinishAfterFearReachesMax() {
  resetGlobals();
  loadCore();
  DS.LayoutData = readLayout();
  DS.TileMap.init(DS.LayoutData);
  const spawn = DS.TileMap.getPlayerSpawn();
  DS.Vehicle.init(spawn.x, spawn.y);
  DS.Renderer = {
    showMessage() {},
    setEncounterHUD() {},
    clearEncounterHUD() {},
  };

  const encounter = new DS.Encounters.intimidation_ride({
    type: 'intimidation_ride',
    def: DS.CardDefs.intimidation_ride,
  });
  encounter.phase = 'active';
  encounter.hasPassenger = true;
  encounter.timer = 30;
  encounter.fear = DS.Config.encounters.intimidationRide.fearMax;
  encounter.fearPeak = encounter.fear;

  encounter.update(0.1);
  assert.equal(encounter.phase, 'result', 'fear max should move intimidation ride into result phase');
  assert.equal(encounter.success, true, 'fear max should count as success');

  encounter.update(DS.Config.ui.resultDisplayTime + 0.1);
  assert.equal(encounter.isFinished(), true, 'result phase should finish after the configured display time');
}

function layoutPoiName(id) {
  return readLayout().pois.find((poi) => poi.id === id)?.name;
}

function testTileMapUsesDistrictLayoutAsSourceOfTruth() {
  resetGlobals();
  loadCore();
  const layout = readLayout();
  DS.TileMap.init(layout);

  const spawn = DS.TileMap.getPlayerSpawn();
  const firstPoi = layout.pois[0];
  const nearestPoi = DS.TileMap.getNearestPoi(firstPoi.x + 8, firstPoi.y + 8, 120);

  assert.deepEqual(spawn, layout.playerSpawn, 'player spawn should come from district-layout.json');
  assert.equal(DS.TileMap.isOnRoad(spawn.x, spawn.y), true, 'player spawn should be on authored road');
  assert.equal(nearestPoi.id, firstPoi.id, 'POI query should use authored POIs from district-layout.json');
  assert.equal(DS.TileMap.isInBuilding(layout.blocked[0].x + 4, layout.blocked[0].y + 4), true, 'building collision should use authored blocked areas');
}

function testVehicleCannotLeaveAuthoredDistrictBoundary() {
  resetGlobals();
  loadCore();
  const layout = readLayout();
  DS.TileMap.init(layout);
  DS.Vehicle.init(16, layout.playerSpawn.y);
  DS.Vehicle.prevX = 16;
  DS.Vehicle.prevY = layout.playerSpawn.y;
  DS.Vehicle.angle = Math.PI;
  DS.Vehicle.speed = 120;

  DS.Vehicle.update(1);

  assert.equal(DS.Vehicle.x >= 16, true, 'vehicle should not drive beyond the authored west boundary');
  assert.equal(DS.Vehicle.speed > -120, true, 'boundary collision should dampen speed instead of allowing escape');
}

testDistrictLayoutFilesExistAndDescribeGameplaySpace();
testSpeedStateDoesNotFreezeTriggerCounter();
testDrawCreatesPendingVehicleBeatSignal();
testAcceptingPendingBeatClearsStalePromptMessages();
testRequestBeatStartsAfterOnePlayerConfirmation();
testWorldPressureBeatStartsAfterOnePlayerConfirmation();
testRaceStillRequiresDrivingAcceptanceAfterSignal();
testIntimidationRideCanFinishAfterFearReachesMax();
testMidnightRaceUsesNearbyTrafficVehicleAsChallenger();
testArmoredTruckSpawnsOnRoad();
testCopilotPickupMarkerSpawnsOnReachableRoad();
testCopilotDestinationMarkerSpawnsWithRoadClearance();
testRendererCreatesOffscreenMarkerIndicator();
testDirectorAdvisorUsesSemanticBeatGateBeforeEventSelection();
testDirectorPolicyBlocksStreetChallengeOffroad();
testDirectorAdvisorKeepsLlmAsAdvisoryBoundary();
testTileMapUsesDistrictLayoutAsSourceOfTruth();
testVehicleCannotLeaveAuthoredDistrictBoundary();

console.log('Vehicle Deck MVP checks passed');
