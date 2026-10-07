import { expect, test } from '@playwright/test';
import { fixtureCookies } from '../fixtures/session';

const result = { id: '80000000-0000-4000-8000-000000000037', protocol: '37', status: 'NOVA', priority: 'NORMAL', version: 1 };

test('Task 37 posiciona, confirma novamente após mover e preserva a mesma tentativa em falha de rede', async ({ page, context }) => {
  await context.addCookies((await fixtureCookies('admin')).map(cookie => ({ ...cookie, url: 'http://127.0.0.1:3102' })));
  await page.route('https://*.tile.openstreetmap.org/**', route => route.abort());
  const bodies: unknown[] = [];
  const keys: string[] = [];
  await page.route('**/api/core/occurrences/battalion', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    bodies.push(route.request().postDataJSON());
    keys.push(route.request().headers()['idempotency-key']);
    if (keys.length === 1) return route.abort();
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(result) });
  });

  await page.goto('/painel/ocorrencias/rapida');
  await expect(page.getByRole('heading', { name: 'Registro rápido do batalhão' })).toBeVisible();
  const map = page.locator('.leaflet-container');
  await expect(map).toBeVisible();
  const bounds = await map.boundingBox();
  if (!bounds) throw new Error('Mapa do batalhão não foi renderizado.');
  await map.click({ position: { x: bounds.width / 2, y: bounds.height / 2 } });
  await expect(map.locator('.leaflet-marker-icon svg')).toBeVisible();
  await expect(map.locator('.leaflet-marker-icon img')).toHaveCount(0);
  await expect(page.getByText('Confirmação necessária após posicionar o marcador')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar ponto no mapa' }).click();
  await expect(page.getByText('Ponto confirmado')).toBeVisible();
  const marker = map.locator('.leaflet-marker-icon').first();
  const markerBounds = await marker.boundingBox();
  if (!markerBounds) throw new Error('Marcador da ocorrência não foi renderizado.');
  await page.mouse.move(markerBounds.x + markerBounds.width / 2, markerBounds.y + markerBounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(markerBounds.x + markerBounds.width / 2 + 38, markerBounds.y + markerBounds.height / 2 + 20, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByText('O ponto mudou. Confirme novamente a localização no mapa.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Registrar ocorrência' })).toBeDisabled();
  await page.getByRole('button', { name: 'Confirmar ponto no mapa' }).click();

  await page.getByRole('combobox', { name: 'Tipo' }).selectOption('Alagamentos/Inundação');
  await page.getByRole('textbox', { name: 'Endereço ou referência' }).fill('Rua de referência, 123');
  await page.getByRole('textbox', { name: 'Descrição curta' }).fill('Água avançando na via');
  await page.getByRole('radio', { name: 'Não' }).check();
  await page.getByRole('textbox', { name: 'Nome de contato (opcional)', exact: true }).fill('');
  await page.getByRole('textbox', { name: 'Contato (opcional)', exact: true }).fill('');
  const submit = page.getByRole('button', { name: 'Registrar ocorrência' });
  await submit.click();
  await expect(page.locator('p[role="alert"]')).toContainText('Não foi possível confirmar o registro');
  await expect(page.getByRole('textbox', { name: 'Descrição curta' })).toHaveValue('Água avançando na via');
  await submit.click();
  await expect(page.getByText('Ocorrência registrada.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Abrir ocorrência' })).toHaveAttribute('href', `/painel/ocorrencias/${result.id}`);

  expect(keys).toHaveLength(2);
  expect(keys[1]).toBe(keys[0]);
  expect(bodies[0]).toEqual(bodies[1]);
  expect(bodies[0]).toMatchObject({ type: 'Alagamentos/Inundação', address: 'Rua de referência, 123', needsMedicalSupport: false, position: { confirmed: true } });
  expect(bodies[0]).not.toHaveProperty('groupId');
  expect(bodies[0]).not.toHaveProperty('climateEventId');
  expect(bodies[0]).not.toHaveProperty('priority');
  expect(bodies[0]).not.toHaveProperty('status');
});

test('Task 37 mantém o asterisco obrigatório ao lado do texto em todos os campos do formulário', async ({ page, context }) => {
  await context.addCookies((await fixtureCookies('admin')).map(cookie => ({ ...cookie, url: 'http://127.0.0.1:3102' })));
  await page.route('https://*.tile.openstreetmap.org/**', route => route.abort());
  await page.goto('/painel/ocorrencias/rapida');
  await expect(page.getByRole('heading', { name: 'Registro rápido do batalhão' })).toBeVisible();

  for (const field of ['type', 'address', 'description']) {
    const label = page.locator(`label:has([name="${field}"])`);
    const positions = await label.evaluate(element => {
      const title = element.querySelector<HTMLElement>(':scope > span');
      const required = title?.querySelector<HTMLElement>('[aria-hidden="true"]');
      const textNode = title && Array.from(title.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
      if (!required || !textNode) throw new Error('Rótulo obrigatório não encontrado.');
      const range = document.createRange();
      range.selectNodeContents(textNode);
      const textBounds = range.getBoundingClientRect();
      const requiredBounds = required.getBoundingClientRect();
      return { textY: textBounds.y, textRight: textBounds.right, requiredY: requiredBounds.y, requiredLeft: requiredBounds.left };
    });
    expect(Math.abs(positions.textY - positions.requiredY), `asterisco de ${field} deve ficar na mesma linha do rótulo`).toBeLessThan(5);
    expect(positions.requiredLeft, `asterisco de ${field} deve ficar após o rótulo`).toBeGreaterThanOrEqual(positions.textRight - 1);
  }
});
