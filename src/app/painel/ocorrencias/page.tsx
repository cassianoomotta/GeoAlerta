import Link from 'next/link';
import {can} from '@/features/access/domain/permissions';
import {withSession} from '@/server/access/session';
import {listOccurrences} from '@/server/occurrences/list';
import {parseListFilters,listHref,columnLabels,ListInputError,type ListResult,type Column,type ListItem} from '@/features/occurrences/list-input';
import {ColumnPreferences} from '@/features/occurrences/ui/ColumnPreferences';
import {ManualOccurrenceForm} from '@/features/occurrences/ui/ManualOccurrenceForm';
function cell(item:ListItem,column:Column,labels:Record<string,string>){
  if(column==='createdAt')return new Date(item.createdAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
  if(column==='groupId')return item.groupName;
  if(column==='status')return labels[item.status]??item.status;
  return item[column]??'—';
}
function exportHref(filters:ListResult['filters']){
  const params=new URLSearchParams();
  for(const [key,value]of Object.entries({...filters,page:1,pageSize:100}))if(value!==undefined)params.set(key,Array.isArray(value)?value.join(','):String(value));
  return `/api/core/occurrences/export?${params.toString()}`;
}
export default async function Occurrences({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  let result:ListResult;
  let canCreate=false;
  let canAdminister=false;
  let canExport=false;
  try{
    const params=new URLSearchParams();for(const [key,value]of Object.entries(await searchParams))if(Array.isArray(value))value.forEach(v=>params.append(key,v));else if(value!==undefined)params.set(key,value);
    const loaded=await withSession(async(tx,actor)=>({result:await listOccurrences(tx,actor,parseListFilters(params)),canCreate:actor.role!=='CONSULTA',canAdminister:actor.role==='ADMINISTRADOR',canExport:can(actor,'export',{municipalityId:actor.municipalityId,groupId:actor.groupIds[0]})}));
    result=loaded.result;canCreate=loaded.canCreate;canAdminister=loaded.canAdminister;canExport=loaded.canExport;
  }catch(error){
    return <section className="p-6"><h1 className="text-2xl font-bold">Ocorrências</h1><p role="alert" className="my-4">{error instanceof ListInputError?'Verifique os filtros e as colunas; o grupo deve estar autorizado.':'Não foi possível carregar a lista. Tente novamente.'}</p><Link href="/painel/ocorrencias">Limpar filtros e tentar novamente</Link></section>;
  }
  const {filters,columns,availableColumns,items,total,groups,statusPresentations}=result;
  const labels=Object.fromEntries(statusPresentations.map(item=>[item.code,item.label]));
  const pages=Math.max(1,Math.ceil(total/filters.pageSize));
  return <section className="space-y-5 p-4 md:p-6">
    <h1 className="text-2xl font-bold">Ocorrências</h1>
    {canExport&&<a className="inline-flex rounded border border-emerald-400/30 px-3 py-2 text-sm text-emerald-100" href={exportHref(filters)}>Baixar CSV das ocorrências filtradas</a>}
    {canAdminister&&<><Link className="inline-flex rounded border border-amber-400/30 px-3 py-2 text-sm text-amber-100" href="/painel/ocorrencias/excluidas">Excluídas e restauração</Link><Link className="inline-flex rounded border border-blue-400/30 px-3 py-2 text-sm text-blue-100" href="/painel/admin">Administrar usuários e grupos</Link></>}
    {canCreate&&groups.length>0&&<ManualOccurrenceForm groups={groups}/>}
    <nav aria-label="Atalhos por status" className="flex flex-wrap gap-3"><Link href={listHref(filters,{status:undefined,page:1})}>Todos os status</Link>{statusPresentations.map(({code,label})=><Link key={code} href={listHref(filters,{status:code,page:1})}>{label}</Link>)}</nav>
    <form key={JSON.stringify(filters)} aria-label="Filtros de ocorrências" action="/painel/ocorrencias" method="get" className="grid gap-3 rounded border border-slate-600 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="page" value="1"/>{filters.columns&&<input type="hidden" name="columns" value={filters.columns.join(',')}/>}
      <label>De (UTC)<input className="block w-full rounded bg-slate-900 p-2" type="date" name="from" defaultValue={filters.from?.slice(0,10)}/></label>
      <label>Até (UTC)<input className="block w-full rounded bg-slate-900 p-2" type="date" name="to" defaultValue={filters.to?.slice(0,10)}/></label>
      <label>Status<select className="block w-full rounded bg-slate-900 p-2" name="status" defaultValue={filters.status??''}><option value="">Todos</option>{statusPresentations.map(({code,label})=><option key={code} value={code}>{label}</option>)}</select></label>
      <label>Prioridade<select className="block w-full rounded bg-slate-900 p-2" name="priority" defaultValue={filters.priority??''}><option value="">Todas</option><option value="ALTA">Alta</option><option value="NORMAL">Normal</option></select></label>
      <label>Tipo<input className="block w-full rounded bg-slate-900 p-2" name="type" maxLength={80} defaultValue={filters.type??''}/></label>
      <label>Grupo<select className="block w-full rounded bg-slate-900 p-2" name="groupId" defaultValue={filters.groupId??''}><option value="">Todos autorizados</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
      <label>Ordenar por<select className="block w-full rounded bg-slate-900 p-2" name="sort" defaultValue={filters.sort}><option value="createdAt">Registro</option><option value="priority">Prioridade</option><option value="status">Status</option></select></label>
      <label>Direção<select className="block w-full rounded bg-slate-900 p-2" name="direction" defaultValue={filters.direction}><option value="desc">Decrescente</option><option value="asc">Crescente</option></select></label>
      <label>Por página<select className="block w-full rounded bg-slate-900 p-2" name="pageSize" defaultValue={filters.pageSize}>{[10,25,50,100,...([10,25,50,100].includes(filters.pageSize)?[]:[filters.pageSize])].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
      <button className="self-end rounded bg-blue-700 px-4 py-2">Aplicar filtros</button>
    </form>
    <ColumnPreferences key={columns.join(',')} columns={columns} available={availableColumns} filters={filters}/>
    <p role="status">{total} ocorrências · Página {filters.page} de {pages}</p>
    {items.length?<div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Lista de ocorrências autorizadas</caption><thead><tr>{columns.map(c=><th key={c} className="border-b border-slate-600 p-3">{['createdAt','priority','status'].includes(c)?<Link href={listHref(filters,{sort:c as typeof filters.sort,direction:filters.sort===c&&filters.direction==='desc'?'asc':'desc',page:1})}>{columnLabels[c]}</Link>:columnLabels[c]}</th>)}</tr></thead><tbody>{items.map(item=><tr key={item.id}>{columns.map(c=><td key={c} className="border-b border-slate-700 p-3">{cell(item,c,labels)}</td>)}</tr>)}</tbody></table></div>:<p>Nenhuma ocorrência encontrada para estes filtros.</p>}
    <nav aria-label="Paginação" className="flex gap-6">{filters.page>1&&<Link href={listHref(filters,{page:filters.page-1})}>Página anterior</Link>}{filters.page<pages&&<Link href={listHref(filters,{page:filters.page+1})}>Próxima página</Link>}</nav>
  </section>;
}
