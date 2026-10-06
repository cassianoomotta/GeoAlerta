'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {Check,ChevronDown,Eye,EyeOff,Search,TriangleAlert} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {STATUSES,type DashboardView,type Priority,type Status} from '../contracts';
import type {DashboardBounds,DashboardMapQuery} from '../domain/dashboard-map';
import {mapStatusAppearance,occurrenceTypeIcon,typeIconPaths} from '../domain/map-presentation';

const CoreMapCanvas=dynamic(()=>import('./CoreMapCanvas'),{ssr:false,loading:()=> <div className="h-80 rounded-xl bg-surface-subtle"/>});
type DashboardResponse=DashboardView&{window:DashboardMapQuery};
type StatusPresentation={code:Status;label:string;displayOrder:number};
const statusNames:Record<Status,string>={NOVA:'Novas',EM_TRIAGEM:'Em triagem',EM_ATENDIMENTO:'Em atendimento',RESOLVIDA:'Resolvidas',CANCELADA:'Canceladas'};
const priorities:Priority[]=['ALTA','NORMAL'];
const toggle=<T,>(values:T[],value:T)=>values.includes(value)?values.filter(item=>item!==value):[...values,value];

function TypeIcon({type}:{type:string}){
  return <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={typeIconPaths[occurrenceTypeIcon(type)]}/></svg>;
}

