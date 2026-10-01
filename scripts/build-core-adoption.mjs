// Produces a reviewable, atomic adoption script from the canonical Prisma
// history. It never connects to a database or executes the generated SQL.
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const quote=value=>`'${value.replaceAll("'","''")}'`;
const folders=readdirSync('prisma/migrations',{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name).sort();
const history=folders.map(name=>({name,sql:readFileSync(`prisma/migrations/${name}/migration.sql`,'utf8')}));
const expected=['occurrences','settings','resources','resource_movements','shelters','shelter_people','teams','team_members','team_locations','volunteers','risk_zones'];
const parts=[`BEGIN;
SET LOCAL lock_timeout='10s';
SET LOCAL statement_timeout='120s';
DO $$ DECLARE t text; BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL OR to_regclass('public.groups') IS NOT NULL THEN
    RAISE EXCEPTION 'CORE_ADOPTION_REQUIRES_UNMIGRATED_LEGACY';
  END IF;
  FOREACH t IN ARRAY ARRAY[${expected.map(quote).join(',')}] LOOP
    IF to_regclass('public.'||t) IS NULL THEN RAISE EXCEPTION 'LEGACY_TABLE_MISSING'; END IF;
  END LOOP;
END $$;
LOCK TABLE ${expected.map(t=>`public.${t}`).join(',')} IN ACCESS EXCLUSIVE MODE;
CREATE TEMP TABLE core_adoption_evidence(name text PRIMARY KEY,rows bigint,digest text) ON COMMIT DROP;
DO $$ DECLARE t text; projection text; BEGIN
  FOREACH t IN ARRAY ARRAY[${expected.map(quote).join(',')}] LOOP
    projection := CASE WHEN t='occurrences' THEN 'to_jsonb(x)-''status''' ELSE 'to_jsonb(x)' END;
    EXECUTE format('INSERT INTO core_adoption_evidence SELECT %L,count(*),md5(coalesce(string_agg((%s)::text,E''\\n'' ORDER BY (%s)::text),'''')) FROM public.%I x',t,projection,projection,t);
  END LOOP;
END $$;
CREATE TABLE public._prisma_migrations (
  id varchar(36) PRIMARY KEY,checksum varchar(64) NOT NULL,finished_at timestamptz,
  migration_name varchar(255) NOT NULL,logs text,rolled_back_at timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(),applied_steps_count integer NOT NULL DEFAULT 0
);`];
for(const migration of history){
  if(migration.name!=='0_legacy'){
    const opening=/^(?:\s*--[^\n]*\n)*\s*BEGIN;\s*/;
    if(!opening.test(migration.sql)||!/COMMIT;\s*$/.test(migration.sql))throw new Error(`UNSUPPORTED_MIGRATION_TRANSACTION:${migration.name}`);
    parts.push(`-- Prisma source: ${migration.name}\n${migration.sql.replace(opening,'').replace(/COMMIT;\s*$/,'')}`);
  }
  const checksum=createHash('sha256').update(migration.sql).digest('hex');
  parts.push(`INSERT INTO public._prisma_migrations(id,checksum,finished_at,migration_name,applied_steps_count) VALUES(gen_random_uuid()::text,${quote(checksum)},now(),${quote(migration.name)},${migration.name==='0_legacy'?0:1});`);
}
parts.push(`DO $$ DECLARE old record; actual_rows bigint; actual_digest text; relation_name text; projection text; BEGIN
  FOR old IN SELECT * FROM core_adoption_evidence LOOP
    relation_name := CASE WHEN old.name='risk_zones' THEN 'legacy_risk_zones' ELSE old.name END;
    projection := CASE WHEN old.name='occurrences' THEN
      'to_jsonb(x)-ARRAY[''status'',''legacy_status'',''protocol'',''accuracy'',''priority'',''group_id'',''version'',''updated_at'',''deleted_at'',''needs_sanitation'']'
      ELSE 'to_jsonb(x)' END;
    EXECUTE format('SELECT count(*),md5(coalesce(string_agg((%s)::text,E''\\n'' ORDER BY (%s)::text),'''')) FROM public.%I x',projection,projection,relation_name) INTO actual_rows,actual_digest;
    IF actual_rows<>old.rows OR actual_digest<>old.digest THEN RAISE EXCEPTION 'LEGACY_PRESERVATION_FAILED: %',old.name; END IF;
  END LOOP;
END $$;
REVOKE ALL ON public._prisma_migrations FROM PUBLIC,anon,authenticated;
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
COMMIT;`);
const sql=parts.join('\n\n')+'\n';
if(process.argv.includes('--json'))process.stdout.write(JSON.stringify({sql,migrations:folders}));
else if(process.argv[2]){writeFileSync(process.argv[2],sql,{flag:'wx'});console.log(`${history.length} Prisma migrations packaged; no database connection.`);}
else throw new Error('Provide an output path or --json.');
