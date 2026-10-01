import { test,expect } from '@playwright/test';
import pg from 'pg';
import { accounts,groupA,groupB,groupOther,occurrenceA,occurrenceB,occurrenceOther } from '../fixtures/access';
import { PrismaClient } from '../../prisma/generated/client/client';
import { PrismaPg } from '@prisma/adapter-pg';
test('RNF-001 Prisma real com pool restrito limpa contexto ao concluir ou abortar',async()=>{
  const prisma=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.CORE_ACCESS_RUNTIME_URL,max:1})});
  try{
    for(const mode of ['commit','rollback','sqlerror']){
      const operation=prisma.$transaction(async tx=>{
        await tx.$queryRaw`SELECT set_config('request.jwt.claim.sub',${accounts[1].id},true)`;
        expect(await tx.$queryRaw`SELECT id FROM public.occurrences WHERE group_id=${groupA}::uuid AND id=${occurrenceA}::uuid`).toHaveLength(1);
        if(mode==='rollback')throw new Error('fixture rollback');
        if(mode==='sqlerror')await tx.$queryRaw`SELECT 1/0`;
      });
      if(mode==='commit')await operation;else await expect(operation).rejects.toThrow();
      expect(await prisma.$queryRaw`SELECT id FROM public.occurrences`).toHaveLength(0);
      const rows=await prisma.$queryRaw<{identity:string|null}[]>`SELECT nullif(current_setting('request.jwt.claim.sub',true),'') AS identity`;expect(rows[0].identity).toBeNull();
    }
  }finally{await prisma.$disconnect();}
});
test('RNF-001 SQL nega alteração cruzada, Consulta e reclassificação de Operador',async()=>{
  const db=await connection();try{
    await identity(db,'consulta');expect((await db.query("UPDATE public.occurrences SET description='denied' WHERE id=$1",[occurrenceA])).rowCount).toBe(0);await db.query('ROLLBACK');
    await identity(db,'operador');expect((await db.query("UPDATE public.occurrences SET description='denied' WHERE group_id=$1",[groupB])).rowCount).toBe(0);
    await expect(db.query("UPDATE public.occurrences SET priority='ALTA' WHERE id=$1",[occurrenceA])).rejects.toMatchObject({code:'42501'});await db.query('ROLLBACK');
    await identity(db,'operador');await expect(db.query("UPDATE public.occurrences SET deleted_at=now() WHERE id=$1",[occurrenceA])).rejects.toMatchObject({code:'42501'});await db.query('ROLLBACK');
    await identity(db,'gestor');expect((await db.query("UPDATE public.occurrences SET priority='ALTA' WHERE id=$1",[occurrenceA])).rowCount).toBe(1);await db.query('ROLLBACK');
    for(const closed of ['RESOLVIDA','CANCELADA']){
      await identity(db,'operador');await db.query('UPDATE public.occurrences SET status=$1 WHERE id=$2',[closed,occurrenceA]);
      await expect(db.query("UPDATE public.occurrences SET status='EM_TRIAGEM' WHERE id=$1",[occurrenceA])).rejects.toMatchObject({code:'42501'});await db.query('ROLLBACK');
      for(const name of ['gestor','admin']){await identity(db,name);await db.query('UPDATE public.occurrences SET status=$1 WHERE id=$2',[closed,occurrenceA]);expect((await db.query("UPDATE public.occurrences SET status='EM_TRIAGEM' WHERE id=$1",[occurrenceA])).rowCount).toBe(1);await db.query('ROLLBACK');}
    }
  }finally{await db.end();}
});
async function connection(){const db=new pg.Client({connectionString:process.env.CORE_ACCESS_RUNTIME_URL});await db.connect();return db;}
async function identity(db:pg.Client | pg.PoolClient,name:string){await db.query('BEGIN');await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[accounts.find(a=>a.name===name)!.id,JSON.stringify({role:'ADMINISTRADOR',groups:['all']})]);}
test('RNF-001 RLS real com LOGIN restrito aplica papéis estados grupos múltiplos e município',async()=>{
  const db=await connection();try{
    const r=(await db.query("SELECT current_user,session_user,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user")).rows[0];
    expect(r.current_user).toBe('geoalerta_runtime');expect(r.session_user).toMatch(/^core_test_login_/);expect(r.rolsuper).toBe(false);expect(r.rolbypassrls).toBe(false);
    expect((await db.query("SELECT count(*)::int AS n FROM pg_class c JOIN pg_roles r ON c.relowner=r.oid WHERE r.rolname IN(current_user,session_user)")).rows[0].n).toBe(0);
    for(const a of accounts){await identity(db,a.name);
      const rows=(await db.query('SELECT id FROM public.occurrences WHERE group_id=ANY($1::uuid[]) AND id=ANY($2::uuid[]) ORDER BY group_id',[[groupA,groupB,groupOther],[occurrenceA,occurrenceB,occurrenceOther]])).rows;
      expect(rows.length,a.name).toBe(a.name==='admin'||a.name==='gestor'?2:['consulta','operador'].includes(a.name)?1:0);
      for(const capability of ['read','privateData','operate','reclassify','export','administer']){
        const ok=(await db.query('SELECT public.core_has_access($1,$2) AS ok',[groupA,capability])).rows[0].ok;
        const expected=a.name==='admin'||a.name==='gestor'&&capability!=='administer'||a.name==='operador'&&['read','privateData','operate'].includes(capability)||a.name==='consulta'&&capability==='read';expect(ok,`${a.name}/${capability}`).toBe(expected);
      }
      const privateRows=(await db.query('SELECT reporter_name FROM public.occurrence_private_data WHERE occurrence_id=$1',[occurrenceA])).rows;
      expect(privateRows.length).toBe(['operador','gestor','admin'].includes(a.name)?1:0);
      await db.query('ROLLBACK');
    }
  }finally{await db.end();}
});
test('RNF-001 grants bloqueiam colunas privadas legadas e escrita Data API; Realtime só feed mínimo',async()=>{
  const db=await connection();try{
    await identity(db,'consulta');await expect(db.query('SELECT reporter_name,photo_url FROM public.occurrences')).rejects.toMatchObject({code:'42501'});await db.query('ROLLBACK');
    for(const role of ['anon','authenticated']){
      await db.query('BEGIN');await db.query(`SET LOCAL ROLE ${role}`);await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[accounts[1].id]);
      await expect(db.query("UPDATE public.occurrences SET description='bypass'")).rejects.toMatchObject({code:'42501'});await db.query('ROLLBACK');
      await db.query('BEGIN');await db.query(`SET LOCAL ROLE ${role}`);await expect(db.query('SELECT * FROM public.occurrence_private_data')).rejects.toMatchObject({code:'42501'});await db.query('ROLLBACK');
    }
    await db.query('BEGIN');await db.query('SET LOCAL ROLE authenticated');await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[accounts[0].id]);
    const rows=(await db.query('SELECT * FROM public.occurrence_alerts')).rows;expect(rows.length).toBeGreaterThan(0);expect(rows.every(r=>r.group_id===groupA)).toBe(true);expect(Object.keys(rows[0]).sort()).toEqual(['at','event_id','group_id','occurrence_id','priority','status']);await db.query('ROLLBACK');
  }finally{await db.end();}
});
test('RNF-001 commit rollback erro e pool reutilizado não deixam identidade residual',async()=>{
  const pool=new pg.Pool({connectionString:process.env.CORE_ACCESS_RUNTIME_URL,max:1});try{
    for(const finish of ['COMMIT','ROLLBACK','error']){
      const db=await pool.connect();
      try{await identity(db,'operador');expect((await db.query('SELECT id FROM public.occurrences WHERE group_id=$1 AND id=$2',[groupA,occurrenceA])).rows).toHaveLength(1);
        if(finish==='error'){await expect(db.query('SELECT 1/0')).rejects.toMatchObject({code:'22012'});await db.query('ROLLBACK');}else await db.query(finish);
      }finally{await db.query('ROLLBACK');db.release();}
      const next=await pool.connect();expect((await next.query("SELECT nullif(current_setting('request.jwt.claim.sub',true),'') AS identity")).rows[0].identity).toBeNull();expect((await next.query('SELECT id FROM public.occurrences')).rows).toHaveLength(0);next.release();
    }
  }finally{await pool.end();}
});
