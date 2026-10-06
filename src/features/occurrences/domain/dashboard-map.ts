import type {DashboardView,Priority,Status} from '../contracts';

export type DashboardBounds={west:number;south:number;east:number;north:number};
export type DashboardMapQuery=Partial<DashboardBounds>&{from?:string;to?:string;statuses?:Status[];priorities?:Priority[];types?:string[]};
export type DashboardMarker=DashboardView['markers'][number];
export class DashboardQueryError extends Error{}

const statusValues:readonly Status[]=['NOVA','EM_TRIAGEM','EM_ATENDIMENTO','RESOLVIDA','CANCELADA'];
const priorityValues:readonly Priority[]=['NORMAL','ALTA'];
const cityBounds={west:-50.65,south:-29.95,east:-50.35,north:-29.70};

export function dashboardMapBounds(markers:readonly Pick<DashboardMarker,'latitude'|'longitude'>[]=[]):[[number,number],[number,number]]{
  if(!markers.length)return [[cityBounds.south,cityBounds.west],[cityBounds.north,cityBounds.east]];
  const latitudes=markers.map(marker=>marker.latitude),longitudes=markers.map(marker=>marker.longitude);
  const minLatitude=Math.min(...latitudes),maxLatitude=Math.max(...latitudes);
  const minLongitude=Math.min(...longitudes),maxLongitude=Math.max(...longitudes);
  const latitudeCenter=(minLatitude+maxLatitude)/2,longitudeCenter=(minLongitude+maxLongitude)/2;
  const latitudeRadius=Math.max((maxLatitude-minLatitude)/2,0.01);
  const longitudeRadius=Math.max((maxLongitude-minLongitude)/2,0.01);
  const round=(coordinate:number)=>Math.round(coordinate*1_000_000)/1_000_000;
  return [[round(latitudeCenter-latitudeRadius),round(longitudeCenter-longitudeRadius)],[round(latitudeCenter+latitudeRadius),round(longitudeCenter+longitudeRadius)]];
}

function readDate(value:string|undefined,fallback:Date,end:boolean):Date{
  if(value===undefined)return fallback;
  if(!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value))throw new DashboardQueryError('INVALID_DATE');
  const normalized=value.length===10?`${value}T${end?'23:59:59.999':'00:00:00.000'}Z`:value;
  const result=new Date(normalized);
  if(!Number.isFinite(result.getTime())||result.toISOString().slice(0,10)!==value.slice(0,10))throw new DashboardQueryError('INVALID_DATE');
  return result;
}

export function parseDashboardQuery(params:URLSearchParams,now=new Date()):DashboardMapQuery{
  const multiple=new Set(['status','priority','type']);
  const allowed=new Set(['west','south','east','north','from','to',...multiple]);
  for(const key of params.keys())if(!allowed.has(key)||(!multiple.has(key)&&params.getAll(key).length!==1))throw new DashboardQueryError('INVALID_INPUT');
  const boundNames=['west','south','east','north'] as const;
  const present=boundNames.filter(name=>params.has(name)).length;
  if(present!==0&&present!==4)throw new DashboardQueryError('INVALID_BOUNDS');
  const bounds=present===0?undefined:Object.fromEntries(boundNames.map(name=>{
    const value=Number(params.get(name));
    if(!Number.isFinite(value))throw new DashboardQueryError('INVALID_BOUNDS');
    return [name,value];
  })) as DashboardBounds;
  if(bounds&&(bounds.west < -180||bounds.east>180||bounds.south < -90||bounds.north>90||bounds.west>=bounds.east||bounds.south>=bounds.north))throw new DashboardQueryError('INVALID_BOUNDS');
  function selection(name:string,max:number|undefined,valid:(value:string)=>boolean):string[]|undefined{
    if(!params.has(name))return undefined;
    const values=params.getAll(name);
    if(values.length===1&&values[0]==='')return [];
    if((max!==undefined&&values.length>max)||new Set(values).size!==values.length||values.some(value=>!valid(value)))throw new DashboardQueryError('INVALID_FILTER');
    return values;
  }
  const statuses=selection('status',5,value=>statusValues.includes(value as Status)) as Status[]|undefined;
  const priorities=selection('priority',2,value=>priorityValues.includes(value as Priority)) as Priority[]|undefined;
  const types=selection('type',undefined,value=>value.length>0&&value.length<=120&&value.trim()===value&&!/[\u0000-\u001f]/.test(value));
  const filters={...(statuses!==undefined?{statuses}:{}),...(priorities!==undefined?{priorities}:{}),...(types!==undefined?{types}:{})};
  const hasDateFilter=params.has('from')||params.has('to');
  if(!hasDateFilter)return {...bounds,...filters};
  const to=readDate(params.get('to')??undefined,now,true);
  const from=readDate(params.get('from')??undefined,new Date(to.getTime()-31*24*60*60*1000),false);
  const duration=to.getTime()-from.getTime();
  if(duration<0||duration>31*24*60*60*1000)throw new DashboardQueryError('INVALID_DATE_RANGE');
  return {...bounds,...filters,from:from.toISOString(),to:to.toISOString()};
}

export function shapeDashboardView(
  candidates:readonly DashboardMarker[],
  byStatus:Partial<Record<Status,number>>,
  byPriority:Partial<Record<Priority,number>>,
  limit=1000,
  metadata:{availableTypes?:string[];matchingCount?:number}={},
):DashboardView{
  return {
    markers:candidates.slice(0,limit),
    counts:{
      byStatus:Object.fromEntries(statusValues.map(status=>[status,byStatus[status]??0])) as Record<Status,number>,
      byPriority:Object.fromEntries(priorityValues.map(priority=>[priority,byPriority[priority]??0])) as Record<Priority,number>,
    },
    availableTypes:metadata.availableTypes??[],
    matchingCount:metadata.matchingCount??Object.values(byStatus).reduce((total,count)=>total+(count??0),0),
    limited:candidates.length>limit,
  };
}
