import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { coordinates, tokenId, statusOf, hash, birds } from "./world.js";
import { CanvasRenderer } from "./canvas-renderer.js";

function shade(c, f) {
  const v = new THREE.Color(c);
  v.multiplyScalar(f);
  return "#" + v.getHexString();
}
export function BirdArt({ bird }) {
  const b = bird,
    blocks = [];
  const block = (x, y, z, w, h, d, c) => blocks.push({ x, y, z, w, h, d, c });
  block(-0.65, 0, -0.2, 0.35, 0.38, 0.7, "#b98340");
  block(0.4, 0, -0.2, 0.35, 0.38, 0.7, "#b98340");
  block(-0.85, 0.35, -0.65, 1.7, 1.3, 1.35, b.color);
  block(-0.6, 0.55, 0.55, 1.2, 0.9, 0.18, "#f6ddb0");
  block(-0.65, 1.45, -0.35, 1.3, 1.2, 1.1, b.color);
  block(0.43, 1.95, 0.65, 0.28, 0.3, 0.13, "#fff8e9");
  block(0.52, 1.99, 0.78, 0.15, 0.2, 0.05, "#273d38");
  block(-0.45, 1.95, 0.65, 0.28, 0.3, 0.13, "#fff8e9");
  block(-0.36, 1.99, 0.78, 0.15, 0.2, 0.05, "#273d38");
  block(-0.19, 1.65, 0.73, 0.55, 0.3, 0.45, "#dc8e41");
  block(0.8, 0.7, -0.45, 0.3, 0.78, 0.9, b.accent);
  block(-1.06, 0.7, -0.45, 0.3, 0.78, 0.9, b.accent);
  block(-0.4, 0.75, -1.15, 0.8, 0.7, 0.65, b.accent);
  if (b.shape === 0) {
    block(-0.3, 2.6, -0.05, 0.34, 0.4, 0.3, "#ce7552");
    block(0.05, 2.6, -0.05, 0.34, 0.58, 0.3, "#ce7552");
  }
  if (b.shape === 1) {
    block(-0.3, 2.6, -0.2, 0.5, 0.58, 0.32, b.accent);
    block(-0.3, 2.7, -0.5, 0.5, 0.22, 0.4, b.accent);
  }
  if (b.shape === 2) {
    block(-0.55, 2.5, -0.1, 0.35, 0.35, 0.35, b.accent);
    block(0.2, 2.5, -0.1, 0.35, 0.35, 0.35, b.accent);
    block(-0.18, 2.6, -0.08, 0.36, 0.3, 0.35, "#efbd90");
  }
  if (b.shape === 3) {
    block(-0.65, 2.5, -0.3, 0.3, 0.6, 0.4, b.accent);
    block(0.35, 2.5, -0.3, 0.3, 0.6, 0.4, b.accent);
    block(-0.5, 0.65, 0.71, 1, 0.62, 0.12, "#d7d7b2");
  }
  if (b.shape === 1) {
    block(-0.27, 0.45, -1.7, 0.54, 0.5, 0.7, b.accent);
    blocks.forEach((q) => {
      q.x *= 0.78;
      q.w *= 0.78;
      q.y *= 1.07;
      q.h *= 1.07;
    });
  }
  if (b.shape === 2)
    blocks.forEach((q) => {
      q.x *= 1.17;
      q.w *= 1.17;
      q.y *= 0.86;
      q.h *= 0.86;
    });
  if (b.shape === 3)
    blocks
      .filter((q) => q.y > 1.4)
      .forEach((q) => {
        q.x *= 1.13;
        q.w *= 1.13;
      });
  const p = (x, y, z) => [
    140 + x * 37 - z * 22,
    150 - y * 36 + x * 13 + z * 16,
  ];
  const poly = (points) => points.map((q) => p(...q).join(",")).join(" ");
  blocks.sort((a, b) => a.x + a.z - (b.x + b.z));
  return (
    <svg
      className={`voxel-bird bird-type-${b.shape}`}
      viewBox="0 0 280 200"
      role="img"
      aria-label={b.name}
    >
      <ellipse cx="140" cy="171" rx="53" ry="14" fill="#304538" opacity=".1" />
      <g>
        {blocks.map(({ x, y, z, w, h, d, c }, i) => (
          <g key={i}>
            <polygon
              points={poly([
                [x, y + h, z],
                [x + w, y + h, z],
                [x + w, y + h, z + d],
                [x, y + h, z + d],
              ])}
              fill={shade(c, 1.13)}
            />
            <polygon
              points={poly([
                [x + w, y, z],
                [x + w, y + h, z],
                [x + w, y + h, z + d],
                [x + w, y, z + d],
              ])}
              fill={shade(c, 0.8)}
            />
            <polygon
              points={poly([
                [x, y, z + d],
                [x + w, y, z + d],
                [x + w, y + h, z + d],
                [x, y + h, z + d],
              ])}
              fill={c}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}

function createBuilder(scene) {
  const batches = new Map(),
    dummy = new THREE.Object3D();
  function box(x, y, z, w, h, d, c, rotation = 0) {
    if (!batches.has(c)) batches.set(c, []);
    batches.get(c).push([x, y, z, w, h, d, rotation]);
  }
  function flush() {
    for (const [color, list] of batches) {
      const mesh = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color, roughness: 1 }),
        list.length,
      );
      list.forEach(([x, y, z, w, h, d, r], i) => {
        dummy.position.set(x, y, z);
        dummy.scale.set(w, h, d);
        dummy.rotation.set(0, r, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    }
    batches.clear();
  }
  return { box, flush };
}
function tree(box, x, y, z, seed, scale = 1) {
  const s = scale,
    green = ["#6b944b", "#87a75a", "#4e8054", "#a4b465"][seed % 4];
  box(
    x + 0.4 * s,
    y + 0.035,
    z + 0.18 * s,
    1.9 * s,
    0.025,
    1.55 * s,
    "#819953",
  );
  box(x, y + 1.25 * s, z, 0.42 * s, 2.5 * s, 0.42 * s, "#8b7754");
  if (seed % 5 === 0) {
    for (let i = 0; i < 4; i++)
      box(
        x,
        y + (1.9 + i * 0.63) * s,
        z,
        (2.2 - i * 0.44) * s,
        0.85 * s,
        (2.2 - i * 0.44) * s,
        green,
      );
  } else {
    box(x, y + 2.4 * s, z, 1.95 * s, 1.55 * s, 1.7 * s, green);
    box(
      x - 0.22 * s,
      y + 3.25 * s,
      z - 0.1 * s,
      1.32 * s,
      0.6 * s,
      1.3 * s,
      shade(green, 1.06),
    );
    box(
      x + 0.7 * s,
      y + 2.35 * s,
      z + 0.16 * s,
      0.9 * s,
      0.95 * s,
      1.05 * s,
      green,
    );
  }
}
function house(box, x, y, z, scale = 1) {
  const s = scale;
  box(x, y + 0.68 * s, z, 2.2 * s, 1.36 * s, 1.8 * s, "#f0dbad");
  box(x, y + 0.07 * s, z, 2.65 * s, 0.17 * s, 2.3 * s, "#ac9870");
  for (let i = 0; i < 5; i++)
    box(
      x,
      y + (1.4 + i * 0.19) * s,
      z,
      (2.85 - i * 0.46) * s,
      0.23 * s,
      2.4 * s,
      i % 2 ? "#c47750" : "#d48c58",
    );
  box(x, y + 0.45 * s, z + 0.915 * s, 0.48 * s, 0.9 * s, 0.05 * s, "#6c7960");
  box(
    x + 0.67 * s,
    y + 0.85 * s,
    z + 0.94 * s,
    0.4 * s,
    0.42 * s,
    0.08 * s,
    "#699d99",
  );
  box(
    x - 0.66 * s,
    y + 0.85 * s,
    z + 0.94 * s,
    0.4 * s,
    0.42 * s,
    0.08 * s,
    "#699d99",
  );
  box(
    x + 0.6 * s,
    y + 2.16 * s,
    z - 0.4 * s,
    0.33 * s,
    0.9 * s,
    0.38 * s,
    "#e6d2ac",
  );
  for (const dx of [-1.2, 1.2])
    box(
      x + dx * s,
      y + 0.65 * s,
      z + 1.4 * s,
      0.12 * s,
      1.3 * s,
      0.12 * s,
      "#b69667",
    );
  box(x, y + 1.27 * s, z + 1.23 * s, 2.65 * s, 0.13 * s, 0.65 * s, "#8a9b64");
}
function makeBird(scene, x, y, z, bird, scale = 1) {
  const group = new THREE.Group(),
    box = (a, b, c, w, h, d, color) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color, roughness: 1 }),
      );
      m.position.set(a, b, c);
      m.castShadow = true;
      group.add(m);
    };
  box(0, 0.6, 0, 0.9, 0.85, 0.9, bird.color);
  box(0, 1.2, 0.2, 0.73, 0.66, 0.7, bird.color);
  box(0, 1.04, 0.66, 0.24, 0.19, 0.33, "#d69b42");
  for (const a of [-0.22, 0.22]) {
    box(a, 1.33, 0.56, 0.14, 0.18, 0.04, "#fff6df");
    box(a + 0.015, 1.33, 0.59, 0.075, 0.12, 0.025, "#2a3736");
    box(a, 0.1, 0.14, 0.13, 0.2, 0.3, "#af7740");
    box(a * 2.3, 0.66, -0.03, 0.2, 0.52, 0.62, bird.accent);
  }
  box(0, 0.6, -0.6, 0.5, 0.45, 0.55, bird.accent);
  box(0, 1.63, 0.16, 0.24, 0.3, 0.24, bird.accent);
  group.position.set(x, y, z);
  group.scale.setScalar(scale);
  scene.add(group);
  return group;
}
function label(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fffdf0";
  ctx.beginPath();
  ctx.roundRect(4, 4, 248, 65, 18);
  ctx.fill();
  ctx.fillStyle = "#344e3b";
  ctx.font = "600 29px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, 128, 47);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      depthTest: false,
    }),
  );
  sprite.scale.set(3.5, 1.1, 1);
  return sprite;
}
function worldPosition(n) {
  return n * 2.15 + Math.floor(n / 10) * 5.5;
}
function nearestCoord(v, max) {
  let best = 0,
    dist = Infinity;
  for (let i = 0; i < max; i++) {
    const d = Math.abs(worldPosition(i) - v);
    if (d < dist) {
      dist = d;
      best = i;
    }
  }
  return best;
}

