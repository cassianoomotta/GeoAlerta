'use client';

import {MapContainer,TileLayer,CircleMarker,Marker,Popup,useMap,useMapEvents} from 'react-leaflet';
import {useEffect} from 'react';
import {divIcon} from 'leaflet';
import Link from 'next/link';
import {PriorityBadge,StatusBadge} from './OccurrenceBadges';
import type {Status} from '../contracts';
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

const highPriorityIcon=divIcon({className:'priority-map-marker',iconSize:[26,26],iconAnchor:[13,13],html:'<svg aria-hidden="true" viewBox="0 0 26 26" width="26" height="26"><path d="M13 2 24 23H2Z" fill="var(--danger)" stroke="var(--surface)" stroke-width="2" stroke-linejoin="round"/><path d="M13 9v6m0 3v1" stroke="var(--danger-foreground)" stroke-width="2" stroke-linecap="round"/></svg>'});

export default function CoreMapCanvas({view,onViewportChange,statusLabels}:{view:DashboardView;onViewportChange:(bounds:DashboardBounds)=>void;statusLabels:Record<Status,string>}){
  function popup(marker:DashboardView['markers'][number]){
    return <Popup><div className="space-y-3"><p className="font-medium">Ocorrência {marker.id.slice(0,8)}</p><div className="flex flex-wrap gap-2"><PriorityBadge priority={marker.priority}/><StatusBadge status={marker.status} label={statusLabels[marker.status]}/></div><Link href={`/painel/ocorrencias/${encodeURIComponent(marker.id)}`} className="text-primary underline">Abrir ocorrência</Link></div></Popup>;
  }
  return <div className="space-y-3">
    <div aria-label="Legenda de prioridades" className="flex flex-wrap gap-3 text-sm"><PriorityBadge priority="NORMAL"/><PriorityBadge priority="ALTA"/><Link href="/painel/ocorrencias" className="ml-auto text-primary underline">Ver ocorrências em lista</Link></div>
    <div className="h-[min(65vh,620px)] min-h-80 overflow-hidden rounded-xl border border-border">
    <MapContainer bounds={dashboardMapBounds(view.markers)} boundsOptions={{padding:[24,24]}} scrollWheelZoom className="h-full w-full">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ViewportListener onChange={onViewportChange}/>
      {view.markers.map(marker=>marker.priority==='ALTA'
        ?<Marker key={marker.id} position={[marker.latitude,marker.longitude]} icon={highPriorityIcon} title={`Ocorrência ${marker.id.slice(0,8)} · Prioridade alta`} alt="Prioridade alta">{popup(marker)}</Marker>
        :<CircleMarker key={marker.id} center={[marker.latitude,marker.longitude]} radius={7} pathOptions={{color:'var(--surface)',fillColor:'var(--info)',fillOpacity:1,weight:2}}>{popup(marker)}</CircleMarker>)}
    </MapContainer>
  </div></div>;
}
