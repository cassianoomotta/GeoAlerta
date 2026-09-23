"use client";

import { useState, useEffect, useCallback } from "react";
import { useMap, useMapEvents, Polyline, Polygon, CircleMarker, Tooltip } from "react-leaflet";
import L from "leaflet";
import { Undo2, Check, X, AlertTriangle } from "lucide-react";

export interface RiskZone {
  id: string;
  name: string;
  description?: string | null;
  risk_level: string;
  color: string;
  coordinates: [number, number][];
  geojson: any;
  municipio?: string;
  created_at?: string;
}

interface MapDrawingToolProps {
  isActive: boolean;
  color?: string;
  onComplete: (points: [number, number][]) => void;
  onCancel: () => void;
}

export default function MapDrawingTool({
  isActive,
  color = "#ef4444",
  onComplete,
  onCancel,
}: MapDrawingToolProps) {
  const map = useMap();
  const [points, setPoints] = useState<[number, number][]>([]);
  const [mousePos, setMousePos] = useState<[number, number] | null>(null);

  // Limpar pontos ao desativar
  useEffect(() => {
    if (!isActive) {
      setPoints([]);
      setMousePos(null);
    }
  }, [isActive]);

  // Modificar cursor e desativar double-click zoom durante o desenho
  useEffect(() => {
    const container = map.getContainer();
    if (isActive) {
      container.style.cursor = "crosshair";
      map.doubleClickZoom.disable();
    } else {
      container.style.cursor = "";
      map.doubleClickZoom.enable();
    }
    return () => {
      container.style.cursor = "";
      map.doubleClickZoom.enable();
    };
  }, [isActive, map]);

  // Ações de controle
  const handleUndo = useCallback(() => {
    setPoints((prev) => prev.slice(0, -1));
  }, []);

  const handleFinish = useCallback(() => {
    if (points.length >= 3) {
      onComplete(points);
      setPoints([]);
      setMousePos(null);
    }
  }, [points, onComplete]);

  const handleCancel = useCallback(() => {
    setPoints([]);
    setMousePos(null);
    onCancel();
  }, [onCancel]);

  // Teclas de atalho: Esc (cancelar), Backspace / Ctrl+Z (desfazer), Enter (concluir)
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancel();
      } else if (e.key === "Backspace" || (e.ctrlKey && e.key.toLowerCase() === "z")) {
        e.preventDefault();
        handleUndo();
      } else if (e.key === "Enter" && points.length >= 3) {
        e.preventDefault();
        handleFinish();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, points.length, handleCancel, handleUndo, handleFinish]);

  // Eventos de clique e movimento no mapa
  useMapEvents({
    click(e) {
      if (!isActive) return;
      const newPoint: [number, number] = [e.latlng.lat, e.latlng.lng];
      setPoints((prev) => [...prev, newPoint]);
    },
    mousemove(e) {
      if (!isActive) return;
      setMousePos([e.latlng.lat, e.latlng.lng]);
    },
  });

  if (!isActive) return null;

  // Pré-visualização do polígono fechando com o mouse
  const previewPolygonCoords: [number, number][] =
    mousePos && points.length >= 2 ? [...points, mousePos] : points;

  return (
    <>
      {/* 1. Polígono provisório transparente */}
      {previewPolygonCoords.length >= 3 && (
        <Polygon
          positions={previewPolygonCoords}
          pathOptions={{
            color: color,
            fillColor: color,
            fillOpacity: 0.25,
            weight: 2,
            dashArray: "6, 6",
          }}
        />
      )}

      {/* 2. Linhas conectando os pontos já fixados */}
      {points.length >= 2 && (
        <Polyline
          positions={points}
          pathOptions={{
            color: color,
            weight: 3,
            opacity: 0.9,
          }}
        />
      )}

      {/* 3. Linha elástica guia (rubberband) até o mouse atual */}
      {points.length >= 1 && mousePos && (
        <Polyline
          positions={[points[points.length - 1], mousePos]}
          pathOptions={{
            color: color,
            weight: 2,
            dashArray: "4, 6",
            opacity: 0.7,
          }}
        />
      )}

      {/* 4. Vértices marcados */}
      {points.map((pt, idx) => {
        const isFirst = idx === 0;
        const canClose = isFirst && points.length >= 3;

        return (
          <CircleMarker
            key={`draw-vertex-${idx}`}
            center={pt}
            radius={isFirst ? 8 : 6}
            pathOptions={{
              color: isFirst ? (canClose ? "#10b981" : "#ffffff") : "#ffffff",
              fillColor: isFirst ? (canClose ? "#10b981" : color) : color,
              fillOpacity: 1,
              weight: isFirst ? 3 : 2,
            }}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e as any);
                if (canClose) {
                  handleFinish();
                }
              },
            }}
          >
            {isFirst && (
              <Tooltip
                permanent={canClose}
                direction="top"
                offset={[0, -10]}
                className="tactical-tooltip"
              >
                <span className="text-[10px] font-bold">
                  {canClose ? "🎯 Clique aqui para fechar a área" : "Ponto inicial"}
                </span>
              </Tooltip>
            )}
          </CircleMarker>
        );
      })}

      {/* 5. HUD Flutuante no topo do mapa com controles ergonômicos */}
      <div
        className="leaflet-top leaflet-center"
        style={{
          position: "absolute",
          top: "16px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          pointerEvents: "auto",
        }}
      >
        <div className="bg-slate-900/95 border border-red-500/50 backdrop-blur-xl shadow-2xl px-4 py-2.5 rounded-2xl flex items-center gap-3 text-white animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-red-400 flex items-center gap-1.5">
              <AlertTriangle size={14} /> Mapeamento de Risco
            </span>
          </div>

          <div className="h-4 w-px bg-white/20" />

          <span className="text-xs text-slate-300 font-medium">
            {points.length === 0 ? (
              "Clique no mapa para marcar o primeiro ponto"
            ) : points.length < 3 ? (
              <>
                <strong className="text-white">{points.length}</strong> ponto(s) • Marque pelo menos 3
              </>
            ) : (
              <>
                <strong className="text-emerald-400 font-bold">{points.length}</strong> pontos • Pronto para fechar
              </>
            )}
          </span>

          <div className="flex items-center gap-1.5 ml-2">
            {points.length > 0 && (
              <button
                type="button"
                onClick={handleUndo}
                title="Desfazer último ponto (Ctrl+Z ou Backspace)"
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Undo2 size={13} />
                <span className="hidden sm:inline">Desfazer</span>
              </button>
            )}

            {points.length >= 3 && (
              <button
                type="button"
                onClick={handleFinish}
                title="Concluir e salvar polígono (Enter)"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(16,185,129,0.4)] flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={14} />
                <span>Concluir Área</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCancel}
              title="Cancelar delimitação (Esc)"
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
