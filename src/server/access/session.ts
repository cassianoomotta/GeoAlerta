import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { AccessError, withIdentity } from './context';
import type { Actor } from '@/features/access/contracts';
import type { Prisma } from '../../../prisma/generated/client/client';

export async function sessionClient() {
  const store=await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{
    cookies:{getAll:()=>store.getAll(),setAll:values=>{ for(const {name,value,options} of values) { try {store.set(name,value,options);} catch { /* Server Component: Proxy persists refresh cookies. */ } } }},
  });
}
export async function withSession<T>(work:(tx:Prisma.TransactionClient,actor:Actor)=>Promise<T>):Promise<T> {
  const client=await sessionClient();
  const {data,error}=await client.auth.getUser();
  if(error || !data.user) throw new AccessError(401,'UNAUTHENTICATED');
  return withIdentity(data.user.id,work);
}
export function accessResponse(error:unknown) {
  if(!(error instanceof AccessError)){
    const failureCode=typeof error==='object'&&error!==null&&'code' in error&&typeof error.code==='string'&&/^[A-Z0-9_]{1,40}$/.test(error.code)?error.code:'UNHANDLED_FAILURE';
    console.error(JSON.stringify({event:'CORE_REQUEST_FAILURE',code:failureCode}));
  }
  const status=error instanceof AccessError?error.status:503;
  const code=error instanceof AccessError?error.code:'SERVICE_UNAVAILABLE';
  return Response.json({error:{code,message:status===401?'Autenticação necessária.':status===404?'Registro não encontrado.':status===403?'Acesso não autorizado.':'Serviço temporariamente indisponível.'}},{status,headers:{'Cache-Control':'no-store'}});
}
