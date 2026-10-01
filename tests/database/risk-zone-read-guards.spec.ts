import {test,expect} from '@playwright/test';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {accounts} from '../fixtures/access';

test('zonas atuais exigem ator autorizado e versão inativa encerra triagem anterior',async()=>{
  const setup=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});
  const db=new pg.Client({connectionString:process.env.CORE_ACCESS_RUNTIME_URL});
  await setup.connect();await db.connect();
  const id=randomUUID();
  const polygon="ST_Multi(ST_GeomFromText('POLYGON((-51 -30,-50 -30,-50 -29,-51 -29,-51 -30))',4326))";
  try{
    await setup.query(`INSERT INTO public.risk_zones(zone_id,version,name,type,active,geometry) VALUES($1,1,'Synthetic guard','INUNDACAO',true,${polygon})`,[id]);
    for(const name of [undefined,'consulta','pendente','suspenso','desativado','semgrupo','outromunicipio','operador']){
      await db.query('BEGIN');
      if(name)await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[accounts.find(a=>a.name===name)!.id]);
      expect((await db.query('SELECT zone_id FROM public.risk_zones WHERE zone_id=$1',[id])).rows.length,name??'anonymous').toBe(name==='operador'?1:0);
      await db.query('ROLLBACK');
    }
    await setup.query(`INSERT INTO public.risk_zones(zone_id,version,name,type,active,geometry) VALUES($1,2,'Synthetic disabled','INUNDACAO',false,${polygon})`,[id]);
    await db.query('BEGIN');await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[accounts.find(a=>a.name==='operador')!.id]);
    expect((await db.query('SELECT zone_id FROM public.risk_zones WHERE zone_id=$1',[id])).rows).toEqual([]);
  }finally{await db.query('ROLLBACK');await db.end();await setup.end();}
});
