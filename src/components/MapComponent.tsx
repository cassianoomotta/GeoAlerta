"use client";

import { useRef, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON, Polyline } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { floodZonesGeoJSON } from '@/data/geo';
import { parseCoordinates } from '@/lib/geoUtils';
import { formatTimeAgo } from '@/lib/dateUtils';
import { generateDynamicFloodZones } from '@/lib/autoFloodZones';
import {
  occurrenceIcon,
  shelterIcon,
  teamGpsIcon,
  getOrganColor,
  getOccurrenceColor,
  MAP_ICON_STYLES,
} from '@/lib/mapIcons';

// ---------- Interfaces ----------
export interface MapShelter {
  id: string;
  name: string;
  type: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  capacity: number;
  occupied: number;
  phone: string | null;
  status: string;
}

export interface MapTeamLive {
  team_id: string;
  team_name: string;
  organ: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  sent_at: string;
  member_name?: string;
  type?: string;
  phone?: string | null;
  status?: string;
}

export interface MapResource {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  status: string;
  shelter_id: string | null;
}

export interface MapVolunteerSummary {
  total: number;
  available: number;
  bySpecialty: { specialty: string; count: number }[];
}

// ---------- Componentes Internos ----------
function MapController({ markerRefs }: { markerRefs: React.MutableRefObject<any> }) {
  const map = useMap();
  
  useEffect(() => {
    const handleFly = (e: any) => {
      const id = e.detail;
      const marker = markerRefs.current[id];
      if (marker) {
        const latLng = marker.getLatLng();
        map.flyTo(latLng, 17, { duration: 1.5 });
        setTimeout(() => marker.openPopup(), 1500);
      }
    };
    window.addEventListener('flyToMarker', handleFly);
    return () => window.removeEventListener('flyToMarker', handleFly);
  }, [map, markerRefs]);
  
  return null;
}

// Ícones de especialidade para o painel de voluntários
const SPECIALTY_ICONS: Record<string, string> = {
  "Jipeiro": "🚙",
  "Saúde": "🏥",
  "Logística": "🚛",
  "Barco/Embarcação": "🚤",
  "Cozinha": "🍳",
  "Motorista": "🚗",
  "Comunicação": "📻",
  "Bombeiro Civil": "🧑‍🚒",
  "Outros": "👤",
};

