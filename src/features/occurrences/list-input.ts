import {STATUSES,type OccurrenceRow,type OccurrenceFilters,type Status,type Priority} from './contracts';
export const statuses = STATUSES;
export const publicColumns = ['protocol','createdAt','status','priority','type','groupId','needsMedicalSupport'] as const;
export const privateColumns = ['reporterName','reporterContact'] as const;
export type Column = typeof publicColumns[number] | typeof privateColumns[number];
export const columnLabels: Record<Column,string> = {protocol:'Protocolo',createdAt:'Registro',status:'Status',priority:'Prioridade',type:'Tipo',groupId:'Grupo',needsMedicalSupport:'Apoio médico',reporterName:'Nome do cidadão',reporterContact:'Contato do cidadão'};
export type CategoryStatus='active'|'inactive';
export type NullableFilter = string | '__NULL__';
export type BooleanFilter = 'true' | 'false' | '__NULL__';
export type ListFilters = OccurrenceFilters & {
  categoryStatus?:CategoryStatus;
  registeringInstitutionCode?:NullableFilter;
  neighborhoodCode?:NullableFilter;
  localityCode?:NullableFilter;
  situation?:'EM_RISCO'|'JA_OCORREU'|'__NULL__';
  damageLocationCode?:NullableFilter;
  hasVictims?:BooleanFilter;
  hasDisplaced?:BooleanFilter;
  agencyCode?:string;
  page:number;pageSize:number;sort:'createdAt'|'priority'|'status';direction:'asc'|'desc';columns?:string[]
};
export type ListItem = OccurrenceRow & {groupName:string;needsMedicalSupport?:boolean|null;reporterName?:string|null;reporterContact?:string|null};
export type ListCatalogs = {
  registeringInstitutions:{code:string;label:string}[];
  neighborhoods:{code:string;label:string}[];
  localities:{code:string;label:string}[];
  damageLocations:{code:string;label:string}[];
  serviceAgencies:{code:string;label:string}[];
};
export type ListResult = {items:ListItem[];total:number;page:number;pageSize:number;filters:ListFilters;columns:Column[];availableColumns:Column[];groups:{id:string;name:string}[];statusPresentations:{code:Status;label:string;displayOrder:number}[];occurrenceTypes:{name:string;active:boolean}[];catalogs:ListCatalogs};
export class ListInputError extends Error {constructor(public status:422|403=422){super('INVALID_LIST_INPUT');}}
export function availableColumns(privateData:boolean):Column[]{return privateData?[...publicColumns,...privateColumns]:[...publicColumns];}
export function validateColumns(value:unknown,allowed:readonly string[]):Column[]{
  if(!Array.isArray(value)||value.length<1||value.length>allowed.length||!value.every(c=>typeof c==='string'&&allowed.includes(c))||new Set(value).size!==value.length)throw new ListInputError();
  return value as Column[];
}
function date(value:string,end:boolean){
  if(!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/.test(value))throw new ListInputError();
  const d=new Date(value.length===10?`${value}T00:00:00.000Z`:value);
  if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value.slice(0,10))throw new ListInputError();
  if(end&&value.length===10)d.setUTCDate(d.getUTCDate()+1);
  return d.toISOString();
}
export function parseListFilters(params:URLSearchParams):ListFilters{
  const keys=['from','to','status','priority','type','categoryStatus','groupId','page','pageSize','sort','direction','columns','registeringInstitutionCode','neighborhoodCode','localityCode','situation','damageLocationCode','hasVictims','hasDisplaced','agencyCode'];
  for(const key of params.keys())if(!keys.includes(key)||params.getAll(key).length!==1)throw new ListInputError();
  const get=(key:string)=>params.get(key)?.trim()||undefined;
  const integer=(key:string,fallback:number,max:number)=>{const v=get(key);if(!v)return fallback;if(!/^[1-9]\d*$/.test(v)||!Number.isSafeInteger(Number(v))||Number(v)>max)throw new ListInputError();return Number(v);};
  const sort=get('sort')??'createdAt',direction=get('direction')??'desc';
  const status=get('status'),priority=get('priority'),type=get('type'),categoryStatus=get('categoryStatus'),groupId=get('groupId');
  const code=(key:string):NullableFilter|undefined=>{
    const value=get(key);
    if(!value)return undefined;
    if(value==='__NULL__')return value;
    if(!/^[A-Z0-9]+(?:_[A-Z0-9]+)*$/.test(value)||value.length>80)throw new ListInputError();
    return value;
  };
  const bool=(key:string):BooleanFilter|undefined=>{
    const value=get(key);
    if(!value)return undefined;
    if(!['true','false','__NULL__'].includes(value))throw new ListInputError();
    return value as BooleanFilter;
  };
  const registeringInstitutionCode=code('registeringInstitutionCode'),neighborhoodCode=code('neighborhoodCode'),localityCode=code('localityCode'),damageLocationCode=code('damageLocationCode'),agencyCode=code('agencyCode');
  const situation=get('situation');
  if(!['createdAt','priority','status'].includes(sort)||!['asc','desc'].includes(direction)||status&&!statuses.includes(status as typeof statuses[number])||priority&&!['ALTA','NORMAL'].includes(priority)||type&&type.length>80||categoryStatus&&!['active','inactive'].includes(categoryStatus)||groupId&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(groupId)||situation&&!['EM_RISCO','JA_OCORREU','__NULL__'].includes(situation)||agencyCode==='__NULL__')throw new ListInputError();
  const from=get('from')?date(get('from')!,false):undefined,to=get('to')?date(get('to')!,true):undefined;
  if(from&&to&&from>=to)throw new ListInputError();
  return {from,to,status:status as Status|undefined,priority:priority as Priority|undefined,type,categoryStatus:categoryStatus as CategoryStatus|undefined,groupId,registeringInstitutionCode,neighborhoodCode,localityCode,situation:situation as ListFilters['situation'],damageLocationCode,hasVictims:bool('hasVictims'),hasDisplaced:bool('hasDisplaced'),agencyCode,page:integer('page',1,1000000),pageSize:integer('pageSize',50,100),sort:sort as ListFilters['sort'],direction:direction as ListFilters['direction'],...(get('columns')?{columns:get('columns')!.split(',')}:{})};
}
export function listHref(filters:ListFilters,patch:Partial<ListFilters>={}){
  const params=new URLSearchParams();for(const [k,v]of Object.entries({...filters,...patch}))if(v!==undefined&&v!=='')params.set(k,Array.isArray(v)?v.join(','):String(v));
  return `/painel/ocorrencias?${params}`;
}
