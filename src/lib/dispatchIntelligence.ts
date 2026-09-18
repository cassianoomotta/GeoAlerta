import * as turf from '@turf/turf';
import { calculateDistanceKm } from './geoUtils';
import type { MapTeamLive } from '@/components/MapComponent';

export interface SmartRecommendation {
  team: MapTeamLive;
  entity: MapTeamLive;
  distanceKm: number;
  matchReason: string;
  isDirectSpecialty: boolean;
  isAvailable: boolean;
  specialtyLabel?: string;
}

export interface RiskZoneCheckResult {
  inRiskZone: boolean;
  zoneName?: string;
  riskLevel?: string;
  isDynamicZone?: boolean;
}

// Mapeamento de afinidade operacional entre tipos de desastres e órgãos/especialidades
export const INCIDENT_SPECIALTY_MAP: Record<string, { preferredOrgans: string[]; label: string }> = {
  "alag": { preferredOrgans: ["Bombeiros", "Defesa Civil"], label: "Resgate Aquático e Barcos" },
  "inunda": { preferredOrgans: ["Bombeiros", "Defesa Civil"], label: "Resgate Aquático e Barcos" },
  "enchen": { preferredOrgans: ["Bombeiros", "Defesa Civil"], label: "Resgate e Monitoramento Hidrológico" },
  "transbord": { preferredOrgans: ["Defesa Civil", "Bombeiros"], label: "Monitoramento e Alerta Hidrológico" },
  "desliza": { preferredOrgans: ["Bombeiros", "Defesa Civil"], label: "Busca e Salvamento Geotécnico" },
  "desaba": { preferredOrgans: ["Bombeiros", "Defesa Civil"], label: "Busca e Salvamento em Estruturas" },
  "árvore": { preferredOrgans: ["Obras", "Bombeiros"], label: "Corte e Desobstrução de Vias" },
  "arvore": { preferredOrgans: ["Obras", "Bombeiros"], label: "Corte e Desobstrução de Vias" },
  "fio": { preferredOrgans: ["Obras", "Bombeiros"], label: "Risco Elétrico e Isolamento" },
  "eletric": { preferredOrgans: ["Obras", "Bombeiros"], label: "Risco Elétrico e Isolamento" },
  "bueiro": { preferredOrgans: ["Obras", "Defesa Civil"], label: "Drenagem Urbana e Desobstrução" },
  "via": { preferredOrgans: ["Obras", "Polícia"], label: "Desobstrução e Controle de Tráfego" },
  "ponte": { preferredOrgans: ["Obras", "Defesa Civil"], label: "Avaliação Estrutural e Interdição" },
  "desabrig": { preferredOrgans: ["Assistência Social", "Saúde"], label: "Acolhimento e Abrigo Humanitário" },
  "desaloj": { preferredOrgans: ["Assistência Social", "Saúde"], label: "Acolhimento e Abrigo Humanitário" },
  "alimento": { preferredOrgans: ["Assistência Social", "Defesa Civil"], label: "Distribuição de Mantimentos" },
  "água": { preferredOrgans: ["Assistência Social", "Defesa Civil"], label: "Abastecimento Humanitário" },
  "agua": { preferredOrgans: ["Assistência Social", "Defesa Civil"], label: "Abastecimento Humanitário" },
  "saúde": { preferredOrgans: ["Saúde", "Bombeiros"], label: "Atendimento Pré-Hospitalar (APH)" },
  "saude": { preferredOrgans: ["Saúde", "Bombeiros"], label: "Atendimento Pré-Hospitalar (APH)" },
  "ferid": { preferredOrgans: ["Saúde", "Bombeiros"], label: "Socorro Médico e Resgate" },
  "polícia": { preferredOrgans: ["Polícia"], label: "Segurança e Isolamento de Área" },
  "policia": { preferredOrgans: ["Polícia"], label: "Segurança e Isolamento de Área" },
};

/**
 * Encontra a especialidade correspondente ao tipo de ocorrência
 */
export function getSpecialtyForIncident(type: string | null | undefined): { preferredOrgans: string[]; label: string } {
  if (!type) {
    return { preferredOrgans: ["Defesa Civil", "Bombeiros"], label: "Resposta Rápida" };
  }

  const normalized = type.toLowerCase();
  for (const [key, val] of Object.entries(INCIDENT_SPECIALTY_MAP)) {
    if (normalized.includes(key)) {
      return val;
    }
  }

  return { preferredOrgans: ["Defesa Civil", "Bombeiros"], label: "Resposta Geral a Desastres" };
}

/**
 * Alocação Inteligente: Escolhe a equipe ideal cruzando:
 * 1. Especialidade do órgão compatível com o tipo de chamado
 * 2. Status de prontidão (prioriza "Disponível" sobre "Em missão" ou "Indisponível")
 * 3. Menor distância geográfica (km Haversine)
 */
