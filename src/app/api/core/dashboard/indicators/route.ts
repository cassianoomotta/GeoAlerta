import {DashboardIndicatorsQueryError,parseDashboardIndicatorsQuery} from '@/features/occurrences/domain/dashboard-indicators';
import {DashboardIndicatorsAccessError,getDashboardIndicators} from '@/features/occurrences/application/get-dashboard-indicators';
import {accessResponse,withSession} from '@/server/access/session';
import {readDashboardIndicators} from '@/server/occurrences/dashboard-indicators';

export const runtime='nodejs';

export async function GET(request:Request){
  try{
    const query=parseDashboardIndicatorsQuery(new URL(request.url).searchParams);
    const result=await withSession(async(tx,actor)=>getDashboardIndicators(actor,query,{
      read:(validatedQuery)=>readDashboardIndicators(tx,validatedQuery),
    }));
    return Response.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    if(error instanceof DashboardIndicatorsQueryError)return Response.json({error:{code:error.message,message:'Verifique as datas (intervalo máximo de 366 dias) e o bairro selecionados.'}},{status:422,headers:{'Cache-Control':'no-store'}});
    if(error instanceof DashboardIndicatorsAccessError)return Response.json({error:{code:'ACCESS_DENIED',message:'Acesso não autorizado.'}},{status:403,headers:{'Cache-Control':'no-store'}});
    return accessResponse(error);
  }
}

