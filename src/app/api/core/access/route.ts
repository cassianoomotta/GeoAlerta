import {withSession,accessResponse} from '@/server/access/session';
import {requireCapability} from '@/server/access/context';
import type {Capability} from '@/features/access/domain/permissions';
const capabilities:readonly string[]=['read','privateData','operate','reclassify','export','administer'];
// Permission preflight for UI actions; every actual operation must also authorize.
export async function GET(request:Request){
  const params=new URL(request.url).searchParams;
  const capability=params.get('capability')??'read';
  try{
    const result=await withSession(async(_tx,actor)=>{
      if(!capabilities.includes(capability)) return null;
      requireCapability(actor,capability as Capability,params.get('groupId')??undefined);
      return {allowed:true};
    });
    return result?Response.json(result,{headers:{'Cache-Control':'no-store'}}):Response.json({error:{code:'INVALID_INPUT',message:'Capacidade inválida.'}},{status:422});
  }catch(error){return accessResponse(error);}
}
