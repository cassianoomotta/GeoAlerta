import {can} from '@/features/access/domain/permissions';
import {ListInputError,parseListFilters} from '@/features/occurrences/list-input';
import {buildOccurrencesCsv} from '@/features/occurrences/export-csv';
import {AccessError,municipalityId} from '@/server/access/context';
import {accessResponse,withSession} from '@/server/access/session';
import {exportOccurrences} from '@/server/occurrences/list';

export const runtime='nodejs';

export async function GET(request:Request){
  try{
    const filters=parseListFilters(new URL(request.url).searchParams);
    const result=await withSession(async(tx,actor)=>{
      if(!can(actor,'export',{municipalityId,groupId:actor.groupIds[0]}))throw new AccessError(403,'ACCESS_DENIED');
      return exportOccurrences(tx,actor,filters);
    });
    const csv=buildOccurrencesCsv(result.items,result.columns);
    const date=new Date().toISOString().slice(0,10);
    return new Response(csv,{headers:{
      'Cache-Control':'no-store',
      'Content-Disposition':`attachment; filename="geoalerta-ocorrencias-${date}.csv"`,
      'Content-Type':'text/csv; charset=utf-8',
      'X-Exported-Count':String(result.items.length),
      'X-Total-Count':String(result.total),
    }});
  }catch(error){
    if(error instanceof ListInputError)return Response.json({error:{code:error.status===403?'ACCESS_DENIED':'INVALID_INPUT',message:error.status===403?'Grupo não autorizado.':'Verifique os filtros e as colunas.'}},{status:error.status,headers:{'Cache-Control':'no-store'}});
    return accessResponse(error);
  }
}
