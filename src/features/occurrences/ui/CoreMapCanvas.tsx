'use client';

import {MapContainer,TileLayer,Marker,Popup,useMap,useMapEvents} from 'react-leaflet';
import {useEffect} from 'react';
import {divIcon,type DivIcon} from 'leaflet';
import Link from 'next/link';
import {PriorityBadge,StatusBadge} from './OccurrenceBadges';
import type {Status} from '../contracts';
import type {DashboardView} from '../contracts';
import {dashboardMapBounds,type DashboardBounds} from '../domain/dashboard-map';
import {resizeDashboardMapViewport} from './map-viewport';
import {mapStatusAppearance,occurrenceMarkerHtml,occurrenceTypeIcon} from '../domain/map-presentation';

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

const markerIcons=new Map<string,DivIcon>();
function markerIcon(marker:DashboardView['markers'][number]){
  const key=`${occurrenceTypeIcon(marker.type)}:${marker.status}:${marker.priority}`;
  if(!markerIcons.has(key))markerIcons.set(key,divIcon({
    className:'occurrence-map-icon',iconSize:[34,34],iconAnchor:[17,17],popupAnchor:[0,-19],
    html:occurrenceMarkerHtml(marker.type,marker.status,marker.priority),
  }));
  return markerIcons.get(key)!;
}

export default function CoreMapCanvas({view,onViewportChange,statusLabels}:{view:DashboardView;onViewportChange:(bounds:DashboardBounds)=>void;statusLabels:Record<Status,string>}){
  function popup(marker:DashboardView['markers'][number]){
    return <Popup><div className="space-y-3"><p className="font-medium">Ocorrência {marker.protocol}</p><p className="text-sm">{marker.type}</p><div className="flex flex-wrap gap-2"><PriorityBadge priority={marker.priority}/><StatusBadge status={marker.status} label={statusLabels[marker.status]}/></div><Link href={`/painel/ocorrencias/${encodeURIComponent(marker.id)}`} className="text-primary underline">Abrir ocorrência</Link></div></Popup>;
  }
  return <div className="space-y-3">
    <div aria-label="Legenda do mapa" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      {(Object.keys(mapStatusAppearance) as Status[]).map(status=><span key={status} className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-3 w-3 rounded-full" style={{backgroundColor:mapStatusAppearance[status].color}}/>{statusLabels[status]}</span>)}
      <PriorityBadge priority="ALTA"/>
    </div>
    <div className="h-[min(65vh,620px)] min-h-80 overflow-hidden rounded-xl border border-border">
    <MapContainer bounds={dashboardMapBounds(view.markers)} boundsOptions={{padding:[24,24]}} scrollWheelZoom className="h-full w-full">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ViewportListener onChange={onViewportChange}/>
      {view.markers.map(marker=><Marker key={marker.id} position={[marker.latitude,marker.longitude]} icon={markerIcon(marker)}
        title={`Ocorrência ${marker.protocol} · ${marker.type} · ${statusLabels[marker.status]} · Prioridade ${marker.priority==='ALTA'?'alta':'normal'}`}
        alt={`Ocorrência ${marker.protocol}: ${marker.type}, ${statusLabels[marker.status]}, prioridade ${marker.priority==='ALTA'?'alta':'normal'}`}>
        {popup(marker)}
      </Marker>)}
    </MapContainer>
  </div></div>;
}
