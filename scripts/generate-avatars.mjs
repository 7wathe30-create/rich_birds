import { mkdir, writeFile } from "node:fs/promises";
import { AVATARS } from "../src/avatars.js";

const cast = [
  { id: "nova", name: "Нова · инженер", bg: ["#183b50", "#6a46a8"], skin: "#c77d5b", skinShade: "#995541", hair: "#302342", hairHi: "#a974ee", clothes: "#7c4ed0", trim: "#52ead2", style: "fringe", accessory: "visor" },
  { id: "rowan", name: "Роуэн · следопыт", bg: ["#193e3a", "#789047"], skin: "#e7ae7c", skinShade: "#b97854", hair: "#7a392a", hairHi: "#cf7550", clothes: "#436b43", trim: "#d2b867", style: "sweep", accessory: "hood", collar: "crossed" },
  { id: "mika", name: "Мика · художница", bg: ["#17495a", "#368c94"], skin: "#f0c6a4", skinShade: "#c68e75", hair: "#15334a", hairHi: "#39bfca", clothes: "#e28e48", trim: "#ffe49a", style: "bob", accessory: "beret", collar: "v" },
  { id: "sol", name: "Сол · странник", bg: ["#733e39", "#d4954b"], skin: "#9e5d43", skinShade: "#714033", hair: "#29272b", hairHi: "#55403a", clothes: "#b85f35", trim: "#f2ce70", style: "wrap", accessory: "scarf" },
  { id: "iris", name: "Ирис · волшебница", bg: ["#392b71", "#9a4caa"], skin: "#e7b7a3", skinShade: "#bd827d", hair: "#352956", hairHi: "#b268d0", clothes: "#533d91", trim: "#f3d16a", style: "long", accessory: "witch", collar: "high" },
  { id: "kaito", name: "Кайто · самурай", bg: ["#26365a", "#bd5261"], skin: "#e8bc97", skinShade: "#b97c65", hair: "#211f2a", hairHi: "#48405a", clothes: "#263b64", trim: "#e46b58", style: "topknot", accessory: "headband" },
  { id: "bruna", name: "Бруна · кузнец", bg: ["#54352e", "#be693d"], skin: "#d49369", skinShade: "#a25e49", hair: "#713928", hairHi: "#e3783c", clothes: "#51434a", trim: "#edbd4f", style: "curls", accessory: "goggles" },
  { id: "zephyr", name: "Зефир · пилот", bg: ["#16546a", "#3b9cba"], skin: "#f1c69b", skinShade: "#bc8465", hair: "#744b32", hairHi: "#d59a58", clothes: "#e8e4d5", trim: "#49d5dc", style: "short", accessory: "pilot" },
  { id: "nia", name: "Ниа · ботаник", bg: ["#244535", "#89a353"], skin: "#87513f", skinShade: "#60382f", hair: "#282d2b", hairHi: "#534638", clothes: "#39745a", trim: "#dfcc78", style: "afro", accessory: "leaf" },
  { id: "orin", name: "Орин · рыцарь", bg: ["#334457", "#81949b"], skin: "#dbad86", skinShade: "#a87461", hair: "#503c32", hairHi: "#937050", clothes: "#596778", trim: "#e3c878", style: "helmet", accessory: "plume", collar: "armor" },
  { id: "lux", name: "Люкс · музыкант", bg: ["#60375e", "#ce608d"], skin: "#edc2a7", skinShade: "#bd8290", hair: "#492549", hairHi: "#f06aaf", clothes: "#573b75", trim: "#63e3dc", style: "spikes", accessory: "headphones" },
  { id: "tarek", name: "Тарек · искатель", bg: ["#66503a", "#c89149"], skin: "#bb7952", skinShade: "#85503d", hair: "#302b29", hairHi: "#62503b", clothes: "#47706d", trim: "#e4bd65", style: "cap", accessory: "compass" },
  { id: "echo", name: "Эхо · робот", bg: ["#23445b", "#347e92"], skin: "#b9e7dc", skinShade: "#659c9b", hair: "#283e54", hairHi: "#55d8cf", clothes: "#3e6377", trim: "#f1cf61", style: "antenna", accessory: "robot" },
  { id: "fable", name: "Фейбл · эльф", bg: ["#274554", "#549c91"], skin: "#efd2ae", skinShade: "#bd9b82", hair: "#52645a", hairHi: "#bbd77e", clothes: "#41665d", trim: "#e3c879", style: "elven", accessory: "earcuff" },
  { id: "juno", name: "Джуно · космонавт", bg: ["#222e58", "#69579f"], skin: "#9a604b", skinShade: "#70413b", hair: "#292a35", hairHi: "#655c80", clothes: "#d2d8e0", trim: "#66e5e0", style: "buzz", accessory: "space", collar: "harness" },
];

