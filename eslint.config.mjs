import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".cache/**",
    "out/**",
    "build/**",
    ".cache/**",
    "venv/**",
    "docs/security-audit/migrate.js",
    // Unreferenced legacy modules are disabled in `src/modules/registry.ts`.
    "src/components/MapComponent.tsx",
    "src/components/MapDrawingTool.tsx",
    "src/lib/autoFloodZones.ts",
    "src/lib/dispatchIntelligence.ts",
    "src/lib/geoUtils.ts",
    "src/modules/abrigos/page.tsx",
    "src/modules/equipes/page.tsx",
    "src/modules/legacy-occurrence-table.tsx",
    "src/modules/legacy-public-page.tsx",
    "src/modules/legacy/**",
    "src/modules/recursos/page.tsx",
    "src/modules/voluntarios/page.tsx",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
