import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {getOccurrenceMapPool} from '@/server/occurrence-map-pool';
import {OccurrenceMapAccessError,readOccurrenceMapSnapshot} from '@/server/occurrence-map-reader';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(){
  const headers=new Headers({'Cache-Control':'private, no-store'});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!anonKey||!process.env.DATABASE_URL){
    return Response.json({error:{code:'SERVICE_UNAVAILABLE',message:'A leitura do mapa não está configurada neste ambiente.'}},{status:503,headers});
  }

  try{
    const cookieStore=await cookies();
    const supabase=createServerClient(url,anonKey,{
      cookies:{
        getAll:()=>cookieStore.getAll(),
        setAll:(values,refreshHeaders)=>{
          values.forEach(({name,value,options})=>cookieStore.set(name,value,options));
          Object.entries(refreshHeaders??{}).forEach(([name,value])=>headers.set(name,value));
        },
      },
    });
    const {data,error}=await supabase.auth.getUser();
    if(error||!data.user){
      return Response.json({error:{code:'UNAUTHENTICATED',message:'Entre no painel para consultar as ocorrências.'}},{status:401,headers});
    }

    const items=await readOccurrenceMapSnapshot(getOccurrenceMapPool(),data.user.id);
    return Response.json({items},{headers});
  }catch(error){
    if(error instanceof OccurrenceMapAccessError){
      const message=error.status===403?'Seu perfil não tem acesso às ocorrências deste município.':'Não foi possível validar o acesso ao mapa.';
      return Response.json({error:{code:error.code,message}},{status:error.status,headers});
    }
    const errorCode=error&&typeof error==='object'&&'code' in error&&typeof error.code==='string'&&/^[0-9A-Z]{5}$/.test(error.code)
      ? error.code
      : undefined;
    const errorName=error instanceof Error?error.name:'UnknownError';
    console.error(JSON.stringify({event:'OCCURRENCE_MAP_READ_FAILED',errorName,errorCode}));
    return Response.json({error:{code:'SERVICE_UNAVAILABLE',message:'Não foi possível carregar as ocorrências agora.'}},{status:503,headers});
  }
}
