import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readOccurrenceMapSnapshot} from '../src/server/occurrence-map-reader.ts';

function fakePool(profile,rows=[]){
  const statements=[];
  let released=false;
  const client={
    async query(sql,values=[]){
      statements.push({sql:sql.replace(/\s+/g,' ').trim(),values});
      if(sql.includes('FROM pg_roles'))return {rows:[{safe:true}]};
      if(sql.includes('FROM public.admin_profiles'))return {rows:profile?[profile]:[]};
      if(sql.includes('FROM public.occurrences'))return {rows};
      return {rows:[]};
    },
    release(){released=true;},
  };
  return {pool:{async connect(){return client;}},statements,isReleased:()=>released};
}

test('map snapshot requires active municipal user and reads only safe fields in a read-only RLS transaction',async()=>{
  const fixture=fakePool({role:'ADMINISTRADOR',state:'ATIVO',municipality_id:'sa_patrulha'},[
    {id:'d90552ee-8e52-4d1a-b430-8813369fd780',protocol:'25',type:'Alagamento / Inundação',status:'NOVA',priority:'ALTA',created_at:'2026-10-05T12:00:00.000Z',location:{type:'Point',coordinates:[-50.52,-29.82]}},
  ]);

  const items=await readOccurrenceMapSnapshot(fixture.pool,'c66b30f3-57c0-4aa9-b62f-511083565672');

  assert.equal(items.length,1);
  assert.equal(items[0].protocol,'25');
  assert.deepEqual(items[0].location,{type:'Point',coordinates:[-50.52,-29.82]});
  assert.match(fixture.statements[0].sql,/BEGIN TRANSACTION READ ONLY/i);
  assert.match(fixture.statements[2].sql,/set_config\('request\.jwt\.claim\.sub'/i);
  assert.match(fixture.statements.at(-2).sql,/SELECT o\.id::text AS id,\s*o\.protocol,\s*o\.type,\s*o\.status,\s*o\.priority,\s*o\.created_at/i);
  assert.doesNotMatch(fixture.statements.at(-2).sql,/SELECT \*|reporter_name|description|photo_url/i);
  assert.equal(fixture.statements.at(-1).sql,'COMMIT');
  assert.equal(fixture.isReleased(),true);
});

test('map snapshot rejects inactive profiles before querying occurrences',async()=>{
  const fixture=fakePool({role:'CONSULTA',state:'PENDENTE',municipality_id:'sa_patrulha'});

  await assert.rejects(()=>readOccurrenceMapSnapshot(fixture.pool,'c66b30f3-57c0-4aa9-b62f-511083565672'),{status:403});

  assert.equal(fixture.statements.some(item=>item.sql.includes('FROM public.occurrences')),false);
  assert.equal(fixture.statements.at(-1).sql,'ROLLBACK');
  assert.equal(fixture.isReleased(),true);
});

test('map snapshot permits read-only VOLUNTARIO with active municipal profile',async()=>{
  const fixture=fakePool({role:'VOLUNTARIO',state:'ATIVO',municipality_id:'sa_patrulha'});
  await readOccurrenceMapSnapshot(fixture.pool,'c66b30f3-57c0-4aa9-b62f-511083565672');
  assert.equal(fixture.statements.some(item=>item.sql.includes('FROM public.occurrences')),true);
  assert.equal(fixture.statements.at(-1).sql,'COMMIT');
});
