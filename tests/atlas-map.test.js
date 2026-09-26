import { test } from "node:test";
import assert from "node:assert/strict";
import { zoomAt, parcelAt, MIN_ZOOM, MAX_ZOOM } from "../src/atlas-map.js";
import { cellMarker } from "../src/atlas-map.js";
import { coordinates } from "../src/world.js";
test("avatar always fits its exact parcel at every zoom", () => {
  for (const scale of [2, 7, 24, 54, 108])
    for (const id of [1, 48216, 100000]) {
      const view = { x: -20, y: 13, scale },
        p = coordinates(id),
        m = cellMarker(id, view);
      assert.ok(m.x >= view.x + p.x * scale && m.y >= view.y + p.y * scale);
      assert.ok(m.x + m.size <= view.x + (p.x + 1) * scale);
      assert.ok(m.y + m.size <= view.y + (p.y + 1) * scale);
      assert.equal(parcelAt(m.x + m.size / 2, m.y + m.size / 2, view), id);
    }
});
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
