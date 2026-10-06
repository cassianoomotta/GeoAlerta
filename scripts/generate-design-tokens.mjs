import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../docs/design-system/tokens.json', import.meta.url));
const target = fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url));
const tokens = JSON.parse(readFileSync(source, 'utf8'));
const kebab = (name) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
const channels = (hex) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)).join(' ');
const aliases = {
  foreground: 'text', card: 'surface', 'card-foreground': 'text',
  popover: 'surface', 'popover-foreground': 'text', secondary: 'surfaceSubtle',
  'secondary-foreground': 'text', muted: 'surfaceSubtle', 'muted-foreground': 'textMuted',
  accent: 'primarySoft', 'accent-foreground': 'primary', destructive: 'danger',
  'destructive-foreground': 'dangerForeground', input: 'controlBorder', ring: 'focus',
};
const declarations = (theme) => [
  ...Object.entries(theme).flatMap(([name, value]) => [
    `  --${kebab(name)}: ${value};`, `  --${kebab(name)}-rgb: ${channels(value)};`,
  ]),
  ...Object.entries(aliases).flatMap(([name, value]) => [
    `  --${name}: var(--${kebab(value)});`, `  --${name}-rgb: var(--${kebab(value)}-rgb);`,
  ]),
].join('\n');
const css = `/* Generated from docs/design-system/tokens.json. Run npm run design:tokens. */
:root {
${declarations(tokens.themes.light)}
  color-scheme: light;
  --font-body: ${tokens.typography.family};
  --radius: ${tokens.radiusPx.panel}px;
  --radius-control: ${tokens.radiusPx.control}px;
  --radius-mobile: ${tokens.radiusPx.mobileSurface}px;
  --shadow-overlay: 0 8px 24px rgb(23 35 33 / 0.12);
}
:root[data-theme="dark"] {
${declarations(tokens.themes.dark)}
  color-scheme: dark;
  --shadow-overlay: 0 8px 24px rgb(0 0 0 / 0.24);
}
`;
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== css) {
    console.error('Tokens CSS desatualizados. Execute npm run design:tokens.');
    process.exitCode = 1;
  } else console.log('Tokens CSS conferidos.');
} else {
  writeFileSync(target, css);
  console.log('Tokens CSS gerados.');
}
