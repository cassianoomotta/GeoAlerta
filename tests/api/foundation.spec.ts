import { test, expect } from '@playwright/test';

test('RNF-007 runner HTTP acessa a aplicação local existente', async ({ request }) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/html');
  expect(await response.text()).toContain('GeoAlerta');
});
