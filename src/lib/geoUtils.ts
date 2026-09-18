export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Decodifica qualquer formato de localização (PostGIS WKB Hex, WKT POINT, GeoJSON, lat/lng)
 */
export function parseCoordinates(location: any): Coordinates | null {
  if (!location) return null;

  try {
    // 1. PostGIS WKB Hex string
    if (typeof location === 'string') {
      const trimmed = location.trim();
      
      // Se for Hex (ex: 0101000020E6100000... de 50 caracteres para EWKB)
      if (trimmed.length >= 42 && /^[0-9a-fA-F]+$/.test(trimmed)) {
        const matches = trimmed.match(/.{1,2}/g);
        if (matches) {
          const bytes = new Uint8Array(matches.map((byte: string) => parseInt(byte, 16)));
          const view = new DataView(bytes.buffer);
          const isLittleEndian = bytes[0] === 1;
          
          if (trimmed.length === 50) {
            // EWKB com SRID 4326: X (lng) no offset 9, Y (lat) no offset 17
            const lng = view.getFloat64(9, isLittleEndian);
            const lat = view.getFloat64(17, isLittleEndian);
            if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
              return { lat, lng };
            }
          } else if (trimmed.length === 42) {
            // WKB puro sem SRID
            const lng = view.getFloat64(5, isLittleEndian);
            const lat = view.getFloat64(13, isLittleEndian);
            if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
              return { lat, lng };
            }
          }
        }
      }

      // 2. WKT format: POINT(lng lat)
      const wktMatch = trimmed.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
      if (wktMatch) {
        const lng = parseFloat(wktMatch[1]);
        const lat = parseFloat(wktMatch[2]);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }

      // 3. String "lat, lng"
      const commaMatch = trimmed.match(/^([-\d.]+)\s*,\s*([-\d.]+)$/);
      if (commaMatch) {
        const lat = parseFloat(commaMatch[1]);
        const lng = parseFloat(commaMatch[2]);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }

      // 4. Link ou query do Google Maps com coordenadas (@lat,lng ou ?q=lat,lng)
      const gmapsAtMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (gmapsAtMatch) {
        const lat = parseFloat(gmapsAtMatch[1]);
        const lng = parseFloat(gmapsAtMatch[2]);
        if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
      }
      const gmapsQMatch = trimmed.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (gmapsQMatch) {
        const lat = parseFloat(gmapsQMatch[1]);
        const lng = parseFloat(gmapsQMatch[2]);
        if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
      }
    }

    // 4. GeoJSON Object: { coordinates: [lng, lat] }
    if (location && typeof location === 'object') {
      if (Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
        const lng = Number(location.coordinates[0]);
        const lat = Number(location.coordinates[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }

      // 5. Object com lat/lng
      if ('lat' in location && 'lng' in location) {
        const lat = Number(location.lat);
        const lng = Number(location.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }
      if ('latitude' in location && 'longitude' in location) {
        const lat = Number(location.latitude);
        const lng = Number(location.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }
    }
  } catch (err) {
    console.error("Erro ao decodificar coordenadas:", err);
  }

  return null;
}

export function formatCoordinates(coords: Coordinates | null, decimals = 5): string {
  if (!coords) return "Não informado";
  return `${coords.lat.toFixed(decimals)}, ${coords.lng.toFixed(decimals)}`;
}

export function getGoogleMapsUrl(coords: Coordinates | null): string {
  if (!coords) return "";
  return `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
}

export function getWazeUrl(coords: Coordinates | null): string {
  if (!coords) return "";
  return `https://waze.com/ul?ll=${coords.lat},${coords.lng}&navigate=yes`;
}

/**
 * Calcula a distância em quilômetros entre duas coordenadas (Fórmula Haversine)
 */
export function calculateDistanceKm(c1: Coordinates, c2: Coordinates): number {
  const R = 6371; // Raio médio da Terra em km
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Encontra a entidade mais próxima de uma coordenada de origem
 */
export function findClosestEntity<T extends { lat: number | null; lng: number | null }>(
  origin: Coordinates,
  entities: T[]
): { entity: T; distanceKm: number } | null {
  if (!entities || entities.length === 0) return null;

  let closest: { entity: T; distanceKm: number } | null = null;

  for (const item of entities) {
    if (item.lat === null || item.lng === null || isNaN(item.lat) || isNaN(item.lng)) continue;
    const dist = calculateDistanceKm(origin, { lat: item.lat, lng: item.lng });
    if (!closest || dist < closest.distanceKm) {
      closest = { entity: item, distanceKm: dist };
    }
  }

  return closest;
}

/**
 * Geocodifica um endereço textual ou extrai coordenadas de link do Google Maps.
 */
export async function geocodeAddress(
  input: string,
  fallbackCity: string = "Santo Antônio da Patrulha"
): Promise<Coordinates | null> {
  if (!input || !input.trim()) return null;
  const trimmed = input.trim();

  // 1. Tentar parsear se já contiver coordenadas ou link do Google Maps
  const parsed = parseCoordinates(trimmed);
  if (parsed) return parsed;

  // 2. Se for texto de endereço, consultar Nominatim OpenStreetMap
  try {
    let query = trimmed;
    if (!query.toLowerCase().includes("patrulha") && !query.toLowerCase().includes("rs")) {
      query = `${trimmed}, ${fallbackCity}, RS, Brasil`;
    }
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      {
        headers: { "User-Agent": "GeoAlerta-App" }
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.length > 0 && data[0].lat && data[0].lon) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
  } catch (e) {
    console.warn("Falha no geocoding do endereço:", e);
  }

  return null;
}