export function findSmartRecommendedTeam(
  occurrenceCoords: { lat: number; lng: number } | null,
  occurrenceType: string | null | undefined,
  teams: MapTeamLive[]
): SmartRecommendation | null {
  if (!occurrenceCoords || !teams || teams.length === 0) return null;

  const specialty = getSpecialtyForIncident(occurrenceType);
  const preferredOrgans = specialty.preferredOrgans;

  // Classificar candidatos por compatibilidade
  const categoryA: { team: MapTeamLive; distanceKm: number }[] = []; // Especialidade Compatível + Disponível
  const categoryB: { team: MapTeamLive; distanceKm: number }[] = []; // Outra Especialidade + Disponível
  const categoryC: { team: MapTeamLive; distanceKm: number }[] = []; // Especialidade Compatível + Em Missão
  const categoryD: { team: MapTeamLive; distanceKm: number }[] = []; // Outros

  for (const team of teams) {
    if (team.lat === null || team.lng === null || isNaN(team.lat) || isNaN(team.lng)) continue;

    const dist = calculateDistanceKm(occurrenceCoords, { lat: team.lat, lng: team.lng });
    const isPreferredOrgan = preferredOrgans.some(org => 
      team.organ?.toLowerCase().includes(org.toLowerCase()) || 
      team.team_name?.toLowerCase().includes(org.toLowerCase())
    );
    const isAvailable = !team.status || team.status === "Disponível";

    if (isPreferredOrgan && isAvailable) {
      categoryA.push({ team, distanceKm: dist });
    } else if (isAvailable) {
      categoryB.push({ team, distanceKm: dist });
    } else if (isPreferredOrgan) {
      categoryC.push({ team, distanceKm: dist });
    } else {
      categoryD.push({ team, distanceKm: dist });
    }
  }

  const sortByDistance = (list: { team: MapTeamLive; distanceKm: number }[]) => 
    list.sort((a, b) => a.distanceKm - b.distanceKm);

  sortByDistance(categoryA);
  sortByDistance(categoryB);
  sortByDistance(categoryC);
  sortByDistance(categoryD);

  // 1. Melhor cenário: Especialidade compatível e viatura disponível
  if (categoryA.length > 0) {
    const best = categoryA[0];
    return {
      team: best.team,
      entity: best.team,
      distanceKm: best.distanceKm,
      matchReason: `Especialidade compatível (${specialty.label}) • Viatura disponível`,
      isDirectSpecialty: true,
      isAvailable: true,
      specialtyLabel: specialty.label,
    };
  }

  // 2. Viatura disponível mais próxima de outro órgão de apoio
  if (categoryB.length > 0) {
    const best = categoryB[0];
    return {
      team: best.team,
      entity: best.team,
      distanceKm: best.distanceKm,
      matchReason: `Viatura disponível mais próxima (${best.team.organ}) • Apoio imediato`,
      isDirectSpecialty: false,
      isAvailable: true,
      specialtyLabel: specialty.label,
    };
  }

  // 3. Especialidade compatível, porém ocupada em atendimento
  if (categoryC.length > 0) {
    const best = categoryC[0];
    return {
      team: best.team,
      entity: best.team,
      distanceKm: best.distanceKm,
      matchReason: `⚠️ Especialidade ideal (${specialty.label}) • Viatura em atendimento`,
      isDirectSpecialty: true,
      isAvailable: false,
      specialtyLabel: specialty.label,
    };
  }

  // 4. Fallback: qualquer equipe mais próxima
  if (categoryD.length > 0) {
    const best = categoryD[0];
    return {
      team: best.team,
      entity: best.team,
      distanceKm: best.distanceKm,
      matchReason: `Viatura mais próxima disponível na região`,
      isDirectSpecialty: false,
      isAvailable: false,
      specialtyLabel: specialty.label,
    };
  }

  return null;
}

/**
 * Validação de Point-in-Polygon (Turf.js):
 * Verifica se um ponto geográfico cai dentro de polígonos de mancha de inundação ou áreas de risco.
 */
export function checkOccurrenceInRiskZone(
  coords: { lat: number; lng: number } | null,
  officialFloodZonesGeoJson: any,
  dynamicFloodGeoJson?: any
): RiskZoneCheckResult {
  if (!coords) return { inRiskZone: false };

  try {
    const pt = turf.point([coords.lng, coords.lat]);

    // 1. Verificar polígonos oficiais
    if (officialFloodZonesGeoJson?.features) {
      for (const feat of officialFloodZonesGeoJson.features) {
        if (feat.geometry && (feat.geometry.type === 'Polygon' || feat.geometry.type === 'MultiPolygon')) {
          if (turf.booleanPointInPolygon(pt, feat as any)) {
            return {
              inRiskZone: true,
              zoneName: feat.properties?.name || 'Mancha de Inundação Oficial',
              riskLevel: feat.properties?.riskLevel || 'Alto',
              isDynamicZone: false,
            };
          }
        }
      }
    }

    // 2. Verificar mancha dinâmica calculada por chamados
    if (dynamicFloodGeoJson) {
      const dynamicFeatures = dynamicFloodGeoJson.features || [dynamicFloodGeoJson];
      for (const feat of dynamicFeatures) {
        if (feat.geometry && (feat.geometry.type === 'Polygon' || feat.geometry.type === 'MultiPolygon')) {
          if (turf.booleanPointInPolygon(pt, feat as any)) {
            return {
              inRiskZone: true,
              zoneName: 'Mancha Dinâmica Ativa (IA)',
              riskLevel: 'Crítico',
              isDynamicZone: true,
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('Erro ao verificar ponto em polígono de risco:', err);
  }

  return { inRiskZone: false };
}
