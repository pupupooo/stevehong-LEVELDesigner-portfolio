import assert from "node:assert/strict";
import test from "node:test";

import {
  createGameState,
  getActors,
  getActorTracks,
  getMapMarkers,
  getSceneActions,
  getVisibleEntries,
  getWorldOutcome,
  getZoneConditions,
  performAction,
} from "./event-frontline-engine.mjs";

function play(state, actions) {
  return actions.reduce((current, action) => performAction(current, action), state);
}

test("preview seen at B lets the player reach the medicine cart live event at A that night", () => {
  let state = createGameState({ startZone: "B" });

  state = performAction(state, { type: "observe" });
  assert.equal(state.currentTick.id, "day1_day");
  assert.equal(state.seenPreviews.has("medicine_cart_ambush"), true);

  state = performAction(state, { type: "move", targetZone: "A" });
  const entries = getVisibleEntries(state);

  assert.equal(state.currentTick.id, "day1_night");
  assert.equal(entries.some((entry) => entry.id === "medicine_cart_ambush.live"), true);
  assert.equal(state.activeScene?.eventId, "medicine_cart_ambush");
  assert.equal(state.activeScene?.phaseIndex, 0);
});

test("redirecting the cart and bandit across scene beats saves the medicine route", () => {
  let state = createGameState({ startZone: "B" });
  state = play(state, [
    { type: "observe" },
    { type: "move", targetZone: "A" },
    { type: "sceneAction", actionId: "warn_cart" },
    { type: "sceneAction", actionId: "delay_bandit" },
    { type: "sceneBeat" },
    { type: "move", targetZone: "B" },
    { type: "move", targetZone: "C" },
    { type: "rest" },
  ]);

  assert.equal(state.events.medicine_cart_ambush.status, "resolved");
  assert.equal(state.events.medicine_cart_ambush.sceneOutcome, "cart_saved");
  assert.equal(state.worldTags.has("medicine_delivered"), true);
  assert.equal(
    state.reentries.some((entry) => entry.eventId === "medicine_cart_ambush"),
    false,
  );
});

test("three explicit wait beats resolve an on-site scene without intervention", () => {
  let state = createGameState({ startZone: "B" });
  state = play(state, [
    { type: "move", targetZone: "A" },
    { type: "sceneBeat" },
    { type: "sceneBeat" },
    { type: "sceneBeat" },
  ]);

  assert.equal(state.activeScene, null);
  assert.equal(state.events.medicine_cart_ambush.sceneOutcome, "cart_lost");
  assert.equal(state.events.medicine_cart_ambush.witnessed, true);
});

test("observing intent and securing the crate creates a portable partial outcome", () => {
  let state = createGameState({ startZone: "B" });
  state = play(state, [
    { type: "move", targetZone: "A" },
  ]);

  const inspectAction = getSceneActions(state).find((action) => action.id === "inspect_intent");
  assert.equal(inspectAction.target, "bandit");
  assert.equal(inspectAction.text.includes("关键资源"), true);

  state = performAction(state, { type: "sceneAction", actionId: "inspect_intent" });

  assert.equal(
    getSceneActions(state).some(
      (action) => action.id === "secure_medicine"
        && action.primitive === "transfer"
        && action.target === "medicine",
    ),
    true,
  );

  state = play(state, [
    { type: "sceneAction", actionId: "secure_medicine" },
    { type: "sceneBeat" },
  ]);

  assert.equal(state.activeScene, null);
  assert.equal(state.events.medicine_cart_ambush.sceneOutcome, "medicine_recovered");
  assert.equal(state.inventory.has("medicine_crate"), true);
  assert.equal(getWorldOutcome(state).id, "medicine_in_hand");
});

