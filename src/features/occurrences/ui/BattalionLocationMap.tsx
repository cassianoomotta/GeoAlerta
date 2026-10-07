'use client';

import { divIcon, type DivIcon } from 'leaflet';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import { BATTALION_MAP_DEFAULT_CENTER, BATTALION_MAP_DEFAULT_ZOOM } from '../domain/battalion-map';

export type BattalionMapPoint = { latitude: number; longitude: number };

const battalionMarkerIcon: DivIcon = divIcon({
  className: 'occurrence-map-icon',
  iconSize: [36, 44],
  iconAnchor: [18, 42],
  html: '<svg aria-hidden="true" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg"><path d="M18 42s14-15 14-26A14 14 0 1 0 4 16c0 11 14 26 14 26Z" fill="#087f8c" stroke="white" stroke-width="3"/><circle cx="18" cy="16" r="5" fill="white"/></svg>',
});

function SelectPoint({ onChange }: { onChange(point: BattalionMapPoint): void }) {
  useMapEvents({
    click(event) {
      onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

export default function BattalionLocationMap({
  point,
  onChange,
}: {
  point: BattalionMapPoint | null;
  onChange(point: BattalionMapPoint): void;
}) {
  const center: LatLngExpression = point ? [point.latitude, point.longitude] : BATTALION_MAP_DEFAULT_CENTER;
  return (
    <div className="h-72 overflow-hidden rounded-xl border border-control-border sm:h-96">
      <MapContainer center={center} zoom={BATTALION_MAP_DEFAULT_ZOOM} scrollWheelZoom className="h-full w-full">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <SelectPoint onChange={onChange} />
        {point && <Marker
          position={[point.latitude, point.longitude]}
          icon={battalionMarkerIcon}
          title="Ponto da ocorrência"
          alt="Marcador do ponto da ocorrência"
          draggable
          eventHandlers={{ dragend(event) {
            const marker = event.target;
            const next = marker.getLatLng();
            onChange({ latitude: next.lat, longitude: next.lng });
          } }}
        />}
      </MapContainer>
    </div>
  );
}
