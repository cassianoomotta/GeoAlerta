// =============================================
// GeoAlerta - Sistema de Ícones do Mapa Tático
// Ícones SVG inline via L.divIcon (zero dependência de CDN)
// Paleta cromática definida pelo Guia de Iconografia UX
// =============================================
import L from "leaflet";
import {occurrenceTypeIcon,typeIconPaths} from '@/features/occurrences/domain/map-presentation';

// ---------- Paleta de Cores por Tipo de Ocorrência ----------
const OCCURRENCE_COLORS: Record<string, string> = {
  "Alagamento": "#3b82f6",       // blue-500
  "Inundação": "#3b82f6",
  "Deslizamento": "#a16207",     // yellow-700 (terra)
  "Encosta": "#a16207",
  "Desabrigados": "#d946ef",     // fuchsia-500
  "Acolhimento": "#d946ef",
  "Árvore": "#16a34a",           // green-600
  "Fio": "#eab308",              // yellow-500 (elétrico)
  "Choque": "#eab308",
  "Elétrico": "#eab308",
  "Bueiro": "#f97316",           // orange-500
  "Via": "#f97316",
  "Obstruída": "#f97316",
  "Alimentos": "#ec4899",        // pink-500
  "Água": "#ec4899",
  "Humanitário": "#ec4899",
  "Resgate": "#ec4899",
  "Outros": "#94a3b8",           // slate-400
};

/**
 * Determina a cor do marcador baseado no tipo da ocorrência.
 * Faz matching parcial (ex: "Alagamento / Inundação" → match "Alagamento").
 */
export function getOccurrenceColor(type: string | null | undefined): string {
  if (!type) return "#94a3b8";
  for (const [key, color] of Object.entries(OCCURRENCE_COLORS)) {
    if (type.includes(key)) return color;
  }
  return "#94a3b8"; // fallback: slate
}

/**
 * Retorna o SVG inline do ícone baseado no tipo da ocorrência.
 */
function getOccurrenceSvg(type: string | null | undefined): string {
  const iconPath=typeIconPaths[occurrenceTypeIcon(type ?? '')];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="${iconPath}"/></svg>`;
}

/**
 * Cria um L.divIcon estilizado para ocorrências.
 * Círculo 32×32 com ícone SVG, borda branca e glow na cor temática.
 */
export function occurrenceIcon(type: string | null | undefined, status?: string): L.DivIcon {
  const color = getOccurrenceColor(type);
  const svg = getOccurrenceSvg(type);
  const isNew = !status || status === "Novo" || status === "Aberto";
  const isResolved = status === "Resolvido";

  const pulseRing = isNew
    ? `<div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${color};opacity:0.6;animation:occPulse 2s ease-out infinite;pointer-events:none"></div>`
    : "";

  const opacity = isResolved ? "0.5" : "1";
  const resolvedCheck = isResolved
    ? `<div style="position:absolute;top:-4px;right:-4px;width:14px;height:14px;background:#10b981;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center">
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>
       </div>`
    : "";

  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:32px;height:32px;opacity:${opacity}">
        ${pulseRing}
        <div style="
          width:32px;height:32px;
          background:${color};
          border-radius:50%;
          border:3px solid white;
          box-shadow:0 0 12px ${color}66, 0 2px 8px rgba(0,0,0,0.4);
          display:flex;align-items:center;justify-content:center;
          position:relative;
        ">${svg}</div>
        ${resolvedCheck}
      </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
  });
}

// ---------- Ícones de Abrigos ----------
const SHELTER_COLORS: Record<string, string> = {
  humano: "#10b981",  // emerald-500
  pet: "#d946ef",     // fuchsia-500
  misto: "#f59e0b",   // amber-500
};

const SHELTER_SVGS: Record<string, string> = {
  humano: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
  pet:    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/></svg>`,
  misto:  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="16" viewBox="0 0 28 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 21v-6a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v6"/><path d="M1 12a2 2 0 0 1 .709-1.528l5-4.3a2 2 0 0 1 2.582 0l5 4.3A2 2 0 0 1 15 12v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2z"/><circle cx="21" cy="8" r="1.5"/><circle cx="26" cy="11" r="1.5"/><path d="M19 13a3.5 3.5 0 0 1 3.5 3.5v2a2.5 2.5 0 0 1-5 0v-2A3.5 3.5 0 0 1 19 13Z"/></svg>`,
};

/**
 * Cria um L.divIcon para abrigos.
 * Quadrado arredondado com ícone de casa/pata e mini barra de ocupação.
 */