test("delivering the recovered crate to the clinic creates a distinct converged result", () => {
  let state = createGameState({ startZone: "B" });
  state = play(state, [
    { type: "move", targetZone: "A" },
    { type: "sceneAction", actionId: "inspect_intent" },
    { type: "sceneAction", actionId: "secure_medicine" },
    { type: "sceneBeat" },
    { type: "movePlayer", targetZone: "B" },
    { type: "movePlayer", targetZone: "C" },
    { type: "movePlayer", targetZone: "D" },
    { type: "deliverToken", tokenId: "medicine_crate" },
  ]);

  assert.equal(state.inventory.has("medicine_crate"), false);
  assert.equal(state.worldTags.has("medicine_delivered"), true);
  assert.equal(state.worldTags.has("cart_missing"), true);
  assert.equal(getWorldOutcome(state).id, "medicine_relay");
});

test("leaving a live scene collapses its remaining beats through the same resolver", () => {
  let state = createGameState({ startZone: "B" });
  state = play(state, [
    { type: "move", targetZone: "A" },
    { type: "sceneAction", actionId: "warn_cart" },
    { type: "leaveScene" },
  ]);

  assert.equal(state.activeScene, null);
  assert.equal(state.events.medicine_cart_ambush.sceneOutcome, "cart_lost");
  assert.equal(state.events.medicine_cart_ambush.sceneResolved, true);
  assert.equal(getWorldOutcome(state).id, "cart_lost_witnessed");
});

test("witnessing a failed scene creates strong reentry even without seeing its preview", () => {
  const state = play(createGameState({ startZone: "B" }), [
    { type: "move", targetZone: "A" },
    { type: "sceneBeat" },
    { type: "sceneBeat" },
    { type: "sceneBeat" },
    { type: "rest" },
    { type: "rest" },
    { type: "rest" },
  ]);
  const medicineHooks = state.reentries.filter(
    (entry) => entry.eventId === "medicine_cart_ambush",
  );

  assert.equal(state.seenPreviews.has("medicine_cart_ambush"), false);
  assert.equal(medicineHooks.length, 3);
  assert.equal(medicineHooks.every((entry) => entry.strength === "strong"), true);
});

test("missing a previewed live event transforms it into strong reentry hooks", () => {
  let state = createGameState({ startZone: "B" });
  state = play(state, [
    { type: "observe" },
    { type: "move", targetZone: "C" },
    { type: "observe" },
    { type: "rest" },
    { type: "rest" },
    { type: "rest" },
  ]);

  const medicineHooks = state.reentries.filter(
    (entry) => entry.eventId === "medicine_cart_ambush",
  );

  assert.equal(state.currentTick.id, "day3_day");
  assert.equal(medicineHooks.length, 3);
  assert.deepEqual(
    medicineHooks.map((entry) => entry.zoneId).sort(),
    ["C", "D", "F"],
  );
  assert.equal(medicineHooks.every((entry) => entry.strength === "strong"), true);
  assert.equal(state.worldTags.has("medicine_shortage"), true);
});

test("unseen events only create weak background fallout, not strong reentry hooks", () => {
  let state = createGameState({ startZone: "C" });
  state = play(state, [
    { type: "rest" },
    { type: "rest" },
    { type: "rest" },
    { type: "rest" },
  ]);

  const medicineHooks = state.reentries.filter(
    (entry) => entry.eventId === "medicine_cart_ambush",
  );

  assert.equal(state.currentTick.id, "day3_day");
  assert.equal(medicineHooks.length, 1);
  assert.equal(medicineHooks[0].strength, "weak");
  assert.equal(medicineHooks[0].zoneId, "C");
  assert.equal(medicineHooks[0].title.includes("传闻"), true);
  assert.equal(state.events.medicine_cart_ambush.sceneOutcome, "cart_lost");
  assert.equal(
    getMapMarkers(state).some(
      (marker) => marker.kind === "rumor" && marker.eventId === "medicine_cart_ambush",
    ),
    true,
  );
});

