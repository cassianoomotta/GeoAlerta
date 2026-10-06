import {STATUSES,type Priority,type Status} from '../contracts';
// UTC interval [from,to); the selected end date is included in full.
export type IndicatorQuery={from?:string;to?:string};
export type DailyActivity={day:string;opened:number;closed:number};
export type IndicatorData={byStatus:Partial<Record<Status,number>>;byPriority:Partial<Record<Priority,number>>;byType:{type:string;count:number}[];daily:DailyActivity[]};
export type IndicatorView={summary:{total:number;open:number;inProgress:number;highPriority:number};byStatus:Record<Status,number>;byType:IndicatorData['byType'];daily:DailyActivity[]};
export class IndicatorQueryError extends Error{}
const dayMs=86_400_000;
const calendar=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'});
export function indicatorDay(value:Date):string{
  const parts=calendar.formatToParts(value);
  const part=(name:string)=>parts.find(item=>item.type===name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function readDay(value:string):number{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new IndicatorQueryError('INVALID_DATE');
  const result=Date.parse(`${value}T00:00:00Z`);
  if(!Number.isFinite(result)||new Date(result).toISOString().slice(0,10)!==value)throw new IndicatorQueryError('INVALID_DATE');
  return result;
}
// Resolve the local day's start with the IANA zone, including historical offset changes.
function localMidnight(day:number):number{
  const clock=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  let candidate=day;
  const seen=new Set<number>();
  for(let index=0;index<4;index++){
    seen.add(candidate);
    const parts=clock.formatToParts(new Date(candidate));
    const part=(name:string)=>parts.find(item=>item.type===name)!.value;
    const wallTime=Date.parse(`${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}Z`);
    const next=candidate+day-wallTime;
    if(next===candidate)return candidate;
    if(seen.has(next))return Math.max(candidate,next); // A historical DST jump may skip midnight.
    candidate=next;
  }
  return candidate;
}
export function parseIndicatorQuery(params:URLSearchParams,now=new Date()):IndicatorQuery{
  for(const key of params.keys())if(!['from','to'].includes(key)||params.getAll(key).length!==1)throw new IndicatorQueryError('INVALID_INPUT');
  if(!params.size)return {};
  const to=readDay(params.get('to')??indicatorDay(now));
  const from=params.has('from')?readDay(params.get('from')!):to-30*dayMs;
  if(to<from||to-from>30*dayMs)throw new IndicatorQueryError('INVALID_DATE_RANGE');
  return {from:new Date(localMidnight(from)).toISOString(),to:new Date(localMidnight(to+dayMs)).toISOString()};
}
export function shapeIndicatorView(data:IndicatorData,query:IndicatorQuery):IndicatorView{
  const byStatus=Object.fromEntries(STATUSES.map(status=>[status,data.byStatus[status]??0])) as Record<Status,number>;
  const days=new Map(data.daily.map(item=>[item.day,item]));
  const sorted=[...days.keys()].sort();
  const first=query.from?indicatorDay(new Date(query.from)):sorted[0];
  const last=query.to?indicatorDay(new Date(new Date(query.to).getTime()-1)):sorted.at(-1);
  const daily:DailyActivity[]=[];
  if(first&&last)for(let day=readDay(first),end=readDay(last);day<=end;day+=dayMs){
    const key=new Date(day).toISOString().slice(0,10);
    daily.push(days.get(key)??{day:key,opened:0,closed:0});
  }
  return {summary:{total:Object.values(byStatus).reduce((sum,count)=>sum+count,0),open:byStatus.NOVA+byStatus.EM_TRIAGEM+byStatus.EM_ATENDIMENTO,inProgress:byStatus.EM_ATENDIMENTO,highPriority:data.byPriority.ALTA??0},byStatus,byType:data.byType,daily};
}
