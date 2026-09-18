import * as turf from '@turf/turf';
import { parseCoordinates } from './geoUtils';

export interface DynamicFloodZoneResult {
  geoJson: any | null;
  totalOccurrences: number;
  estimatedAreaHectares: number;
  clustersCount: number;
  lastUpdated: string;
}

export interface DynamicFloodZoneOptions {
  bufferRadiusMeters?: number;
  varyBySeverity?: boolean;
  onlyActive?: boolean;
}

/**
 * Identifica se uma ocorrência tem natureza de alagamento/inundação/hidrológica
 */
export function isFloodRelatedOccurrence(type: string | null | undefined): boolean {
  if (!type) return false;
  const t = type.toLowerCase().trim();
  return (
    t.includes('alag') ||
    t.includes('inunda') ||
    t.includes('enchen') ||
    t.includes('enxurr') ||
    t.includes('transbord') ||
    t.includes('rio') ||
    t.includes('córrego') ||
    t.includes('agua') ||
    t.includes('água') ||
    t.includes('bueiro') ||
    t.includes('drenag')
  );
}

/**
 * Calcula o raio do buffer em metros baseado na prioridade/gravidade do chamado
 */
function getOccurrenceRadius(occ: any, defaultRadius: number, varyBySeverity: boolean): number {
  if (!varyBySeverity) return defaultRadius;

  const priority = String(occ.priority || '').toUpperCase();
  const severity = String(occ.severity || '').toUpperCase();

  if (priority === 'ALTA' || priority === 'CRITICA' || severity === 'ALTA' || severity === 'CRITICA') {
    return Math.round(defaultRadius * 1.5); // ex: 225m
  }
  if (priority === 'BAIXA' || severity === 'BAIXA') {
    return Math.round(defaultRadius * 0.75); // ex: 110m
  }
  return defaultRadius; // ex: 150m (MEDIA)
}

/**
 * Gera os polígonos da Mancha de Inundação Dinâmica em tempo real via Turf.js
 * aplicando Buffer (raio de influência) + Union (fusão automática de áreas contíguas).
 */
export function generateDynamicFloodZones(
  occurrences: any[],
  options: DynamicFloodZoneOptions = {}
): DynamicFloodZoneResult {
  const {
    bufferRadiusMeters = 150,
    varyBySeverity = true,
    onlyActive = true,
  } = options;

  if (!occurrences || occurrences.length === 0) {
    return {
      geoJson: null,
      totalOccurrences: 0,
      estimatedAreaHectares: 0,
      clustersCount: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  // 1. Filtrar ocorrências elegíveis
  const eligibleOccurrences = occurrences.filter((occ) => {
    if (onlyActive && occ.status === 'Resolvido') {
      return false;
    }
    return isFloodRelatedOccurrence(occ.type);
  });

  if (eligibleOccurrences.length === 0) {
    return {
      geoJson: null,
      totalOccurrences: 0,
      estimatedAreaHectares: 0,
      clustersCount: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  // 2. Criar os buffers (círculos poligonais) para cada ponto
  const bufferFeatures: any[] = [];

  for (const occ of eligibleOccurrences) {
    const coords = parseCoordinates(occ.location);
    if (!coords) continue;

    const radiusMeters = getOccurrenceRadius(occ, bufferRadiusMeters, varyBySeverity);
    const radiusKm = radiusMeters / 1000;

    // Turf espera [lng, lat]
    const point = turf.point([coords.lng, coords.lat], {
      occurrenceId: occ.id,
      type: occ.type,
      priority: occ.priority,
      status: occ.status,
      radiusMeters,
    });

    try {
      // 16 passos geram círculos suaves sem sobrecarregar a geometria
      const buffered = turf.buffer(point, radiusKm, { units: 'kilometers', steps: 16 });
      if (buffered) {
        buffered.properties = {
          occurrenceId: occ.id,
          type: occ.type,
          priority: occ.priority,
          radiusMeters,
        };
        bufferFeatures.push(buffered);
      }
    } catch (err) {
      console.warn('Erro ao gerar buffer do ponto:', err);
    }
  }

  if (bufferFeatures.length === 0) {
    return {
      geoJson: null,
      totalOccurrences: 0,
      estimatedAreaHectares: 0,
      clustersCount: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  // 3. Unir os buffers sobrepostos (Union / Dissolve)
  let unitedGeometry: any = null;

  try {
    if (bufferFeatures.length === 1) {
      unitedGeometry = bufferFeatures[0];
    } else {
      // turf.union aceita FeatureCollection em versões modernas
      const fc = turf.featureCollection(bufferFeatures as any);
      unitedGeometry = (turf.union as any)(fc);
    }
  } catch (unionErr) {
    console.warn('Falha no turf.union agrupado, tentando união incremental:', unionErr);
    // Fallback: união par-a-par se a em lote falhar
    try {
      let accumulator = bufferFeatures[0];
      for (let i = 1; i < bufferFeatures.length; i++) {
        const nextUnion = (turf.union as any)(turf.featureCollection([accumulator, bufferFeatures[i]] as any));
        if (nextUnion) {
          accumulator = nextUnion;
        }
      }
      unitedGeometry = accumulator;
    } catch (fallbackErr) {
      console.error('Falha geral na união de geometrias:', fallbackErr);
      unitedGeometry = turf.featureCollection(bufferFeatures as any);
    }
  }

  if (!unitedGeometry) {
    return {
      geoJson: null,
      totalOccurrences: eligibleOccurrences.length,
      estimatedAreaHectares: 0,
      clustersCount: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  // 4. Calcular métricas operacionais (Área e Qtd de manchas)
  let estimatedAreaHectares = 0;
  let clustersCount = 1;

  try {
    const areaSqMeters = turf.area(unitedGeometry);
    estimatedAreaHectares = Number((areaSqMeters / 10000).toFixed(2)); // 1 ha = 10.000 m²

    if (unitedGeometry.geometry?.type === 'MultiPolygon') {
      clustersCount = unitedGeometry.geometry.coordinates.length;
    } else if (unitedGeometry.type === 'FeatureCollection') {
      clustersCount = unitedGeometry.features.length;
    }
  } catch (e) {
    console.warn('Erro ao calcular área:', e);
  }

  // Anexar metadados à propriedade do polígono gerado
  unitedGeometry.properties = {
    ...(unitedGeometry.properties || {}),
    name: 'Mancha Dinâmica (IA / Ocorrências)',
    isDynamic: true,
    occurrencesCount: eligibleOccurrences.length,
    estimatedAreaHectares,
    clustersCount,
    generatedAt: new Date().toISOString(),
  };

  return {
    geoJson: unitedGeometry,
    totalOccurrences: eligibleOccurrences.length,
    estimatedAreaHectares,
    clustersCount,
    lastUpdated: new Date().toISOString(),
  };
}
