import Link from 'next/link';
import {can} from '@/features/access/domain/permissions';
import {withSession} from '@/server/access/session';
import {listOccurrences} from '@/server/occurrences/list';
import {parseListFilters,listHref,columnLabels,ListInputError,type ListResult,type Column,type ListItem} from '@/features/occurrences/list-input';
import {ColumnPreferences} from '@/features/occurrences/ui/ColumnPreferences';
import {PriorityBadge,StatusBadge} from '@/features/occurrences/ui/OccurrenceBadges';
function cell(item:ListItem,column:Column,labels:Record<string,string>){
  if(column==='protocol')return <Link className="font-medium text-primary underline-offset-2 hover:underline" href={`/painel/ocorrencias/${encodeURIComponent(item.id)}`} aria-label={item.protocol}>{item.protocol}</Link>;
  if(column==='createdAt')return new Date(item.createdAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
  if(column==='groupId')return item.groupName;
  if(column==='status')return <StatusBadge status={item.status} label={labels[item.status]??item.status}/>;
  if(column==='priority')return <PriorityBadge priority={item.priority}/>;
  if(column==='needsMedicalSupport')return item.needsMedicalSupport==null?'Não informado':item.needsMedicalSupport?'Sim':'Não';
  return item[column]??'—';
}
function exportHref(filters:ListResult['filters']){
  const params=new URLSearchParams();
  for(const [key,value]of Object.entries({...filters,page:1,pageSize:100}))if(value!==undefined)params.set(key,Array.isArray(value)?value.join(','):String(value));
  return `/api/core/occurrences/export?${params.toString()}`;
}
function inclusiveEndDate(value?:string){
  if(!value)return '';
  const date=new Date(value);
  date.setUTCDate(date.getUTCDate()-1);
  return date.toISOString().slice(0,10);
}
export default async function Occurrences({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  let result:ListResult;
  let canAdminister=false;
  let canExport=false;
  try{
    const params=new URLSearchParams();for(const [key,value]of Object.entries(await searchParams))if(Array.isArray(value))value.forEach(v=>params.append(key,v));else if(value!==undefined)params.set(key,value);
    const loaded=await withSession(async(tx,actor)=>({result:await listOccurrences(tx,actor,parseListFilters(params)),canAdminister:actor.role==='ADMINISTRADOR',canExport:can(actor,'export',{municipalityId:actor.municipalityId,groupId:actor.groupIds[0]})}));
    result=loaded.result;canAdminister=loaded.canAdminister;canExport=loaded.canExport;
  }catch(error){
    return <section className="p-6"><h1 className="text-2xl font-bold">Ocorrências</h1><p role="alert" className="my-4">{error instanceof ListInputError?'Verifique os filtros e as colunas; o grupo deve estar autorizado.':'Não foi possível carregar a lista. Tente novamente.'}</p><Link href="/painel/ocorrencias">Limpar filtros e tentar novamente</Link></section>;
  }
  const {filters,columns,availableColumns,items,total,groups,statusPresentations,occurrenceTypes,catalogs}=result;
  const labels=Object.fromEntries(statusPresentations.map(item=>[item.code,item.label]));
  const pages=Math.max(1,Math.ceil(total/filters.pageSize));
  const activeFilterCount=[filters.from,filters.to,filters.status,filters.priority,filters.type,filters.categoryStatus,filters.registeringInstitutionCode,filters.neighborhoodCode,filters.localityCode,filters.situation,filters.damageLocationCode,filters.hasVictims,filters.hasDisplaced,filters.agencyCode,filters.groupId,filters.climateEventId].filter(Boolean).length;
  return <section className="space-y-5 p-4 md:p-6">
    <h1 className="text-2xl font-bold">Ocorrências</h1>
    {canExport&&<a className="btn btn-secondary" href={exportHref(filters)}>Baixar CSV das ocorrências filtradas</a>}
    {canAdminister&&<><Link className="inline-flex rounded border border-warning/30 px-3 py-2 text-sm text-warning" href="/painel/ocorrencias/excluidas">Excluídas e restauração</Link><Link className="inline-flex rounded border border-primary/30 px-3 py-2 text-sm text-primary" href="/painel/admin">Administrar usuários e grupos</Link></>}
    <details aria-label="Filtros de ocorrências" className="rounded border border-control-border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        <span>Filtros da ocorrência</span>
        <span className="text-sm font-normal text-muted-foreground">{activeFilterCount?`${activeFilterCount} aplicado(s)`:'Mostrar filtros'} <span aria-hidden="true">▾</span></span>
      </summary>
      <form key={JSON.stringify(filters)} aria-label="Filtros de ocorrências" action="/painel/ocorrencias" method="get" className="grid gap-3 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="page" value="1"/>{filters.columns&&<input type="hidden" name="columns" value={filters.columns.join(',')}/>}
      <label>De (UTC)<input className="block w-full rounded bg-surface p-2" type="date" name="from" defaultValue={filters.from?.slice(0,10)}/></label>
      <label>Até (UTC)<input className="block w-full rounded bg-surface p-2" type="date" name="to" defaultValue={inclusiveEndDate(filters.to)}/></label>
      <label>Status<select className="block w-full rounded bg-surface p-2" name="status" defaultValue={filters.status??''}><option value="">Todos</option>{statusPresentations.map(({code,label})=><option key={code} value={code}>{label}</option>)}</select></label>
      <label>Prioridade<select className="block w-full rounded bg-surface p-2" name="priority" defaultValue={filters.priority??''}><option value="">Todas</option><option value="ALTA">Alta</option><option value="NORMAL">Normal</option></select></label>
      <label>Tipo<select className="block w-full rounded bg-surface p-2" name="type" defaultValue={filters.type??''}><option value="">Todos os tipos</option>{occurrenceTypes.map(type=><option key={type.name} value={type.name}>{type.name}{type.active?'':' (desativada)'}</option>)}</select></label>
      <label>Evento climático<select className="block w-full rounded bg-surface p-2" name="climateEventId" defaultValue={filters.climateEventId??''}><option value="">Todos</option><option value="__NULL__">Sem evento</option>{result.climateEvents.map(event=><option key={event.id} value={event.id}>{event.name} · {event.state.replaceAll('_',' ')}</option>)}</select></label>
      <label>Situação da categoria<select className="block w-full rounded bg-surface p-2" name="categoryStatus" defaultValue={filters.categoryStatus??''}><option value="">Todas</option><option value="active">Ativas</option><option value="inactive">Desativadas</option></select></label>
      <label>Instituição que registrou<select className="block w-full rounded bg-surface p-2" name="registeringInstitutionCode" defaultValue={filters.registeringInstitutionCode??''}><option value="">Todas</option><option value="__NULL__">Não informado</option>{catalogs.registeringInstitutions.map(item=><option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
      <label>Bairro<select className="block w-full rounded bg-surface p-2" name="neighborhoodCode" defaultValue={filters.neighborhoodCode??''}><option value="">Todos</option><option value="__NULL__">Não informado</option>{catalogs.neighborhoods.map(item=><option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
      <label>Localidade<select className="block w-full rounded bg-surface p-2" name="localityCode" defaultValue={filters.localityCode??''}><option value="">Todas</option><option value="__NULL__">Não informado</option>{catalogs.localities.map(item=><option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
      <label>Situação da ocorrência<select className="block w-full rounded bg-surface p-2" name="situation" defaultValue={filters.situation??''}><option value="">Todas</option><option value="__NULL__">Não informado</option><option value="EM_RISCO">Em risco de ocorrer</option><option value="JA_OCORREU">Já ocorreu</option></select></label>
      <label>Local atingido<select className="block w-full rounded bg-surface p-2" name="damageLocationCode" defaultValue={filters.damageLocationCode??''}><option value="">Todos</option><option value="__NULL__">Não informado</option>{catalogs.damageLocations.map(item=><option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
      <label>Vítimas<select className="block w-full rounded bg-surface p-2" name="hasVictims" defaultValue={filters.hasVictims??''}><option value="">Todas</option><option value="__NULL__">Não informado</option><option value="true">Sim</option><option value="false">Não</option></select></label>
      <label>Desabrigados/desalojados<select className="block w-full rounded bg-surface p-2" name="hasDisplaced" defaultValue={filters.hasDisplaced??''}><option value="">Todas</option><option value="__NULL__">Não informado</option><option value="true">Sim</option><option value="false">Não</option></select></label>
      <label>Órgão que atendeu<select className="block w-full rounded bg-surface p-2" name="agencyCode" defaultValue={filters.agencyCode??''}><option value="">Todos</option>{catalogs.serviceAgencies.map(item=><option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
      {groups.length>1?<label>Grupo<select className="block w-full rounded bg-surface p-2" name="groupId" defaultValue={filters.groupId??''}><option value="">Todos autorizados</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>:filters.groupId&&<input type="hidden" name="groupId" value={filters.groupId}/>}
      <label>Ordenar por<select className="block w-full rounded bg-surface p-2" name="sort" defaultValue={filters.sort}><option value="createdAt">Registro</option><option value="priority">Prioridade</option><option value="status">Status</option></select></label>
      <label>Direção<select className="block w-full rounded bg-surface p-2" name="direction" defaultValue={filters.direction}><option value="desc">Decrescente</option><option value="asc">Crescente</option></select></label>
      <label>Por página<select className="block w-full rounded bg-surface p-2" name="pageSize" defaultValue={filters.pageSize}>{[10,25,50,100,...([10,25,50,100].includes(filters.pageSize)?[]:[filters.pageSize])].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
      <button className="self-end rounded bg-primary px-4 py-2 text-primary-foreground">Aplicar filtros</button>
      </form>
    </details>
    <ColumnPreferences key={columns.join(',')} columns={columns} available={availableColumns} filters={filters}/>
    <p role="status">{total} ocorrências · Página {filters.page} de {pages}</p>
    {items.length?<div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Lista de ocorrências autorizadas</caption><thead><tr>{columns.map(c=><th key={c} className="border-b border-control-border p-3">{['createdAt','priority','status'].includes(c)?<Link href={listHref(filters,{sort:c as typeof filters.sort,direction:filters.sort===c&&filters.direction==='desc'?'asc':'desc',page:1})}>{columnLabels[c]}</Link>:columnLabels[c]}</th>)}</tr></thead><tbody>{items.map(item=><tr key={item.id}>{columns.map(c=><td key={c} className="border-b border-border p-3">{cell(item,c,labels)}</td>)}</tr>)}</tbody></table></div>:<p>Nenhuma ocorrência encontrada para estes filtros.</p>}
    <nav aria-label="Paginação" className="flex gap-6">{filters.page>1&&<Link href={listHref(filters,{page:filters.page-1})}>Página anterior</Link>}{filters.page<pages&&<Link href={listHref(filters,{page:filters.page+1})}>Próxima página</Link>}</nav>
  </section>;
}