export function CoreMapOverview({showMap=true}:{showMap?:boolean}){
  const [view,setView]=useState<DashboardResponse|null>(null);
  const [bounds,setBounds]=useState<DashboardBounds|null>(null);
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [refreshKey,setRefreshKey]=useState(0);
  const [selectedStatuses,setSelectedStatuses]=useState<Status[]>([...STATUSES]);
  const [selectedPriorities,setSelectedPriorities]=useState<Priority[]>([...priorities]);
  // null follows all available types, including types introduced by new records.
  const [selectedTypes,setSelectedTypes]=useState<string[]|null>(null);
  const [typesOpen,setTypesOpen]=useState(false);
  const [typeSearch,setTypeSearch]=useState('');
  const [presentations,setPresentations]=useState<StatusPresentation[]>(Object.entries(statusNames).map(([code,label],index)=>({code:code as Status,label,displayOrder:index+1})));
  const onViewportChange=useCallback((next:DashboardBounds)=>setBounds(current=>current&&Object.keys(next).every(key=>current[key as keyof DashboardBounds]===next[key as keyof DashboardBounds])?current:next),[]);
  const allHidden=selectedStatuses.length===0||selectedPriorities.length===0||selectedTypes?.length===0;
  const availableTypes=useMemo(()=>[...new Set([...(view?.availableTypes??[]),...(selectedTypes??[])])].sort((a,b)=>a.localeCompare(b,'pt-BR')),[view?.availableTypes,selectedTypes]);
  const searchedTypes=availableTypes.filter(type=>type.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(typeSearch.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'')));
  const visibleMarkers=useMemo(()=>view?.markers.filter(marker=>selectedStatuses.includes(marker.status)&&selectedPriorities.includes(marker.priority)&&(selectedTypes===null||selectedTypes.includes(marker.type)))??[],[view,selectedStatuses,selectedPriorities,selectedTypes]);

  function showAll(){setSelectedStatuses([...STATUSES]);setSelectedPriorities([...priorities]);setSelectedTypes(null);}
  function toggleType(type:string){setSelectedTypes(current=>toggle(current??availableTypes,type));}

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
    function appendSelection(name:string,values:string[]){
      if(values.length)values.forEach(value=>params.append(name,value));
      else params.set(name,'');
    }
    if(showMap){
      if(selectedStatuses.length!==STATUSES.length)appendSelection('status',selectedStatuses);
      if(selectedPriorities.length!==priorities.length)appendSelection('priority',selectedPriorities);
      if(selectedTypes!==null)appendSelection('type',selectedTypes);
    }
    queueMicrotask(()=>{if(!controller.signal.aborted)setLoading(true);});
    fetch(`/api/core/dashboard${params.size?`?${params}`:''}`,{cache:'no-store',signal:controller.signal})
      .then(async response=>{
        const body=await response.json() as DashboardResponse|{error?:{message?:string}};
        if(!response.ok)throw new Error('error'in body?body.error?.message??'Não foi possível consultar o mapa.':'Não foi possível consultar o mapa.');
        if(!controller.signal.aborted){setView(body as DashboardResponse);setError('');}
      })
      .catch(cause=>{if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:'Falha de comunicação ao consultar o mapa.');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[bounds,from,to,refreshKey,selectedStatuses,selectedPriorities,selectedTypes,showMap]);

  return <section className="space-y-4 rounded-2xl border border-border bg-surface p-4 text-foreground" aria-labelledby={showMap?'core-map-title':'core-indicators-title'}>
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 id={showMap?'core-map-title':'core-indicators-title'} className="text-xl font-bold">{showMap?'Mapa de ocorrências':'Indicadores de ocorrências'}</h2><p className="text-sm text-muted-foreground">{showMap?'Filtre os registros e mova o mapa para delimitar a consulta.':'Consulte os totais das ocorrências no período selecionado.'}</p></div>
      <div className="flex w-full gap-3 sm:w-auto">
        <label className="min-w-0 flex-1 text-xs text-muted-foreground">De<input aria-label="Data inicial do mapa" className="mt-1 block w-full rounded bg-surface-subtle p-2" type="date" value={from} onChange={event=>setFrom(event.target.value)}/></label>
        <label className="min-w-0 flex-1 text-xs text-muted-foreground">Até<input aria-label="Data final do mapa" className="mt-1 block w-full rounded bg-surface-subtle p-2" type="date" value={to} onChange={event=>setTo(event.target.value)}/></label>
      </div>
    </header>
    {error&&<div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded border border-danger/30 bg-danger-soft p-3 text-sm"><p>{error} {view&&'Os dados exibidos são da última consulta confirmada.'}</p><Button variant="secondary" onClick={()=>setRefreshKey(value=>value+1)}>Tentar novamente</Button></div>}
    {loading&&!view&&<p role="status">{showMap?'Carregando mapa e contagens…':'Carregando indicadores…'}</p>}
    {view&&<>
      {showMap&&<p className="text-sm text-muted-foreground">Selecione os status e as prioridades que deseja visualizar. As contagens mostram o total da área e do período.</p>}
      <div aria-label={showMap?'Filtros por status e prioridade':'Contagens por status e prioridade'} className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
        {[...presentations].sort((a,b)=>a.displayOrder-b.displayOrder).map(({code,label})=>{
          const selected=selectedStatuses.includes(code);
          const content=<><span className="flex items-center gap-2 text-xs"><span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{backgroundColor:mapStatusAppearance[code].color}}/><span className="min-w-0 flex-1">{label}</span>{showMap&&selected&&<Check aria-hidden="true" size={16}/>}</span><span className="mt-1 block text-lg font-bold tabular-nums">{view.counts.byStatus[code]}</span></>;
          return showMap?<button key={code} type="button" aria-label={`Filtrar status: ${label}`} aria-pressed={selected} onClick={()=>setSelectedStatuses(current=>toggle(current,code))} className={`rounded-lg border p-3 text-left text-foreground transition-colors hover:bg-primary-soft ${selected?'border-primary bg-primary-soft':'border-control-border bg-surface'}`}>{content}</button>:<div key={code} className="rounded-lg bg-surface-subtle p-3">{content}</div>;
        })}
        {priorities.map(priority=>{
          const selected=selectedPriorities.includes(priority);
          const label=`Prioridade ${priority==='ALTA'?'alta':'normal'}`;
          const content=<><span className="flex items-center gap-2 text-xs">{priority==='ALTA'&&<TriangleAlert aria-hidden="true" className="shrink-0 text-danger" size={16}/>}<span className="flex-1">{label}</span>{showMap&&selected&&<Check aria-hidden="true" size={16}/>}</span><span className="mt-1 block text-lg font-bold tabular-nums">{view.counts.byPriority[priority]}</span></>;
          return showMap?<button key={priority} type="button" aria-label={`Filtrar ${label.toLowerCase()}`} aria-pressed={selected} onClick={()=>setSelectedPriorities(current=>toggle(current,priority))} className={`rounded-lg border p-3 text-left text-foreground transition-colors hover:bg-primary-soft ${selected?'border-primary bg-primary-soft':'border-control-border bg-surface'}`}>{content}</button>:<div key={priority} className="rounded-lg bg-surface-subtle p-3">{content}</div>;
        })}
      </div>
      {showMap&&<>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" aria-expanded={typesOpen} aria-controls="map-type-filters" onClick={()=>setTypesOpen(open=>!open)}>Tipos de ocorrência <span className="text-muted-foreground">({selectedTypes===null?'Todos':selectedTypes.length})</span><ChevronDown aria-hidden="true" className={typesOpen?'rotate-180':''} size={16}/></Button>
          <Button variant="secondary" onClick={()=>allHidden?showAll():setSelectedStatuses([])}>{allHidden?<Eye aria-hidden="true" size={18}/>:<EyeOff aria-hidden="true" size={18}/>} {allHidden?'Exibir todos':'Ocultar todos'}</Button>
          <Link href="/painel/ocorrencias" className="text-sm text-primary underline sm:ml-auto">Ver ocorrências em lista</Link>
        </div>
        {typesOpen&&<fieldset id="map-type-filters" className="space-y-3 rounded-lg border border-border p-3">
          <legend className="px-1 text-sm font-medium">Tipos de ocorrência</legend>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-0 flex-1"><span className="sr-only">Buscar tipo de ocorrência</span><Search aria-hidden="true" className="absolute left-3 top-3 text-muted-foreground" size={16}/><input type="search" className="w-full pl-9 pr-3" value={typeSearch} onChange={event=>setTypeSearch(event.target.value)} placeholder="Buscar tipo de ocorrência"/></label>
            <Button variant="text" onClick={()=>setSelectedTypes(null)}>Selecionar todos os tipos</Button>
            <Button variant="text" onClick={()=>setSelectedTypes([])}>Limpar tipos</Button>
          </div>
          <div className="grid max-h-64 gap-x-4 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {searchedTypes.map(type=><label key={type} className="flex min-h-11 cursor-pointer items-center gap-3 rounded px-2 py-2 text-sm hover:bg-surface-subtle"><input type="checkbox" className="h-4 w-4 shrink-0" checked={selectedTypes===null||selectedTypes.includes(type)} onChange={()=>toggleType(type)}/><TypeIcon type={type}/><span>{type}</span></label>)}
          </div>
          {searchedTypes.length===0&&<p className="text-sm text-muted-foreground">{availableTypes.length?'Nenhum tipo corresponde à busca.':'Nenhum tipo de ocorrência disponível nesta área e período.'}</p>}
        </fieldset>}
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{loading?'Atualizando mapa…':allHidden?'Todos os registros estão ocultos.':`${visibleMarkers.length} ${visibleMarkers.length===1?'ocorrência visível':'ocorrências visíveis'}${view.limited?` de ${view.matchingCount} encontradas`:''}.`}</p>
        {!loading&&!allHidden&&visibleMarkers.length===0&&<p className="rounded border border-border bg-surface-subtle p-3 text-sm text-muted-foreground">Nenhuma ocorrência corresponde aos filtros nesta área e período.</p>}
        {!loading&&view.limited&&!allHidden&&<p className="rounded border border-warning/30 bg-warning-soft p-3 text-sm text-warning">Mais de 1.000 ocorrências correspondem aos filtros. O mapa exibe até 1.000 marcadores; refine os filtros para visualizar os demais.</p>}
        <CoreMapCanvas view={{...view,markers:visibleMarkers}} onViewportChange={onViewportChange} statusLabels={Object.fromEntries(presentations.map(item=>[item.code,item.label])) as Record<Status,string>}/>
        <p className="text-xs text-muted-foreground">{view.window.from&&view.window.to?`Período ${new Date(view.window.from).toLocaleDateString('pt-BR')}–${new Date(view.window.to).toLocaleDateString('pt-BR')}`:'Todo o histórico'} · Ícone: tipo · Cor: status · Aviso vermelho: prioridade alta</p>
      </>}
    </>}
  </section>;
}
