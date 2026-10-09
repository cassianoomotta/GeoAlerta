import Link from 'next/link';
import {ArrowDown,ArrowUp,ArrowUpDown} from 'lucide-react';
import {can} from '@/features/access/domain/permissions';
import {withSession} from '@/server/access/session';
import {listOccurrences} from '@/server/occurrences/list';
import {parseListFilters,listHref,columnLabels,OCCURRENCES_PAGE_SIZE,ListInputError,type ListResult,type Column,type ListItem} from '@/features/occurrences/list-input';
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
  for(const [key,value]of Object.entries({...filters,page:1,pageSize:OCCURRENCES_PAGE_SIZE}))if(value!==undefined)params.set(key,Array.isArray(value)?value.join(','):String(value));
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
  let canUseBattalionFlow=false;
  try{
    const params=new URLSearchParams();for(const [key,value]of Object.entries(await searchParams))if(Array.isArray(value))value.forEach(v=>params.append(key,v));else if(value!==undefined)params.set(key,value);
    const loaded=await withSession(async(tx,actor)=>({result:await listOccurrences(tx,actor,parseListFilters(params)),canAdminister:actor.role==='ADMINISTRADOR',canExport:can(actor,'export',{municipalityId:actor.municipalityId,groupId:actor.groupIds[0]}),canUseBattalionFlow:['OPERADOR','GESTOR','ADMINISTRADOR'].includes(actor.role)}));
    result=loaded.result;canAdminister=loaded.canAdminister;canExport=loaded.canExport;canUseBattalionFlow=loaded.canUseBattalionFlow;
  }catch(error){
    return <section className="p-6"><h1 className="text-2xl font-bold">Ocorrências</h1><p role="alert" className="my-4">{error instanceof ListInputError?'Verifique os filtros e as colunas; o grupo deve estar autorizado.':'Não foi possível carregar a lista. Tente novamente.'}</p><Link href="/painel/ocorrencias">Limpar filtros e tentar novamente</Link></section>;
  }
  const {filters,columns,availableColumns,items,total,groups,statusPresentations,occurrenceTypes,catalogs}=result;
  const labels=Object.fromEntries(statusPresentations.map(item=>[item.code,item.label]));
  const pages=Math.max(1,Math.ceil(total/filters.pageSize));
  const firstItem=items.length?(filters.page-1)*filters.pageSize+1:0;
  const lastItem=items.length?firstItem+items.length-1:0;
  const pageNumbers=Array.from(new Set([1,pages,...Array.from({length:5},(_,index)=>filters.page+index-2)]))
    .filter(page=>page>=1&&page<=pages).sort((a,b)=>a-b);
  const paginationClass='inline-flex min-h-12 items-center justify-center rounded-lg border border-control-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  const activeFilterCount=[filters.from,filters.to,filters.status,filters.priority,filters.type,filters.registrationChannel,filters.categoryStatus,filters.registeringInstitutionCode,filters.neighborhoodCode,filters.localityCode,filters.situation,filters.damageLocationCode,filters.hasVictims,filters.hasDisplaced,filters.agencyCode,filters.groupId,filters.climateEventId].filter(Boolean).length;
  return <section className="space-y-5 p-4 md:p-6">
    <h1 className="text-2xl font-bold">Ocorrências</h1>
    {canUseBattalionFlow&&<Link className="inline-flex rounded bg-primary px-4 py-2 font-medium text-primary-foreground" href="/painel/ocorrencias/rapida">Registro rápido do batalhão</Link>}
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
      <label>Origem do registro<select className="block w-full rounded bg-surface p-2" name="registrationChannel" defaultValue={filters.registrationChannel??''}><option value="">Todas</option><option value="PUBLICO">Cidadão</option><option value="MANUAL">Painel</option><option value="BATALHAO">Batalhão</option><option value="__NULL__">Não identificada</option></select></label>
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
      <label>Ordenar por<select className="block w-full rounded bg-surface p-2" name="sort" defaultValue={filters.sort}>{availableColumns.map(column=><option key={column} value={column}>{columnLabels[column]}</option>)}</select></label>
      <label>Direção<select className="block w-full rounded bg-surface p-2" name="direction" defaultValue={filters.direction}><option value="desc">Decrescente</option><option value="asc">Crescente</option></select></label>
      <input type="hidden" name="pageSize" value={OCCURRENCES_PAGE_SIZE}/>
      <button className="self-end rounded bg-primary px-4 py-2 text-primary-foreground">Aplicar filtros</button>
      </form>
    </details>
    <ColumnPreferences key={columns.join(',')} columns={columns} available={availableColumns} filters={filters}/>
    {items.length?<div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Lista de ocorrências autorizadas</caption><thead><tr>{columns.map(c=>{
      const active=filters.sort===c;
      const direction=active&&filters.direction==='desc'?'asc':'desc';
      const Icon=active?(filters.direction==='desc'?ArrowDown:ArrowUp):ArrowUpDown;
      const noWrap=c==='protocol';
      return <th key={c} aria-sort={active?(filters.direction==='asc'?'ascending':'descending'):'none'} className={`border-b border-control-border bg-primary/20 p-3 ${noWrap?'whitespace-nowrap':''}`}><Link className="inline-flex items-center gap-1 whitespace-nowrap hover:text-primary" aria-label={`Ordenar por ${columnLabels[c]}`} href={listHref(filters,{sort:c,direction,page:1})}><span>{columnLabels[c]}</span><Icon size={15} aria-hidden="true" /></Link></th>;
    })}</tr></thead><tbody>{items.map(item=><tr key={item.id} className="transition-colors hover:bg-primary/10 focus-within:bg-primary/10">{columns.map(c=><td key={c} className={`border-b border-border p-3 ${c==='status'?'whitespace-nowrap':''}`}>{cell(item,c,labels)}</td>)}</tr>)}</tbody></table></div>:<p>Nenhuma ocorrência encontrada para estes filtros.</p>}
    <nav aria-label="Paginação de ocorrências" className="flex flex-col items-center gap-3 border-t border-border pt-5 text-center">
      <div role="status" className="space-y-1">
        <p className="text-sm font-medium text-foreground">{items.length?`Exibindo ${firstItem}–${lastItem} de ${total} ocorrências`:total?`Nenhuma ocorrência nesta página · ${total} no total`:'0 ocorrências encontradas'}</p>
        <p className="text-sm text-muted-foreground">Página {filters.page} de {pages} · {OCCURRENCES_PAGE_SIZE} por página</p>
      </div>
      <div className="flex w-full flex-wrap items-center justify-center gap-2">
        {filters.page>1?<Link prefetch={false} className={paginationClass} href={listHref(filters,{page:filters.page-1})}>Página anterior</Link>:<span aria-disabled="true" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border bg-disabled px-4 py-2 text-sm text-disabled-text">Página anterior</span>}
        <div className="order-last flex w-full flex-wrap justify-center gap-2 sm:order-none sm:w-auto">
          {pageNumbers.map((page,index)=><span key={page} className="inline-flex items-center gap-2">
            {index>0&&page-pageNumbers[index-1]>1&&<span className="px-1 text-muted-foreground"><span aria-hidden="true">…</span><span className="sr-only">Páginas intermediárias</span></span>}
            {page===filters.page?<span aria-current="page" aria-label={`Página ${page}, atual`} className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">{page}</span>:<Link prefetch={false} aria-label={`Ir para página ${page}`} className={`${paginationClass} min-w-12`} href={listHref(filters,{page})}>{page}</Link>}
          </span>)}
        </div>
        {filters.page<pages?<Link prefetch={false} className={paginationClass} href={listHref(filters,{page:filters.page+1})}>Próxima página</Link>:<span aria-disabled="true" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border bg-disabled px-4 py-2 text-sm text-disabled-text">Próxima página</span>}
      </div>
    </nav>
  </section>;
}
