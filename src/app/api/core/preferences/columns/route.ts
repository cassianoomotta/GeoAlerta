import {withSession,accessResponse} from '@/server/access/session';
import {saveColumns} from '@/features/access/infrastructure/preferences';
import {ListInputError} from '@/features/occurrences/list-input';
export async function PUT(request:Request){
  try{
    const columns=await withSession(async(tx,actor)=>{
      if(!request.headers.get('content-type')?.startsWith('application/json'))throw new ListInputError();
      const reader=request.body?.getReader();if(!reader)throw new ListInputError();
      const chunks:Uint8Array[]=[];let size=0;
      try{while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>1024){await reader.cancel();throw new ListInputError();}chunks.push(chunk.value);}}finally{reader.releaseLock();}
      const text=Buffer.concat(chunks).toString('utf8');
      let value:unknown;try{value=JSON.parse(text);}catch{throw new ListInputError();}
      if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>k!=='columns'))throw new ListInputError();
      return saveColumns(tx,actor,(value as {columns:unknown}).columns);
    });
    return Response.json({columns},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return error instanceof ListInputError?Response.json({error:{code:'INVALID_INPUT',message:'Selecione somente colunas disponíveis para sua conta.'}},{status:422,headers:{'Cache-Control':'no-store'}}):accessResponse(error);}
}
