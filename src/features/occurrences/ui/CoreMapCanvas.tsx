'use client';

import Link from 'next/link';
import MarkerClusterGroup from 'react-leaflet-cluster';
import {MapContainer,TileLayer,Marker,Popup,useMap,useMapEvents} from 'react-leaflet';
import {useEffect} from 'react';
import {occurrenceIcon} from '@/lib/mapIcons';
import type {DashboardView,Status} from '../contracts';
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

export default function CoreMapCanvas({view,onViewportChange,statusLabels}:{
  view:DashboardView;
  onViewportChange:(bounds:DashboardBounds)=>void;
  statusLabels:Partial<Record<Status,string>>;
}){
  return <div className="h-[min(65vh,620px)] min-h-80 overflow-hidden rounded-xl border border-slate-700">
    <MapContainer bounds={dashboardMapBounds(view.markers)} boundsOptions={{padding:[24,24]}} scrollWheelZoom className="h-full w-full">
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ViewportListener onChange={onViewportChange}/>
      <MarkerClusterGroup chunkedLoading maxClusterRadius={25} spiderfyOnMaxZoom disableClusteringAtZoom={12} spiderfyDistanceMultiplier={2.5}>
        {view.markers.map(marker=>{
          const statusLabel=statusLabels[marker.status]??marker.status;
          const markerLabel=`${marker.type||'Tipo não informado'} · ${statusLabel} · ${marker.state==='open'?'Aberta':'Fechada'} · Prioridade ${marker.priority==='ALTA'?'alta':'normal'}`;
          return <Marker key={marker.id} position={[marker.latitude,marker.longitude]} icon={occurrenceIcon(marker.type,marker.state==='open'?'Aberto':'Resolvido')} title={markerLabel} alt={markerLabel}>
            <Popup>
              <div className="min-w-44 space-y-1 text-slate-900">
                <h3 className="font-semibold">{marker.type||'Tipo não informado'}</h3>
                <p>Status: {statusLabel} · {marker.state==='open'?'Aberta':'Fechada'}</p>
                <p>Prioridade: {marker.priority==='ALTA'?'Alta':'Normal'}</p>
                <Link className="mt-2 inline-block font-semibold text-blue-700 underline" href={`/painel/ocorrencias/${encodeURIComponent(marker.id)}`}>Ver detalhes da ocorrência</Link>
              </div>
            </Popup>
          </Marker>;
        })}
      </MarkerClusterGroup>
    </MapContainer>
  </div>;
}