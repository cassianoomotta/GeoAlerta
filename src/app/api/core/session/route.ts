import { withSession, accessResponse } from '@/server/access/session';
export async function GET() {
  try {
    const actor = await withSession(async(_tx,actor)=>actor);
    return Response.json(actor,{headers:{'Cache-Control':'no-store'}});
  }
  catch(error) {return accessResponse(error);}
}
