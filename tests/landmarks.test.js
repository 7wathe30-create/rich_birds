import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { LANDMARKS } from "../src/landmarks.js";

test("reference portraits resolve to distinct, decodable local artwork", async () => {
  assert.equal(LANDMARKS.length, 3);
  assert.equal(new Set(LANDMARKS.map(({ id }) => id)).size, 3);
  for (const landmark of LANDMARKS) {
    assert.match(landmark.src, /^\/landmarks\/[a-z-]+\.webp$/);
    assert.match(landmark.caption, /Иллюстративный портрет/);
    assert.ok(landmark.id >= 1 && landmark.id <= 100000);
    const image = await sharp(
      new URL(`../public${landmark.src}`, import.meta.url).pathname,
    ).metadata();
    assert.equal(image.format, "webp");
    assert.ok(image.width >= 80 && image.height >= 80);
  }
});
