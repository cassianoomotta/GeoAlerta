import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import pg from 'pg';
import { fixtureCookies } from '../fixtures/session';
import { assertTestTarget } from '../fixtures/database';
import { groupA } from '../fixtures/access';
import { listType } from '../fixtures/list';

test('RF-011 exporta CSV completo com 50 mil registros filtrados sem alterar os dados', async ({ request }) => {
  assertTestTarget(process.env.TEST_DATABASE_URL);
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  const prefix = `T20CSV-${randomUUID()}-`;
  await db.connect();

  try {
    await db.query(`
      INSERT INTO public.occurrences
        (protocol,type,description,location,accuracy,group_id,status,priority,created_at)
      SELECT $1 || lpad(i::text,5,'0'),$2,'Synthetic Task 20 CSV fixture',
        ST_SetSRID(ST_MakePoint(-50.5,-29.5),4326)::geography,5,$3,'NOVA','NORMAL',
        '2099-01-01T00:00:00Z'::timestamptz + i * interval '1 millisecond'
      FROM generate_series(1,50000) AS i
    `, [prefix, listType(), groupA]);

    const snapshot = async () => (await db.query(`
      SELECT count(*)::int AS count, count(DISTINCT protocol)::int AS distinct_count,
        md5(string_agg(protocol,E'\\n' ORDER BY protocol)) AS digest
      FROM public.occurrences WHERE left(protocol,char_length($1))=$1
    `, [prefix])).rows[0];

    const before = await snapshot();
    expect(before).toMatchObject({ count: 50000, distinct_count: 50000 });

    const cookies = await fixtureCookies('gestor');
    const response = await request.get('/api/core/occurrences/export?' + new URLSearchParams({
      from: '2099-01-01',
      to: '2099-01-02',
      type: listType(),
      groupId: groupA,
      columns: 'protocol',
    }), { headers: { Cookie: cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ') } });

    expect(response.status()).toBe(200);
    expect(response.headers()['x-exported-count']).toBe('50000');
    expect(response.headers()['x-total-count']).toBe('50000');
    const csv = (await response.text()).replace(/^\uFEFF/u, '');
    const lines = csv.trimEnd().split('\r\n');
    expect(lines).toHaveLength(50001);
    expect(lines[0]).toBe('"Protocolo"');
    expect(csv).toContain(`"${prefix}00001"`);
    expect(csv).toContain(`"${prefix}50000"`);

    expect(await snapshot()).toEqual(before);
  } finally {
    await db.query('DELETE FROM public.occurrences WHERE left(protocol,char_length($1))=$1', [prefix]);
    await db.end();
  }
});
