import { expect, test } from '@playwright/test';
import { fixtureCookies } from '../fixtures/session';

const result = { id: '80000000-0000-4000-8000-000000000001', protocol: '1', status: 'NOVA', priority: 'ALTA', version: 1 };

test('US-05 operador registra ocorrência com localização nativa e abre o protocolo', async ({ page, context }) => {
  await page.route('**/*', (route) => {
    const host = new URL(route.request().url()).hostname;
    return ['127.0.0.1', 'localhost'].includes(host) ? route.continue() : route.abort();
  });
  await context.addCookies((await fixtureCookies('operador')).map((cookie) => ({ ...cookie, url: 'http://127.0.0.1:3102' })));
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: -29.5, longitude: -50.5, accuracy: 8 });
  let submitted: unknown;
  const idempotencyKeys: string[] = [];
  let releaseFirstResponse!: () => void;
  const firstResponse = new Promise<void>((resolve) => { releaseFirstResponse = resolve; });
  await page.route('**/api/core/occurrences', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    submitted = route.request().postDataJSON();
    idempotencyKeys.push(route.request().headers()['idempotency-key']);
    if (idempotencyKeys.length === 1) await firstResponse;
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(result) });
  });

  await page.goto('/painel/ocorrencias');
  await page.getByText('Registrar ocorrência manualmente', { exact: true }).click();
  const form=page.locator('details').filter({has:page.getByText('Registrar ocorrência manualmente',{exact:true})}).locator('form');
  await page.getByRole('button', { name: 'Obter localização GPS' }).click();
  await expect(page.getByText(/Precisão ±8 m/)).toBeVisible();
  await form.getByLabel('Tipo',{exact:true}).selectOption('Alagamentos/Inundação');
  await form.getByLabel('Nome de contato',{exact:true}).fill('Pessoa sintética');
  await form.getByLabel('Contato',{exact:true}).fill('555-0100');
  await form.getByLabel('Descrição',{exact:true}).fill('Água avançando na via');
  await page.getByRole('button', { name: 'Registrar ocorrência', exact: true }).click();
  await expect(form.getByLabel('Descrição',{exact:true})).toBeDisabled();
  await expect(form.getByLabel('Tipo',{exact:true})).toBeDisabled();
  releaseFirstResponse();

  await expect(page.getByText('Protocolo 1')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Abrir ocorrência' })).toHaveAttribute('href', `/painel/ocorrencias/${result.id}`);
  expect(submitted).toMatchObject({
    groupId: '20000000-0000-4000-8000-000000000001',
    type: 'Alagamentos/Inundação',
    description: 'Água avançando na via',
    position: { latitude: -29.5, longitude: -50.5, accuracy: 8 },
  });

  await page.getByRole('button', { name: 'Registrar ocorrência', exact: true }).click();
  await expect.poll(() => idempotencyKeys).toHaveLength(2);
  expect(idempotencyKeys[1]).not.toBe(idempotencyKeys[0]);
});
