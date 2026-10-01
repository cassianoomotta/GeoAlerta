import { expect, test } from '@playwright/test';
import pg from 'pg';
import { accounts, groupA, occurrenceA, occurrenceB, occurrenceOther } from '../fixtures/access';

const deletedOccurrence = '30000000-0000-4000-8000-000000000099';
const zoneA = '91000000-0000-4000-8000-000000000011';
const zoneB = '91000000-0000-4000-8000-000000000012';
const zoneDeleted = '91000000-0000-4000-8000-000000000013';
const zoneOther = '91000000-0000-4000-8000-000000000014';

test.beforeAll(async () => {
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  try {
    const polygon = "ST_Multi(ST_GeomFromText('POLYGON((-51 -30,-50 -30,-50 -29,-51 -29,-51 -30))',4326))";
    await db.query(`INSERT INTO public.risk_zones(zone_id,version,name,type,active,geometry) VALUES ($1,1,'Ticket05 zone A','INUNDACAO',true,${polygon}),($2,1,'Ticket05 zone B','INUNDACAO',true,${polygon}),($3,1,'Ticket05 deleted zone','INUNDACAO',true,${polygon}),($4,1,'Ticket05 other municipality zone','INUNDACAO',true,${polygon}) ON CONFLICT(zone_id,version) DO UPDATE SET name=EXCLUDED.name,active=EXCLUDED.active`, [zoneA, zoneB, zoneDeleted, zoneOther]);
    await db.query(`INSERT INTO public.occurrences(id,protocol,type,description,location,accuracy,group_id,deleted_at) VALUES ($1,'TEST-TICKET05-DELETED','fixture','deleted synthetic',ST_SetSRID(ST_MakePoint(-50.5,-29.5),4326)::geography,10,$2,now()) ON CONFLICT(id) DO UPDATE SET deleted_at=now()`, [deletedOccurrence, groupA]);
    await db.query(`INSERT INTO public.occurrence_classification_zones(occurrence_id,zone_id,zone_version) VALUES ($1,$2,1),($3,$4,1),($5,$6,1),($7,$8,1) ON CONFLICT DO NOTHING`, [occurrenceA, zoneA, occurrenceB, zoneB, deletedOccurrence, zoneDeleted, occurrenceOther, zoneOther]);
    await db.query(`INSERT INTO public.occurrence_events(id,occurrence_id,kind,reason,changes) VALUES ('91000000-0000-4000-8000-000000000021',$1,'cross-group private ticket05','private sentinel','{"private":"ticket05"}'::jsonb),('91000000-0000-4000-8000-000000000022',$2,'deleted private ticket05','private sentinel','{"private":"ticket05"}'::jsonb) ON CONFLICT(id) DO UPDATE SET kind=EXCLUDED.kind,reason=EXCLUDED.reason,changes=EXCLUDED.changes`, [occurrenceB, deletedOccurrence]);
  } finally {
    await db.end();
  }
});

test('RF-015 Consulta lê somente timeline sanitizada no banco', async () => {
  const db = new pg.Client({ connectionString: process.env.CORE_ACCESS_RUNTIME_URL });
  await db.connect();
  try {
    await db.query('BEGIN');
    const consulta = accounts.find((account) => account.name === 'consulta')!;
    await db.query('SELECT set_config($1,$2,true),set_config($3,$4,true)', ['request.jwt.claim.sub', consulta.id, 'request.jwt.claims', JSON.stringify({ sub: consulta.id })]);
    const history = await db.query('SELECT id,kind,"actorId",at FROM public.core_occurrence_history($1::uuid)', [occurrenceA]);
    expect(history.rows.length).toBeGreaterThan(0);
    for (const event of history.rows) expect(Object.keys(event).sort()).toEqual(['actorId', 'at', 'id', 'kind']);
    expect((await db.query('SELECT * FROM public.core_occurrence_history($1::uuid)', [occurrenceB])).rows).toEqual([]);
    expect((await db.query('SELECT * FROM public.core_occurrence_history($1::uuid)', [deletedOccurrence])).rows).toEqual([]);
    expect((await db.query('SELECT * FROM public.core_occurrence_history($1::uuid)', ['30000000-0000-4000-8000-000000000098'])).rows).toEqual([]);
    const consultaLinks = await db.query('SELECT occurrence_id,zone_id FROM public.occurrence_classification_zones WHERE zone_id=ANY($1::uuid[]) ORDER BY occurrence_id', [[zoneA, zoneB, zoneDeleted, zoneOther]]);
    expect(consultaLinks.rows).toEqual([{ occurrence_id: occurrenceA, zone_id: zoneA }]);
    const consultaZones = await db.query('SELECT zone_id FROM public.risk_zones WHERE zone_id=ANY($1::uuid[]) ORDER BY zone_id', [[zoneA, zoneB, zoneDeleted, zoneOther]]);
    expect(consultaZones.rows).toEqual([{ zone_id: zoneA }]);
    await db.query('SAVEPOINT private_columns_denied');
    await expect(db.query('SELECT reason,changes FROM public.occurrence_events WHERE occurrence_id=$1', [occurrenceA])).rejects.toMatchObject({ code: '42501' });
    await db.query('ROLLBACK TO SAVEPOINT private_columns_denied');
    await expect(db.query('SELECT reporter_name,reporter_contact,photo_object_key FROM public.occurrence_private_data WHERE occurrence_id=$1', [occurrenceA])).resolves.toMatchObject({ rows: [] });
    await db.query('ROLLBACK');

    const gestor = accounts.find((account) => account.name === 'gestor')!;
    await db.query('BEGIN');
    await db.query('SELECT set_config($1,$2,true),set_config($3,$4,true)', ['request.jwt.claim.sub', gestor.id, 'request.jwt.claims', JSON.stringify({ sub: gestor.id })]);
    expect((await db.query('SELECT * FROM public.core_occurrence_history($1::uuid)', [occurrenceB])).rows.map((event) => event.kind)).toContain('cross-group private ticket05');
    expect((await db.query('SELECT occurrence_id,zone_id FROM public.occurrence_classification_zones WHERE zone_id=ANY($1::uuid[]) ORDER BY occurrence_id', [[zoneA, zoneB, zoneDeleted, zoneOther]])).rows).toEqual([
      { occurrence_id: occurrenceA, zone_id: zoneA },
      { occurrence_id: occurrenceB, zone_id: zoneB },
    ]);
    expect((await db.query('SELECT zone_id FROM public.risk_zones WHERE zone_id=ANY($1::uuid[]) ORDER BY zone_id', [[zoneA, zoneB, zoneDeleted, zoneOther]])).rows).toEqual([{ zone_id: zoneA }, { zone_id: zoneB }]);
    await db.query('ROLLBACK');

    const municipalityAdmin = accounts.find((account) => account.name === 'admin')!;
    await db.query('BEGIN');
    await db.query('SELECT set_config($1,$2,true),set_config($3,$4,true)', ['request.jwt.claim.sub', municipalityAdmin.id, 'request.jwt.claims', JSON.stringify({ sub: municipalityAdmin.id })]);
    expect((await db.query('SELECT * FROM public.core_occurrence_history($1::uuid)', [occurrenceOther])).rows).toEqual([]);
    expect((await db.query('SELECT occurrence_id,zone_id FROM public.occurrence_classification_zones WHERE zone_id=$1', [zoneOther])).rows).toEqual([]);
    await db.query('ROLLBACK');
  } finally {
    await db.query('ROLLBACK');
    await db.end();
  }
});
