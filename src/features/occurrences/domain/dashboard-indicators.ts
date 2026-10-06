import type {Status} from '../contracts';

export const DASHBOARD_TIME_ZONE='America/Sao_Paulo';
export type DashboardIndicatorsPeriod='today'|'week'|'month'|'custom';
export type DashboardIndicatorsQuery={
  period:DashboardIndicatorsPeriod;
  from:string;
  to:string;
  neighborhoodCode?:string;
};
export type DashboardIndicatorsData={
  totals:{registered:number;open:number;inService:number;resolved:number;cancelled:number};
  daily:{date:string;total:number}[];
  byNeighborhood:{code:string|null;label:string;total:number}[];
  byType:{label:string;total:number}[];
  neighborhoods:{code:string;label:string}[];
  byStatus:Partial<Record<Status,number>>;
};
export type DashboardIndicatorsView=DashboardIndicatorsData&{
  window:DashboardIndicatorsQuery&{timeZone:string};
};
export class DashboardIndicatorsQueryError extends Error{}

function calendarDate(date:Date,timeZone:string):string{
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const part=(type:Intl.DateTimeFormatPartTypes)=>parts.find(item=>item.type===type)?.value??'';
  return part('year')+'-'+part('month')+'-'+part('day');
}

function shiftDay(value:string,days:number):string{
  const date=new Date(value+'T12:00:00.000Z');
  date.setUTCDate(date.getUTCDate()+days);
  return date.toISOString().slice(0,10);
}

function localMidnight(value:string,timeZone:string):Date{
  const [year,month,day]=value.split('-').map(Number);
  const desired=Date.UTC(year,month-1,day);
  let candidate=desired;
  const formatter=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  for(let attempt=0;attempt<4;attempt++){
    const parts=formatter.formatToParts(new Date(candidate));
    const part=(type:Intl.DateTimeFormatPartTypes)=>Number(parts.find(item=>item.type===type)?.value??0);
    const represented=Date.UTC(part('year'),part('month')-1,part('day'),part('hour'),part('minute'),part('second'));
    const correction=desired-represented;
    candidate+=correction;
    if(correction===0)break;
  }
  return new Date(candidate);
}

function validCalendarDate(value:string|undefined):value is string{
  return !!value&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&new Date(value+'T12:00:00.000Z').toISOString().slice(0,10)===value;
}

function calendarDaysBetween(start:string,end:string):number{
  const first=Date.parse(start+'T12:00:00.000Z');
  const last=Date.parse(end+'T12:00:00.000Z');
  return Math.round((last-first)/86_400_000)+1;
}

export function parseDashboardIndicatorsQuery(
  params:URLSearchParams,
  now=new Date(),
  timeZone=DASHBOARD_TIME_ZONE,
):DashboardIndicatorsQuery{
  const allowed=new Set(['period','from','to','neighborhood']);
  for(const key of params.keys())if(!allowed.has(key)||params.getAll(key).length!==1)throw new DashboardIndicatorsQueryError('INVALID_INPUT');

  const period=(params.get('period')??'today') as DashboardIndicatorsPeriod;
  if(!['today','week','month','custom'].includes(period))throw new DashboardIndicatorsQueryError('INVALID_PERIOD');
  const neighborhoodCode=params.get('neighborhood')??undefined;
  if(neighborhoodCode!==undefined&&!/^[A-Za-z0-9_-]{1,40}$/.test(neighborhoodCode))throw new DashboardIndicatorsQueryError('INVALID_NEIGHBORHOOD');

  let start:string;
  let end:string;
  if(period==='custom'){
    const from=params.get('from')??undefined;
    const to=params.get('to')??undefined;
    if(!validCalendarDate(from)||!validCalendarDate(to)||from>to||calendarDaysBetween(from,to)>366)throw new DashboardIndicatorsQueryError('INVALID_DATE_RANGE');
    start=from;
    end=shiftDay(to,1);
  }else{
    if(params.has('from')||params.has('to'))throw new DashboardIndicatorsQueryError('INVALID_INPUT');
    const today=calendarDate(now,timeZone);
    end=shiftDay(today,1);
    if(period==='today')start=today;
    else if(period==='month')start=today.slice(0,8)+'01';
    else{
      const weekday=new Date(today+'T12:00:00.000Z').getUTCDay();
      start=shiftDay(today,-((weekday+6)%7));
    }
  }

  return {
    period,
    from:localMidnight(start,timeZone).toISOString(),
    to:localMidnight(end,timeZone).toISOString(),
    ...(neighborhoodCode?{neighborhoodCode}:{}),
  };
}

