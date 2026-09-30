import { withSession, accessResponse } from '@/server/access/session';
import { AccessError } from '@/server/access/context';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const {id}=await params;
    const result=await withSession(async tx=>{
      if(!/^[0-9a-f-]{36}$/i.test(id)) throw new AccessError(404,'NOT_FOUND');
      const rows=await tx.$queryRaw<{id:string;protocol:string;status:string;priority:string;group_id:string}[]>`SELECT id,protocol,status,priority,group_id FROM public.occurrences WHERE id=${id}::uuid AND deleted_at IS NULL`;
      if(!rows[0]) throw new AccessError(404,'NOT_FOUND');
      return rows[0];
    });
    return Response.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(error){return accessResponse(error);}
}