export function shelterIcon(type: string, occupied: number, capacity: number, status: string): L.DivIcon {
  const color = SHELTER_COLORS[type] || SHELTER_COLORS.humano;
  const svg = SHELTER_SVGS[type] || SHELTER_SVGS.humano;
  const pct = capacity > 0 ? Math.min(100, (occupied / capacity) * 100) : 0;
  const barColor = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#10b981";
  const isClosed = status === "Encerrado";
  const isFull = status === "Lotado";

  const opacity = isClosed ? "0.4" : "1";
  const fullPulse = isFull
    ? `border:3px solid #ef4444;animation:shelterPulse 1.5s infinite;`
    : `border:3px solid white;`;

  const closedBadge = isClosed
    ? `<div style="position:absolute;top:-4px;right:-4px;width:14px;height:14px;background:#ef4444;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center">
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
       </div>`
    : "";

  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:36px;height:42px;opacity:${opacity}">
        <div style="
          width:36px;height:36px;
          background:${color};
          border-radius:8px;
          ${fullPulse}
          box-shadow:0 0 12px ${color}66, 0 2px 8px rgba(0,0,0,0.4);
          display:flex;align-items:center;justify-content:center;
          position:relative;
        ">${svg}</div>
        <div style="
          position:absolute;bottom:2px;left:4px;right:4px;
          height:4px;background:rgba(255,255,255,0.2);
          border-radius:2px;overflow:hidden;
        ">
          <div style="height:100%;width:${pct}%;background:${barColor};border-radius:2px;transition:width 0.3s"></div>
        </div>
        ${closedBadge}
        <div style="
          position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);
          width:0;height:0;
          border-left:6px solid transparent;
          border-right:6px solid transparent;
          border-top:6px solid ${color};
        "></div>
      </div>`,
    iconSize: [36, 48],
    iconAnchor: [18, 48],
    popupAnchor: [0, -48],
  });
}

// ---------- Ícones de Equipes GPS (ponto pulsante) ----------
const ORGAN_COLORS: Record<string, string> = {
  "Defesa Civil": "#f59e0b",
  "Bombeiros": "#ef4444",
  "Obras": "#3b82f6",
  "Assistência Social": "#d946ef",
  "Saúde": "#10b981",
  "Polícia": "#64748b",
};

export function getOrganColor(organ: string): string {
  return ORGAN_COLORS[organ] || "#22d3ee"; // cyan fallback
}

/**
 * Cria um L.divIcon pulsante para equipes com GPS ativo.
 */
export function teamGpsIcon(organ: string, teamName?: string, incidentCount?: number): L.DivIcon {
  const color = getOrganColor(organ);
  const hasIncidents = typeof incidentCount === "number" && incidentCount > 0;
  return L.divIcon({
    className: "team-live-marker-wrapper",
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;pointer-events:none;">
        ${teamName ? `
          <div style="
            pointer-events: auto;
            cursor: pointer;
            background: rgba(15, 23, 42, 0.95);
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            padding: 2px 7px;
            border-radius: 6px;
            border: 1.5px solid ${color};
            box-shadow: 0 2px 10px rgba(0,0,0,0.7), 0 0 10px ${color}66;
            white-space: nowrap;
            margin-bottom: 2px;
            letter-spacing: 0.3px;
            text-shadow: 0 1px 2px rgba(0,0,0,0.8);
          ">
            ${teamName}
          </div>
        ` : ''}
        ${hasIncidents ? `
          <div style="
            pointer-events: auto;
            cursor: pointer;
            background: rgba(220, 38, 38, 0.95);
            color: #ffffff;
            font-size: 9px;
            font-weight: 800;
            padding: 1px 6px;
            border-radius: 10px;
            border: 1px solid #fca5a5;
            box-shadow: 0 2px 8px rgba(220,38,38,0.5);
            white-space: nowrap;
            margin-bottom: 3px;
            letter-spacing: 0.2px;
            display: flex;
            align-items: center;
            gap: 3px;
          ">
            <span>🚨</span>
            <span>${incidentCount} chamado(s) aqui</span>
          </div>
        ` : ''}
        <div style="
          pointer-events: auto;
          cursor: pointer;
          width:22px;height:22px;
          background:${color};
          border-radius:50%;
          border:3px solid white;
          box-shadow:0 0 0 5px ${color}55, 0 0 18px ${color};
          animation:teamPulse 1.5s infinite;
        "></div>
      </div>`,
    iconSize: [140, hasIncidents ? 66 : (teamName ? 52 : 24)],
    iconAnchor: [70, hasIncidents ? 54 : (teamName ? 40 : 11)],
    popupAnchor: [0, -32],
  });
}

// ---------- CSS das animações (injetar uma vez no DOM) ----------
export const MAP_ICON_STYLES = `
  @keyframes occPulse {
    0% { transform: scale(1); opacity: 0.6; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes shelterPulse {
    0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
    70% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
    100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
  }
  @keyframes teamPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.35); }
    100% { transform: scale(1); }
  }
`;
