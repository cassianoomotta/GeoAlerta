import { withSession, accessResponse } from '@/server/access/session';
export async function GET() {
  try { return Response.json(await withSession(async(_tx,actor)=>actor),{headers:{'Cache-Control':'no-store'}}); }
  catch(error) {return accessResponse(error);}
}
