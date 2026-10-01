import {DashboardQueryError,parseDashboardQuery} from '@/features/occurrences/domain/dashboard-map';
import {DashboardMapAccessError,getDashboardMap} from '@/features/occurrences/application/get-dashboard-map';
import {accessResponse,withSession} from '@/server/access/session';
import {readDashboardMap} from '@/server/occurrences/dashboard-map';

export const runtime='nodejs';

export async function GET(request:Request){
  try{
    const query=parseDashboardQuery(new URL(request.url).searchParams);
    const result=await withSession(async(tx,actor)=>{
      return getDashboardMap(actor,query,{read:(validatedQuery,markerLimit)=>readDashboardMap(tx,validatedQuery,markerLimit)});
    });
    return Response.json({...result,window:query},{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    if(error instanceof DashboardQueryError)return Response.json({error:{code:error.message,message:'Verifique o recorte espacial e o período (máximo de 31 dias).'}},{status:422,headers:{'Cache-Control':'no-store'}});
    if(error instanceof DashboardMapAccessError)return Response.json({error:{code:'ACCESS_DENIED',message:'Acesso não autorizado.'}},{status:403,headers:{'Cache-Control':'no-store'}});
    return accessResponse(error);
  }
}
