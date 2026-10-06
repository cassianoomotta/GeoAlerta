import { expect, test } from '@playwright/test';

test('primeiro acesso usa Claro mesmo em dispositivo escuro; Sistema é uma escolha explícita', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/design-system');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByLabel('Aparência').selectOption('system');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByLabel('Aparência').selectOption('dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByLabel('Aparência')).toHaveValue('dark');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#172321');
});

test('armazenamento bloqueado não impede usar ou mudar o tema', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'getItem', { value: () => { throw new Error('blocked'); } });
    Object.defineProperty(Storage.prototype, 'setItem', { value: () => { throw new Error('blocked'); } });
  });
  await page.goto('/design-system');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByLabel('Aparência').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('campo inválido tem label, descrição de erro e loading bloqueia o botão', async ({ page }) => {
  await page.goto('/design-system');
  const input = page.getByLabel('Descrição com erro');
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  const errorId = await input.getAttribute('aria-describedby');
  expect(errorId).toBeTruthy();
  await expect(page.locator(`[id="${errorId}"]`)).toHaveText('Descreva a ocorrência para continuar.');
  await expect(page.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
  await page.getByLabel('Aparência').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Registrar ocorrência', exact: true })).toBeFocused();
});

test('ações primária e destrutiva mantêm superfície sólida e contraste de texto em ambos os temas', async ({ page }) => {
  await page.goto('/design-system');
  for (const theme of ['light', 'dark']) {
    await page.getByLabel('Aparência').selectOption(theme);
    for (const name of ['Registrar ocorrência', 'Cancelar ocorrência']) {
      const colors = await page.getByRole('button', { name, exact: true }).evaluate(element => {
        const style = getComputedStyle(element);
        return { background: style.backgroundColor, foreground: style.color };
      });
      expect(colors.background).not.toBe('rgba(0, 0, 0, 0)');
      const luminance = (color: string) => {
        const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(value => {
          const channel = Number(value) / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      const a = luminance(colors.background), b = luminance(colors.foreground);
      expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test('catálogo mantém a leitura sem overflow nos dois temas e nas larguras de aceite', async ({ page }) => {
  await page.goto('/design-system');
  for (const width of [320, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark']) {
      await page.getByLabel('Aparência').selectOption(theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
      await expect(page.getByRole('heading', { name: 'Design system', exact: true })).toBeVisible();
    }
  }
});

test('formulário público acompanha o tema, mantém input mobile de 16px e envio dependente de GPS', async ({ page }) => {
  await page.route('**/api/core/public/occurrence-types', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ types: ['Alagamentos/Inundação'] }) }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/design-system');
  for (const theme of ['dark', 'light']) {
    await page.getByLabel('Aparência').selectOption(theme);
    await page.getByRole('link', { name: 'Abrir registro de ocorrências' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.getByRole('button', { name: 'Enviar ocorrência' })).toBeDisabled();
    const inputStyle = await page.getByRole('textbox', { name: 'Nome' }).evaluate(element => {
      const style = getComputedStyle(element);
      return { fontSize: parseFloat(style.fontSize), minHeight: parseFloat(style.minHeight), colorScheme: style.colorScheme };
    });
    expect(inputStyle.fontSize).toBeGreaterThanOrEqual(16);
    expect(inputStyle.minHeight).toBeGreaterThanOrEqual(48);
    expect(inputStyle.colorScheme).toBe(theme);
    await expect(page.getByRole('region', { name: 'Instituições de atendimento' }).getByRole('img', { name: 'Prefeitura de Santo Antônio da Patrulha' })).toBeVisible();
    await page.goto('/design-system');
  }
});

test('preferência e remoção da preferência são compartilhadas entre abas do mesmo navegador', async ({ page, context }) => {
  await page.goto('/design-system');
  const other = await context.newPage();
  await other.goto('/design-system');
  await page.getByLabel('Aparência').selectOption('dark');
  await expect(other.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.evaluate(() => localStorage.removeItem('geoalerta-theme'));
  await expect(other.locator('html')).toHaveAttribute('data-theme', 'light');
  await other.close();
});
