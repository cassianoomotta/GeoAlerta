import {STATUSES,type Priority,type Status} from '../contracts';

export type EventDashboardEvent={id:string;name:string;state:'EM_ANDAMENTO'|'ENCERRADO';plannedStart:string;plannedEnd:string;startedAt:string|null;endedAt:string|null};
export type EventDashboardQuery={primaryEventId?:string;comparisonEventId?:string};
export type EventDashboardPresentation={code:Status;label:string;displayOrder:number};
export type EventDashboardRawMetric={
  event:EventDashboardEvent;
  total:number;
  byType:{type:string;count:number}[];
  byPriority:Partial<Record<Priority,number>>;
  byMedicalSupport:{yes?:number;no?:number;unknown?:number};
  byStatus:Partial<Record<Status,number>>;
};
export type EventDashboardBucket={label:string;count:number;percentage:number};
export type EventDashboardStatusBucket=EventDashboardBucket&{code:Status};
export type EventDashboardMetric={event:EventDashboardEvent;total:number;open:number;closed:number;cancelled:number;byType:EventDashboardBucket[];byPriority:EventDashboardBucket[];byMedicalSupport:EventDashboardBucket[];byStatus:EventDashboardStatusBucket[]};

export class EventDashboardQueryError extends Error{}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseEventDashboardQuery(params:URLSearchParams):EventDashboardQuery{
  for(const key of params.keys())if(!['primary','comparison'].includes(key)||params.getAll(key).length!==1)throw new EventDashboardQueryError('INVALID_INPUT');
  const primary=params.get('primary')??undefined;
  const comparison=params.get('comparison')??undefined;
  if((primary&&!uuid.test(primary))||(comparison&&!uuid.test(comparison))||(primary&&comparison&&primary.toLowerCase()===comparison.toLowerCase()))throw new EventDashboardQueryError('INVALID_SELECTION');
  return { ...(primary?{primaryEventId:primary.toLowerCase()}:{}), ...(comparison?{comparisonEventId:comparison.toLowerCase()}:{}) };
}

const fallbackLabels:Record<Status,string>={NOVA:'Nova',EM_TRIAGEM:'Em triagem',EM_ATENDIMENTO:'Em atendimento',RESOLVIDA:'Resolvida',CANCELADA:'Cancelada'};
function bucket(label:string,count:number,total:number):EventDashboardBucket{
  return {label,count,percentage:total>0?Math.round((count/total)*1000)/10:0};
}

export function shapeEventDashboardMetrics(raw:EventDashboardRawMetric[],presentations:EventDashboardPresentation[]):EventDashboardMetric[]{
  const orderedStatuses=STATUSES.map(code=>presentations.find(item=>item.code===code)??{code,label:fallbackLabels[code],displayOrder:STATUSES.indexOf(code)+1}).sort((a,b)=>a.displayOrder-b.displayOrder);
  const eventTypes=[...new Set(raw.flatMap(item=>item.byType.map(type=>type.type)))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  return raw.map(item=>{
    const total=item.total;
    const byStatus=orderedStatuses.map(status=>({code:status.code,...bucket(status.label,item.byStatus[status.code]??0,total)}));
    return {
      event:item.event,total,
      open:(item.byStatus.NOVA??0)+(item.byStatus.EM_TRIAGEM??0)+(item.byStatus.EM_ATENDIMENTO??0),
      closed:item.byStatus.RESOLVIDA??0,
      cancelled:item.byStatus.CANCELADA??0,
      byType:eventTypes.map(type=>bucket(type,item.byType.find(value=>value.type===type)?.count??0,total)),
      byPriority:(['NORMAL','ALTA'] as const).map(code=>bucket(code==='ALTA'?'Alta':'Normal',item.byPriority[code]??0,total)),
      byMedicalSupport:[bucket('Sim',item.byMedicalSupport.yes??0,total),bucket('Não',item.byMedicalSupport.no??0,total),bucket('Não informado',item.byMedicalSupport.unknown??0,total)],
      byStatus,
    };
  });
}