test("player participation changes the converged world outcome", () => {
  const interventionState = play(createGameState({ startZone: "B" }), [
    { type: "observe" },
    { type: "move", targetZone: "A" },
    { type: "sceneAction", actionId: "warn_cart" },
    { type: "sceneAction", actionId: "delay_bandit" },
    { type: "sceneBeat" },
    { type: "move", targetZone: "B" },
    { type: "move", targetZone: "C" },
    { type: "rest" },
    { type: "rest" },
    { type: "rest" },
  ]);

  const missedState = play(createGameState({ startZone: "B" }), [
    { type: "observe" },
    { type: "move", targetZone: "C" },
    { type: "observe" },
    { type: "rest" },
    { type: "rest" },
    { type: "rest" },
    { type: "rest" },
  ]);

  assert.equal(getWorldOutcome(interventionState).id, "relief_route");
  assert.equal(getWorldOutcome(missedState).id, "black_market_town");
});

test("map markers expose player, live events, and reentry hooks for the 2D prototype", () => {
  let state = createGameState({ startZone: "B" });
  state = performAction(state, { type: "observe" });
  state = performAction(state, { type: "move", targetZone: "A" });

  let markers = getMapMarkers(state);
  assert.equal(markers.some((marker) => marker.kind === "player" && marker.zoneId === "A"), true);
  assert.equal(
    markers.some((marker) => marker.kind === "live" && marker.eventId === "medicine_cart_ambush"),
    true,
  );
  assert.equal(
    markers.some((marker) => marker.kind === "live" && marker.label === "药车"),
    true,
  );

  state = play(createGameState({ startZone: "B" }), [
    { type: "observe" },
    { type: "move", targetZone: "C" },
    { type: "observe" },
    { type: "rest" },
    { type: "rest" },
    { type: "rest" },
  ]);

  markers = getMapMarkers(state);
  assert.deepEqual(
    markers
      .filter((marker) => marker.kind === "reentry" && marker.eventId === "medicine_cart_ambush")
      .map((marker) => marker.zoneId)
      .sort(),
    ["C", "D", "F"],
  );
});

test("world step advances time without moving the player while scheduled actors change position", () => {
  let state = createGameState({ startZone: "B" });
  const initialActors = getActors(state);

  state = performAction(state, { type: "worldStep" });
  const nextActors = getActors(state);

  assert.equal(state.currentTick.id, "day1_night");
  assert.equal(state.zoneId, "B");
  assert.notDeepEqual(
    initialActors.map((actor) => `${actor.id}:${actor.zoneId}`),
    nextActors.map((actor) => `${actor.id}:${actor.zoneId}`),
  );
  assert.equal(nextActors.some((actor) => actor.id === "medicine_cart" && actor.zoneId === "A"), true);
});

test("player free movement changes location without consuming a world tick", () => {
  let state = createGameState({ startZone: "B" });

  state = performAction(state, { type: "movePlayer", targetZone: "A" });

  assert.equal(state.zoneId, "A");
  assert.equal(state.currentTick.id, "day1_day");
});

test("actor tracks expose continuous movement targets for natural time flow", () => {
  const state = createGameState({ startZone: "B" });
  const tracks = getActorTracks(state);
  const medicineCart = tracks.find((track) => track.id === "medicine_cart");
  const merchant = tracks.find((track) => track.id === "merchant");

  assert.equal(medicineCart.fromZoneId, "B");
  assert.equal(medicineCart.toZoneId, "A");
  assert.equal(medicineCart.moving, true);
  assert.equal(merchant.fromZoneId, "B");
  assert.equal(merchant.toZoneId, "F");
});

test("missed events produce visible zone conditions for the town sandbox", () => {
  const state = play(createGameState({ startZone: "B" }), [
    { type: "observe" },
    { type: "move", targetZone: "C" },
    { type: "observe" },
    { type: "worldStep" },
    { type: "worldStep" },
    { type: "worldStep" },
  ]);

  const conditions = getZoneConditions(state);
  const actors = getActors(state);

  assert.equal(conditions.D.some((condition) => condition.id === "medicine_shortage"), true);
  assert.equal(conditions.C.some((condition) => condition.id === "black_market"), true);
  assert.equal(conditions.F.some((condition) => condition.id === "investigation"), true);
  assert.equal(actors.some((actor) => actor.id === "black_market_dealer" && actor.zoneId === "C"), true);
});
