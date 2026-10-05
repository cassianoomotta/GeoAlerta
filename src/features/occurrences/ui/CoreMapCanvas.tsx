'use client';

import {MapContainer,TileLayer,CircleMarker,Popup,useMap,useMapEvents} from 'react-leaflet';
import {useEffect} from 'react';
import type {DashboardView} from '../contracts';
import {dashboardMapBounds,type DashboardBounds} from '../domain/dashboard-map';
import {resizeDashboardMapViewport} from './map-viewport';

function ViewportListener({onChange}:{onChange:(bounds:DashboardBounds)=>void}){
  const map=useMap();
  useMapEvents({moveend(event){
    const bounds=event.target.getBounds();
    onChange({west:bounds.getWest(),south:bounds.getSouth(),east:bounds.getEast(),north:bounds.getNorth()});
  }});
  useEffect(()=>{
    const container=map.getContainer();
    const sync=()=>resizeDashboardMapViewport(map,onChange);
    const observer=new ResizeObserver(sync);
    observer.observe(container);
    const frame=requestAnimationFrame(sync);
    return()=>{observer.disconnect();cancelAnimationFrame(frame);};
  },[map,onChange]);
  return null;
}

export default function CoreMapCanvas({view,onViewportChange}:{view:DashboardView;onViewportChange:(bounds:DashboardBounds)=>void}){
  return <div className="h-[min(65vh,620px)] min-h-80 overflow-hidden rounded-xl border border-slate-700">
    <MapContainer bounds={dashboardMapBounds(view.markers)} boundsOptions={{padding:[24,24]}} scrollWheelZoom className="h-full w-full">
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ViewportListener onChange={onViewportChange}/>
      {view.markers.map(marker=><CircleMarker key={marker.id} center={[marker.latitude,marker.longitude]} radius={7} pathOptions={{color:marker.priority==='ALTA'?'#ef4444':'#2563eb',fillOpacity:0.8}}>
        <Popup>Ocorrência {marker.id.slice(0,8)} · {marker.status} · Prioridade {marker.priority}</Popup>
      </CircleMarker>)}
    </MapContainer>
  </div>;
}
