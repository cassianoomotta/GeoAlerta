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

export function CoreDashboardIndicators() {
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
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

  const period=view?.window.from&&view.window.to?`${dayFormat.format(new Date(view.window.from))} a ${dayFormat.format(new Date(new Date(view.window.to).getTime()-1))}`:'Todo o histórico';
  const metrics=view?[
    {label:'Total de ocorrências',value:view.summary.total,hint:'Registradas no período',color:'text-foreground'},
    {label:'Abertas',value:view.summary.open,hint:'Novas, em triagem e atendimento',color:'text-primary'},
    {label:'Em atendimento',value:view.summary.inProgress,hint:'Situação atual dos registros',color:'text-info'},
    {label:'Prioridade alta',value:view.summary.highPriority,hint:'Entre os registros do período',color:view.summary.highPriority?'text-danger':'text-foreground'},
  ]:[];
  return <div className="space-y-5">
    <section aria-label="Período do quadro de situação" className="flex flex-wrap items-end justify-between gap-5 rounded-xl border border-border bg-surface p-5 sm:p-6">
      <div className="min-w-0"><p className="font-semibold">{view?period:'Período de análise'}</p><p className="mt-1 text-sm text-muted-foreground">Horário de Brasília · filtros de até 31 dias</p>
        <p className={`mt-2 text-sm ${error?'text-warning':'text-muted-foreground'}`}>{view?<>Última atualização: <time dateTime={view.updatedAt}>{timeFormat.format(new Date(view.updatedAt))}</time>{error?' · Dados desatualizados':' · Atualização a cada 15 s'}</>:error?'Atualização indisponível':'Consultando dados atuais…'}</p>
      </div>
      <div className="flex w-full flex-wrap items-end gap-3 md:w-auto">
        <div className="grid w-full min-w-0 flex-none grid-cols-2 gap-3 md:w-auto"><Field label="De" aria-label="Data inicial do dashboard" type="date" value={from} onChange={event=>setFrom(event.target.value)} className="md:w-40"/><Field label="Até" aria-label="Data final do dashboard" type="date" value={to} onChange={event=>setTo(event.target.value)} className="md:w-40"/></div>
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

export function CoreDashboardIndicators(){
  const [period,setPeriod]=useState<DashboardIndicatorsPeriod>('month');
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  const [neighborhood,setNeighborhood]=useState('');
  const [mode,setMode]=useState<DistributionMode>('neighborhood');
  const [result,setResult]=useState<{request:string;view:DashboardIndicatorsView}|null>(null);
  const [failure,setFailure]=useState<{request:string;message:string}|null>(null);
  const incompleteCustom=period==='custom'&&(!from||!to);
  const params=new URLSearchParams({period});
  if(period==='custom'){params.set('from',from);params.set('to',to);}
  if(neighborhood)params.set('neighborhood',neighborhood);
  const request='/api/core/dashboard/indicators?'+params.toString();
  const view=result?.request===request?result.view:null;
  const error=failure?.request===request?failure.message:'';
  const loading=!incompleteCustom&&!view&&!error;

  useEffect(()=>{
    if(incompleteCustom)return;
    const controller=new AbortController();
    fetch(request,{cache:'no-store',signal:controller.signal})
      .then(async response=>{
        const body=await response.json() as DashboardIndicatorsView|{error?:{message?:string}};
        if(!response.ok)throw new Error('error'in body?body.error?.message??'Não foi possível consultar os indicadores.':'Não foi possível consultar os indicadores.');
        setFailure(current=>current?.request===request?null:current);
        setResult({request,view:body as DashboardIndicatorsView});
      })
      .catch(cause=>{if(!controller.signal.aborted)setFailure({request,message:cause instanceof Error?cause.message:'Falha de comunicação ao consultar os indicadores.'});});
    return ()=>controller.abort();
  },[request,incompleteCustom]);

  const distribution:DistributionItem[]=view
    ?(mode==='neighborhood'?view.byNeighborhood.map(item=>({label:item.label,total:item.total})):view.byType)
    :[];

  return <section className="space-y-4 text-slate-100" aria-labelledby="core-indicators-title">
    <header className="flex flex-col gap-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 id="core-indicators-title" className="text-xl font-bold">Indicadores operacionais</h2>
        <p className="mt-1 text-sm text-slate-300">Acompanhe os registros no período e no bairro selecionados.</p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Período dos indicadores">
        {periods.map(option=><button key={option.value} type="button" aria-pressed={period===option.value} onClick={()=>setPeriod(option.value)} className={'rounded-lg border px-3 py-2 text-sm '+(period===option.value?'border-cyan-400 bg-cyan-950 text-cyan-100':'border-slate-600 bg-slate-800 text-slate-200')}>
          {option.label}
        </button>)}
      </div>
    </header>

    <div className="grid gap-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 sm:grid-cols-3">
      {period==='custom'&&<>
        <label className="text-sm text-slate-300">Data inicial
          <input aria-label="Data inicial dos indicadores" className="mt-1 block w-full rounded bg-slate-800 p-2 text-slate-100" type="date" max={to||undefined} value={from} onChange={event=>setFrom(event.target.value)}/>
        </label>
        <label className="text-sm text-slate-300">Data final
          <input aria-label="Data final dos indicadores" className="mt-1 block w-full rounded bg-slate-800 p-2 text-slate-100" type="date" min={from||undefined} value={to} onChange={event=>setTo(event.target.value)}/>
        </label>
      </>}
      <label className="text-sm text-slate-300">Bairro
        <select aria-label="Filtrar indicadores por bairro" className="mt-1 block w-full rounded bg-slate-800 p-2 text-slate-100" value={neighborhood} onChange={event=>setNeighborhood(event.target.value)}>
          <option value="">Todos os bairros</option>
          {view?.neighborhoods.map(item=><option key={item.code} value={item.code}>{item.label}</option>)}
        </select>
      </label>
    </div>

    {error&&<p role="alert" className="rounded border border-red-400/40 bg-red-950/50 p-3 text-sm">{error}</p>}
    {loading&&!view&&<p role="status" className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm">Carregando indicadores…</p>}
    {incompleteCustom&&<p role="status" className="text-sm text-slate-300">Selecione as duas datas para consultar o período personalizado.</p>}
    {view&&<>
      <p className="text-sm text-slate-400">Período: {dateRange(view)} · Fuso: {view.window.timeZone}</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {label:'Registradas',value:view.totals.registered},
          {label:'Abertas',value:view.totals.open},
          {label:'Em atendimento',value:view.totals.inService},
          {label:'Resolvidas',value:view.totals.resolved},
          {label:'Canceladas',value:view.totals.cancelled},
        ].map(item=><article key={item.label} className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
          <h3 className="text-sm text-slate-300">{item.label}</h3>
          <p className="mt-2 text-3xl font-bold tabular-nums">{item.value}</p>
        </article>)}
      </div>
      {view.totals.registered===0&&<p role="status" className="rounded border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-300">Nenhuma ocorrência encontrada no período e bairro selecionados.</p>}
      <div className="grid gap-4 xl:grid-cols-2">
        <TrendChart items={view.daily}/>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Distribuição das ocorrências">
            <button type="button" aria-pressed={mode==='neighborhood'} onClick={()=>setMode('neighborhood')} className={'rounded-lg border px-3 py-2 text-sm '+(mode==='neighborhood'?'border-cyan-400 bg-cyan-950 text-cyan-100':'border-slate-600 bg-slate-800 text-slate-200')}>Por bairro</button>
            <button type="button" aria-pressed={mode==='type'} onClick={()=>setMode('type')} className={'rounded-lg border px-3 py-2 text-sm '+(mode==='type'?'border-cyan-400 bg-cyan-950 text-cyan-100':'border-slate-600 bg-slate-800 text-slate-200')}>Por tipo</button>
          </div>
          <DistributionChart items={distribution} title={mode==='neighborhood'?'Distribuição por bairro':'Distribuição por tipo'}/>
        </div>
      </div>
    </>}
  </section>;
}


