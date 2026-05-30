import AsyncStorage from '@react-native-async-storage/async-storage';

export type StationFavoriteKind = 'home' | 'work' | 'school';

export interface StationFavorite {
  kind: StationFavoriteKind;
  stationName: string;
  lineId?: string;
  savedAt: number;
}

export const STATION_FAVORITE_KINDS: {
  kind: StationFavoriteKind;
  label: string;
  icon: 'home-outline' | 'briefcase-outline' | 'school-outline';
  color: string;
}[] = [
  { kind: 'home', label: '집', icon: 'home-outline', color: '#2B77D9' },
  { kind: 'work', label: '회사', icon: 'briefcase-outline', color: '#7C5CFF' },
  { kind: 'school', label: '학교', icon: 'school-outline', color: '#0B6B56' },
];

const STATION_FAVORITES_KEY = 'metro_station_favorites';

export type StationFavoriteMap = Partial<Record<StationFavoriteKind, StationFavorite>>;

function isFavoriteKind(kind: string): kind is StationFavoriteKind {
  return STATION_FAVORITE_KINDS.some((item) => item.kind === kind);
}

function isStationFavorite(value: unknown): value is StationFavorite {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as StationFavorite).stationName === 'string' &&
    typeof (value as StationFavorite).savedAt === 'number'
  );
}

async function readStationFavorites(): Promise<StationFavoriteMap> {
  try {
    const raw = await AsyncStorage.getItem(STATION_FAVORITES_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.entries(parsed).reduce<StationFavoriteMap>((acc, [kind, value]) => {
      if (!isFavoriteKind(kind) || !isStationFavorite(value)) return acc;
      acc[kind] = { ...value, kind };
      return acc;
    }, {});
  } catch {
    return {};
  }
}

async function writeStationFavorites(favorites: StationFavoriteMap) {
  await AsyncStorage.setItem(STATION_FAVORITES_KEY, JSON.stringify(favorites));
}

export function getStationFavoriteKindsForStationFromMap(
  favorites: StationFavoriteMap,
  stationName: string,
) {
  return STATION_FAVORITE_KINDS
    .filter(({ kind }) => favorites[kind]?.stationName === stationName)
    .map(({ kind }) => kind);
}

export async function getStationFavoriteMap() {
  return readStationFavorites();
}

export async function getStationFavorites() {
  const favorites = await readStationFavorites();
  return STATION_FAVORITE_KINDS
    .map(({ kind }) => favorites[kind])
    .filter((favorite): favorite is StationFavorite => Boolean(favorite));
}

export async function setStationFavorite(
  kind: StationFavoriteKind,
  stationName: string,
  lineId?: string,
) {
  const favorites = await readStationFavorites();
  favorites[kind] = {
    kind,
    stationName,
    lineId,
    savedAt: Date.now(),
  };
  await writeStationFavorites(favorites);
  return favorites[kind];
}

export async function removeStationFavorite(kind: StationFavoriteKind) {
  const favorites = await readStationFavorites();
  delete favorites[kind];
  await writeStationFavorites(favorites);
}
