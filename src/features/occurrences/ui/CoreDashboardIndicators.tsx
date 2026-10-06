'use client';

import {useEffect,useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Field} from '@/components/ui/field';
import type {IndicatorQuery,IndicatorView} from '../domain/dashboard-indicators';
import {DashboardCharts,defaultPresentations,type StatusPresentation} from './DashboardCharts';

type ResponseData=IndicatorView&{window:IndicatorQuery;updatedAt:string};
type Snapshot={key:string;data?:ResponseData;error?:string};
const number=new Intl.NumberFormat('pt-BR');
const dayFormat=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo'});
const timeFormat=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',second:'2-digit'});
type DashboardPeriod='today'|'week'|'month'|'custom';
const dashboardPeriods:{value:DashboardPeriod;label:string}[]=[{value:'today',label:'Hoje'},{value:'week',label:'Semana'},{value:'month',label:'Mês'},{value:'custom',label:'Personalizado'}];
function dayAtDashboardZone(date:Date):string{return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
function shiftCalendarDay(day:string,amount:number):string{const date=new Date(day+'T12:00:00.000Z');date.setUTCDate(date.getUTCDate()+amount);return date.toISOString().slice(0,10);}
function rangeForDashboardPeriod(period:Exclude<DashboardPeriod,'custom'>,now=new Date()):{from:string;to:string}{
  const today=dayAtDashboardZone(now);
  if(period==='today')return {from:today,to:today};
  if(period==='week'){const weekday=new Date(today+'T12:00:00.000Z').getUTCDay();const monday=shiftCalendarDay(today,-((weekday+6)%7));return {from:monday,to:shiftCalendarDay(monday,6)};}
  return {from:today.slice(0,8)+'01',to:today};
}

export function CoreDashboardIndicators() {
  const initialRange=rangeForDashboardPeriod('month');
  const [period,setPeriod]=useState<DashboardPeriod>('month');
  const [from,setFrom]=useState(initialRange.from);
  const [to,setTo]=useState(initialRange.to);
  const [refresh,setRefresh]=useState(0);
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
  const [presentations,setPresentations]=useState(defaultPresentations);
  const params=new URLSearchParams();
  if(from)params.set('from',from);
  if(to)params.set('to',to);
  const key=params.toString();
  const view=snapshot?.key===key?snapshot.data:undefined;
  const error=snapshot?.key===key?snapshot.error:undefined;

  useEffect(()=>{
    const controller=new AbortController();
    void fetch('/api/core/status-presentations',{cache:'no-store',signal:controller.signal}).then(async response=>{
      if(response.ok){const body=await response.json() as {items:StatusPresentation[]};if(!controller.signal.aborted)setPresentations(body.items);}
    }).catch(()=>{});
    return()=>controller.abort();
  },[]);
  useEffect(()=>{
    const update=()=>{if(document.visibilityState==='visible')setRefresh(value=>value+1);};
    const timer=setInterval(update,15_000);
    document.addEventListener('visibilitychange',update);
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',update);};
  },[]);
  useEffect(()=>{
    const controller=new AbortController();
    void fetch(`/api/core/dashboard/indicators${key?`?${key}`:''}`,{cache:'no-store',signal:controller.signal}).then(async response=>{
      const body=await response.json();
      if(!response.ok)throw new Error(body.error?.message??'Não foi possível atualizar o quadro de situação.');
      if(!controller.signal.aborted)setSnapshot({key,data:body as ResponseData});
    }).catch(cause=>{
      if(!controller.signal.aborted)setSnapshot(previous=>({key,data:previous?.key===key?previous.data:undefined,error:cause instanceof Error?cause.message:'Falha de conexão. Tente atualizar o painel.'}));
    });
    return()=>controller.abort();
  },[key,refresh]);

  const periodLabel=view?.window.from&&view.window.to?`${dayFormat.format(new Date(view.window.from))} a ${dayFormat.format(new Date(new Date(view.window.to).getTime()-1))}`:'Todo o histórico';
  const metrics=view?[
    {label:'Total de ocorrências',value:view.summary.total,hint:'Registradas no período',color:'text-foreground'},
    {label:'Abertas',value:view.summary.open,hint:'Novas, em triagem e atendimento',color:'text-primary'},
    {label:'Em atendimento',value:view.summary.inProgress,hint:'Situação atual dos registros',color:'text-info'},
    {label:'Prioridade alta',value:view.summary.highPriority,hint:'Entre os registros do período',color:view.summary.highPriority?'text-danger':'text-foreground'},
  ]:[];
  return <div className="space-y-5">
    <section aria-label="Período do quadro de situação" className="flex flex-wrap items-end justify-between gap-5 rounded-xl border border-border bg-surface p-5 sm:p-6">
      <div className="min-w-0"><p className="font-semibold">{view?periodLabel:'Período de análise'}</p><p className="mt-1 text-sm text-muted-foreground">Horário de Brasília · filtros de até 31 dias</p>
        <p className={`mt-2 text-sm ${error?'text-warning':'text-muted-foreground'}`}>{view?<>Última atualização: <time dateTime={view.updatedAt}>{timeFormat.format(new Date(view.updatedAt))}</time>{error?' · Dados desatualizados':' · Atualização a cada 15 s'}</>:error?'Atualização indisponível':'Consultando dados atuais…'}</p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Período dos indicadores">
        {dashboardPeriods.map(option=><button key={option.value} type="button" aria-pressed={period===option.value} onClick={()=>{setPeriod(option.value);if(option.value!=='custom'){const range=rangeForDashboardPeriod(option.value);setFrom(range.from);setTo(range.to);}}} className={'rounded-lg border px-3 py-2 text-sm '+(period===option.value?'border-primary bg-primary-soft text-primary':'border-border bg-surface text-foreground')}>
          {option.label}
        </button>)}
      </div>      <div className="flex w-full flex-wrap items-end gap-3 md:w-auto">
        <div className="grid w-full min-w-0 flex-none grid-cols-2 gap-3 md:w-auto"><Field label="De" aria-label="Data inicial do dashboard" type="date" value={from} onChange={event=>{setPeriod('custom');setFrom(event.target.value);}} className="md:w-40"/><Field label="Até" aria-label="Data final do dashboard" type="date" value={to} onChange={event=>{setPeriod('custom');setTo(event.target.value);}} className="md:w-40"/></div>
        <Button variant="secondary" onClick={()=>setRefresh(value=>value+1)}><RefreshCw size={16} aria-hidden="true"/>Atualizar</Button>
        {(from||to)&&<Button variant="text" onClick={()=>{setFrom('');setTo('');}}>Limpar período</Button>}
      </div>
    </section>
    {error&&<div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm"><p className="font-medium">Não foi possível atualizar os dados.</p><p className="mt-1">{error}</p>{view&&<p className="mt-1">Os gráficos mostram a última consulta confirmada. Use Atualizar para tentar novamente.</p>}</div>}
    {!view&&!error&&<div role="status" aria-label="Carregando quadro de situação" className="space-y-5"><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0,1,2,3].map(index=><div key={index} className="h-32 rounded-xl bg-surface-subtle"/>)}</div><div className="grid gap-5 xl:grid-cols-2">{[0,1,2,3].map(index=><div key={index} className="h-80 rounded-xl border border-border bg-surface"/>)}</div><span className="sr-only">Carregando indicadores e gráficos…</span></div>}
    {view&&<>
      <dl className="grid grid-cols-2 gap-x-5 gap-y-6 rounded-xl border border-border bg-surface p-5 sm:p-6 lg:grid-cols-4">{metrics.map(metric=><div key={metric.label} className="min-w-0"><dt className="text-sm font-medium text-muted-foreground">{metric.label}</dt><dd className={`mt-2 text-4xl font-semibold tabular-nums sm:text-5xl ${metric.color}`}>{number.format(metric.value)}</dd><dd className="mt-2 text-xs text-muted-foreground">{metric.hint}</dd></div>)}</dl>
      <DashboardCharts view={view} presentations={presentations}/>
      <p className="text-sm text-muted-foreground">Indicadores, status e tipos usam registros do período selecionado e sua situação atual. Dados limitados aos grupos que você pode consultar.</p>
    </>}
  </div>;
}
