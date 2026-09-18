"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

export interface LivePoint { team_id: string; team_name: string; lat: number; lng: number; accuracy: number | null; sent_at: string; member_name?: string; }
export interface TeamForMap { id: string; name: string; organ: string; type: string; status: string; }

export function TeamMap({ teams, live }: { teams: TeamForMap[]; live: LivePoint[] }) {
  const mapRef = useRef<L.Map | null>(null);

  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]));

  // fit dos pontos ao vivo
  const points = live.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  useEffect(() => {
    if (points.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
      mapRef.current.fitBounds(bounds.pad(0.3));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.length]);

  const liveIcon = (color: string) => L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;background:${color};border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px ${color}44,0 0 12px ${color}99;animation:pulse 1.5s infinite"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

  const organColor = (organ: string) =>
    organ === "Bombeiros" ? "#ef4444" : organ === "Obras" ? "#3b82f6" : organ === "Saúde" ? "#10b981" : organ === "Assistência Social" ? "#d946ef" : "#f59e0b";

  return (
    <MapContainer
      center={[-29.8252, -50.5186]}
      zoom={13}
      ref={mapRef}
      style={{ height: "100%", width: "100%" }}
    >
      <style>{`@keyframes pulse{0%{transform:scale(1)}50%{transform:scale(1.35)}100%{transform:scale(1)}}`}</style>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {points.map((p, i) => {
        const t = teamById[p.team_id];
        const color = t ? organColor(t.organ) : "#22d3ee";
        return (
          <Marker key={`${p.team_id}-${i}`} position={[p.lat, p.lng]} icon={liveIcon(color)}>
            <Popup className="dark-popup">
              <div className="min-w-[170px]">
                <strong className="text-white block text-sm">{p.team_name}</strong>
                {t && <span className="text-xs text-slate-400 block mb-1">{t.organ} • {t.type}</span>}
                {p.member_name && <span className="text-[11px] text-slate-400 block">Agente: {p.member_name}</span>}
                {p.accuracy && <span className="text-[10px] text-slate-500 block mt-1">Precisão ±{Math.round(p.accuracy)}m</span>}
                <span className="text-[10px] text-slate-500 block mt-1">Atualizado {new Date(p.sent_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}