import { test } from "node:test";
import assert from "node:assert/strict";
import { zoomAt, parcelAt, MIN_ZOOM, MAX_ZOOM } from "../src/atlas-map.js";
test("zoom preserves world point beneath pointer and enforces bounds", () => {
  const view = { x: -800, y: -420, scale: 7 },
    anchor = { x: 400, y: 300 };
  for (const next of [1, 14, 100]) {
    const z = zoomAt(view, next, anchor);
    assert.ok(z.scale >= MIN_ZOOM && z.scale <= MAX_ZOOM);
    assert.ok(
      Math.abs((anchor.x - z.x) / z.scale - (anchor.x - view.x) / view.scale) <
        1e-9,
    );
    assert.ok(
      Math.abs((anchor.y - z.y) / z.scale - (anchor.y - view.y) / view.scale) <
        1e-9,
    );
  }
});
test("screen hit testing returns permanent parcel IDs only inside grid", () => {
  const v = { x: 0, y: 0, scale: 10 };
  assert.equal(parcelAt(145, 5, v), 15);
  assert.equal(parcelAt(3999, 2499, v), 100000);
  assert.equal(parcelAt(-1, 0, v), null);
  assert.equal(parcelAt(4000, 0, v), null);
  assert.equal(parcelAt(0, 2500, v), null);
});
