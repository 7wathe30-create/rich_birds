import { coordinates, tokenId, hash } from "./world.js";

export const MIN_ZOOM = 2;
export const MAX_ZOOM = 108;
export const INITIAL_ZOOM = 24;
export function cellMarker(id, view) {
  const p = coordinates(id);
  return {
    id,
    x: view.x + p.x * view.scale + 0.5,
    y: view.y + p.y * view.scale + 0.5,
    size: Math.max(0, view.scale - 1),
  };
}
export function zoomAt(view, next, anchor) {
  const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
  return {
    scale,
    x: anchor.x - ((anchor.x - view.x) * scale) / view.scale,
    y: anchor.y - ((anchor.y - view.y) * scale) / view.scale,
  };
}
export function parcelAt(x, y, view) {
  const gx = Math.floor((x - view.x) / view.scale),
    gy = Math.floor((y - view.y) / view.scale);
  return gx < 0 || gx >= 400 || gy < 0 || gy >= 250 ? null : tokenId(gx, gy);
}
export function mountMap(canvas, options) {
  const ctx = canvas.getContext("2d");
  let width = 1,
    height = 1,
    view = { scale: INITIAL_ZOOM, x: 0, y: 0 },
    initialized = false,
    frame = 0,
    drag = null,
    hover = null;
  const anchor = () => ({ x: width / 2, y: height / 2 });
  const center = (id) => {
    const p = coordinates(id);
    view.x = width / 2 - (p.x + 0.5) * view.scale;
    view.y = height / 2 + (width < 500 ? 40 : 0) - (p.y + 0.5) * view.scale;
    request();
  };
  function draw() {
    frame = 0;
    const {
      selected,
      filter,
      markers = [],
      statusFor = () => "free",
    } = options.current;
    ctx.setTransform(
      devicePixelRatio > 1 ? 1.5 : 1,
      0,
      0,
      devicePixelRatio > 1 ? 1.5 : 1,
      0,
      0,
    );
    ctx.fillStyle = "#0c2020";
    ctx.fillRect(0, 0, width, height);
    const s = view.scale,
      xa = Math.max(0, Math.floor(-view.x / s)),
      xb = Math.min(400, Math.ceil((width - view.x) / s)),
      ya = Math.max(0, Math.floor(-view.y / s)),
      yb = Math.min(250, Math.ceil((height - view.y) / s));
    for (let y = ya; y < yb; y++)
      for (let x = xa; x < xb; x++) {
        const id = tokenId(x, y),
          n = hash(id),
          status = statusFor(id),
          px = view.x + x * s,
          py = view.y + y * s;
        const grove = Math.sin(x * 0.031) + Math.cos(y * 0.053) > 0.6;
        let color = grove
          ? n > 0.5
            ? "#17604a"
            : "#195944"
          : n > 0.5
            ? "#237756"
            : "#287d57";
        if (x % 40 === 0 || y % 40 === 0) color = "#315f51";
        if (status === "owned") color = n > 0.5 ? "#80484b" : "#713f43";
        if (status === "sale") color = n > 0.5 ? "#aa893b" : "#967a35";
        if (filter !== "all" && status !== filter) color = "#183c32";
        if (filter === "sale" && status === "sale") color = "#c69d3d";
        ctx.fillStyle = color;
        ctx.fillRect(px, py, Math.max(0.5, s - 0.75), Math.max(0.5, s - 0.75));
        if (
          s >= 6 &&
          (filter === "all" || filter === status) &&
          status !== "free"
        ) {
          ctx.fillStyle = status === "sale" ? "#edd187" : "#d69892";
          const midX = px + s * 0.5,
            midY = py + s * 0.5;
          if (status === "sale") {
            ctx.beginPath();
            ctx.moveTo(midX, midY - s * 0.16);
            ctx.lineTo(midX + s * 0.16, midY);
            ctx.lineTo(midX, midY + s * 0.16);
            ctx.lineTo(midX - s * 0.16, midY);
            ctx.fill();
          } else ctx.fillRect(midX - s * 0.1, midY - s * 0.1, s * 0.2, s * 0.2);
        }
        if (s > 27) {
          ctx.fillStyle = "#d2eed5";
          ctx.font = `${Math.min(10, s * 0.18)}px monospace`;
          ctx.textAlign = "center";
          ctx.fillText("#" + id, px + s / 2, py + s * 0.54);
          if (status !== "free") {
            ctx.fillStyle = status === "sale" ? "#ebcc69" : "#d69892";
            ctx.fillRect(px + s * 0.42, py + s * 0.73, s * 0.13, s * 0.08);
          }
        }
      }
    ctx.strokeStyle = "#68be8221";
    ctx.lineWidth = 1;
    for (let x = Math.ceil(xa / 10) * 10; x < xb; x += 10) {
      ctx.beginPath();
      ctx.moveTo(view.x + x * s, 0);
      ctx.lineTo(view.x + x * s, height);
      ctx.stroke();
    }
    for (let y = Math.ceil(ya / 10) * 10; y < yb; y += 10) {
      ctx.beginPath();
      ctx.moveTo(0, view.y + y * s);
      ctx.lineTo(width, view.y + y * s);
      ctx.stroke();
    }
    for (const id of [hover, selected])
      if (id) {
        const p = coordinates(id),
          x = view.x + p.x * s,
          y = view.y + p.y * s;
        ctx.fillStyle = id === selected ? "#d2e96790" : "#a3ffe660";
        ctx.fillRect(x, y, s, s);
        ctx.strokeStyle = id === selected ? "#edffad" : "#b1ffdf";
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 2, y - 2, s + 3, s + 3);
        if (id === selected) {
          ctx.strokeStyle = "#d5ef9560";
          ctx.strokeRect(x - 7, y - 7, s + 13, s + 13);
        }
      }
    const visibleMarkers = markers
      .map((m) => ({ ...m, ...cellMarker(m.id, view) }))
      .filter(
        (m) =>
          m.x + s > 0 &&
          m.y + s > 0 &&
          m.x < width &&
          m.y < height &&
          (filter === "all" || statusFor(m.id) === filter),
      );
    options.current.onFrame({
      scale: s,
      markers: visibleMarkers,
      center: parcelAt(width / 2, height / 2, view),
      viewport: {
        x: Math.max(0, -view.x / (400 * s)),
        y: Math.max(0, -view.y / (250 * s)),
        w: width / (400 * s),
        h: height / (250 * s),
      },
    });
  }
  function request() {
    if (!frame) frame = requestAnimationFrame(draw);
  }
  const resize = new ResizeObserver(() => {
    const r = canvas.getBoundingClientRect();
    if (initialized) {
      view.x += (r.width - width) / 2;
      view.y += (r.height - height) / 2;
    }
    width = r.width;
    height = r.height;
    const ratio = devicePixelRatio > 1 ? 1.5 : 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    if (!initialized) {
      center(48216);
      initialized = true;
    }
    request();
  });
  resize.observe(canvas);
  const point = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const wheel = (e) => {
    e.preventDefault();
    view = zoomAt(view, view.scale * Math.exp(-e.deltaY * 0.0018), point(e));
    request();
  };
  const down = (e) => {
    const p = point(e);
    drag = { ...p, origin: { ...view } };
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  };
  const move = (e) => {
    const p = point(e);
    if (drag) {
      view.x = drag.origin.x + p.x - drag.x;
      view.y = drag.origin.y + p.y - drag.y;
    } else hover = parcelAt(p.x, p.y, view);
    request();
  };
  const up = (e) => {
    if (!drag) return;
    const p = point(e);
    if (Math.hypot(p.x - drag.x, p.y - drag.y) < 5) {
      const id = parcelAt(p.x, p.y, view);
      if (id) options.current.onSelect(id);
    }
    drag = null;
    canvas.style.cursor = "grab";
    request();
  };
  const cancel = () => {
    drag = null;
    canvas.style.cursor = "grab";
  };
  const leave = () => {
    hover = null;
    request();
  };
  const key = (e) => {
    if (
      [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "+",
        "=",
        "-",
        "Enter",
      ].includes(e.key)
    )
      e.preventDefault();
    if (e.key === "ArrowUp") view.y += 60;
    if (e.key === "ArrowDown") view.y -= 60;
    if (e.key === "ArrowLeft") view.x += 60;
    if (e.key === "ArrowRight") view.x -= 60;
    if (e.key === "+" || e.key === "=")
      view = zoomAt(view, view.scale * 1.3, anchor());
    if (e.key === "-") view = zoomAt(view, view.scale / 1.3, anchor());
    if (e.key === "Enter") {
      const id = parcelAt(width / 2, height / 2, view);
      if (id) options.current.onSelect(id);
    }
    request();
  };
  canvas.addEventListener("wheel", wheel, { passive: false });
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", cancel);
  canvas.addEventListener("pointerleave", leave);
  canvas.addEventListener("keydown", key);
  return {
    update: request,
    center,
    zoom: (factor) => {
      view = zoomAt(view, view.scale * factor, anchor());
      request();
    },
    reset: () => {
      view.scale = INITIAL_ZOOM;
      center(48216);
    },
    destroy: () => {
      resize.disconnect();
      cancelAnimationFrame(frame);
      for (const [event, fn] of [
        ["wheel", wheel],
        ["pointerdown", down],
        ["pointermove", move],
        ["pointerup", up],
        ["pointercancel", cancel],
        ["pointerleave", leave],
        ["keydown", key],
      ])
        canvas.removeEventListener(event, fn);
    },
  };
}
