"use client";

import { useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Pino Vermelho
const icon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
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

export default function MapComponent({ occurrences }: { occurrences: any[] }) {
  const markerRefs = useRef<{[key: string]: L.Marker}>({});

  
  return (
    <MapContainer 
      center={[-29.8252, -50.5186]} // Santo Antônio da Patrulha - RS
      zoom={13} 
      style={{ height: '100%', width: '100%', borderRadius: '1rem' }}
    >
      <MapController markerRefs={markerRefs} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
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
          >
            <Popup>
              <strong>{occ.type}</strong><br/>
              <span style={{ fontSize: '0.85rem' }}>
                Reportado por: <b>{occ.reporter_name || 'Anônimo'}</b>
              </span><br/>
              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                {new Date(occ.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
              </span><br/>
              {occ.description && <span><br/>{occ.description}<br/></span>}
              <span style={{ fontSize: '0.8rem', color: '#666', display: 'block', marginTop: '0.5rem' }}>
                Status: {occ.status}
              </span>
              {occ.photo_url && (
                <div style={{ marginTop: '0.5rem' }}>
                  <a href={occ.photo_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
                    Ver Foto
                  </a>
                </div>
              )}
            </Popup>
          </Marker>
        );
      })}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
