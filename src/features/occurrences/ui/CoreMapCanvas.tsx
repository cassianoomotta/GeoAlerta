'use client';

import {MapContainer,TileLayer,CircleMarker,Popup,useMapEvents} from 'react-leaflet';
import type {DashboardView} from '../contracts';
import type {DashboardMapQuery} from '../domain/dashboard-map';

function ViewportListener({onChange}:{onChange:(bounds:Pick<DashboardMapQuery,'west'|'south'|'east'|'north'>)=>void}){
  useMapEvents({moveend(event){
    const bounds=event.target.getBounds();
    onChange({west:bounds.getWest(),south:bounds.getSouth(),east:bounds.getEast(),north:bounds.getNorth()});
  }});
  return null;
}

export default function CoreMapCanvas({view,onViewportChange}:{view:DashboardView;onViewportChange:(bounds:Pick<DashboardMapQuery,'west'|'south'|'east'|'north'>)=>void}){
  return <div className="h-[min(65vh,620px)] min-h-80 overflow-hidden rounded-xl border border-slate-700">
    <MapContainer center={[-29.8285,-50.5192]} zoom={12} scrollWheelZoom className="h-full w-full">
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ViewportListener onChange={onViewportChange}/>
      {view.markers.map(marker=><CircleMarker key={marker.id} center={[marker.latitude,marker.longitude]} radius={7} pathOptions={{color:marker.priority==='ALTA'?'#ef4444':'#2563eb',fillOpacity:0.8}}>
        <Popup>Ocorrência {marker.id.slice(0,8)} · {marker.status} · Prioridade {marker.priority}</Popup>
      </CircleMarker>)}
    </MapContainer>
  </div>;
}
