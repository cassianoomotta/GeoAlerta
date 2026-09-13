"use client";

import { useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { floodZonesGeoJSON, shelters } from '@/data/geo';

// Pino Vermelho (Ocorrências)
const icon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Pino Verde (Abrigos)
const shelterIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

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

export default function MapComponent({ 
  occurrences, 
  onMarkerClick,
  showOccurrences = true,
  showFloodZones = true,
  showShelters = true
}: { 
  occurrences: any[], 
  onMarkerClick?: (occ: any) => void,
  showOccurrences?: boolean,
  showFloodZones?: boolean,
  showShelters?: boolean
}) {
  const markerRefs = useRef<{[key: string]: L.Marker}>({});

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
  
  return (
    <MapContainer 
      center={[-29.8252, -50.5186]} // Santo Antônio da Patrulha - RS
      zoom={13} 
      style={{ height: '100%', width: '100%', borderRadius: '1rem', background: '#0f172a' }}
    >
      <MapController markerRefs={markerRefs} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="dark-map-tiles"
      />
      
      {showFloodZones && (
        <GeoJSON 
          data={floodZonesGeoJSON as any} 
          style={geoJsonStyle}
          onEachFeature={(feature, layer) => {
            if (feature.properties && feature.properties.name) {
              layer.bindPopup(`<strong style="color: #0f172a">${feature.properties.name}</strong><br/><span style="color: #64748b">Risco: ${feature.properties.riskLevel}</span>`);
            }
          }}
        />
      )}

      {showShelters && shelters.map(shelter => (
        <Marker 
          key={`shelter-${shelter.id}`} 
          position={[shelter.lat, shelter.lng]} 
          icon={shelterIcon}
        >
          <Popup className="dark-popup">
            <div className="min-w-[180px] bg-card text-foreground">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border border-emerald-500/20">Abrigo Oficial</span>
              </div>
              <strong className="text-sm text-white block mb-0.5">{shelter.name}</strong>
              <span className="text-xs text-slate-400 block mb-2">{shelter.address}</span>
              <div className="bg-white/5 p-2 rounded-lg border border-white/10 text-xs">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-500">Ocupação:</span>
                  <strong className={shelter.occupied >= shelter.capacity ? 'text-red-400' : 'text-slate-300'}>{shelter.occupied} / {shelter.capacity}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Contato:</span>
                  <strong className="text-slate-300">{shelter.phone}</strong>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {showOccurrences && (
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={50} // Radius in pixels to group markers
          spiderfyOnMaxZoom={true} // Spreads markers out in a spider leg shape when fully zoomed in
        >
          {occurrences.map((occ) => {
            // Extrair Lat/Long do formato "POINT(lon lat)" do PostGIS
          if (!occ.location) return null;
          
          let lat = 0;
          let lng = 0;
          
          try {
            if (typeof occ.location === 'string') {
              // Verifica se é uma string Hex do PostGIS (WKB) (geralmente 50 chars para POINT)
              if (occ.location.length === 50 && occ.location.startsWith('0101')) {
                // Hex para Uint8Array
                const bytes = new Uint8Array(occ.location.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
                const view = new DataView(bytes.buffer);
                const isLittleEndian = bytes[0] === 1;
                lng = view.getFloat64(9, isLittleEndian);
                lat = view.getFloat64(17, isLittleEndian);
              } else {
                // Verifica se é string WKT "POINT(lon lat)"
                const match = occ.location.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
                if (match) {
                  lng = parseFloat(match[1]);
                  lat = parseFloat(match[2]);
                }
              }
            } else if (occ.location && occ.location.coordinates) {
               lng = occ.location.coordinates[0];
               lat = occ.location.coordinates[1];
            }
          } catch(e) { 
            console.error("Erro ao ler location:", e);
            return null; 
          }

          if (!lat || !lng) return null;

          return (
            <Marker 
              position={[lat, lng]} 
              icon={icon} 
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
                  <strong className="text-white block mb-1 text-sm">{occ.type}</strong>
                  <span className="text-xs text-slate-400 block mb-1">
                    Reportado por: <b className="text-slate-300">{occ.reporter_name || 'Anônimo'}</b>
                  </span>
                  <span className="text-[10px] text-slate-500 block mb-2">
                    {new Date(occ.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
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
                </Popup>
              )}
            </Marker>
          );
        })}
        </MarkerClusterGroup>
      )}
    </MapContainer>
  );
}
