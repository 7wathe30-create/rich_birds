import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_DEMO,
  saveProfile,
  assignDemoLand,
  transferDemoLand,
  placeDemoBird,
  readDemo,
  demoOwner,
  landStatus,
  validAvatar,
} from "../src/demo-state.js";
const profile = {
  nickname: "Voxel Explorer",
  avatar: { kind: "preset", index: 5 },
};
test("onboarding requires valid nickname and avatar", () => {
  for (const p of [
    { ...profile, nickname: " " },
    { ...profile, avatar: null },
    { ...profile, avatar: { kind: "preset", index: 15 } },
    { ...profile, avatar: { kind: "upload", src: "javascript:alert(1)" } },
  ])
    assert.throws(() => saveProfile(EMPTY_DEMO, p));
  assert.throws(() => assignDemoLand(EMPTY_DEMO, 16));
  assert.ok(validAvatar({ kind: "upload", src: "data:image/png;base64,YQ==" }));
});
test("assignment is demo-only and rejects occupied lands", () => {
  const s = saveProfile(EMPTY_DEMO, profile);
  assert.throws(() => assignDemoLand(s, 15));
  const owned = assignDemoLand(s, 16);
  assert.equal(demoOwner(owned, 16), "player");
  assert.equal(landStatus(owned, 16), "owned");
  assert.throws(() => assignDemoLand(owned, 16));
  assert.equal(s.lands.length, 0);
});
test("profile changes affect all owned land without copying avatars", () => {
  let s = assignDemoLand(saveProfile(EMPTY_DEMO, profile), 16);
  s = assignDemoLand(s, 17);
  s = saveProfile(s, {
    nickname: "Updated",
    avatar: { kind: "preset", index: 14 },
  });
  assert.equal(s.profile.avatar.index, 14);
  assert.ok(
    s.lands.every((l) => l.owner === "player" && !Object.hasOwn(l, "avatar")),
  );
  assert.deepEqual(readDemo(JSON.stringify(s)), s);
});
test("direct transfer invalidates placement and access; return does not restore old birds", () => {
  let s = assignDemoLand(saveProfile(EMPTY_DEMO, profile), 16);
  s = placeDemoBird(s, 16, 108);
  assert.deepEqual(s.lands[0].placements, [108]);
  s = transferDemoLand(s, 16, "visitor");
  assert.equal(demoOwner(s, 16), "visitor");
  assert.deepEqual(s.lands[0].placements, []);
  assert.throws(() => placeDemoBird(s, 16, 108));
  s = transferDemoLand(s, 16, "player");
  assert.deepEqual(s.lands[0].placements, []);
  assert.equal(s.lands[0].epoch, 3);
  s = placeDemoBird(s, 16, 108);
  assert.deepEqual(s.lands[0].placements, [108]);
});
test("bird placement removal preserves inventory and moves one demo bird between scenes", () => {
  let s = assignDemoLand(
    assignDemoLand(saveProfile(EMPTY_DEMO, profile), 16),
    17,
  );
  s = placeDemoBird(s, 16, 108);
  s = placeDemoBird(s, 17, 108);
  assert.deepEqual(s.lands[0].placements, []);
  assert.deepEqual(s.lands[1].placements, [108]);
  s = placeDemoBird(s, 17, 108);
  assert.deepEqual(s.lands[1].placements, []);
  assert.throws(() => placeDemoBird(s, 17, 999));
});
test("malformed and unsafe stored state is rejected", () => {
  for (const raw of [
    "null",
    "{bad}",
    JSON.stringify({ version: 2, lands: [] }),
    JSON.stringify({
      version: 1,
      profile,
      lands: [{ id: 0, owner: "player", epoch: 1, placements: [] }],
    }),
    JSON.stringify({
      version: 1,
      profile,
      lands: [{ id: 16, owner: "visitor", epoch: 1, placements: [108] }],
    }),
  ])
    assert.deepEqual(readDemo(raw), EMPTY_DEMO);
});
