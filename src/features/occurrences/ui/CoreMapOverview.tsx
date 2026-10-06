'use client';

import dynamic from 'next/dynamic';
import {useCallback,useEffect,useState} from 'react';
import type {DashboardView} from '../contracts';
import type {DashboardBounds,DashboardMapQuery} from '../domain/dashboard-map';

const CoreMapCanvas=dynamic(()=>import('./CoreMapCanvas'),{ssr:false,loading:()=> <div className="h-80 animate-pulse rounded-xl bg-slate-800"/>});
type Bounds=DashboardBounds;
type DashboardResponse=DashboardView&{window:DashboardMapQuery};
type CoreMapOverviewProps={showMap?:boolean};
const statusNames:Record<keyof DashboardView['counts']['byStatus'],string>={NOVA:'Novas',EM_TRIAGEM:'Em triagem',EM_ATENDIMENTO:'Em atendimento',RESOLVIDA:'Resolvidas',CANCELADA:'Canceladas'};
type StatusPresentation={code:keyof DashboardView['counts']['byStatus'];label:string;displayOrder:number};

export function CoreMapOverview({showMap=true}:CoreMapOverviewProps){
  const [view,setView]=useState<DashboardResponse|null>(null);
  const [bounds,setBounds]=useState<Bounds|null>(null);
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [refreshKey,setRefreshKey]=useState(0);
  const [presentations,setPresentations]=useState<StatusPresentation[]>(Object.entries(statusNames).map(([code,label],index)=>({code:code as StatusPresentation['code'],label,displayOrder:index+1})));
  const onViewportChange=useCallback((next:Bounds)=>setBounds(current=>current&&Object.keys(next).every(key=>current[key as keyof Bounds]===next[key as keyof Bounds])?current:next),[]);

  useEffect(()=>{let mounted=true;void fetch('/api/core/status-presentations',{cache:'no-store'}).then(response=>response.ok?response.json():Promise.reject()).then((body:{items:StatusPresentation[]})=>{if(mounted)setPresentations(body.items)}).catch(()=>{});return()=>{mounted=false}},[]);

  useEffect(()=>{
    const refreshIfVisible=()=>{if(document.visibilityState==='visible')setRefreshKey(value=>value+1);};
    const interval=setInterval(refreshIfVisible,15_000);
    document.addEventListener('visibilitychange',refreshIfVisible);
    return()=>{clearInterval(interval);document.removeEventListener('visibilitychange',refreshIfVisible);};
  },[]);

  useEffect(()=>{
    const controller=new AbortController();
    const params=new URLSearchParams();
    if(bounds)for(const [key,value]of Object.entries(bounds))params.set(key,String(value));
    if(from)params.set('from',from);
    if(to)params.set('to',to);
    fetch(`/api/core/dashboard${params.size?`?${params}`:''}`,{cache:'no-store',signal:controller.signal})
      .then(async response=>{
        const body=await response.json() as DashboardResponse|{error?:{message?:string}};
        if(!response.ok)throw new Error('error'in body?body.error?.message??'Não foi possível consultar o mapa.':'Não foi possível consultar o mapa.');
        setView(body as DashboardResponse);setError('');
      })
      .catch(cause=>{if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:'Falha de comunicação ao consultar o mapa.');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[bounds,from,to,refreshKey]);

  return <section className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-slate-100" aria-labelledby={showMap?'core-map-title':'core-indicators-title'}>
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 id={showMap?'core-map-title':'core-indicators-title'} className="text-xl font-bold">{showMap?'Mapa de ocorrências':'Indicadores de ocorrências'}</h2><p className="text-sm text-slate-300">{showMap?'Ajuste o período e mova o mapa para delimitar a consulta.':'Consulte os totais das ocorrências no período selecionado.'}</p></div>
      <div className="flex gap-3">
        <label className="text-xs text-slate-300">De<input aria-label="Data inicial do mapa" className="mt-1 block rounded bg-slate-800 p-2" type="date" value={from} onChange={event=>setFrom(event.target.value)}/></label>
        <label className="text-xs text-slate-300">Até<input aria-label="Data final do mapa" className="mt-1 block rounded bg-slate-800 p-2" type="date" value={to} onChange={event=>setTo(event.target.value)}/></label>
      </div>
    </header>
    {error&&<p role="alert" className="rounded border border-red-400/40 bg-red-950/50 p-3 text-sm">{error}</p>}
    {loading&&!view&&<p role="status">{showMap?'Carregando mapa e contagens…':'Carregando indicadores…'}</p>}
    {view&&<>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {[...presentations].sort((a,b)=>a.displayOrder-b.displayOrder).map(({code,label})=><div key={code} className="rounded-lg bg-slate-800 p-3"><p className="text-xs text-slate-300">{label}</p><p className="text-lg font-bold">{view.counts.byStatus[code]}</p></div>)}
        <div className="rounded-lg bg-slate-800 p-3"><p className="text-xs text-slate-300">Prioridade alta</p><p className="text-lg font-bold">{view.counts.byPriority.ALTA}</p></div>
        <div className="rounded-lg bg-slate-800 p-3"><p className="text-xs text-slate-300">Prioridade normal</p><p className="text-lg font-bold">{view.counts.byPriority.NORMAL}</p></div>
      </div>
      {showMap&&view.limited&&<p role="status" className="rounded border border-amber-400/40 bg-amber-950/40 p-3 text-sm text-amber-100">Mais de 1.000 ocorrências neste recorte. O mapa limita os marcadores; as contagens incluem todas as ocorrências do período e da área.</p>}
      {view.markers.length===0&&<p role="status" className="rounded border border-slate-700 bg-slate-800/60 p-3 text-sm text-slate-300">Nenhuma ocorrência encontrada no recorte consultado.</p>}
      {showMap&&<CoreMapCanvas view={view} onViewportChange={onViewportChange}/>}
      {showMap&&<p className="text-xs text-slate-400">{view.markers.length} marcadores visíveis · {view.window.from&&view.window.to?`período ${new Date(view.window.from).toLocaleDateString('pt-BR')}–${new Date(view.window.to).toLocaleDateString('pt-BR')}`:'todo o histórico'}</p>}
    </>}
  </section>;
}