// ---------- Componente Principal ----------
export default function MapComponent({ 
  occurrences, 
  onMarkerClick,
  showOccurrences = true,
  showFloodZones = true,
  showAutoFloodZones = true,
  autoFloodRadius = 150,
  showShelters = true,
  showTeams = true,
  showResources = true,
  showVolunteers = true,
  // Novos dados dinâmicos
  shelters = [],
  liveTeams = [],
  resources = [],
  volunteerSummary,
  dispatchVector,
}: { 
  occurrences: any[];
  onMarkerClick?: (occ: any) => void;
  showOccurrences?: boolean;
  showFloodZones?: boolean;
  showAutoFloodZones?: boolean;
  autoFloodRadius?: number;
  showShelters?: boolean;
  showTeams?: boolean;
  showResources?: boolean;
  showVolunteers?: boolean;
  shelters?: MapShelter[];
  liveTeams?: MapTeamLive[];
  resources?: MapResource[];
  volunteerSummary?: MapVolunteerSummary;
  dispatchVector?: { from: [number, number]; to: [number, number]; teamName: string; distanceKm: number } | null;
}) {
  const markerRefs = useRef<{[key: string]: L.Marker}>({});

  // Cálculo da Mancha de Inundação Dinâmica em tempo real via Turf.js
  const dynamicFloodZones = useMemo(() => {
    if (!showAutoFloodZones) return null;
    return generateDynamicFloodZones(occurrences, {
      bufferRadiusMeters: autoFloodRadius,
      varyBySeverity: true,
      onlyActive: true,
    });
  }, [occurrences, showAutoFloodZones, autoFloodRadius]);

  const geoJsonStyle = (feature: any) => {
    return {
      fillColor: feature?.properties?.color || '#ef4444',
      weight: 2,
      opacity: 0.8,
      color: feature?.properties?.color || '#ef4444',
      dashArray: '3',
      fillOpacity: 0.3
    };
  };

  // Estilo moderno de alta visibilidade para manchas automáticas estimadas por IA/chamados
  const dynamicZoneStyle = () => {
    return {
      fillColor: '#0284c7', // Sky blue vibrante
      weight: 2.5,
      opacity: 0.9,
      color: '#38bdf8', // Cyan luminoso
      dashArray: '6, 6',
      fillOpacity: 0.32,
    };
  };

  // Agregar recursos por shelter_id para enriquecer popup dos abrigos
  const resourcesByShelter = resources.reduce<Record<string, { total: number; critical: number; items: MapResource[] }>>((acc, r) => {
    if (!r.shelter_id) return acc;
    if (!acc[r.shelter_id]) acc[r.shelter_id] = { total: 0, critical: 0, items: [] };
    acc[r.shelter_id].total += 1;
    if (r.status === "Baixo Estoque" || r.status === "Esgotado") acc[r.shelter_id].critical += 1;
    acc[r.shelter_id].items.push(r);
    return acc;
  }, {});
  
  return (
    <>
      {/* Injetar CSS das animações dos ícones */}
      <style dangerouslySetInnerHTML={{ __html: MAP_ICON_STYLES }} />

      <MapContainer 
        center={[-29.8252, -50.5186]} // Santo Antônio da Patrulha - RS
        zoom={13} 
        style={{ height: '100%', width: '100%', borderRadius: '1rem', background: '#f8fafc', zIndex: 0 }}
      >
        <MapController markerRefs={markerRefs} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* ===== CAMADA 1: Manchas de Inundação Oficiais (GeoJSON) ===== */}
        {showFloodZones && (
          <GeoJSON 
            data={floodZonesGeoJSON as any} 
            style={geoJsonStyle}
            onEachFeature={(feature, layer) => {
              if (feature.properties && feature.properties.name) {
                layer.bindPopup(`<strong style="color: #0f172a">${feature.properties.name}</strong><br/><span style="color: #64748b">Risco Oficial: ${feature.properties.riskLevel}</span>`);
              }
            }}
          />
        )}

        {/* ===== CAMADA 1B: Mancha Dinâmica (IA / Ocorrências via Turf.js) ===== */}
        {showAutoFloodZones && dynamicFloodZones?.geoJson && (
          <GeoJSON 
            key={`dynamic-flood-zone-${dynamicFloodZones.lastUpdated}-${dynamicFloodZones.totalOccurrences}`}
            data={dynamicFloodZones.geoJson} 
            style={dynamicZoneStyle}
            onEachFeature={(feature, layer) => {
              const props = feature?.properties || {};
              layer.bindPopup(`
                <div style="min-width: 220px; font-family: system-ui, -apple-system, sans-serif; color: #0f172a; padding: 2px;">
                  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                    <span style="font-size: 16px;">🌊</span>
                    <strong style="color: #0284c7; font-size: 13px;">Mancha Dinâmica (IA)</strong>
                  </div>
                  <div style="font-size: 11px; color: #64748b; margin-bottom: 8px; line-height: 1.35;">
                    Polígono estimado automaticamente pela fusão contínua de chamados de alagamento da população.
                  </div>
                  <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 6px 10px; font-size: 11px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                      <span style="color: #0369a1;">Chamados fundidos:</span>
                      <strong style="color: #0c4a6e;">${props.occurrencesCount || 0} ocorrências</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #0369a1;">Área inundada estimada:</span>
                      <strong style="color: #0c4a6e;">~${props.estimatedAreaHectares || 0} ha</strong>
                    </div>
                  </div>
                </div>
              `);
            }}
          />
        )}

        {/* ===== CAMADA TÁTICA: Vetor de Despacho (Linha Ocorrência ↔ Equipe Recomendada) ===== */}
        {dispatchVector && (
          <Polyline
            positions={[dispatchVector.from, dispatchVector.to]}
            pathOptions={{
              color: '#38bdf8', // Cyan luminoso
              weight: 3.5,
              dashArray: '8, 8',
              opacity: 0.9,
            }}
          >
            <Popup className="dark-popup">
              <div className="text-xs font-bold text-white p-1">
                🚒 Vetor Tático: {dispatchVector.teamName} • {dispatchVector.distanceKm.toLocaleString('pt-BR')} km
              </div>
            </Popup>
          </Polyline>
        )}

        {/* ===== CAMADA 2: Abrigos (do Supabase, dinâmicos) ===== */}
        {showShelters && shelters.map(shelter => {
          if (!shelter.lat || !shelter.lng) return null;
          const shRes = showResources ? resourcesByShelter[shelter.id] : null;
          return (
            <Marker 
              key={`shelter-${shelter.id}`} 
              position={[shelter.lat, shelter.lng]} 
              icon={shelterIcon(shelter.type, shelter.occupied, shelter.capacity, shelter.status)}
            >
              <Popup className="dark-popup">
                <div className="min-w-[200px] bg-card text-foreground">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border ${
                      shelter.type === "pet" ? "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/20" :
                      shelter.type === "misto" ? "bg-amber-500/20 text-amber-400 border-amber-500/20" :
                      "bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                    }`}>
                      {shelter.type === "pet" ? "🐾 Pet" : shelter.type === "misto" ? "🏠🐾 Misto" : "🏠 Humano"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      shelter.status === "Aberto" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20" :
                      shelter.status === "Lotado" ? "bg-red-500/20 text-red-400 border-red-500/20" :
                      "bg-slate-500/20 text-slate-400 border-slate-500/20"
                    }`}>{shelter.status}</span>
                  </div>
                  <strong className="text-sm text-white block mb-0.5">{shelter.name}</strong>
                  {shelter.address && <span className="text-xs text-slate-400 block mb-2">{shelter.address}</span>}
                  
                  {/* Barra de ocupação */}
                  <div className="bg-white/5 p-2 rounded-lg border border-white/10 text-xs">
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-500">Ocupação:</span>
                      <strong className={shelter.capacity > 0 && shelter.occupied / shelter.capacity >= 0.85 ? 'text-red-400' : 'text-slate-300'}>
                        {shelter.occupied} / {shelter.capacity}
                      </strong>
                    </div>
                    <div className="w-full bg-white/10 rounded h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded ${
                          shelter.capacity > 0 && shelter.occupied / shelter.capacity >= 0.9 ? "bg-red-400" :
                          shelter.capacity > 0 && shelter.occupied / shelter.capacity >= 0.7 ? "bg-amber-400" :
                          "bg-emerald-400"
                        }`} 
                        style={{ width: `${shelter.capacity > 0 ? Math.min(100, (shelter.occupied / shelter.capacity) * 100) : 0}%` }} 
                      />
                    </div>
                    {shelter.phone && (
                      <div className="flex justify-between mt-1">
                        <span className="text-slate-500">Contato:</span>
                        <strong className="text-slate-300">{shelter.phone}</strong>
                      </div>
                    )}
                  </div>

                  {/* Recursos vinculados (só se camada ativa e houver dados) */}
                  {shRes && (
                    <div className="mt-2 p-2 rounded-lg border text-xs" style={{ background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.2)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-amber-300 font-bold flex items-center gap-1">📦 Estoque</span>
                        <span className="text-slate-300 font-bold">{shRes.total} itens</span>
                      </div>
                      {shRes.critical > 0 && (
                        <div className="mt-1 text-red-400 font-bold flex items-center gap-1">
                          ⚠️ {shRes.critical} item(ns) crítico(s)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* ===== CAMADA 3: Ocorrências (clusterizadas, ícones por tipo) ===== */}
        {showOccurrences && (
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={50}
            spiderfyOnMaxZoom={true}
          >
            {occurrences.map((occ) => {
              const coords = parseCoordinates(occ.location);
              if (!coords) return null;
              const { lat, lng } = coords;

            return (
              <Marker 
                position={[lat, lng]} 
                icon={occurrenceIcon(occ.type, occ.status)} 
                key={occ.id}
                ref={(m) => {
                  if (m) {
                    markerRefs.current[occ.id] = m;
                  }
                }}
                eventHandlers={{
                  click: () => {
                    if (onMarkerClick) {
                      onMarkerClick(occ);
                    }
                  }
                }}
              >
                {!onMarkerClick && (
                  <Popup className="dark-popup">
                    <div className="min-w-[180px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: getOccurrenceColor(occ.type) }}></span>
                        <strong className="text-white text-sm">{occ.type}</strong>
                      </div>
                      <span className="text-xs text-slate-400 block mb-1">
                        Reportado por: <b className="text-slate-300">{occ.reporter_name || 'Anônimo'}</b>
                      </span>
                      <span className="text-[10px] text-slate-500 block mb-2">
                        {new Date(occ.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})} • há {formatTimeAgo(occ.created_at)}
                      </span>
                      {occ.description && (
                        <div className="bg-white/5 border border-white/10 p-2 rounded-lg text-xs text-slate-300 mb-2">
                          {occ.description}
                        </div>
                      )}
                      <span className="text-xs text-slate-400 block mb-2">
                        Status: <span className="font-bold text-slate-200">{occ.status}</span>
                      </span>
                      {occ.photo_url && (
                        <div className="mt-2">
                          <a href={occ.photo_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-blue-400 text-xs font-semibold">
                            Ver Evidência
                          </a>
                        </div>
                      )}
                    </div>
                  </Popup>
                )}
              </Marker>
            );
          })}
          </MarkerClusterGroup>
        )}

        {/* ===== CAMADA 4: Equipes GPS (pontos pulsantes em tempo real) ===== */}
        {showTeams && liveTeams.map((pt, i) => {
          if (!Number.isFinite(pt.lat) || !Number.isFinite(pt.lng)) return null;
          return (
            <Marker
              key={`team-live-${pt.team_id}-${i}`}
              position={[pt.lat, pt.lng]}
              icon={teamGpsIcon(pt.organ)}
            >
              <Popup className="dark-popup">
                <div className="min-w-[170px]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: getOrganColor(pt.organ) }}></span>
                    <strong className="text-white block text-sm">{pt.team_name}</strong>
                  </div>
                  <span className="text-xs text-slate-400 block mb-1">{pt.organ}{pt.type ? ` • ${pt.type}` : ''}</span>
                  {pt.member_name && <span className="text-[11px] text-slate-400 block">Agente: {pt.member_name}</span>}
                  {pt.accuracy && <span className="text-[10px] text-slate-500 block mt-1">Precisão ±{Math.round(pt.accuracy)}m</span>}
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Atualizado {new Date(pt.sent_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* ===== PAINEL FLUTUANTE: Voluntários ===== */}
      {showVolunteers && volunteerSummary && volunteerSummary.total > 0 && (
        <div 
          className="absolute bottom-4 left-4 z-[400] glass-card rounded-xl p-3 max-w-[220px] shadow-2xl border border-white/10 backdrop-blur-xl"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
            <span className="text-sm">🤝</span>
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">Voluntários</span>
            <span className="ml-auto text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
              {volunteerSummary.available} ativos
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {volunteerSummary.bySpecialty.map((s) => (
              <div key={s.specialty} className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <span>{SPECIALTY_ICONS[s.specialty] || "👤"}</span>
                  {s.specialty}
                </span>
                <span className="text-white font-bold">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== BADGE FLUTUANTE: Mancha Dinâmica Ativa ===== */}
      {showAutoFloodZones && dynamicFloodZones && dynamicFloodZones.totalOccurrences > 0 && (
        <div 
          className="absolute top-4 right-4 z-[400] glass-card rounded-xl px-3 py-2 shadow-2xl border border-sky-500/30 backdrop-blur-xl bg-slate-900/90 text-white max-w-[240px] pointer-events-auto"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">Mancha Dinâmica (IA)</span>
          </div>
          <div className="text-[11px] text-slate-300">
            <span className="font-bold text-white">{dynamicFloodZones.totalOccurrences}</span> chamados ativos gerando <span className="font-bold text-sky-300">~{dynamicFloodZones.estimatedAreaHectares} ha</span> de área estimada.
          </div>
        </div>
      )}
    </>
  );
}
