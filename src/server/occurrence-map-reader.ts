type ReadOnlyClient={
  query:(sql:string,values?:unknown[])=>Promise<{rows:Record<string,unknown>[]}>;
  release:()=>void;
};
type ReadOnlyPool={connect:()=>Promise<ReadOnlyClient>};

export type MapOccurrence={
  id:string;
  protocol:string;
  type:string;
  status:string;
  priority:string;
  created_at:Date|string;
  location:{type:'Point';coordinates:[number,number]};
};

export class OccurrenceMapAccessError extends Error{
  readonly status:401|403|503;
  readonly code:string;
  constructor(status:401|403|503,code:string){super(code);this.status=status;this.code=code;}
}

const allowedRoles=new Set(['CONSULTA','OPERADOR','GESTOR','ADMINISTRADOR']);

export async function readOccurrenceMapSnapshot(pool:ReadOnlyPool,userId:string):Promise<MapOccurrence[]>{
  if(!/^[0-9a-f-]{36}$/i.test(userId))throw new OccurrenceMapAccessError(401,'UNAUTHENTICATED');

  const client=await pool.connect();
  let transactionStarted=false;
  try{
    await client.query('BEGIN TRANSACTION READ ONLY');
    transactionStarted=true;

    const roles=(await client.query(`SELECT
      NOT role.rolsuper AND NOT role.rolbypassrls
      AND NOT login_role.rolsuper AND NOT login_role.rolbypassrls
      AND role.rolname='geoalerta_runtime' AS safe
      FROM pg_roles role JOIN pg_roles login_role ON login_role.rolname=session_user
      WHERE role.rolname=current_user`)).rows as {safe:boolean}[];
    if(!roles[0]?.safe)throw new OccurrenceMapAccessError(503,'UNSAFE_DATABASE_ROLE');

    await client.query(`SELECT
      set_config('request.jwt.claim.sub',$1,true),
      set_config('request.jwt.claims',$2,true)`,[userId,JSON.stringify({sub:userId})]);

    const profiles=(await client.query(`SELECT role,state,municipality_id
      FROM public.admin_profiles WHERE user_id=$1::uuid`,[userId])).rows as {role:string;state:string;municipality_id:string}[];
    const profile=profiles[0];
    if(!profile||profile.state!=='ATIVO'||profile.municipality_id!=='sa_patrulha'||!allowedRoles.has(profile.role)){
      throw new OccurrenceMapAccessError(403,'ACCESS_DENIED');
    }

    const result=await client.query(`SELECT
      o.id::text AS id,o.protocol,o.type,o.status,o.priority,o.created_at,
      ST_AsGeoJSON(o.location::geometry)::jsonb AS location
      FROM public.occurrences o
      WHERE o.deleted_at IS NULL
      ORDER BY o.created_at DESC,o.id
      LIMIT 1000`);

    await client.query('COMMIT');
    transactionStarted=false;
    return result.rows as unknown as MapOccurrence[];
  }catch(error){
    if(transactionStarted){
      try{await client.query('ROLLBACK');}catch{}
    }
    throw error;
  }finally{
    client.release();
  }
}
