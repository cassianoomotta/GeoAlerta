'use client';

import {useEffect,useRef,useState,type ReactNode} from 'react';
import {STATUSES,type Status} from '../contracts';
import type {DailyActivity,IndicatorView} from '../domain/dashboard-indicators';

export type StatusPresentation={code:Status;label:string;displayOrder:number};
export const defaultPresentations:StatusPresentation[]=[{code:'NOVA',label:'Nova',displayOrder:1},{code:'EM_TRIAGEM',label:'Em triagem',displayOrder:2},{code:'EM_ATENDIMENTO',label:'Em atendimento',displayOrder:3},{code:'RESOLVIDA',label:'Resolvida',displayOrder:4},{code:'CANCELADA',label:'Cancelada',displayOrder:5}];
const chartColors={daily:'#087580',type:'#426A8A',opened:'var(--chart-opened)',closed:'var(--chart-closed)'} as const;
const statusColors:Record<Status,string>={NOVA:'#087580',EM_TRIAGEM:'#A56B12',EM_ATENDIMENTO:'#426A8A',RESOLVIDA:'#43845F',CANCELADA:'var(--chart-cancelled)'};
const number=new Intl.NumberFormat('pt-BR');
const date=(day:string)=>`${day.slice(8,10)}/${day.slice(5,7)}`;
const fullDate=(day:string)=>`${date(day)}/${day.slice(0,4)}`;
const height=200,left=40,top=20,bottom=height-38;

