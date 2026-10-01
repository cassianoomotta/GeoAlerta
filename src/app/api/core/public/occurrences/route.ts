import {validatePublicInput,validateIdempotencyKey,PublicInputError} from '@/features/occurrences/public-input';
import {openOccurrence,IntakeError} from '@/server/occurrences/intake';
import {resolveOrigin} from '@/server/occurrences/origin';
import {PhotoError} from '@/features/occurrences/photos/contracts';
import {photoResponse} from '@/features/occurrences/photos/http';
export const runtime='nodejs';
async function readBody(request:Request){
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new PublicInputError();
  const reader=request.body?.getReader();if(!reader)throw new PublicInputError();
  const chunks:Uint8Array[]=[];let bytes=0;
  try{while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.length;if(bytes>16384){await reader.cancel();throw new PublicInputError();}chunks.push(chunk.value);}}
  finally{reader.releaseLock();}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new PublicInputError();}
}
export async function POST(request:Request){
  try{
    const key=validateIdempotencyKey(request.headers.get('Idempotency-Key'));
    const input=validatePublicInput(await readBody(request));
    const {result,replay}=await openOccurrence(input,key,resolveOrigin(request.headers));
    return Response.json(result,{status:replay?200:201,headers:{'Cache-Control':'no-store'}});
  }catch(error){
    if(error instanceof PhotoError)return photoResponse(error);
    const status=error instanceof PublicInputError?422:error instanceof IntakeError?error.status:503;
    const code=error instanceof PublicInputError?error.code:error instanceof IntakeError?error.code:'SERVICE_UNAVAILABLE';
    const message=status===422?'Verifique os campos e a localização.':status===409?'Esta tentativa já foi usada com outros dados.':status===429?'Limite de tentativas atingido. Tente novamente no próximo minuto.':'Não foi possível confirmar o registro. Tente novamente com os mesmos dados.';
    return Response.json({error:{code,message}},{status,headers:{'Cache-Control':'no-store',...(status===429?{'Retry-After':'60'}:{})}});
  }
}
