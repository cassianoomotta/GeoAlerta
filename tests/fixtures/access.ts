import pg from 'pg';
import { randomUUID, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { assertTestTarget } from './database';
import { resolveExecutable } from '../../scripts/with-env.mjs';

export const groupA='20000000-0000-4000-8000-000000000001';
export const groupB='20000000-0000-4000-8000-000000000002';
export const groupOther='20000000-0000-4000-8000-000000000003';
export const occurrenceA='30000000-0000-4000-8000-000000000001';
export const occurrenceB='30000000-0000-4000-8000-000000000002';
export const occurrenceOther='30000000-0000-4000-8000-000000000003';
export const accounts=[
  {name:'consulta',role:'CONSULTA',state:'ATIVO',groups:[groupA]},
  {name:'operador',role:'OPERADOR',state:'ATIVO',groups:[groupA]},
  {name:'gestor',role:'GESTOR',state:'ATIVO',groups:[groupA,groupB]},
  {name:'admin',role:'ADMINISTRADOR',state:'ATIVO',groups:[]},
  {name:'pendente',role:'OPERADOR',state:'PENDENTE',groups:[groupA]},
  {name:'suspenso',role:'OPERADOR',state:'SUSPENSO',groups:[groupA]},
  {name:'desativado',role:'OPERADOR',state:'DESATIVADO',groups:[groupA]},
  {name:'semgrupo',role:'OPERADOR',state:'ATIVO',groups:[]},
  {name:'outromunicipio',role:'ADMINISTRADOR',state:'ATIVO',groups:[]},
].map((a,index)=>({...a,id:`10000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`}));
export async function prepareAccessTests() {
  assertTestTarget(process.env.TEST_DATABASE_URL);
  const migration=spawnSync(process.execPath,[resolveExecutable('prisma'),'migrate','deploy'],{env:process.env,encoding:'utf8',timeout:90000});
  if(migration.status!==0) throw new Error('Isolated Core access migration failed.');
  const db=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});
  await db.connect();
  try {
    const role=`core_test_login_${randomUUID().replaceAll('-','')}`;
    const password=randomBytes(32).toString('hex');
    // Generated fixture credentials remain in memory, never in .env/artifacts.
    await db.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOBYPASSRLS NOINHERIT`);
    await db.query(`GRANT geoalerta_runtime,authenticated,anon TO ${role}`);
    const url=new URL(process.env.TEST_DATABASE_URL!); url.username=role;url.password=password;url.searchParams.set('options','-c role=geoalerta_runtime');
    await db.query(`INSERT INTO public.groups(id,municipality_id,name) VALUES ($1,'sa_patrulha','Fixture A'),($2,'sa_patrulha','Fixture B'),($3,'other','Fixture other') ON CONFLICT(id) DO NOTHING`,[groupA,groupB,groupOther]);
    for(const a of accounts) {
      await db.query(`INSERT INTO public.admin_profiles(user_id,municipality_id,name,role,state) VALUES ($1,$2,$3,$4,$5) ON CONFLICT(user_id) DO UPDATE SET role=EXCLUDED.role,state=EXCLUDED.state`,[a.id,a.name==='outromunicipio'?'other':'sa_patrulha',a.name,a.role,a.state]);
      for(const g of a.groups) await db.query('INSERT INTO public.user_group_memberships(user_id,group_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[a.id,g]);
    }
    for(const [id,g] of [[occurrenceA,groupA],[occurrenceB,groupB],[occurrenceOther,groupOther]]) {
      await db.query(`INSERT INTO public.occurrences(id,protocol,type,description,location,accuracy,group_id,reporter_name,photo_url) VALUES($1,$2,'fixture','synthetic',ST_SetSRID(ST_MakePoint(-50.5,-29.5),4326)::geography,10,$3,'Legacy private fixture','private/photo') ON CONFLICT(id) DO NOTHING`,[id,`TEST-${id}`,g]);
      await db.query(`INSERT INTO public.occurrence_private_data(occurrence_id,reporter_name,reporter_contact,photo_object_key) VALUES($1,'Private fixture','fixture contact','private/photo') ON CONFLICT DO NOTHING`,[id]);
      const event=(await db.query(`INSERT INTO public.occurrence_events(occurrence_id,kind) VALUES($1,'fixture') RETURNING id`,[id])).rows[0].id;
      await db.query(`INSERT INTO public.occurrence_alerts(event_id,occurrence_id,group_id,priority,status) VALUES($1,$2,$3,'NORMAL','NOVA')`,[event,id,g]);
    }
    return url.toString();
  }finally{await db.end();}
}
