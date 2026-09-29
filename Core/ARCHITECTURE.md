# ARCHITECTURE — Arquitetura do Sistema (GeoAlerta)

## 1. Visão Geral da Arquitetura

O **GeoAlerta** adota uma arquitetura Serverless Full-Stack moderna baseada no **Next.js 16 (App Router)** com Turbopack e **Supabase (PostgreSQL + PostGIS + Auth + Realtime + Storage)**.

```mermaid
graph TD
    UserCitizen[Cidadão - PWA Mobile] -->|HTTPS / Multipart Foto| NextFrontend[Next.js 16 App Router]
    UserAdmin[Gestor / Defesa Civil] -->|Dashboard / Auth Cookie| NextFrontend
    UserAgent[Agente de Resgate] -->|Heartbeat GPS 10s| NextFrontend

    subgraph Backend [Supabase BaaS]
        NextFrontend -->|PostgreSQL Client / PostGIS| Postgres[(PostgreSQL 15+)]
        NextFrontend -->|S3 Protocol| Storage[Supabase Storage - Fotos]
        NextFrontend -->|WebSocket Pub/Sub| Realtime[Supabase Realtime]
        NextFrontend -->|SSR Auth Cookies| Auth[Supabase GoTrue Auth]
    end

    subgraph ClientEngines [Motores do Cliente]
        NextFrontend -->|Leaflet.js & MarkerCluster| MapView[Visualizador Tático]
        NextFrontend -->|Turf.js| SpatialEngine[Interseção de Manchas de Inundação]
    end
```

---

## 2. Stack Tecnológica Detalhada

| Camada | Tecnologia | Justificativa |
| :--- | :--- | :--- |
| **Framework Web** | Next.js 16.3.5 (Turbopack + React 19) | Renderização híbrida (SSR para painel seguro, Static para PWA rápido), App Router moderno e compilação instantânea. |
| **Linguagem** | TypeScript 5 (Modo Estrito) | Tipagem ponta a ponta e redução de falhas de runtime em produção. |
| **Estilização** | Tailwind CSS 3.4.19 + CSS Variables | Design system rápido, dark mode nativo com tema Slate 950/900 e isolamento de z-index. |
| **Banco de Dados** | PostgreSQL com extensão **PostGIS** | Suporte nativo a cálculos geoespaciais, índices espaciais (GIST) e consultas de proximidade. |
| **Segurança & Dados** | Supabase `@supabase/ssr` + RLS | Autenticação via cookies HTTP-only, proteção de rotas via Middleware e Row Level Security estrito por município. |
| **Mapas e GIS** | Leaflet 1.9.4 + `@turf/turf` 7.4.0 | Renderização vetorial leve de polígonos de risco, clustering de milhares de pontos e geofencing cliente-side. |
| **Ícones** | Lucide React | Biblioteca leve e padronizada de ícones semânticos para interface tática. |

---

## 3. Modelo de Dados e Esquema Relacional

```mermaid
erDiagram
    occurrences ||--o{ flood_zones : intersects
    shelters ||--o{ shelter_people : houses
    shelters ||--o{ resources : stores
    resources ||--o{ resource_movements : logs
    teams ||--o{ team_members : employs
    teams ||--o{ team_locations : tracks

    occurrences {
        uuid id PK
        text citizen_name
        text citizen_phone
        text emergency_type
        text description
        float latitude
        float longitude
        text photo_url
        text status
        text priority
        text municipio
        timestamp created_at
    }

    shelters {
        uuid id PK
        text name
        text shelter_type
        text address
        float latitude
        float longitude
        int capacity
        int current_occupancy
        text municipio
    }

    shelter_people {
        uuid id PK
        uuid shelter_id FK
        text name
        text document
        boolean has_pet
        text pet_details
        text municipio
    }

    teams {
        uuid id PK
        text name
        text agency
        text activity_type
        text contact
        text municipio
    }

    team_locations {
        uuid id PK
        uuid team_id FK
        float latitude
        float longitude
        float accuracy
        timestamp recorded_at
    }

    resources {
        uuid id PK
        text item_name
        text category
        int quantity
        text unit
        date expiration_date
        uuid shelter_id FK
        text municipio
    }
```

---

## 4. Estratégia de Isolamento e Segurança (RLS)

1. **Escopo por Município:** Toda tabela operacional possui coluna `municipio TEXT NOT NULL DEFAULT 'sa_patrulha'`, garantindo suporte multi-tenant nativo.
2. **Políticas de Row Level Security (RLS):**
   * **Leitura/Criação de Ocorrências:** Cidadãos anônimos podem criar (`INSERT`) ocorrências públicas; apenas operadores autenticados podem atualizar (`UPDATE`/`DELETE`).
   * **Módulos Administrativos:** Rotas de `/painel/*` (Recursos, Abrigos, Equipes, Voluntários) exigem usuário autenticado com sessão válida via `@supabase/ssr`.
3. **Tratamento de Cookies e Middleware:**
   * O middleware intercepta requisições de `/painel` e valida a sessão do usuário. Se não autenticado, redireciona imediatamente para `/login`.

---

## 5. Arquitetura Modular (`src/modules/`)

Para permitir que cada prefeitura adquira ou ative apenas os módulos desejados, o código foi modularizado:
* `src/modules/registry.ts`: Define a lista de módulos ativos e feature flags.
* `src/modules/core/`: Componentes universais (telas, cards, badges, formulários).
* `src/modules/<slug>/`: Cada pasta (`abrigos/`, `equipes/`, `recursos/`, `voluntarios/`) isola a lógica de negócio, chamadas do Supabase e interfaces daquele módulo.