export function WorldScene({
  selected,
  focus,
  filter,
  evening,
  zoom,
  onSelect,
  onNavigateFocus,
  coop,
  view,
  placedBirds,
}) {
  const host = useRef(),
    state = useRef(),
    selectRef = useRef(onSelect),
    focusRef = useRef(onNavigateFocus),
    zoomRef = useRef(zoom),
    selectedRef = useRef(selected);
  selectRef.current = onSelect;
  focusRef.current = onNavigateFocus;
  zoomRef.current = zoom;
  selectedRef.current = selected;
  useEffect(() => {
    const container = host.current,
      scene = new THREE.Scene();
    let renderer;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2", {
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer = context
      ? new THREE.WebGLRenderer({
          canvas,
          context,
          antialias: true,
          alpha: false,
        })
      : new CanvasRenderer({ evening });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(evening ? "#5e838c" : "#a8c9ba");
    container.appendChild(renderer.domElement);
    const camera = new THREE.OrthographicCamera(-30, 30, 22, -22, 0.1, 350),
      target = new THREE.Vector3(0, 0, 0);
    const hemi = new THREE.HemisphereLight(
      evening ? "#abbaf0" : "#fff6d8",
      evening ? "#52685e" : "#739d83",
      evening ? 2 : 2.8,
    );
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(
      evening ? "#ffb875" : "#fff3db",
      evening ? 3 : 3.7,
    );
    sun.position.set(-25, 50, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -55,
      right: 55,
      top: 55,
      bottom: -55,
      far: 160,
    });
    sun.shadow.normalBias = 0.04;
    sun.shadow.bias = -0.0002;
    scene.add(sun);
    const { box, flush } = createBuilder(scene),
      pickMeshes = [],
      positions = new Map(),
      animated = [],
      smallLabels = [];
    const center = coordinates(focus),
      origin = { x: worldPosition(center.x), z: worldPosition(center.y) };
    let marker;
    if (!coop) {
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(450, 450),
        new THREE.MeshStandardMaterial({
          color: evening ? "#638e99" : "#a4cbbd",
          roughness: 0.76,
          metalness: 0.08,
        }),
      );
      water.rotation.x = -Math.PI / 2;
      water.position.y = -1.5;
      water.receiveShadow = true;
      scene.add(water);
      const tileGeo = new THREE.BoxGeometry(2.1, 0.22, 2.1),
        dummy = new THREE.Object3D(),
        tiles = [],
        ids = [],
        colors = [];
      for (
        let cy = Math.max(0, Math.floor(center.y / 10) - 2);
        cy <= Math.min(24, Math.floor(center.y / 10) + 2);
        cy++
      )
        for (
          let cx = Math.max(0, Math.floor(center.x / 10) - 2);
          cx <= Math.min(39, Math.floor(center.x / 10) + 2);
          cx++
        ) {
          for (let ly = 0; ly < 10; ly++)
            for (let lx = 0; lx < 10; lx++) {
              const gx = cx * 10 + lx,
                gy = cy * 10 + ly,
                id = tokenId(gx, gy),
                x =
                  worldPosition(gx) -
                  origin.x -
                  (lx - 4.5) * 0.4 * (Math.abs(ly - 4.5) / 4.5) ** 3,
                z =
                  worldPosition(gy) -
                  origin.z -
                  (ly - 4.5) * 0.4 * (Math.abs(lx - 4.5) / 4.5) ** 3,
                r = hash(id),
                edge = Math.min(lx, ly, 9 - lx, 9 - ly),
                h = edge === 0 ? -0.1 : edge === 1 ? 0.05 : 0.2;
              if (Math.abs(x) > 52 || Math.abs(z) > 52) continue;
              positions.set(id, { x, y: h, z });
              ids.push(id);
              tiles.push([x, h, z]);
              const status = statusOf(id),
                isMatch = filter === "all" || filter === status;
              let c =
                edge === 0
                  ? "#afbe77"
                  : r > 0.7
                    ? "#a8bc72"
                    : r > 0.4
                      ? "#9fb66a"
                      : "#94af65";
              if (!isMatch) c = "#b4bd9c";
              else if (filter === "sale") c = "#d3b978";
              else if ((cx + cy) % 3 === 0) c = shade(c, 1.07);
              else if ((cx + cy) % 3 === 1) c = shade(c, 0.94);
              colors.push(c);
              box(
                x,
                h - 0.72,
                z,
                2.13,
                1.3,
                2.13,
                edge === 0 ? "#c7bc8c" : "#b2aa7f",
              );
              const path = lx === 4 || ly === 5;
              if (path)
                box(
                  x,
                  h + 0.13,
                  z,
                  lx === 4 ? 0.9 : 2.12,
                  0.035,
                  ly === 5 ? 0.9 : 2.12,
                  "#d9c994",
                );
              if (!path && r > ((cx + cy) % 3 === 1 ? 0.58 : 0.8) && isMatch) {
                tree(
                  box,
                  x + (r - 0.8) * 2,
                  h + 0.12,
                  z,
                  Math.floor(r * 100),
                  0.64 + r * 0.18,
                );
              }
              if (!path && r < 0.095 && edge > 0 && isMatch) {
                house(box, x, h + 0.11, z, 0.57);
              }
              if (status !== "free" && r < 0.48 && !path && isMatch) {
                box(x + 0.65, h + 0.62, z - 0.6, 0.065, 1, 0.065, "#9b875f");
                box(
                  x + 0.78,
                  h + 0.94,
                  z - 0.6,
                  0.36,
                  0.3,
                  0.08,
                  status === "sale" ? "#dfa55f" : "#5e8674",
                );
              }
              if (r > 0.36 && r < 0.46 && !path && isMatch) {
                for (let i = 0; i < 3; i++) {
                  box(
                    x - 0.6 + i * 0.24,
                    h + 0.22,
                    z + 0.55,
                    0.08,
                    0.25,
                    0.08,
                    "#6d8b4e",
                  );
                  box(
                    x - 0.6 + i * 0.24,
                    h + 0.37,
                    z + 0.55,
                    0.19,
                    0.12,
                    0.19,
                    i % 2 ? "#f1cf81" : "#e8ae9c",
                  );
                }
              }
              if (Math.abs(gx - center.x) < 4 && Math.abs(gy - center.y) < 4) {
                const l = label("#" + id);
                l.position.set(x, h + 0.7, z);
                l.visible = false;
                scene.add(l);
                smallLabels.push(l);
              }
            }
          const hx = worldPosition(cx * 10 + 6) - origin.x,
            hz = worldPosition(cy * 10 + 4) - origin.z;
          if (Math.abs(hx) < 40 && Math.abs(hz) < 40) {
            house(box, hx, 0.35, hz, 1.55);
            tree(box, hx - 3, 0.2, hz - 2, cy + cx, 1.3);
            box(hx, 0, hz + 3.2, 2.8, 0.14, 2.2, "#d9c994");
            // Footbridges connect districts without changing parcel rights.
            const bx = worldPosition(cx * 10 + 9) - origin.x + 2.8,
              bz = worldPosition(cy * 10 + 5) - origin.z;
            for (let i = 0; i < 8; i++)
              box(bx - 2.3 + i * 0.65, 0.15, bz, 0.55, 0.18, 1.35, "#b6996c");
            for (let i = 0; i < 3; i++)
              for (const dz of [-0.73, 0.73])
                box(bx - 2 + i * 2, 0.65, bz + dz, 0.12, 1.15, 0.12, "#a88c64");
            for (const dz of [-0.73, 0.73])
              box(bx, 1.05, bz + dz, 4.2, 0.1, 0.1, "#cfb98a");
          }
        }
      const mesh = new THREE.InstancedMesh(
        tileGeo,
        new THREE.MeshStandardMaterial({ roughness: 1 }),
        tiles.length,
      );
      tiles.forEach(([x, y, z], i) => {
        dummy.position.set(x, y, z);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, new THREE.Color(colors[i]));
      });
      mesh.receiveShadow = true;
      mesh.userData.ids = ids;
      scene.add(mesh);
      pickMeshes.push(mesh);
      for (let i = 0; i < 60; i++) {
        const x = (hash(i + 1) - 0.5) * 110,
          z = (hash(i + 900) - 0.5) * 100;
        box(x, -1.47, z, 0.4 + hash(i + 32) * 1.2, 0.012, 0.055, "#c0d9ca");
      }
      const mx = worldPosition(Math.floor(center.x / 10) * 10 + 2) - origin.x,
        mz = worldPosition(Math.floor(center.y / 10) * 10 + 2) - origin.z;
      box(mx, 1.3, mz, 1.4, 2.8, 1.4, "#efe1b6");
      box(mx, 2.8, mz, 1.9, 0.35, 1.9, "#bd7f50");
      const windmill = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.43, 2.1, 0.08),
          new THREE.MeshStandardMaterial({ color: "#f4e9c9" }),
        );
        blade.position.y = 1.2;
        const arm = new THREE.Group();
        arm.rotation.z = (i * Math.PI) / 2;
        arm.add(blade);
        windmill.add(arm);
      }
      windmill.position.set(mx, 2.45, mz + 1);
      scene.add(windmill);
      animated.push({ type: "wind", group: windmill });
      marker = new THREE.Group();
      const rim = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.09, 2.2),
        new THREE.MeshBasicMaterial({
          color: "#f8e8a0",
          transparent: true,
          opacity: 0.7,
        }),
      );
      marker.add(rim);
      const selectedLabel = label("Участок");
      selectedLabel.position.y = 2;
      marker.add(selectedLabel);
      marker.visible = false;
      scene.add(marker);
      camera.position.set(35, 36, 40);
      target.set(0, 0, 0);
    } else {
      renderer.setClearColor(evening ? "#697d80" : "#b6c6b0");
      box(0, -0.8, 0, 19, 1.5, 15, "#b2a780");
      box(0, 0, 0, 19, 0.18, 15, "#8a9970");
      for (let x = -7; x <= 7; x++) box(x, 0.21, 0, 0.95, 0.25, 11, "#c3a77c");
      for (let y = 0; y < 7; y++) {
        box(
          0,
          0.6 + y * 0.48,
          -5.1,
          15,
          0.43,
          0.35,
          y % 2 ? "#b58f63" : "#bd996b",
        );
        box(
          -7.3,
          0.6 + y * 0.48,
          -1,
          0.35,
          0.43,
          8.5,
          y % 2 ? "#b58f63" : "#bd996b",
        );
      }
      for (const x of [-7.2, 0, 7.2]) {
        box(x, 2.4, -5, 0.35, 4.8, 0.5, "#796347");
        box(x, 2.4, 5, 0.35, 4.8, 0.35, "#796347");
      }
      box(0, 4.7, -5, 15.5, 0.45, 0.55, "#7f6a4e");
      box(0, 4.7, 5, 15.5, 0.45, 0.55, "#7f6a4e");
      for (let i = 0; i < 3; i++)
        box(
          0,
          4.9 + i * 0.38,
          -5 + i * 0.8,
          15.8,
          0.2,
          0.95,
          i % 2 ? "#c88b63" : "#d59b72",
        );
      box(-5.6, 0.8, 2.5, 1, 0.85, 1, "#b6805d");
      box(-5.6, 1.5, 2.5, 0.7, 0.7, 0.7, "#7f9d62");
      box(-5.9, 1.8, 2.4, 0.5, 0.45, 0.55, "#9caf71");
      box(-4.8, 0.65, -0.5, 1.2, 0.65, 0.8, "#c69e68");
      for (const dx of [-5.2, -4.4])
        box(dx, 0.5, -0.5, 0.12, 1, 0.6, "#94764e");
      for (let i = 0; i < 7; i++)
        box(
          -5.3 + i * 1.45,
          3.9 - Math.sin((i / 6) * Math.PI) * 0.3,
          -4.68,
          0.42,
          0.45,
          0.08,
          i % 2 ? "#8c9f69" : "#ecd099",
        );
      for (const x of [-7.3, 0, 7.3])
        for (let i = 0; i < 6; i++) {
          box(x, 4.8 + i * 0.38, -5 + i * 0.8, 0.4, 0.4, 1.12, "#ad7853");
          box(x, 4.8 + i * 0.38, 5 - i * 0.8, 0.4, 0.4, 1.12, "#ad7853");
        }
      box(-3, 2.5, -4.86, 2.2, 1.7, 0.12, "#a7c9bc");
      box(-3, 2.5, -4.74, 0.12, 1.8, 0.1, "#f5deb4");
      box(-3, 2.5, -4.74, 2.25, 0.12, 0.1, "#f5deb4");
      for (let i = 0; i < 3; i++) {
        box(2.4 + i * 1.5, 0.58, -3.6, 1.3, 0.55, 1.6, "#90714e");
        box(2.4 + i * 1.5, 0.89, -3.6, 1.1, 0.13, 1.4, "#d5bf78");
      }
      box(-5, 1.25, -1, 0.18, 2, 0.18, "#7a674e");
      box(-1, 1.25, -1, 0.18, 2, 0.18, "#7a674e");
      box(-3, 2.25, -1, 4.4, 0.2, 0.25, "#a18055");
      box(5, 0.7, 2, 1.5, 1, 1.3, "#c6af6f");
      box(5, 1.4, 2, 1.2, 0.4, 1.1, "#d0bd7e");
      for (let i = 0; i < 5; i++)
        tree(box, 8 + hash(i) * 3, -0.1, -6 + i * 3, i, 0.8);
      for (let i = 0; i < 4; i++) {
        if (!placedBirds.includes(birds[i].id)) continue;
        const b = makeBird(
          scene,
          -3.5 + i * 2.2,
          0.38,
          1 + Math.sin(i * 2) * 1.6,
          birds[i],
          1.1,
        );
        b.rotation.y = 0.3 + i * 0.6;
        animated.push({
          type: "bird",
          group: b,
          offset: i,
          base: b.position.y,
        });
      }
      for (let i = 0; i < 25; i++)
        box(
          (hash(i + 520) - 0.5) * 12,
          0.37,
          (hash(i + 920) - 0.5) * 8,
          0.3,
          0.025,
          0.035,
          "#decb8d",
          hash(i) * 4,
        );
      for (const x of [-5, 5]) {
        box(x, 3.6, -3.5, 0.48, 0.7, 0.48, "#e8b765");
        const light = new THREE.PointLight("#ffc474", evening ? 35 : 10, 9);
        light.position.set(x, 3.2, -3.5);
        scene.add(light);
      }
      camera.position.set(
        view === 1 ? 13 : view === 2 ? -15 : 19,
        view === 1 ? 10 : 16,
        view === 2 ? 17 : 24,
      );
      target.set(view === 1 ? 0 : -0.5, 1, 0);
    }
    flush();
    camera.lookAt(target);
    const raycaster = new THREE.Raycaster(),
      pointer = new THREE.Vector2(),
      plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    let drag = null,
      hoverId = null,
      frame = 0,
      disposed = false;
    const updatePointer = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
    };
    const down = (e) => {
      if (coop) return;
      updatePointer(e);
      const point = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, point);
      drag = {
        x: e.clientX,
        y: e.clientY,
        point,
        target: target.clone(),
        cam: camera.position.clone(),
      };
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const move = (e) => {
      updatePointer(e);
      if (drag) {
        const point = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, point);
        const delta = drag.point.clone().sub(point);
        delta.y = 0;
        camera.position.add(delta);
        target.add(delta);
        camera.lookAt(target);
        renderer.domElement.style.cursor = "grabbing";
      } else {
        const hit = raycaster.intersectObjects(pickMeshes)[0];
        hoverId = hit ? hit.object.userData.ids[hit.instanceId] : null;
        renderer.domElement.style.cursor = hoverId ? "pointer" : "grab";
      }
    };
    const up = (e) => {
      if (!drag) return;
      const moved = Math.hypot(e.clientX - drag.x, e.clientY - drag.y);
      if (moved < 6) {
        updatePointer(e);
        const hit = raycaster.intersectObjects(pickMeshes)[0];
        if (hit) selectRef.current(hit.object.userData.ids[hit.instanceId]);
      } else if (target.length() > 10 && focusRef.current) {
        focusRef.current(
          tokenId(
            nearestCoord(origin.x + target.x, 400),
            nearestCoord(origin.z + target.z, 250),
          ),
        );
      }
      drag = null;
      renderer.domElement.style.cursor = "grab";
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);
    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.userData.aspect = width / height;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lastMarker = null;
    const tick = (t) => {
      if (disposed) return;
      frame = requestAnimationFrame(tick);
      const scale = coop
        ? Math.max(view === 1 ? 6.8 : 10, 11 / (camera.userData.aspect || 1))
        : 22;
      const h = scale / zoomRef.current,
        aspect = camera.userData.aspect || 1;
      camera.left = -h * aspect;
      camera.right = h * aspect;
      camera.top = h;
      camera.bottom = -h;
      camera.updateProjectionMatrix();
      if (marker) {
        const id = selectedRef.current || hoverId,
          pos = positions.get(id);
        marker.visible = !!pos;
        if (pos) {
          marker.position.set(pos.x, pos.y + 0.2, pos.z);
          if (lastMarker !== id) {
            const old = marker.children[1];
            old.material.map.dispose();
            old.material.dispose();
            marker.remove(old);
            const sprite = label(
              "#" +
                id +
                " · " +
                (statusOf(id) === "free" ? "свободно" : "владелец"),
            );
            sprite.position.y = 2;
            marker.add(sprite);
            lastMarker = id;
          }
        }
      }
      smallLabels.forEach((l) => (l.visible = zoomRef.current > 1.8));
      if (!reduced.matches)
        animated.forEach((a) => {
          if (a.type === "wind") a.group.rotation.z = t * 0.00015;
          else {
            a.group.position.y =
              a.base + Math.max(0, Math.sin(t * 0.002 + a.offset * 2)) * 0.1;
            a.group.rotation.z = Math.sin(t * 0.0015 + a.offset) * 0.035;
          }
        });
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(tick);
    state.current = { scene, camera };
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.traverse((o) => {
        o.geometry?.dispose();
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        materials.forEach((m) => {
          m?.map?.dispose();
          m?.dispose();
        });
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [focus, filter, evening, coop, view, placedBirds]);
  return <div className="scene" ref={host} />;
}