const rect = (x, y, w, h, fill, extra = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra ? ` ${extra}` : ""}/>`;
const pixel = (x, y, fill, size = 8) => rect(x, y, size, size, fill);

function neckline(person) {
  const t = person.trim;
  const collars = {
    crossed: `<path d="M94 170h15l13 18-12 10-19-23zm52 0h-15l-13 18 12 10 19-23z" fill="${t}"/>`,
    v: `<path d="M100 170h13l7 12 7-12h13l-20 24z" fill="${t}"/><path d="M117 179h6v13h-6z" fill="#fff1d9"/>`,
    high: `${rect(103, 167, 35, 15, t)}${rect(110, 168, 21, 8, person.clothes)}`,
    armor: `${rect(94, 170, 13, 31, t)}${rect(133, 170, 13, 31, t)}${rect(108, 171, 24, 8, "#ffffff", 'fill-opacity=".45"')}`,
    harness: `<path d="M94 170h11l17 25h-12zm52 0h-11l-17 25h12z" fill="${t}"/>${rect(115, 183, 10, 10, "#3b506b")}`,
  };
  return collars[person.collar] ?? `${rect(105, 170, 31, 8, t)}${rect(111, 170, 19, 5, person.clothes)}`;
}

function hairShape(person) {
  const { hair: h, hairHi: hi, style } = person;
  const shapes = {
    fringe: [rect(70, 61, 100, 31, h), rect(70, 82, 20, 28, h), rect(90, 82, 20, 16, hi), rect(110, 78, 20, 20, h), rect(130, 82, 20, 12, hi)],
    sweep: [rect(70, 62, 100, 30, h), rect(70, 78, 18, 35, h), rect(88, 64, 65, 15, hi), rect(130, 77, 40, 12, hi)],
    bob: [rect(66, 60, 108, 58, h), rect(74, 51, 91, 27, h), rect(78, 78, 20, 18, hi), rect(112, 70, 18, 12, hi), rect(151, 83, 19, 31, h)],
    wrap: [rect(69, 58, 102, 38, h), rect(75, 46, 89, 21, hi), rect(71, 83, 17, 34, h), rect(153, 80, 18, 35, h)],
    long: [rect(67, 58, 106, 83, h), rect(75, 49, 90, 33, h), rect(80, 83, 16, 27, hi), rect(151, 84, 18, 45, hi)],
    topknot: [rect(75, 61, 91, 36, h), rect(106, 37, 31, 24, h), rect(70, 78, 18, 29, h), rect(94, 67, 28, 12, hi)],
    curls: [rect(71, 60, 99, 40, h), rect(66, 65, 20, 25, hi), rect(84, 48, 20, 21, h), rect(109, 49, 22, 21, hi), rect(143, 54, 24, 24, h), rect(153, 84, 18, 30, h)],
    short: [rect(73, 60, 94, 28, h), rect(78, 51, 77, 16, hi), rect(70, 76, 20, 20, h), rect(146, 75, 22, 15, h)],
    afro: [rect(66, 49, 108, 61, h), rect(73, 42, 26, 25, hi), rect(112, 41, 26, 21, h), rect(151, 48, 20, 27, hi), rect(72, 90, 15, 26, h), rect(153, 90, 15, 25, h)],
    helmet: [rect(67, 54, 106, 48, "#8295a4"), rect(74, 46, 90, 23, "#aebbc0"), rect(75, 68, 90, 9, "#667b89"), rect(72, 82, 18, 30, h), rect(147, 82, 20, 30, h)],
    spikes: [rect(72, 66, 96, 29, h), rect(67, 49, 20, 27, hi), rect(90, 40, 19, 28, h), rect(113, 45, 19, 23, hi), rect(141, 51, 27, 26, h), rect(153, 78, 16, 34, h)],
    cap: [rect(71, 57, 99, 34, h), rect(74, 49, 82, 19, hi), rect(130, 73, 49, 13, h), rect(73, 82, 17, 26, h)],
    antenna: [rect(72, 66, 96, 40, h), rect(84, 56, 70, 17, hi), rect(112, 42, 12, 19, "#bce9e1"), rect(108, 35, 20, 12, "#55d8cf")],
    elven: [rect(68, 56, 103, 56, h), rect(77, 48, 86, 25, hi), rect(72, 82, 17, 53, h), rect(151, 79, 18, 54, h), rect(110, 68, 20, 10, hi)],
    buzz: [rect(76, 57, 92, 25, h), rect(78, 52, 77, 12, hi)],
  };
  return shapes[style].join("");
}

function accessory(person) {
  const { accessory: item, trim: t } = person;
  const art = {
    visor: `${rect(75, 91, 89, 16, "#263a59")}${rect(83, 94, 73, 8, "#56ead2")}${pixel(143, 94, "#d9fff3", 8)}`,
    hood: `${rect(60, 66, 15, 66, "#344e3d")}${rect(165, 66, 15, 66, "#344e3d")}${rect(62, 69, 12, 12, t)}`,
    beret: `${rect(76, 46, 86, 13, "#d45e4f")}${rect(91, 39, 48, 13, "#d45e4f")}${pixel(139, 44, t)}`,
    scarf: `${rect(84, 145, 72, 15, t)}${rect(135, 153, 15, 28, t)}${rect(90, 147, 58, 5, "#fff0b0")}`,
    witch: `${rect(72, 48, 94, 9, "#312653")}${rect(83, 33, 69, 15, "#523478")}${rect(98, 14, 38, 20, "#68438f")}${pixel(111, 19, t)}`,
    headband: `${rect(73, 78, 96, 12, "#c55252")}${pixel(145, 79, t)}`,
    goggles: `${rect(73, 72, 94, 13, "#433737")}${rect(81, 75, 30, 9, t)}${rect(126, 75, 30, 9, t)}${rect(111, 77, 15, 5, "#433737")}`,
    pilot: `${rect(73, 63, 96, 12, "#465b67")}${rect(79, 65, 31, 12, "#85edf0")}${rect(130, 65, 31, 12, "#85edf0")}${rect(110, 67, 20, 5, "#465b67")}`,
    leaf: `${rect(147, 62, 11, 22, "#72aa62")}${rect(153, 52, 17, 13, "#a5c96d")}${rect(157, 61, 12, 13, "#72aa62")}`,
    plume: `${rect(119, 35, 14, 28, "#d5bd78")}${rect(130, 28, 20, 17, "#a14f52")}${rect(143, 22, 14, 15, "#bd6260")}`,
    headphones: `${rect(63, 68, 14, 47, t)}${rect(75, 54, 12, 14, t)}${rect(163, 68, 14, 47, t)}${rect(153, 54, 12, 14, t)}${rect(64, 83, 14, 23, "#3d3155")}${rect(162, 83, 14, 23, "#3d3155")}`,
    compass: `${rect(139, 145, 27, 27, "#d5b55f")}${rect(145, 151, 15, 15, "#304c4b")}${rect(151, 153, 5, 10, "#f0da91")}`,
    robot: `${rect(78, 90, 87, 15, "#304f65")}${rect(85, 93, 23, 9, "#55e8d5")}${rect(135, 93, 22, 9, "#55e8d5")}${rect(112, 91, 15, 9, "#304f65")}${pixel(116, 108, t, 12)}`,
    earcuff: `${rect(52, 84, 20, 9, "#e4c876")}${rect(53, 91, 12, 10, t)}`,
    space: `${rect(55, 43, 130, 112, "#b9c9d8" , 'fill-opacity=".38" stroke="#e4f5f7" stroke-width="7"')}${rect(66, 51, 108, 89, "#71d6d8", 'fill-opacity=".16" stroke="#d8ffff" stroke-width="3"')}${rect(75, 169, 22, 13, t)}`,
  };
  return art[item];
}

function render(person) {
  const { id, name, bg, skin, skinShade, clothes, trim } = person;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240" role="img" aria-label="${name}">
<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient><linearGradient id="shirt" x2="1" y2="1"><stop stop-color="${trim}"/><stop offset=".22" stop-color="${clothes}"/><stop offset="1" stop-color="${clothes}"/></linearGradient></defs>
${rect(0, 0, 240, 240, "url(#sky)")}
<defs><clipPath id="forelock"><rect x="75" y="68" width="90" height="24"/></clipPath><clipPath id="sideLocks"><rect x="70" y="92" width="18" height="58"/><rect x="153" y="92" width="23" height="58"/></clipPath></defs>
${rect(12, 12, 216, 216, "none", 'stroke="#ffffff" stroke-opacity=".14" stroke-width="2"')}
${pixel(25, 29, trim, 8)}${pixel(199, 40, trim, 6)}${pixel(31, 185, "#ffffff", 5)}${pixel(193, 176, trim, 8)}
${rect(21, 183, 198, 57, "#172334", 'fill-opacity=".42"')}
${rect(46, 181, 148, 63, "#101a29")}${rect(57, 170, 126, 41, "url(#shirt)")}${rect(68, 163, 18, 29, clothes)}${rect(154, 163, 18, 29, clothes)}
${neckline(person)}
${rect(103, 141, 35, 35, skinShade)}${rect(107, 141, 28, 31, skin)}
${hairShape(person)}
${rect(75, 68, 90, 82, skin)}${rect(75, 68, 13, 78, skinShade)}${rect(88, 140, 64, 10, skinShade)}
${rect(64, 98, 14, 22, skin)}${rect(162, 98, 14, 22, skinShade)}
<g clip-path="url(#forelock)">${hairShape(person)}</g><g clip-path="url(#sideLocks)">${hairShape(person)}</g>
${rect(91, 105, 19, 10, "#fff1d9")}${rect(132, 105, 19, 10, "#fff1d9")}${rect(98, 106, 9, 9, "#263244")}${rect(139, 106, 9, 9, "#263244")}
${pixel(98, 106, "#ffffff", 4)}${pixel(139, 106, "#ffffff", 4)}${rect(117, 114, 11, 18, skinShade)}${rect(111, 135, 27, 6, "#743f48")}${rect(116, 136, 15, 4, "#f0b2a0")}
${accessory(person)}
${rect(77, 198, 86, 5, trim)}${rect(84, 215, 72, 3, "#ffffff", 'fill-opacity=".38"')}
<text x="120" y="232" text-anchor="middle" fill="#ffffff" fill-opacity=".92" font-family="system-ui,sans-serif" font-size="9" font-weight="700" letter-spacing="1.1">${id.toUpperCase()}</text>
</svg>`;
  return svg;
}

await mkdir(new URL("../public/avatars/", import.meta.url), { recursive: true });
for (const avatar of AVATARS) {
  const person = cast.find(({ id }) => id === avatar.id);
  if (!person || person.name !== avatar.name) throw new Error(`Missing avatar design: ${avatar.id}`);
  await writeFile(new URL(`../public${avatar.src}`, import.meta.url), render(person));
}
if (cast.length !== AVATARS.length) throw new Error("Avatar catalog and designs must have equal size");
console.log(`Generated ${AVATARS.length} voxel avatars in public/avatars/`);
