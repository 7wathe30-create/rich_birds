import { coordinates, statusOf, birds } from "./world.js";

export const STORAGE_KEY = "rich-birds:demo:v1";
export const EMPTY_DEMO = { version: 1, profile: null, lands: [] };
export const DEFAULT_AVATAR = { kind: "preset", index: 0 };
export function validAvatar(avatar) {
  return avatar?.kind === "preset"
    ? Number.isInteger(avatar.index) && avatar.index >= 0 && avatar.index < 15
    : avatar?.kind === "upload" &&
        typeof avatar.src === "string" &&
        avatar.src.length < 700000 &&
        /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(avatar.src);
}
export function saveProfile(state, profile) {
  const nickname = profile.nickname?.trim();
  if (
    !nickname ||
    nickname.length > 24 ||
    /[\u0000-\u001f\u007f]/.test(nickname)
  )
    throw new Error("Введи ник от 1 до 24 символов.");
  if (!validAvatar(profile.avatar))
    throw new Error("Выбери аватар из коллекции или загрузи изображение.");
  return { ...state, profile: { nickname, avatar: { ...profile.avatar } } };
}
export function landStatus(state, id) {
  return state.lands.some((l) => l.id === id) ? "owned" : statusOf(id);
}
export function demoOwner(state, id) {
  return state.lands.find((l) => l.id === id)?.owner || null;
}
export function assignDemoLand(state, id) {
  coordinates(id);
  if (!state.profile) throw new Error("Сначала создай демо-профиль.");
  if (landStatus(state, id) !== "free")
    throw new Error("Для примерки выбери свободную землю.");
  return {
    ...state,
    lands: [...state.lands, { id, owner: "player", epoch: 1, placements: [] }],
  };
}
export function transferDemoLand(state, id, nextOwner) {
  if (!["player", "visitor"].includes(nextOwner))
    throw new Error("Неизвестный демо-владелец.");
  const land = state.lands.find((l) => l.id === id);
  if (!land || land.owner === nextOwner)
    throw new Error("Владелец не изменился.");
  return {
    ...state,
    lands: state.lands.map((l) =>
      l.id === id
        ? { ...l, owner: nextOwner, epoch: l.epoch + 1, placements: [] }
        : l,
    ),
  };
}
export function placeDemoBird(state, landId, birdId) {
  if (!birds.some((b) => b.id === birdId))
    throw new Error("Неизвестная демо-птица.");
  const land = state.lands.find((l) => l.id === landId);
  if (!state.profile || land?.owner !== "player")
    throw new Error("Управлять может только демо-владелец участка.");
  const remove = land.placements.includes(birdId);
  return {
    ...state,
    lands: state.lands.map((l) => {
      const placements = l.placements.filter((id) => id !== birdId);
      return {
        ...l,
        placements:
          l.id === landId && !remove ? [...placements, birdId] : placements,
      };
    }),
  };
}
export function readDemo(raw) {
  if (!raw) return EMPTY_DEMO;
  try {
    const s = JSON.parse(raw);
    if (s.version !== 1 || !Array.isArray(s.lands) || s.lands.length > 100000)
      throw Error();
    const state = s.profile ? saveProfile(EMPTY_DEMO, s.profile) : EMPTY_DEMO;
    const seen = new Set(),
      placed = new Set();
    const lands = s.lands.map((l) => {
      coordinates(l.id);
      if (
        seen.has(l.id) ||
        !["player", "visitor"].includes(l.owner) ||
        !Number.isSafeInteger(l.epoch) ||
        l.epoch < 1 ||
        !Array.isArray(l.placements) ||
        (!state.profile && l.owner === "player")
      )
        throw Error();
      seen.add(l.id);
      if (l.owner === "visitor" && l.placements.length) throw Error();
      const placements = l.placements.map((id) => {
        if (!birds.some((b) => b.id === id) || placed.has(id)) throw Error();
        placed.add(id);
        return id;
      });
      return { id: l.id, owner: l.owner, epoch: l.epoch, placements };
    });
    return { ...state, lands };
  } catch {
    return EMPTY_DEMO;
  }
}
