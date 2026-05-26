export type StationFavoriteKind = "home" | "work" | "school";

export interface StationFavorite {
  kind: StationFavoriteKind;
  stationName: string;
  lineId?: string;
  savedAt: number;
}

export const STATION_FAVORITE_KINDS: Array<{
  kind: StationFavoriteKind;
  label: string;
}> = [
  { kind: "home", label: "집" },
  { kind: "work", label: "회사" },
  { kind: "school", label: "학교" },
];

const STATION_FAVORITES_KEY = "metro_station_favorites";

export type StationFavoriteMap = Partial<Record<StationFavoriteKind, StationFavorite>>;

function isFavoriteKind(kind: string): kind is StationFavoriteKind {
  return STATION_FAVORITE_KINDS.some(item => item.kind === kind);
}

function readStationFavorites(): StationFavoriteMap {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STATION_FAVORITES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.entries(parsed).reduce<StationFavoriteMap>((acc, [kind, value]) => {
      if (!isFavoriteKind(kind)) return acc;
      if (
        value &&
        typeof value === "object" &&
        typeof (value as StationFavorite).stationName === "string" &&
        typeof (value as StationFavorite).savedAt === "number"
      ) {
        acc[kind] = value as StationFavorite;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function writeStationFavorites(favorites: StationFavoriteMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STATION_FAVORITES_KEY, JSON.stringify(favorites));
  window.dispatchEvent(new Event("metro:station-favorites-changed"));
}

export function getStationFavoriteMap() {
  return readStationFavorites();
}

export function getStationFavorites() {
  const favorites = readStationFavorites();
  return STATION_FAVORITE_KINDS
    .map(({ kind }) => favorites[kind])
    .filter((favorite): favorite is StationFavorite => Boolean(favorite));
}

export function getStationFavorite(kind: StationFavoriteKind) {
  return readStationFavorites()[kind] ?? null;
}

export function getStationFavoriteKindsForStation(stationName: string) {
  const favorites = readStationFavorites();
  return STATION_FAVORITE_KINDS
    .filter(({ kind }) => favorites[kind]?.stationName === stationName)
    .map(({ kind }) => kind);
}

export function setStationFavorite(
  kind: StationFavoriteKind,
  stationName: string,
  lineId?: string,
) {
  const favorites = readStationFavorites();
  favorites[kind] = {
    kind,
    stationName,
    lineId,
    savedAt: Date.now(),
  };
  writeStationFavorites(favorites);
  return favorites[kind];
}

export function removeStationFavorite(kind: StationFavoriteKind) {
  const favorites = readStationFavorites();
  delete favorites[kind];
  writeStationFavorites(favorites);
}
