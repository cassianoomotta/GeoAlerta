'use client';

import {useEffect,useState} from 'react';
import type {DashboardIndicatorsPeriod,DashboardIndicatorsView} from '../domain/dashboard-indicators';

type DistributionMode='neighborhood'|'type';
type DistributionItem={label:string;total:number};

const periods:{value:DashboardIndicatorsPeriod;label:string}[]=[
  {value:'today',label:'Hoje'},
  {value:'week',label:'Semana'},
  {value:'month',label:'Mês'},
  {value:'custom',label:'Personalizado'},
];

function formatDay(value:string):string{
  return new Date(value+'T12:00:00.000Z').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',timeZone:'UTC'});
}

function dateRange(view:DashboardIndicatorsView):string{
  const start=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',timeZone:view.window.timeZone}).format(new Date(view.window.from));
  const finalInstant=new Date(new Date(view.window.to).getTime()-1);
  const end=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',timeZone:view.window.timeZone}).format(finalInstant);
  return start+' – '+end;
}

function TrendChart({items}:{items:DashboardIndicatorsView['daily']}){
  const width=640,height=200,padding=24;
  const maximum=Math.max(1,...items.map(item=>item.total));
  const points=items.map((item,index)=>{
    const x=items.length===1?width/2:padding+(index*(width-padding*2))/(items.length-1);
    const y=height-padding-(item.total/maximum)*(height-padding*2);
    return {x,y,item};
  });
  const path=points.map((point,index)=>(index?'L':'M')+' '+point.x+' '+point.y).join(' ');
  return <figure className="rounded-xl border border-slate-700 bg-slate-950/40 p-3" aria-labelledby="daily-trend-title">
    <figcaption id="daily-trend-title" className="mb-2 text-sm font-semibold">Ocorrências por dia</figcaption>
    {items.length===0?<p role="status" className="text-sm text-slate-300">Sem dados para comparar neste período.</p>:<>
      <svg viewBox={'0 0 '+width+' '+height} className="h-48 w-full overflow-visible" role="img" aria-label="Gráfico de linha com a quantidade de ocorrências por dia">
        <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#475569" strokeWidth="1"/>
        <path d={path} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
        {points.map(({x,y,item})=><circle key={item.date} cx={x} cy={y} r="4" fill="#7dd3fc"><title>{formatDay(item.date)+': '+item.total}</title></circle>)}
      </svg>
      <div className="mt-1 flex justify-between gap-2 text-xs text-slate-400">
        <span>{formatDay(items[0].date)}</span><span>{items.length>2?formatDay(items[Math.floor(items.length/2)].date):''}</span><span>{formatDay(items[items.length-1].date)}</span>
      </div>
    </>}
  </figure>;
}

function DistributionChart({items,title}:{items:DistributionItem[];title:string}){
  const maximum=Math.max(1,...items.map(item=>item.total));
  return <figure className="rounded-xl border border-slate-700 bg-slate-950/40 p-3" aria-labelledby="distribution-title">
    <figcaption id="distribution-title" className="mb-3 text-sm font-semibold">{title}</figcaption>
    {items.length===0?<p role="status" className="text-sm text-slate-300">Sem dados para distribuir neste período.</p>:
      <ol className="space-y-3">
        {items.slice(0,8).map(item=><li key={item.label} className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-x-3 gap-y-1">
          <span className="truncate text-sm text-slate-200" title={item.label}>{item.label}</span>
          <span className="text-right text-sm font-semibold tabular-nums">{item.total}</span>
          <span className="col-span-2 h-2 overflow-hidden rounded-full bg-slate-800" role="img" aria-label={item.label+': '+item.total}>
            <span className="block h-full rounded-full bg-cyan-500" style={{width:(item.total/maximum*100)+'%'}}/>
          </span>
        </li>)}
      </ol>}
  </figure>;
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


