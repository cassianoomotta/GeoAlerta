import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { fixtureCookies } from '../fixtures/session';

const adminPath = '/api/core/admin/shelters';
const publicPath = '/api/core/public/shelters';
const validInput = (name: string) => ({
  name,
  type: 'humano',
  address: 'Praça Central, Santo Antônio da Patrulha',
  lat: -29.82,
  lng: -50.52,
  capacity: 100,
  occupied: 15,
  phone: '51999990000',
  manager: 'Responsável de teste',
  status: 'Aberto',
  isActive: true,
});
const headersFor = async (name: 'admin' | 'operador') => ({
  Cookie: (await fixtureCookies(name)).map(({ name: key, value }) => `${key}=${value}`).join('; '),
});

test('RF-004 somente Administrador administra abrigos', async ({ request }) => {
  expect((await request.get(adminPath)).status()).toBe(401);
  expect((await request.get(adminPath, { headers: await headersFor('operador') })).status()).toBe(403);
  expect((await request.post(adminPath, { headers: await headersFor('operador'), data: { action: 'create', ...validInput(`Sem acesso ${randomUUID()}`) } })).status()).toBe(403);
});

test('RF-004 cadastro, edição, catálogo público e exclusão vinculada', async ({ request }) => {
  const headers = await headersFor('admin');
  const name = `Abrigo fixture ${randomUUID()}`;
  const created = await request.post(adminPath, { headers, data: { action: 'create', ...validInput(name) } });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  try {
    const adminList = await request.get(adminPath, { headers });
    expect((await adminList.json()).shelters).toContainEqual(expect.objectContaining({ id, name, status: 'Aberto', isActive: true }));

    const publicList = await request.get(publicPath);
    expect(publicList.status()).toBe(200);
    expect(publicList.headers()['cache-control']).toContain('no-store');
    expect((await publicList.json()).shelters).toContainEqual(expect.objectContaining({ id, name, address: validInput(name).address, lat: -29.82, lng: -50.52, status: 'Aberto' }));

    const closed = await request.post(adminPath, { headers, data: { action: 'update', id, ...validInput(name), status: 'Lotado' } });
    expect(closed.status()).toBe(200);
    expect((await (await request.get(publicPath)).json()).shelters).not.toContainEqual(expect.objectContaining({ id }));

    const deletion = await request.post(adminPath, { headers, data: { action: 'delete', id } });
    expect(deletion.status()).toBe(200);
    const linkedDeletion = await request.post(adminPath, { headers, data: { action: 'delete', id: '50000000-0000-4000-8000-000000000001' } });
    expect(linkedDeletion.status()).toBe(409);
  } finally {
    await request.post(adminPath, { headers, data: { action: 'delete', id } });
  }
});

test('RF-004 catálogo público exclui abrigos inativos, lotados ou incompletos', async ({ request }) => {
  const headers = await headersFor('admin');
  const ids: string[] = [];
  try {
    for (const [label, overrides] of [
      ['inativo', { isActive: false }],
      ['lotado', { status: 'Lotado' }],
    ] as const) {
      const response = await request.post(adminPath, { headers, data: { action: 'create', ...validInput(`Abrigo ${label} ${randomUUID()}`), ...overrides } });
      expect(response.status()).toBe(201);
      ids.push((await response.json()).id);
    }
    const catalog = await request.get(publicPath);
    const shelters = (await catalog.json()).shelters;
    for (const id of ids) expect(shelters).not.toContainEqual(expect.objectContaining({ id }));
  } finally {
    for (const id of ids) await request.post(adminPath, { headers, data: { action: 'delete', id } });
  }
});
