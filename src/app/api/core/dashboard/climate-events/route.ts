import {EventDashboardQueryError,parseEventDashboardQuery} from '@/features/occurrences/domain/dashboard-events';
import {accessResponse,withSession} from '@/server/access/session';
import {readDashboardEventIndicators} from '@/server/occurrences/dashboard-events';

export const runtime='nodejs';
const noStore={'Cache-Control':'no-store'};

export async function GET(request:Request){
  try{
    const query=parseEventDashboardQuery(new URL(request.url).searchParams);
    const result=await withSession((tx,actor)=>readDashboardEventIndicators(tx,actor,query));
    return Response.json(result,{headers:noStore});
  }catch(error){
    if(error instanceof EventDashboardQueryError)return Response.json({error:{code:'INVALID_SELECTION',message:'Selecione eventos válidos para comparar.'}},{status:422,headers:noStore});
    return accessResponse(error);
  }
}
