import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { getEnabledModules, MODULES } from '../../src/modules/registry';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

test('RF-017 navegação separa dashboard e mapa, mantém ocorrências e oculta módulos legados', () => {
  expect(getEnabledModules().map(({ slug }) => slug)).toEqual(['dashboard', 'monitoramento', 'tabela']);
  expect(MODULES.filter(({ enabled }) => enabled).map(({ label, href }) => [label, href])).toEqual([
    ['Dashboard', '/painel'], ['Mapa', '/painel/mapa'], ['Ocorrências', '/painel/ocorrencias'],
  ]);
  expect(MODULES.filter(({ enabled }) => !enabled).map(({ slug }) => slug)).toEqual([
    'recursos', 'abrigos', 'equipes', 'voluntarios',
  ]);
});

test('RF-017 rotas legadas não montam componentes, GPS nem assinaturas operacionais', () => {
  const legacyRoutes = [
    'src/app/painel/abrigos/page.tsx',
    'src/app/painel/recursos/page.tsx',
    'src/app/painel/equipes/page.tsx',
    'src/app/painel/voluntarios/page.tsx',
    'src/app/rastreio/page.tsx',
  ];
  for (const path of legacyRoutes) {
    const page = source(path);
    expect(page).toContain('LegacyModuleUnavailable');
    expect(page).not.toMatch(/@\/modules\/(abrigos|recursos|equipes|voluntarios)/);
    expect(page).not.toMatch(/geolocation|watchPosition|\.subscribe\(/i);
  }

  const dashboard = source('src/app/painel/page.tsx');
  const map = source('src/app/painel/mapa/page.tsx');
  expect(dashboard).toContain('CoreDashboardIndicators');
  expect(dashboard).not.toContain('CoreMapOverview');
  expect(map).toContain('CoreMapOverview');
  expect(dashboard).not.toMatch(/team_locations|watchPosition|\.subscribe\(/i);
});

test('RF-017 detalhes de ocorrência retornam à lista que os abriu', () => {
  const detail = source('src/app/painel/ocorrencias/[id]/page.tsx');
  expect(detail.match(/href="\/painel\/ocorrencias"/g)).toHaveLength(2);
  expect(detail).not.toMatch(/href="\/painel">← Voltar para ocorrências/);
});

test('RF-017 mantém as implementações completas de mapa legado e rastreio fora das rotas ativas', () => {
  expect(source('src/modules/legacy/painel-dashboard-page.tsx')).toContain('function PainelContent');
  expect(source('src/modules/legacy/tracking-page.tsx')).toContain('navigator.geolocation.watchPosition');
});

test('RF-017 migration nega acesso às tabelas antigas sem apagar dados e remove broadcast GPS', () => {
  const migration = source('prisma/migrations/202610010017_disable_legacy_modules/migration.sql');
  for (const table of ['resources', 'resource_movements', 'shelters', 'shelter_people', 'teams', 'team_members', 'team_locations', 'volunteers']) {
    expect(migration).toContain(`'${table}'`);
  }
  expect(migration).toContain('REVOKE ALL PRIVILEGES ON TABLE');
  expect(migration).toContain('AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false)');
  expect(migration).toContain('ALTER PUBLICATION supabase_realtime DROP TABLE');
  expect(migration).not.toMatch(/^\s*(?:DROP TABLE|TRUNCATE|DELETE FROM)\b/im);
});
