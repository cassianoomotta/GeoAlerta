import {can} from '@/features/access/domain/permissions';
import {IndicatorQueryError,parseIndicatorQuery,shapeIndicatorView} from '@/features/occurrences/domain/dashboard-indicators';
import {accessResponse,withSession} from '@/server/access/session';
import {AccessError} from '@/server/access/context';
import {readDashboardIndicators} from '@/server/occurrences/dashboard-indicators';

export const runtime='nodejs';
export async function GET(request:Request){
  try{
    const query=parseIndicatorQuery(new URL(request.url).searchParams);
    const view=await withSession(async(tx,actor)=>{
      if(!can(actor,'read',{municipalityId:actor.municipalityId,groupId:actor.groupIds[0]}))throw new AccessError(403,'ACCESS_DENIED');
      return shapeIndicatorView(await readDashboardIndicators(tx,query),query);
    });
    return Response.json({...view,window:query,updatedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    if(error instanceof IndicatorQueryError)return Response.json({error:{code:error.message,message:'Selecione datas válidas e um período de até 31 dias, com a data inicial antes da final.'}},{status:422,headers:{'Cache-Control':'no-store'}});
    return accessResponse(error);
  }
}
