import type {DashboardView,Priority,Status} from '../contracts';

export type DashboardMapQuery={west:number;south:number;east:number;north:number;from:string;to:string};
export type DashboardMarker=DashboardView['markers'][number];
export class DashboardQueryError extends Error{}

const statusValues:readonly Status[]=['NOVA','EM_TRIAGEM','EM_ATENDIMENTO','RESOLVIDA','CANCELADA'];
const priorityValues:readonly Priority[]=['NORMAL','ALTA'];
const cityBounds={west:-50.65,south:-29.95,east:-50.35,north:-29.70};

function readDate(value:string|undefined,fallback:Date,end:boolean):Date{
  if(value===undefined)return fallback;
  if(!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value))throw new DashboardQueryError('INVALID_DATE');
  const normalized=value.length===10?`${value}T${end?'23:59:59.999':'00:00:00.000'}Z`:value;
  const result=new Date(normalized);
  if(!Number.isFinite(result.getTime())||result.toISOString().slice(0,10)!==value.slice(0,10))throw new DashboardQueryError('INVALID_DATE');
  return result;
}

export function parseDashboardQuery(params:URLSearchParams,now=new Date()):DashboardMapQuery{
  const allowed=new Set(['west','south','east','north','from','to']);
  for(const key of params.keys())if(!allowed.has(key)||params.getAll(key).length!==1)throw new DashboardQueryError('INVALID_INPUT');
  const boundNames=['west','south','east','north'] as const;
  const present=boundNames.filter(name=>params.has(name)).length;
  if(present!==0&&present!==4)throw new DashboardQueryError('INVALID_BOUNDS');
  const bounds=present===0?cityBounds:Object.fromEntries(boundNames.map(name=>{
    const value=Number(params.get(name));
    if(!Number.isFinite(value))throw new DashboardQueryError('INVALID_BOUNDS');
    return [name,value];
  })) as typeof cityBounds;
  if(bounds.west < -180||bounds.east>180||bounds.south < -90||bounds.north>90||bounds.west>=bounds.east||bounds.south>=bounds.north)throw new DashboardQueryError('INVALID_BOUNDS');
  const to=readDate(params.get('to')??undefined,now,true);
  const from=readDate(params.get('from')??undefined,new Date(to.getTime()-7*24*60*60*1000),false);
  const duration=to.getTime()-from.getTime();
  if(duration<0||duration>31*24*60*60*1000)throw new DashboardQueryError('INVALID_DATE_RANGE');
  return {...bounds,from:from.toISOString(),to:to.toISOString()};
}

export function shapeDashboardView(
  candidates:readonly DashboardMarker[],
  byStatus:Partial<Record<Status,number>>,
  byPriority:Partial<Record<Priority,number>>,
  limit=1000,
):DashboardView{
  return {
    markers:candidates.slice(0,limit),
    counts:{
      byStatus:Object.fromEntries(statusValues.map(status=>[status,byStatus[status]??0])) as Record<Status,number>,
      byPriority:Object.fromEntries(priorityValues.map(priority=>[priority,byPriority[priority]??0])) as Record<Priority,number>,
    },
    limited:candidates.length>limit,
  };
}
