import { test } from "node:test";
import assert from "node:assert/strict";
import {
  coordinates,
  tokenId,
  parseSearch,
  TOTAL,
  FREE_COUNT,
  statusOf,
} from "../src/world.js";
test("all 100,000 immutable IDs round-trip to unique coordinates", () => {
  for (let id = 1; id <= TOTAL; id++) {
    const { x, y } = coordinates(id);
    assert.equal(tokenId(x, y), id);
  }
});
test("search supports IDs and coordinates with strict bounds", () => {
  assert.equal(parseSearch("#15"), 15);
  assert.equal(parseSearch("14, 0"), 15);
  assert.equal(parseSearch("399 249"), 100000);
  for (const value of [
    "0",
    "100001",
    "-1",
    "400,0",
    "1,250",
    "abc",
    "1.5",
    "1 2 3",
    "1,",
    "1e2",
    "1,,2",
    "",
  ])
    assert.throws(() => parseSearch(value));
});
test("free count matches deterministic demo data", () => {
  let count = 0;
  for (let i = 1; i <= TOTAL; i++) if (statusOf(i) === "free") count++;
  assert.equal(count, FREE_COUNT);
});
