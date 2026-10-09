import type {Priority,Status} from './contracts';

export type CoreAlert={eventId:string;occurrenceId:string;groupId:string;priority:Priority;status:Status;at:string};
export type AlertOccurrenceMetadata=Record<string,{protocol:string;type:string}>;

const statuses:readonly Status[]=['NOVA','EM_TRIAGEM','EM_ATENDIMENTO','RESOLVIDA','CANCELADA'];
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseCoreAlert(value:unknown):CoreAlert|null{
  if(typeof value!=='object'||value===null||Array.isArray(value))return null;
  const row=value as Record<string,unknown>;
  if(typeof row.event_id!=='string'||!uuid.test(row.event_id)||typeof row.occurrence_id!=='string'||!uuid.test(row.occurrence_id)||
    typeof row.group_id!=='string'||!uuid.test(row.group_id)||(row.priority!=='NORMAL'&&row.priority!=='ALTA')||
    typeof row.status!=='string'||!statuses.includes(row.status as Status)||typeof row.at!=='string'||!Number.isFinite(Date.parse(row.at)))return null;
  return {eventId:row.event_id,occurrenceId:row.occurrence_id,groupId:row.group_id,priority:row.priority,status:row.status as Status,at:new Date(row.at).toISOString()};
}

export function parseAlertOccurrenceMetadata(value:unknown):AlertOccurrenceMetadata{
  if(!Array.isArray(value))return {};
  const result:AlertOccurrenceMetadata={};
  for(const item of value){
    if(typeof item!=='object'||item===null||Array.isArray(item))continue;
    const row=item as Record<string,unknown>;
    if(typeof row.id!=='string'||!uuid.test(row.id)||typeof row.protocol!=='string'||!row.protocol.trim()||row.protocol.length>80||typeof row.type!=='string'||!row.type.trim()||row.type.length>200)continue;
    result[row.id]={protocol:row.protocol.trim(),type:row.type.trim()};
  }
  return result;
}

export function mergeCoreAlerts(current:readonly CoreAlert[],incoming:readonly CoreAlert[],limit=20):CoreAlert[]{
  const byId=new Map<string,CoreAlert>();
  for(const alert of incoming)byId.set(alert.eventId,alert);
  for(const alert of current)if(!byId.has(alert.eventId))byId.set(alert.eventId,alert);
  return [...byId.values()].sort((left,right)=>right.at.localeCompare(left.at)||left.eventId.localeCompare(right.eventId)).slice(0,limit);
}

export function isRealtimeAuthorizationFailure(error:unknown):boolean{
  const message=error instanceof Error?error.message:typeof error==='string'?error:'';
  return /unauthori[sz]ed|forbidden|permission denied|access denied|row-level security|invalid jwt|jwt expired|expired token/i.test(message);
}
