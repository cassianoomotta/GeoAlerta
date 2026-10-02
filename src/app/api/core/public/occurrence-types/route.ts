import {listActiveOccurrenceTypes} from '@/server/occurrences/intake';

export const runtime='nodejs';

export async function GET(){
  try{
    const types=await listActiveOccurrenceTypes();
    return Response.json({types},{headers:{'Cache-Control':'no-store'}});
  }catch{
    return Response.json({error:{code:'SERVICE_UNAVAILABLE',message:'Não foi possível carregar os tipos de ocorrência.'}},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
