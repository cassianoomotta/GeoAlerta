import { expect, test } from '@playwright/test';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { assertTestTarget } from '../fixtures/database';
import { accounts } from '../fixtures/access';

test('seleção temporal mantém a versão vigente, respeita fronteiras e não faz fallback', async () => {
  assertTestTarget(process.env.TEST_DATABASE_URL);
  const setup = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  const runtime = new pg.Client({ connectionString: process.env.CORE_ACCESS_RUNTIME_URL });
  const futureZone = randomUUID();
  const boundaryZone = randomUUID();
  const inactiveZone = randomUUID();
  const expiredZone = randomUUID();
  const nullLaterZone = randomUUID();
  const zoneIds = [futureZone, boundaryZone, inactiveZone, expiredZone, nullLaterZone];
  const polygon = `ST_Multi(ST_SetSRID(ST_GeomFromText('POLYGON((-51 -30,-50 -30,-50 -29,-51 -29,-51 -30))'),4326))`;
  const now = new Date();
  const futureStart = new Date(now.getTime() + 60 * 60 * 1000);
  const boundaryStart = new Date(now.getTime() + 60 * 60 * 1000);
  const boundaryPrevious = new Date(boundaryStart.getTime() - 1);
  const pastStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const expiredAt = new Date(now.getTime() - 1000);
  const futureBefore = new Date(now.getTime() + 30 * 60 * 1000);

  await setup.connect();
  await runtime.connect();
  try {
    await setup.query(`
      INSERT INTO public.risk_zones(zone_id,version,name,type,active,valid_from,valid_to,geometry) VALUES
        ($1,1,'Temporal initial','INUNDACAO',true,NULL,NULL,${polygon}),
        ($1,2,'Temporal future','INUNDACAO',true,$6,NULL,${polygon}),
        ($2,1,'Boundary initial','RISCO',true,$7,NULL,${polygon}),
        ($2,2,'Boundary next','RISCO',true,$8,NULL,${polygon}),
        ($2,3,'Boundary same start newer','RISCO',true,$8,NULL,${polygon}),
        ($3,1,'Inactive initial','INUNDACAO',true,NULL,NULL,${polygon}),
        ($3,2,'Inactive current','INUNDACAO',false,$7,NULL,${polygon}),
        ($4,1,'Expired initial','RISCO',true,NULL,NULL,${polygon}),
        ($4,2,'Expired current','RISCO',true,$7,$9,${polygon}),
        ($5,1,'Null start initial','INUNDACAO',true,NULL,NULL,${polygon}),
        ($5,2,'Null start invalid later','INUNDACAO',true,NULL,NULL,${polygon})
    `, [futureZone, boundaryZone, inactiveZone, expiredZone, nullLaterZone, futureStart, pastStart, boundaryStart, expiredAt]);

    const selected = (await setup.query(`
      SELECT
        geoalerta_private.effective_risk_zone_version($1::uuid, $10::timestamptz) AS future_before,
        geoalerta_private.effective_risk_zone_version($1::uuid, $6::timestamptz) AS future_at,
        geoalerta_private.effective_risk_zone_version($1::uuid, $7::timestamptz) AS future_initial_window,
        geoalerta_private.effective_risk_zone_version($2::uuid, $11::timestamptz) AS boundary_before,
        geoalerta_private.effective_risk_zone_version($2::uuid, $8::timestamptz) AS boundary_at,
        geoalerta_private.effective_risk_zone_version($3::uuid, now()) AS inactive_current,
        geoalerta_private.effective_risk_zone_version($4::uuid, now()) AS expired_current,
        geoalerta_private.effective_risk_zone_version($4::uuid, $9::timestamptz) AS expired_selected,
        geoalerta_private.effective_risk_zone_version($5::uuid, now()) AS null_later
    `, [futureZone, boundaryZone, inactiveZone, expiredZone, nullLaterZone, futureStart, pastStart, boundaryStart, expiredAt, futureBefore, boundaryPrevious])).rows[0];
    expect(selected).toEqual({
      future_before: 1,
      future_at: 2,
      future_initial_window: 1,
      boundary_before: 1,
      boundary_at: 3,
      inactive_current: 2,
      expired_current: 2,
      expired_selected: 2,
      null_later: 1,
    });
    await runtime.query('BEGIN');
    await runtime.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [accounts.find((account) => account.name === 'operador')!.id]);
    const visible = await runtime.query(
      'SELECT zone_id::text AS zone_id, version FROM public.risk_zones WHERE zone_id = ANY($1::uuid[]) ORDER BY zone_id, version',
      [zoneIds],
    );
    expect(visible.rows).toEqual(expect.arrayContaining([
      { zone_id: futureZone, version: 1 },
      { zone_id: boundaryZone, version: 1 },
      { zone_id: nullLaterZone, version: 1 },
    ]));
    expect(visible.rows).toHaveLength(3);
    await runtime.query('ROLLBACK');
  } finally {
    await runtime.query('ROLLBACK').catch(() => undefined);
    await setup.query('DELETE FROM public.risk_zones WHERE zone_id = ANY($1::uuid[])', [zoneIds]).catch(() => undefined);
    await runtime.end();
    await setup.end();
  }
});



