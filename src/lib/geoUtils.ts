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
