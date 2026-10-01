import {withSession,accessResponse} from '@/server/access/session';
import {parseListFilters,ListInputError} from '@/features/occurrences/list-input';
import {listOccurrences} from '@/server/occurrences/list';
export async function GET(request:Request){
  try{
    const result=await withSession((tx,actor)=>listOccurrences(tx,actor,parseListFilters(new URL(request.url).searchParams)));
    return Response.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(error){return error instanceof ListInputError?Response.json({error:{code:error.status===403?'ACCESS_DENIED':'INVALID_INPUT',message:error.status===403?'Grupo não autorizado.':'Verifique os filtros, a página e as colunas.'}},{status:error.status,headers:{'Cache-Control':'no-store'}}):accessResponse(error);}
}