function ChartFrame({title,description,children,table}:{title:string;description:string;children:ReactNode;table:ReactNode}){
  return <section className="min-w-0 rounded-xl border border-border bg-surface p-4 sm:p-5" aria-label={title}>
    <h2 className="text-lg font-semibold">{title}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    <div className="mt-3">{children}</div>
    <details className="mt-3 border-t border-border pt-2 text-sm"><summary className="w-fit rounded text-primary">Consultar dados do gráfico</summary><div className="max-h-72 overflow-auto">{table}</div></details>
  </section>;
}
function DataTable({columns,rows}:{columns:string[];rows:(string|number)[][]}){
  return <table className="w-full text-left text-sm"><thead><tr>{columns.map(column=><th key={column} scope="col" className="px-3 py-2">{column}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={index} className="border-b border-border">{row.map((cell,cellIndex)=><td key={cellIndex} className="px-3 py-2 tabular-nums">{typeof cell==='number'?number.format(cell):cell}</td>)}</tr>)}</tbody></table>;
}
function EmptyChart({children}:{children:ReactNode}){
  return <div className="flex min-h-[200px] items-center justify-center rounded-lg bg-surface-subtle p-6 text-center text-sm text-muted-foreground">{children}</div>;
}
function useChartWidth(){
  const ref=useRef<HTMLDivElement>(null);
  const [width,setWidth]=useState(560);
  useEffect(()=>{
    if(!ref.current)return;
    const observer=new ResizeObserver(entries=>setWidth(Math.max(240,Math.floor(entries[0].contentRect.width))));
    observer.observe(ref.current);
    return()=>observer.disconnect();
  },[]);
  return {ref,width};
}
function chartScale(max:number){
  const target=Math.max(1,max)/4;
  const power=10**Math.floor(Math.log10(target));
  const step=Math.max(1,[1,2,5,10].find(value=>value*power>=target)!*power);
  const ceiling=Math.max(step,Math.ceil(max/step)*step);
  return {ceiling,ticks:Array.from({length:Math.round(ceiling/step)+1},(_,index)=>index*step),y:(value:number)=>bottom-value/ceiling*(bottom-top)};
}
function Grid({width,scale}:{width:number;scale:ReturnType<typeof chartScale>}){
  return <g aria-hidden="true">{scale.ticks.map(value=><g key={value}><line x1={left} x2={width-12} y1={scale.y(value)} y2={scale.y(value)} stroke="var(--border)" strokeDasharray={value?'3 5':undefined}/><text x={left-8} y={scale.y(value)+4} textAnchor="end" fill="var(--text-muted)" fontSize={12}>{number.format(value)}</text></g>)}</g>;
}
function BarChart({items,kind}:{items:{label:string;value:number;detail:string}[];kind:'days'|'types'}){
  const {ref,width:containerWidth}=useChartWidth();
  const width=kind==='types'?Math.max(containerWidth,items.length*88+left+12):containerWidth;
  const scale=chartScale(Math.max(0,...items.map(item=>item.value)));
  const span=(width-left-12)/Math.max(1,items.length);
  const barWidth=Math.max(1,Math.min(kind==='types'?44:30,span*0.65));
  const stride=kind==='types'?1:Math.max(1,Math.ceil(items.length/Math.max(2,Math.floor((width-left)/65))));
  return <div ref={ref} className="min-w-0 overflow-x-auto"><svg width={width} height={height} role="img" aria-label={kind==='days'?'Gráfico de barras: ocorrências registradas por dia':'Gráfico de colunas: ocorrências por tipo'} className="block">
    <Grid width={width} scale={scale}/>
    {items.map((item,index)=>{
      const x=left+span*(index+0.5);
      const short=kind==='types'&&item.label.length>11?`${item.label.slice(0,10)}…`:item.label;
      return <g key={`${item.label}-${index}`}><rect x={x-barWidth/2} y={scale.y(item.value)} width={barWidth} height={bottom-scale.y(item.value)} rx={3} fill={kind==='types'?chartColors.type:chartColors.daily}><title>{item.detail}: {number.format(item.value)} ocorrências</title></rect>
        {items.length<=12&&item.value>0&&<text x={x} y={scale.y(item.value)-6} textAnchor="middle" fill="var(--text)" fontSize={13} fontWeight={600}>{number.format(item.value)}</text>}
        {index%stride===0&&<text x={x} y={bottom+24} textAnchor="middle" fill="var(--text-muted)" fontSize={12}><title>{item.detail}</title>{short}</text>}
      </g>;
    })}
  </svg></div>;
}
function StatusPie({view,presentations}:{view:IndicatorView;presentations:StatusPresentation[]}){
  const total=view.summary.total;
  const segments=presentations.map((item,index)=>{
    const count=view.byStatus[item.code];
    const before=presentations.slice(0,index).reduce((sum,previous)=>sum+view.byStatus[previous.code],0);
    const start=-Math.PI/2+before/Math.max(total,1)*Math.PI*2;
    const angle=start+count/Math.max(total,1)*Math.PI*2;
    const point=(value:number)=>`${110+90*Math.cos(value)} ${110+90*Math.sin(value)}`;
    return {...item,count,path:`M110 110 L${point(start)} A90 90 0 ${angle-start>Math.PI?1:0} 1 ${point(angle)} Z`};
  });
  return <div className="flex min-h-[200px] flex-wrap items-center justify-center gap-5 sm:justify-between">
    {total>0?<svg viewBox="0 0 220 220" className="h-44 w-44 shrink-0" role="img" aria-label="Gráfico de pizza: distribuição das ocorrências por status">{segments.filter(item=>item.count>0).map(item=>item.count===total?<circle key={item.code} cx={110} cy={110} r={90} fill={statusColors[item.code]}><title>{item.label}: {item.count} ocorrências (100%)</title></circle>:<path key={item.code} d={item.path} fill={statusColors[item.code]} stroke="var(--surface)" strokeWidth={2}><title>{item.label}: {item.count} ocorrências ({Math.round(item.count/total*100)}%)</title></path>)}</svg>:<div className="flex h-44 w-44 items-center justify-center rounded-full border border-dashed border-control-border p-8 text-center text-sm text-muted-foreground">Sem ocorrências no período</div>}
    <ul className="min-w-0 flex-1 space-y-3" aria-label="Legenda de status">{segments.map(item=><li key={item.code} className="flex items-center gap-3 text-sm"><span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm" style={{background:statusColors[item.code]}}/><span className="min-w-0 flex-1 break-words">{item.label}</span><span className="font-semibold tabular-nums">{number.format(item.count)}</span><span className="w-12 text-right tabular-nums text-muted-foreground">{total?Math.round(item.count/total*100):0}%</span></li>)}</ul>
  </div>;
}
function ActivityArea({daily}:{daily:DailyActivity[]}){
  const {ref,width}=useChartWidth();
  const scale=chartScale(Math.max(0,...daily.flatMap(item=>[item.opened,item.closed])));
  const span=width-left-12;
  const x=(index:number)=>left+(daily.length===1?span/2:index/(daily.length-1)*span);
  const stride=Math.max(1,Math.ceil(daily.length/Math.max(2,Math.floor(span/65))));
  const points=(key:'opened'|'closed')=>daily.length===1?`${left},${scale.y(daily[0][key])} ${width-12},${scale.y(daily[0][key])}`:daily.map((item,index)=>`${x(index)},${scale.y(item[key])}`).join(' ');
  return <div ref={ref}><div className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-sm"><span className="flex items-center gap-2"><span aria-hidden="true" className="h-0.5 w-5" style={{backgroundColor:chartColors.opened}}/>Abertas</span><span className="flex items-center gap-2"><span aria-hidden="true" className="w-5 border-t-2 border-dashed" style={{borderColor:chartColors.closed}}/>Encerradas</span></div>
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} height={height} className="block" role="img" aria-label="Gráfico de área: ocorrências abertas versus encerradas por dia">
      <Grid width={width} scale={scale}/>
      {(['opened','closed'] as const).map(key=><g key={key}><polygon points={`${left},${bottom} ${points(key)} ${width-12},${bottom}`} fill={key==='opened'?chartColors.opened:chartColors.closed} fillOpacity={0.13}/><polyline points={points(key)} fill="none" stroke={key==='opened'?chartColors.opened:chartColors.closed} strokeWidth={2.5} strokeDasharray={key==='closed'?'6 4':undefined}/></g>)}
      {daily.map((item,index)=>(
        <g key={item.day}>
          {(['opened','closed'] as const).map(key=>(
            <circle key={key} cx={x(index)} cy={scale.y(item[key])} r={daily.length>40?2:3.5} fill={key==='opened'?chartColors.opened:chartColors.closed} stroke="var(--surface)" strokeWidth={1}>
              <title>{fullDate(item.day)}: {item[key]} {key==='opened'?'abertas':'encerradas'}</title>
            </circle>
          ))}
          {index%stride===0&&(
            <text x={x(index)} y={bottom+24} textAnchor={index===0?'start':index===daily.length-1?'end':'middle'} fill="var(--text-muted)" fontSize={12}>{date(item.day)}</text>
          )}
        </g>
      ))}
    </svg>
  </div>;
}

export function DashboardCharts({view,presentations=defaultPresentations}:{view:IndicatorView;presentations?:StatusPresentation[]}){
  // Only configured labels change; stable codes retain consistent meaning and colors.
  const ordered=STATUSES.map(code=>presentations.find(item=>item.code===code)??defaultPresentations.find(item=>item.code===code)!).sort((a,b)=>a.displayOrder-b.displayOrder);
  const movement=view.daily.some(item=>item.opened||item.closed);
  return <div className="grid min-w-0 gap-5 xl:grid-cols-2">
    <ChartFrame title="Ocorrências por dia" description="Registros no período · quantidade por dia" table={<DataTable columns={['Dia','Ocorrências']} rows={view.daily.map(item=>[fullDate(item.day),item.opened])}/>}>
      {view.summary.total?<BarChart kind="days" items={view.daily.map(item=>({label:date(item.day),detail:fullDate(item.day),value:item.opened}))}/>:<EmptyChart>Nenhuma ocorrência registrada neste período.</EmptyChart>}
    </ChartFrame>
    <ChartFrame title="Situação das ocorrências" description="Status atual dos registros do período" table={<DataTable columns={['Status','Quantidade']} rows={ordered.map(item=>[item.label,view.byStatus[item.code]])}/>}><StatusPie view={view} presentations={ordered}/></ChartFrame>
    <ChartFrame title="Ocorrências por tipo" description="Categorias ordenadas pela quantidade de registros" table={<DataTable columns={['Tipo','Quantidade']} rows={view.byType.map(item=>[item.type,item.count])}/>}>
      {view.byType.length?<BarChart kind="types" items={view.byType.map(item=>({label:item.type,detail:item.type,value:item.count}))}/>:<EmptyChart>Nenhum tipo de ocorrência neste período.</EmptyChart>}
    </ChartFrame>
    <ChartFrame title="Abertas e encerradas por dia" description="Entradas e encerramentos efetivos no período" table={<DataTable columns={['Dia','Abertas','Encerradas']} rows={view.daily.map(item=>[fullDate(item.day),item.opened,item.closed])}/>}>
      {movement?<ActivityArea daily={view.daily}/>:<EmptyChart>Nenhuma abertura ou encerramento neste período.</EmptyChart>}
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Abertas: novos registros. Encerradas: resolvidas e canceladas, incluindo registros anteriores ao período. Cada ocorrência conta uma vez por dia de encerramento.</p>
    </ChartFrame>
  </div>;
}
