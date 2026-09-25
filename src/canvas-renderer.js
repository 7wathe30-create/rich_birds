import * as THREE from "three";

// The same scene stays interactive on devices without WebGL2.
export class CanvasRenderer {
  constructor({ evening = false } = {}) {
    this.domElement = document.createElement("canvas");
    this.ctx = this.domElement.getContext("2d");
    this.shadowMap = {};
    this.evening = evening;
    this.ratio = 1;
    this.width = 1;
    this.height = 1;
    this.last = 0;
    this.cached = null;
    this.background = "#a8c9ba";
  }
  setPixelRatio(r) {
    this.ratio = Math.min(r, 1.5);
  }
  setClearColor(c) {
    this.background = c;
  }
  setSize(w, h) {
    this.width = w;
    this.height = h;
    this.domElement.width = w * this.ratio;
    this.domElement.height = h * this.ratio;
    this.domElement.style.width = w + "px";
    this.domElement.style.height = h + "px";
    this.cached = null;
  }
  dispose() {
    this.cached = null;
  }
  render(scene, camera) {
    const time = performance.now();
    if (time - this.last < 40) return;
    this.last = time;
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const projection = new THREE.Matrix4().multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      ),
      key = projection.elements.join(",");
    const shapes = [],
      sprites = [],
      matrix = new THREE.Matrix4(),
      local = new THREE.Matrix4(),
      color = new THREE.Color(),
      normalMatrix = new THREE.Matrix3(),
      v = new THREE.Vector3(),
      normal = new THREE.Vector3(),
      light = new THREE.Vector3(-0.4, 0.85, 0.4).normalize();
    const project = (x, y, z, m) => {
      v.set(x, y, z).applyMatrix4(m).applyMatrix4(projection);
      return [((v.x + 1) * this.width) / 2, ((1 - v.y) * this.height) / 2, v.z];
    };
    const faces = (geometry, m, c, opacity = 1) => {
      const center = new THREE.Vector3()
        .setFromMatrixPosition(m)
        .applyMatrix4(projection);
      if (Math.abs(center.x) > 1.3 || Math.abs(center.y) > 1.6) return;
      const pos = geometry.attributes.position,
        norm = geometry.attributes.normal;
      if (!pos) return;
      normalMatrix.getNormalMatrix(m);
      if (
        geometry.type === "BoxGeometry" ||
        geometry.type === "PlaneGeometry"
      ) {
        for (let i = 0; i < pos.count; i += 4) {
          normal
            .fromBufferAttribute(norm, i)
            .applyMatrix3(normalMatrix)
            .normalize();
          const facing = normal
            .clone()
            .transformDirection(camera.matrixWorldInverse);
          if (facing.z <= 0) continue;
          const corners = [i, i + 1, i + 3, i + 2].map((n) =>
            new THREE.Vector3().fromBufferAttribute(pos, n).applyMatrix4(m),
          );
          const base = c.clone();
          const brightness = 0.73 + Math.max(0, normal.dot(light)) * 0.3;
          base.multiplyScalar(this.evening ? brightness * 0.72 : brightness);
          if (this.evening) {
            base.r *= 1.07;
            base.b *= 1.15;
          }
          const columns = Math.max(
            1,
            Math.ceil(corners[0].distanceTo(corners[1]) / 1.5),
          );
          const rows = Math.max(
            1,
            Math.ceil(corners[0].distanceTo(corners[3]) / 1.5),
          );
          const surface = (u, w) =>
            corners[0]
              .clone()
              .lerp(corners[1], u)
              .lerp(corners[3].clone().lerp(corners[2], u), w);
          for (let row = 0; row < rows; row++)
            for (let column = 0; column < columns; column++) {
              const points = [
                [column / columns, row / rows],
                [(column + 1) / columns, row / rows],
                [(column + 1) / columns, (row + 1) / rows],
                [column / columns, (row + 1) / rows],
              ].map(([u, w]) => {
                const p = surface(u, w).applyMatrix4(projection);
                return [
                  ((p.x + 1) * this.width) / 2,
                  ((1 - p.y) * this.height) / 2,
                  p.z,
                ];
              });
              const groundLayer = ["8a9970", "b2a780"].includes(
                c.getHexString(),
              )
                ? 2
                : 0;
              shapes.push({
                points,
                color: base.getStyle(),
                depth: points.reduce((s, p) => s + p[2], 0) / 4 + groundLayer,
                opacity,
              });
            }
        }
      }
    };
    if (!this.cached || key !== this.cached.key) {
      scene.traverseVisible((obj) => {
        if (!obj.isInstancedMesh) return;
        for (let i = 0; i < obj.count; i++) {
          obj.getMatrixAt(i, local);
          matrix.multiplyMatrices(obj.matrixWorld, local);
          if (obj.instanceColor) obj.getColorAt(i, color);
          else color.copy(obj.material.color);
          faces(obj.geometry, matrix, color, obj.material.opacity);
        }
      });
      this.cached = { key, shapes: [...shapes] };
    } else shapes.push(...this.cached.shapes);
    scene.traverseVisible((obj) => {
      if (obj.isInstancedMesh) return;
      if (obj.isSprite) {
        const p = new THREE.Vector3().setFromMatrixPosition(obj.matrixWorld);
        p.applyMatrix4(projection);
        sprites.push({
          image: obj.material.map?.image,
          x: ((p.x + 1) * this.width) / 2,
          y: ((1 - p.y) * this.height) / 2,
          w: (obj.scale.x / (camera.right - camera.left)) * this.width,
          h: (obj.scale.y / (camera.top - camera.bottom)) * this.height,
        });
        return;
      }
      if (
        obj.isMesh &&
        !(
          obj.geometry.type === "PlaneGeometry" &&
          obj.geometry.parameters.width > 200
        )
      )
        faces(
          obj.geometry,
          obj.matrixWorld,
          obj.material.color,
          obj.material.opacity,
        );
    });
    shapes.sort((a, b) => b.depth - a.depth);
    const ctx = this.ctx;
    ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.background;
    ctx.fillRect(0, 0, this.width, this.height);
    for (const s of shapes) {
      ctx.beginPath();
      s.points.forEach((p, i) =>
        i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]),
      );
      ctx.closePath();
      ctx.globalAlpha = s.opacity;
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 0.35;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const s of sprites)
      if (s.image)
        ctx.drawImage(s.image, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h);
  }
}
