export const TOTAL = 100000;
export const WIDTH = 400;
const DEMO_SALE = new Set([7, 48216]);
const DEMO_OWNED = new Set([
  15, 32202, 37095, 40965, 58164, 55083, 62244, 43812,
]);
const DEMO_FREE = new Set([16, 17, 48217]);
export function coordinates(id) {
  if (!Number.isInteger(id) || id < 1 || id > TOTAL)
    throw new RangeError("Участок не найден");
  return { x: (id - 1) % WIDTH, y: Math.floor((id - 1) / WIDTH) };
}
export function tokenId(x, y) {
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    x >= WIDTH ||
    y < 0 ||
    y >= 250
  )
    throw new RangeError("Координаты: X 0–399, Y 0–249");
  return y * WIDTH + x + 1;
}
export function parseSearch(value) {
  if (!/^(?:#?\d+|\d+\s*[,;]\s*\d+|\d+\s+\d+)$/.test(value.trim())) {
    throw new RangeError("Введи номер 1–100 000 или координаты X, Y");
  }
  const parts = value
    .trim()
    .replace(/^#/, "")
    .split(/[,;\s]+/)
    .map(Number);
  const id =
    parts.length === 2
      ? tokenId(...parts)
      : parts.length === 1
        ? parts[0]
        : NaN;
  coordinates(id);
  return id;
}
export function statusOf(id) {
  if (DEMO_SALE.has(id)) return "sale";
  if (DEMO_OWNED.has(id)) return "owned";
  if (DEMO_FREE.has(id)) return "free";
  const sample = hash(id);
  return sample > 0.985 ? "sale" : sample > 0.94 ? "owned" : "free";
}
export function hash(n) {
  return (((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1) + 1) % 1;
}
export const FREE_COUNT = Array.from({ length: TOTAL }, (_, i) =>
  statusOf(i + 1),
).filter((s) => s === "free").length;
export const birds = [
  {
    name: "Мандариновый странник",
    kind: "Любопытный исследователь",
    color: "#edac4e",
    accent: "#428875",
    id: 108,
    background: "#e9eddb",
    shape: 0,
  },
  {
    name: "Лазурная певунья",
    kind: "Голос тихих рассветов",
    color: "#65b7c9",
    accent: "#386b91",
    id: 236,
    background: "#dfebec",
    shape: 1,
  },
  {
    name: "Розовый мечтатель",
    kind: "Немного магии каждый день",
    color: "#e39c9d",
    accent: "#ae657d",
    id: 415,
    background: "#f0e2df",
    shape: 2,
  },
  {
    name: "Лесной хранитель",
    kind: "Маленький дух большой рощи",
    color: "#7d9e61",
    accent: "#46654b",
    id: 572,
    background: "#e6e9d8",
    shape: 3,
  },
];
