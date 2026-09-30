# RULES — Diretrizes de Governança e Regras de Código (GeoAlerta)

Este documento atua como a **constituição inegociável** do projeto GeoAlerta. Qualquer agente de IA ou desenvolvedor deve aderir estritamente a estas regras antes e durante qualquer alteração no código.

---

## 1. Governança Estrita de Git e Deploy (Regra de Ouro)

> [!CAUTION]
> **PROIBIÇÃO ABSOLUTA DE COMMITS E DEPLOYS PELA IA**
> * O assistente de IA **NUNCA** deve executar comandos como `git commit`, `git push`, `git merge`, `git rebase` ou disparar deploys para a Vercel / produção.
> * A IA é restrita a escrever, refatorar, testar localmente e sugerir mudanças.
> * O **USUÁRIO** detém o controle exclusivo para revisar os diffs, commitar (`git commit`) e subir (`git push`) as alterações.

---

## 2. Variáveis de Ambiente e Credenciais

* **Arquivo Único Local:** O projeto adota a convenção de utilizar única e exclusivamente o arquivo `.env` dentro da pasta `sistema/` (`.env` na raiz do repositório).
* **Segurança de Chaves:**
  * O `.env` está no `.gitignore` e **nunca** deve ser commitado.
  * Jamais injete `service_role_key` no código cliente (apenas `NEXT_PUBLIC_SUPABASE_ANON_KEY` pode ser exposta no navegador).
  * Operações administrativas sensíveis de backend devem ser tratadas em Server Actions ou Route Handlers protegidos.

---

## 3. Padrões de Código e TypeScript

* **TypeScript Estrito:** Proibido o uso de `any`. Toda estrutura de dados (ocorrência, abrigo, recurso, equipe) deve ter interface ou tipo explícito em TypeScript.
* **Componentes React (Next.js 16 + React 19):**
  * Prefira Server Components por padrão. Utilize `'use client'` apenas quando houver manipulação de estado (`useState`), efeitos (`useEffect`) ou interações do navegador (Leaflet, geolocalização).
  * Carregamento dinâmico para Leaflet: Por depender do objeto `window`, componentes que utilizam o Leaflet devem ser carregados via `dynamic(() => import(...), { ssr: false })` para evitar erros de hidratação no Next.js.
* **Ordem de Coordenadas (Atenção Crítica):**
  * **Leaflet:** Utiliza `[latitude, longitude]` (ex: `[-29.82, -50.52]`).
  * **GeoJSON / PostGIS / Turf.js:** Utiliza `[longitude, latitude]` (ex: `[-50.52, -29.82]`).
  * Toda conversão deve passar pelos utilitários centralizados em `src/lib/geoUtils.ts`.

---

## 4. Regras de Negócio e Operação

1. **Obrigatoriedade de Geolocalização:** Toda ocorrência de cidadão deve conter dados precisos de latitude e longitude extraídos via `navigator.geolocation.getCurrentPosition()`.
2. **Triagem Automática por Mancha de Inundação:**
   * Ocorrências cuja coordenada intercepte um polígono ativo de mancha de inundação devem receber automaticamente prioridade **Alta / Crítica**.
3. **Notificações In-App em Tempo Real:**
   * Alertas operacionais devem ser disparados em tempo real via canais do Supabase Realtime diretamente para a tela dos operadores.
4. **Isolamento de Z-Index do Mapa:**
   * O container do Leaflet (`.leaflet-container`) deve sempre possuir `z-index: 0 !important; isolation: isolate;` para que modais, gavetas de navegação e dropdowns da interface não fiquem escondidos atrás das camadas do mapa.
5. **Exportação Local:**
   * Relatórios devem ser exportáveis em formato CSV diretamente no navegador sem depender de serviços externos.
