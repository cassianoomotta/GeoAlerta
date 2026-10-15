'use client';

import {useEffect,useMemo,useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {EventDashboardEvent,EventDashboardMetric} from '../domain/dashboard-events';

type EventDashboardResponse={events:EventDashboardEvent[];selectedEventIds:string[];metrics:EventDashboardMetric[];updatedAt:string};
type Snapshot={key:string;data?:EventDashboardResponse;error?:string};
const number=new Intl.NumberFormat('pt-BR');
const date=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short'});
const time=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'});
const stateLabel={EM_ANDAMENTO:'Em andamento',ENCERRADO:'Encerrado'} as const;

function Distribution({title,items}:{title:string;items:{label:string;count:number;percentage:number}[]}){
  return <section aria-label={title} className="min-w-0 rounded-lg border border-border bg-surface p-4">
    <h4 className="font-semibold">{title}</h4>
    {items.length===0?<p className="mt-3 text-sm text-muted-foreground">Sem categorias neste evento.</p>:<ul className="mt-3 space-y-3">
      {items.map(item=><li key={item.label} className="min-w-0" aria-label={`${item.label}: ${number.format(item.count)} (${number.format(item.percentage)}%)`}>
        <div className="flex min-w-0 items-baseline justify-between gap-3 text-sm"><span className="min-w-0 break-words">{item.label}</span><span className="shrink-0 tabular-nums text-muted-foreground">{number.format(item.count)} · {number.format(item.percentage)}%</span></div>
        <div aria-hidden="true" className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-subtle"><div className="h-full rounded-full bg-primary" style={{width:`${Math.min(100,item.percentage)}%`}}/></div>
      </li>)}
    </ul>}
  </section>;
}

function EventPanel({metric,index}:{metric:EventDashboardMetric;index:number}){
  const {event}=metric;
  const state=stateLabel[event.state];
  const metrics=[
    {label:'Total de ocorrências',value:metric.total},
    {label:'Abertas',value:metric.open},
    {label:'Concluídas',value:metric.closed},
    {label:'Canceladas',value:metric.cancelled},
  ];
  return <section aria-label={`Indicadores do evento ${event.name}`} className="min-w-0 space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-5">
    <header className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{index===0?'Evento base':'Evento comparado'}</p>
      <h3 className="mt-1 break-words text-xl font-semibold">{event.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{state} · previsão {date.format(new Date(`${event.plannedStart}T12:00:00-03:00`))} a {date.format(new Date(`${event.plannedEnd}T12:00:00-03:00`))}{event.startedAt?` · iniciado em ${time.format(new Date(event.startedAt))}`:''}</p>
    </header>
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics.map(item=><div key={item.label} className="min-w-0 rounded-lg bg-surface-subtle p-3"><dt className="text-xs text-muted-foreground">{item.label}</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{number.format(item.value)}</dd></div>)}
    </dl>
    <p className="text-xs text-muted-foreground">Abertas = novas + em triagem + em atendimento. Concluídas = resolvidas. Os eventos encerrados refletem a situação atual dos registros vinculados.</p>
    <div className="grid min-w-0 gap-3 md:grid-cols-2">
      <Distribution title="Por tipo" items={metric.byType}/>
      <Distribution title="Por prioridade" items={metric.byPriority}/>
      <Distribution title="Apoio médico" items={metric.byMedicalSupport}/>
      <Distribution title="Por status" items={metric.byStatus}/>
    </div>
  </section>;
}

export function EventDashboard(){
  const [primaryEventId,setPrimaryEventId]=useState('');
  const [comparisonEventId,setComparisonEventId]=useState('');
  const [refresh,setRefresh]=useState(0);
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
  const key=useMemo(()=>{
    const params=new URLSearchParams();
    if(primaryEventId)params.set('primary',primaryEventId);
    if(comparisonEventId)params.set('comparison',comparisonEventId);
    return params.toString();
  },[primaryEventId,comparisonEventId]);
  const view=snapshot?.key===key?snapshot.data:undefined;
  const error=snapshot?.key===key?snapshot.error:undefined;
  const selectedPrimary=primaryEventId||view?.selectedEventIds[0]||'';
  const historical=view?.events.filter(event=>event.state==='ENCERRADO'&&event.id!==selectedPrimary)??[];

  useEffect(()=>{
    const controller=new AbortController();
    void fetch(`/api/core/dashboard/climate-events${key?`?${key}`:''}`,{cache:'no-store',signal:controller.signal}).then(async response=>{
      const body=await response.json();
      if(!response.ok)throw new Error(body.error?.message??'Não foi possível carregar os indicadores por evento.');
      if(!controller.signal.aborted)setSnapshot({key,data:body as EventDashboardResponse});
    }).catch(cause=>{
      if(!controller.signal.aborted)setSnapshot(previous=>({key,data:previous?.key===key?previous.data:undefined,error:cause instanceof Error?cause.message:'Falha de conexão. Tente atualizar o painel.'}));
    });
    return()=>controller.abort();
  },[key,refresh]);

  const selectedEvents=view?.selectedEventIds.map(id=>view.events.find(event=>event.id===id)).filter((event):event is EventDashboardEvent=>!!event)??[];
  return <section aria-labelledby="event-dashboard-heading" className="space-y-4">
    <header className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-border bg-surface p-5 sm:p-6">
      <div className="min-w-0"><h2 id="event-dashboard-heading" className="text-xl font-semibold">Acompanhar eventos climáticos</h2>
        <p className="mt-1 text-sm text-muted-foreground">Contagens de todo o histórico visível nos grupos que você pode consultar.</p>
        <p className="mt-2 text-sm text-muted-foreground">{view?<>Última atualização: <time dateTime={view.updatedAt}>{time.format(new Date(view.updatedAt))}</time>{error?' · dados desatualizados':''}</>:error?'Atualização indisponível':'Consultando eventos atuais…'}</p>
      </div>
      <Button variant="secondary" onClick={()=>setRefresh(value=>value+1)}><RefreshCw size={16} aria-hidden="true"/>Atualizar eventos</Button>
      <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2">
        <label className="form-label min-w-0">Evento base
          <select className="form-input mt-2" value={selectedPrimary} disabled={!view?.events.length} onChange={event=>{setPrimaryEventId(event.target.value);if(event.target.value===comparisonEventId)setComparisonEventId('');}}>
            <option value="">Selecione um evento</option>
            {view?.events.map(event=><option key={event.id} value={event.id}>{event.name} · {stateLabel[event.state]}</option>)}
          </select>
        </label>
        <label className="form-label min-w-0">Comparar com evento encerrado
          <select className="form-input mt-2" value={comparisonEventId} disabled={!historical.length} onChange={event=>setComparisonEventId(event.target.value)}>
            <option value="">Sem comparação</option>
            {historical.map(event=><option key={event.id} value={event.id}>{event.name} · Encerrado</option>)}
          </select>
        </label>
      </div>
    </header>
    {error&&<p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm">Não foi possível atualizar os indicadores de eventos. {error}</p>}
    {!view&&!error&&<div role="status" aria-label="Carregando indicadores de eventos" className="h-48 animate-pulse rounded-xl bg-surface-subtle"><span className="sr-only">Carregando eventos e indicadores…</span></div>}
    {view&&view.events.length===0&&<p className="rounded-xl border border-border bg-surface p-5 text-sm text-muted-foreground">Nenhum evento em andamento ou encerrado está disponível no seu escopo.</p>}
    {view&&view.events.length>0&&selectedEvents.length===0&&<p className="rounded-xl border border-border bg-surface p-5 text-sm text-muted-foreground">Nenhum evento em andamento. Selecione um evento encerrado para consultar o histórico.</p>}
    {view&&selectedEvents.length>0&&<div className={`grid min-w-0 gap-4 ${selectedEvents.length>1?'xl:grid-cols-2':'grid-cols-1'}`}>{selectedEvents.map((event,index)=>{
      const metric=view.metrics.find(item=>item.event.id===event.id);
      return metric?<EventPanel key={event.id} metric={metric} index={index}/>:null;
    })}</div>}
    <p className="text-xs text-muted-foreground">Os totais excluem ocorrências removidas logicamente e sem vínculo persistido com o evento. O percentual é relativo ao total do evento. Dados pessoais não são exibidos.</p>
  </section>;
}
