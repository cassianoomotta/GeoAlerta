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
      style={{ height: '100%', width: '100%', borderRadius: '1rem' }}
    >
      <MapController markerRefs={markerRefs} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {showFloodZones && (
        <GeoJSON 
          data={floodZonesGeoJSON as any} 
          style={geoJsonStyle}
          onEachFeature={(feature, layer) => {
            if (feature.properties && feature.properties.name) {
              layer.bindPopup(`<strong>${feature.properties.name}</strong><br/>Risco: ${feature.properties.riskLevel}`);
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
          <Popup>
            <div style={{ minWidth: '180px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                <span style={{ background: '#dcfce7', color: '#166534', padding: '0.2rem 0.5rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 600 }}>Abrigo Oficial</span>
              </div>
              <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{shelter.name}</strong><br/>
              <span style={{ fontSize: '0.8rem', color: '#475569', display: 'block', marginBottom: '0.5rem' }}>{shelter.address}</span>
              <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <span style={{ color: '#64748b' }}>Ocupação:</span>
                  <strong style={{ color: shelter.occupied >= shelter.capacity ? '#ef4444' : '#0f172a' }}>{shelter.occupied} / {shelter.capacity}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Contato:</span>
                  <strong>{shelter.phone}</strong>
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
              )}
            </Marker>
          );
        })}
        </MarkerClusterGroup>
      )}
    </MapContainer>
  );
}
