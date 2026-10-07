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
  await expect(page.getByRole('button', { name: 'Obter localização GPS' })).toHaveCount(0);
  await page.locator('aside').getByRole('link', { name: 'Nova ocorrência', exact: true }).click();
  await expect(page).toHaveURL(/\/painel\/ocorrencias\/nova$/);
  await expect(page.getByRole('heading', { name: 'Nova ocorrência', exact: true })).toBeVisible();
  await expect(page.locator('aside').getByRole('link', { name: 'Nova ocorrência', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('aside').getByRole('link', { name: 'Lista de ocorrências', exact: true })).not.toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Obter localização GPS' }).click();
  await expect(page.getByText(/Precisão ±8 m/)).toBeVisible();
  await page.getByRole('combobox',{name:'Tipo',exact:true}).selectOption('Alagamentos/Inundação');
  await page.getByRole('textbox',{name:'Nome de contato',exact:true}).fill('Pessoa sintética');
  await page.getByRole('textbox',{name:'Contato',exact:true}).fill('555-0100');
  await page.getByRole('textbox',{name:/Endereço/}).fill('Rua das Flores, 123');
  await page.getByRole('textbox',{name:'Descrição',exact:true}).fill('Água avançando na via');
  await page.getByRole('button', { name: 'Registrar ocorrência', exact: true }).click();
  await expect(page.getByRole('textbox',{name:'Descrição',exact:true})).toBeDisabled();
  await expect(page.getByRole('combobox',{name:'Tipo',exact:true})).toBeDisabled();
  await expect(page.getByRole('textbox',{name:/Endereço/})).toBeDisabled();
  releaseFirstResponse();

  await expect(page.getByText('Protocolo 1')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Abrir ocorrência' })).toHaveAttribute('href', `/painel/ocorrencias/${result.id}`);
  expect(submitted).toMatchObject({
    groupId: '20000000-0000-4000-8000-000000000001',
    type: 'Alagamentos/Inundação',
    description: 'Água avançando na via',
    address: 'Rua das Flores, 123',
    position: { latitude: -29.5, longitude: -50.5, accuracy: 8 },
  });

  await page.getByRole('button', { name: 'Registrar ocorrência', exact: true }).click();
  await expect.poll(() => idempotencyKeys).toHaveLength(2);
  expect(idempotencyKeys[1]).not.toBe(idempotencyKeys[0]);
});
