import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { AVATARS } from "../src/avatars.js";

test("avatar catalog has 15 unique, safe static SVG portraits", async () => {
  assert.equal(AVATARS.length, 15);
  assert.equal(new Set(AVATARS.map(({ id }) => id)).size, 15);
  assert.equal(new Set(AVATARS.map(({ src }) => src)).size, 15);

  const filenames = await readdir(new URL("../public/avatars/", import.meta.url));
  assert.equal(filenames.length, AVATARS.length);
  const contents = new Set();
  for (const { id, src, name } of AVATARS) {
    assert.match(id, /^[a-z]+$/);
    assert.equal(src, `/avatars/${id}.svg`);
    assert.ok(name.length > 0);
    const svg = await readFile(new URL(`../public${src}`, import.meta.url), "utf8");
    assert.match(svg, /^<svg\s/);
    assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, /width="240" height="240" viewBox="0 0 240 240"/);
    assert.match(svg, /<clipPath id="forelock"><rect x="75" y="68" width="90" height="24"\/><\/clipPath>/);
    assert.match(svg, /<clipPath id="sideLocks"><rect x="70" y="92" width="18" height="58"\/><rect x="153" y="92" width="23" height="58"\/><\/clipPath>/);
    const face = svg.indexOf('<rect x="75" y="68" width="90" height="82"');
    const frontHair = svg.indexOf('<g clip-path="url(#forelock)">');
    const eyes = svg.indexOf('<rect x="91" y="105" width="19" height="10"');
    assert.ok(face < frontHair && frontHair < eyes, `${id} layers hair behind the face and eyes above fringe`);
    assert.ok(svg.includes("clip-path=\"url(#sideLocks)\""), `${id} keeps hair at the side silhouette`);
    assert.doesNotMatch(svg, /<script\b|<foreignObject\b|\bon\w+\s*=|(?:href|src)="(?:https?:|data:)/i);
    assert.ok(!contents.has(svg), `${id} should have original artwork`);
    contents.add(svg);
  }
});
