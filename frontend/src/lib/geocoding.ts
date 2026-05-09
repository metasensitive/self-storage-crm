/**
 * Геокодинг через Nominatim (OpenStreetMap).
 *
 * Не требует API-ключа, поддерживает CORS, работает прямо из браузера.
 * Лимит — 1 запрос/сек (соблюдаем через debounce на стороне UI).
 *
 * Если в будущем потребуется точность Яндекс/2GIS — реализация изоморфная,
 * меняется только эта функция (формат AddressSuggestion остаётся прежним).
 *
 * Документация: https://nominatim.org/release-docs/develop/api/Search/
 */

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';

interface NominatimAddress {
  road?: string;
  house_number?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  region?: string;
  country?: string;
  country_code?: string;
}

interface NominatimItem {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
  type?: string;
  class?: string;
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

function pickCity(addr: NominatimAddress | undefined): string {
  if (!addr) return '';
  return (
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.suburb ||
    addr.state ||
    addr.region ||
    ''
  );
}

function pickAddress(item: NominatimItem): string {
  const a = item.address;
  if (a?.road) {
    return a.house_number ? `${a.road}, ${a.house_number}` : a.road;
  }
  // Fallback: первые два сегмента display_name (обычно «Объект, Улица, …»)
  const parts = item.display_name.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.slice(0, 2).join(', ') || item.display_name;
}

function toSuggestion(item: NominatimItem): AddressSuggestion {
  return {
    id: String(item.place_id),
    displayName: item.display_name,
    city: pickCity(item.address),
    address: pickAddress(item),
    latitude: Number(item.lat),
    longitude: Number(item.lon),
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

  const params = new URLSearchParams({
    q: trimmed,
    format: 'json',
    addressdetails: '1',
    limit: String(opts.limit ?? 6),
    'accept-language': 'ru',
  });
  if (opts.countryCodes && opts.countryCodes.length > 0) {
    params.set('countrycodes', opts.countryCodes.join(','));
  }

  const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
    signal: opts.signal,
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Geocoding failed: ${res.status}`);
  }
  const items = (await res.json()) as NominatimItem[];
  return items.filter((i) => i.lat && i.lon).map(toSuggestion);
}
