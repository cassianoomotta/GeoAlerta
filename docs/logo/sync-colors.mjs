import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const logoPath = fileURLToPath(new URL('./geoalerta.svg', import.meta.url));
const componentPath = fileURLToPath(new URL('../../src/components/brand/geoalerta-logo.tsx', import.meta.url));

// Keep standalone SVG colors in sync; inline SVGs inherit the app's CSS tokens.
export function syncLogoColors(tokens, { check = false } = {}) {
  const { light, dark } = tokens.themes;
  const colors = (theme) => `    --geoalerta-logo-primary: ${theme.primary};\n    --geoalerta-logo-danger: ${theme.danger};`;
  const style = `<style data-geoalerta-tokens="">
  /* Generated from docs/design-system/tokens.json. Run npm run design:tokens. */
  .geoalerta-logo {
${colors(light)}
  }
  @media (prefers-color-scheme: dark) {
    .geoalerta-logo:not([data-theme="light"]) {
${colors(dark)}
    }
  }
  .geoalerta-logo[data-theme="dark"] {
${colors(dark)}
  }
  .geoalerta-logo .geoalerta-logo-primary {
    fill: var(--primary, var(--geoalerta-logo-primary));
  }
  .geoalerta-logo .geoalerta-logo-danger {
    fill: var(--danger, var(--geoalerta-logo-danger));
  }
  </style>`;
  const original = readFileSync(logoPath, 'utf8');
  const stylePattern = /<style data-geoalerta-tokens(?:="")?>[\s\S]*?<\/style>/;
  if (!stylePattern.test(original)) throw new Error('Bloco de tokens ausente no SVG da logo.');
  const updated = original.replace(stylePattern, style).replace(
    /class="geoalerta-logo-(primary|danger)" fill="#[0-9a-fA-F]{6}"/g,
    (_, role) => `class="geoalerta-logo-${role}" fill="${light[role]}"`,
  );
  if (check) {
    if (original !== updated) {
      console.error('Cores da logo SVG desatualizadas. Execute npm run design:tokens.');
      process.exitCode = 1;
    } else console.log('Cores da logo SVG conferidas.');
  } else {
    if (original !== updated) writeFileSync(logoPath, updated);
    console.log('Cores da logo SVG sincronizadas.');
  }

  const markup = updated.replace(stylePattern, '').replace(/\bclass=/g, 'className=')
    .replace('className="geoalerta-logo"', 'className={`geoalerta-logo ${className}`}')
    .replace(/className="geoalerta-logo-(primary|danger)" fill="#[0-9a-fA-F]{6}"/g,
      (_, role) => `className="geoalerta-logo-${role}" fill="var(--${role}, ${light[role]})"`);
  const component = `// Generated from docs/logo/geoalerta.svg. Run npm run design:tokens; edit the SVG source instead.
export function GeoAlertaLogo({ className = '' }: { className?: string }) {
  return (
${markup.trim().split('\n').map(line => `    ${line}`).join('\n')}
  );
}
`;
  const current = existsSync(componentPath) ? readFileSync(componentPath, 'utf8') : null;
  if (check) {
    if (current !== component) {
      console.error('Componente da logo desatualizado. Execute npm run design:tokens.');
      process.exitCode = 1;
    } else console.log('Componente da logo conferido.');
  } else {
    mkdirSync(dirname(componentPath), { recursive: true });
    if (current !== component) writeFileSync(componentPath, component);
    console.log('Componente da logo sincronizado.');
  }
}
