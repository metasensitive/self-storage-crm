/**
 * Геокодинг через Photon (https://photon.komoot.io).
 *
 * Photon — публичный бесплатный сервис от Komoot, построенный на тех же
 * данных OSM, что и Nominatim, но специально заточенный под автокомплит:
 * prefix matching, ранжирование по релевантности, быстрый ответ, CORS.
 *
 * Контракт `AddressSuggestion` совместим с прежней реализацией (Nominatim).
 *
 * Особенности:
 * — `lang=default` — Photon публичный инстанс не поддерживает `lang=ru`,
 *   но `default` отдаёт локальные названия (для РФ — кириллицу).
 * — Имя POI (`name`) в `displayName` НЕ включается — иначе магазин/мастерская
 *   на доме №3 показывалась бы как отдельный пункт. Без `name` пять разных
 *   POI на одном здании схлопываются дедупом по `(address, city)`.
 *
 * Документация: https://github.com/komoot/photon
 */

const ENDPOINT = 'https://photon.komoot.io/api/';

// Photon bbox: lon_min,lat_min,lon_max,lat_max — РФ целиком.
const RU_BBOX = '19.5,41.2,180,81.9';

interface PhotonProperties {
  osm_id?: number;
  osm_type?: string;
  osm_key?: string;
  osm_value?: string;
  name?: string;
  country?: string;
  countrycode?: string;
  state?: string;
  county?: string;
  city?: string;
  district?: string;
  locality?: string;
  street?: string;
  housenumber?: string;
  postcode?: string;
  type?: string;
}

interface PhotonFeature {
  type?: 'Feature';
  geometry?: { type?: 'Point'; coordinates?: [number, number] };
  properties?: PhotonProperties;
}

interface PhotonResponse {
  type?: 'FeatureCollection';
  features?: PhotonFeature[];
}

export interface AddressSuggestion {
  /** Уникальный id результата для key в React */
  id: string;
  /** Полный человеко-читаемый адрес для отображения в подсказке */
  displayName: string;
  /** Город (или ближайший населённый пункт) */
  city: string;
  /** Краткий адрес: «улица, дом» — если доступно, иначе display_name */
  address: string;
  /** Координаты в формате чисел */
  latitude: number;
  longitude: number;
}

function pickCity(p: PhotonProperties): string {
  return p.city || p.locality || p.district || p.state || '';
}

function pickAddress(p: PhotonProperties): string {
  if (p.street) {
    return p.housenumber ? `${p.street}, ${p.housenumber}` : p.street;
  }
  // Для городов/посёлков/областей — берём `name` как адресный заголовок.
  if (p.name && p.osm_key && (p.osm_key === 'place' || p.osm_key === 'building')) {
    return p.name;
  }
  return p.city || p.locality || p.district || '';
}

function buildDisplayName(p: PhotonProperties): string {
  // Главная строка адреса (улица+дом или название места) — БЕЗ POI-`name`,
  // чтобы повторы магазинов/амбулаторий на одном здании дедуплицировались.
  const head = p.street
    ? p.housenumber
      ? `${p.street}, ${p.housenumber}`
      : p.street
    : p.osm_key === 'place' || p.osm_key === 'building'
      ? p.name || ''
      : '';

  const city = p.city || p.locality || '';
  const state = p.state;

  const parts: string[] = [];
  if (head) parts.push(head);
  if (city && city !== head) parts.push(city);
  if (state && state !== city) parts.push(state);
  if (p.country) parts.push(p.country);
  return parts.filter(Boolean).join(', ');
}

function toSuggestion(feature: PhotonFeature, idx: number): AddressSuggestion | null {
  const coords = feature.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2) return null;
  const [lon, lat] = coords;
  if (typeof lon !== 'number' || typeof lat !== 'number') return null;

  const p = feature.properties || {};
  const address = pickAddress(p);
  if (!address) return null; // без читаемого адреса в выдаче не показываем

  return {
    id: `${idx}-${lat.toFixed(5)}-${lon.toFixed(5)}`,
    displayName: buildDisplayName(p) || address,
    city: pickCity(p),
    address,
    latitude: lat,
    longitude: lon,
  };
}

interface SearchOptions {
  signal?: AbortSignal;
  limit?: number;
  countryCodes?: string[];
}

export async function searchAddress(
  query: string,
  opts: SearchOptions = {},
): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const limit = opts.limit ?? 8;
  const params = new URLSearchParams({
    q: trimmed,
    lang: 'default',
    // Просим больше — после семантического дедупа останется меньше.
    limit: String(Math.max(limit * 3, 15)),
  });

  if (opts.countryCodes?.map((c) => c.toLowerCase()).includes('ru')) {
    params.set('bbox', RU_BBOX);
  }

  const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
    signal: opts.signal,
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Geocoding failed: ${res.status}`);
  }
  const data = (await res.json()) as PhotonResponse;

  // Семантический дедуп: одинаковые `(address, city)` — это либо POI на одном
  // здании, либо буквально один и тот же объект, проиндексированный дважды.
  const seen = new Set<string>();
  const out: AddressSuggestion[] = [];
  for (const feat of data.features ?? []) {
    // Опциональная фильтрация по стране — если bbox недостаточно жёсткий.
    if (opts.countryCodes && opts.countryCodes.length > 0) {
      const cc = (feat.properties?.countrycode || '').toLowerCase();
      const want = opts.countryCodes.map((c) => c.toLowerCase());
      if (cc && !want.includes(cc)) continue;
    }
    const s = toSuggestion(feat, out.length);
    if (!s) continue;
    const key = `${s.address.toLowerCase()}|${s.city.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}
