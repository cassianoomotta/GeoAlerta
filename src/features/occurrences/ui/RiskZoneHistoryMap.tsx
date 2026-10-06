'use client';

import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { ZoneGeometry } from '../domain/risk-zones';

export type HistoricalZone = {
  zoneId: string;
  version: number;
  name: string;
  type: 'INUNDACAO' | 'RISCO';
  active: boolean;
  validFrom: string | null;
  validTo: string | null;
  geometry: ZoneGeometry;
};

export type ZoneSnapshot = { at: string; zones: HistoricalZone[] };

const snapshotColors = ['#38bdf8', '#fb923c'];
const defaultCenter: L.LatLngExpression = [-29.5, -50.5];

export default function RiskZoneHistoryMap({ snapshots }: { snapshots: ZoneSnapshot[] }) {
  const zones = useMemo(() => snapshots.flatMap((snapshot, snapshotIndex) => snapshot.zones.map((zone) => ({ zone, snapshotIndex }))), [snapshots]);
  const boundsZones = useMemo(() => zones.map(({ zone }) => zone), [zones]);
  return <section className="space-y-3" aria-label="Mapa comparativo das zonas históricas">
    <div className="h-[min(65vh,620px)] min-h-80 overflow-hidden rounded-xl border border-slate-700" role="img" aria-label="Mapa com as zonas efetivas nas duas datas selecionadas">
      <MapContainer center={defaultCenter} zoom={8} scrollWheelZoom className="h-full w-full">
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitZones zones={boundsZones} />
        {zones.map(({ zone, snapshotIndex }) => <GeoJSON
          key={`${snapshots[snapshotIndex]?.at}:${zone.zoneId}:${zone.version}`}
          data={zone.geometry as unknown as GeoJSON.GeoJsonObject}
          style={() => ({
            color: snapshotColors[snapshotIndex] ?? snapshotColors[0],
            weight: zone.type === 'INUNDACAO' ? 3 : 2,
            dashArray: zone.type === 'RISCO' ? '7 5' : undefined,
            fillOpacity: 0.25,
          })}
          onEachFeature={(_feature, layer) => layer.bindPopup(`<strong>${escapeHtml(zone.name)}</strong><br>${zone.type === 'INUNDACAO' ? 'Inundação' : 'Risco'} · versão ${zone.version}<br>${zone.active ? 'Ativa' : 'Inativa'}<br>${snapshotIndex === 0 ? 'Data base' : 'Data comparada'}: ${new Date(snapshots[snapshotIndex].at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`)}
        />)}
      </MapContainer>
    </div>
    <div role="group" className="grid gap-2 rounded border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-200 sm:grid-cols-2" aria-label="Legenda do mapa histórico">
      {snapshots.map((snapshot, index) => <p key={snapshot.at} className="flex items-center gap-2"><span aria-hidden="true" className="inline-block h-1 w-7 rounded" style={{ backgroundColor: snapshotColors[index] ?? snapshotColors[0] }} />{index === 0 ? 'Data base' : 'Data comparada'} · {new Date(snapshot.at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>)}
      <p className="flex items-center gap-2"><span aria-hidden="true" className="inline-block h-1 w-7 bg-slate-200" />Linha contínua: inundação · tracejada: risco</p>
      <p className="sm:col-span-2">Estado: aparecem somente zonas ativas e dentro da vigência; zonas inativas ou encerradas não entram no snapshot.</p>
      <p className="sm:col-span-2">Cada polígono mantém o nome, tipo, estado, versão e vigência no resumo ao selecioná-lo.</p>
    </div>
    {zones.length === 0 && <p className="text-sm text-slate-300">Nenhuma zona registrada em uma ou nas duas datas selecionadas.</p>}
  </section>;
}

function FitZones({ zones }: { zones: HistoricalZone[] }) {
  const map = useMap();
  useEffect(() => {
    const layer = L.featureGroup(zones.map((zone) => L.geoJSON(zone.geometry as unknown as GeoJSON.GeoJsonObject)));
    if (layer.getLayers().length) {
      const bounds = layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 13 });
    } else {
      map.setView(defaultCenter, 8);
    }
  }, [map, zones]);
  return null;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
}
