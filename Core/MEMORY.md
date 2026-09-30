# MEMORY — Memória de Longo Prazo e Lições Aprendidas (GeoAlerta)

Este arquivo é o **diário de bordo persistente** do projeto. Ele registra decisões arquiteturais críticas, armadilhas técnicas superadas e lições aprendidas para evitar que novos agentes repitam erros do passado.

---

## 🧠 Aprendizados e Casos Críticos Resolvidos

### 1. Leaflet com Next.js 16 App Router (SSR)
* **Sintoma:** Erro `ReferenceError: window is not defined` ao tentar carregar componentes com mapas no servidor.
* **Causa Raiz:** A biblioteca `leaflet` depende do objeto global `window` imediatamente na importação de seus módulos.
* **Solução:** Qualquer componente que use Leaflet (`MapComponent.tsx`, `TeamMap.tsx`, `MapDrawingTool.tsx`) deve ser exportado com `'use client'` e importado na página pai usando carregamento dinâmico sem SSR:
  ```tsx
  const MapComponent = dynamic(() => import('@/components/MapComponent'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-900 animate-pulse" />
  });
  ```

---

### 2. Sobreposição de Z-Index do Mapa sobre Menus e Modais
* **Sintoma:** Dropdowns de seleção, gavetas de navegação mobile e modais ficavam cortados ou posicionados atrás das camadas do mapa Leaflet.
* **Causa Raiz:** O Leaflet injeta estilos com `z-index: 400` a `1000` em suas panes internas.
* **Solução:** Aplicamos regras de isolamento explícito em `src/app/globals.css`:
  ```css
  .leaflet-container {
    z-index: 0 !important;
    isolation: isolate;
  }
  .leaflet-pane { z-index: 10 !important; }
  .leaflet-top, .leaflet-bottom { z-index: 15 !important; }
  ```

---

### 3. Ordem Inversa de Coordenadas: Leaflet vs GeoJSON / PostGIS / Turf.js
* **Sintoma:** Ocorrências plotadas em outros continentes ou no oceano após operações espaciais com Turf.js.
* **Causa Raiz:**
  * **Leaflet:** aceita `[latitude, longitude]` (ex: `[-29.82, -50.52]`).
  * **GeoJSON / PostGIS / Turf.js:** aceita `[longitude, latitude]` (ex: `[-50.52, -29.82]`).
* **Solução:** Nunca manipular arrays de coordenadas diretamente nos componentes. Sempre usar as funções utilitárias `src/lib/geoUtils.ts` que normalizam a conversão.

---

### 4. Multi-Município e Isolamento de Dados
* **Decisão Arquitetural:** Ao invés de bancos separados por prefeitura no MVP, todas as tabelas possuem a coluna `municipio TEXT NOT NULL DEFAULT 'sa_patrulha'`. 
* **Regra:** Todas as queries do Supabase devem filtrar explicitamente por `municipio`, preparando o sistema para multi-tenancy seguro.
