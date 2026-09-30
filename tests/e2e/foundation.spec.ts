import { test, expect } from '@playwright/test';

test('RNF-007 runner de navegador carrega a aplicação local preservada', async ({ page }) => {
  // Prevent any interaction with the externally configured legacy Supabase.
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' || url.hostname === 'localhost' ? route.continue() : route.abort();
  });
  await page.goto('/');
  await expect(page.getByRole('heading', {name:'GeoAlerta',exact:true})).toBeVisible();
});
