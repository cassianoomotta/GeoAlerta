# 🛡️ GeoAlerta — Ecossistema Integrado de Gestão de Desastres e Defesa Civil

O **GeoAlerta** é uma plataforma modular e resiliente de resposta rápida a eventos climáticos extremos (inundações, enxurradas, deslizamentos e tempestades). O sistema conecta a população vulnerável aos órgãos municipais de emergência (Defesa Civil, Bombeiros, SAMU, Secretarias de Obras e Habitação), automatizando a triagem geoespacial, a alocação de socorro e o monitoramento em tempo real.

---

## 🌟 O que o GeoAlerta possui (Módulos & Funcionalidades)

### 1. 🚨 PWA Cidadão — Registro Ágil 1-Clique (`/`)
- **Foco em Extrema Facilidade:** Interface web móvel (PWA) de carregamento instantâneo, adaptada para situações de alto estresse e redes com baixa conectividade.
- **Captura Nativa de GPS:** Extrai automaticamente a latitude e longitude exatas do dispositivo do usuário através da Web Geolocation API.
- **Tipificação de Ocorrências:** Botões intuitivos para seleção imediata do sinistro: *Alagamento*, *Deslizamento de Terra*, *Queda de Árvore*, *Bueiro / Ponte Obstruída* e *Resgate Humano Urgente*.
- **Upload de Evidências Fotográficas:** Envio direto de imagens do local para cofre seguro na nuvem (Supabase Storage), vinculadas ao registro georreferenciado.

### 2. 🗺️ Painel Tático Digital & Gabinete de Crise (`/painel`)
- **Central de Comando em Tempo Real:** Mapa interativo em tela cheia construído sobre **Leaflet.js**, **React-Leaflet** e **PostGIS**.
- **Agrupamento Inteligente (Clusterização):** Exibição sem perda de performance mesmo com centenas de ocorrências simultâneas.
- **Sobreposição de Manchas de Inundação (GeoJSON / Turf.js):** Renderização vetorial de polígonos de risco hidrológico. 
- **Triagem Automatizada por Algoritmo Espacial:** Qualquer ocorrência registrada dentro de uma mancha de risco ativa é categorizada automaticamente com **Prioridade ALTA**, acionando alertas sonoros e visuais in-app.
- **Transmissão WebSocket (Supabase Realtime):** Ocorrências abertas pela população surgem instantaneamente na tela dos gestores, sem necessidade de atualizar a página (*F5*).

### 3. 📋 Tabela Operacional de Desastres (`/painel/tabela`)
- **Triagem Operacional e Ciclo de Vida:** Controle de status das ocorrências: *Pendente*, *Em Atendimento*, *Concluído* e *Cancelado*.
- **Despacho com 1 Clique para Rotas (Waze & Google Maps):** Botões diretos que abrem o aplicativo de navegação com as coordenadas exatas da chamada para orientar motoristas de viaturas e barcos.
- **Canal Direto com o Cidadão (WhatsApp):** Abertura de conversa no WhatsApp em um toque com o número fornecido no registro.
- **Exportação CSV / Excel:** Exportação pontual dos relatórios de ocorrências com data, coordenadas, solicitante, prioridade e status para prestação de contas, laudos e auditoria pública.

### 4. 📦 Módulo de Estoque de Recursos & Mantimentos (`/painel/recursos`)
- **Gestão de Donativos e Suprimentos de Crise:** Controle rigoroso de estoque para itens vitais: água potável, cestas básicas, medicamentos, cobertores, colchões, kits de higiene e lonas.
- **Controle de Validade e Alertas de Escassez:** Indicadores visuais para itens próximos do vencimento ou abaixo da cota mínima de segurança.
- **Auditoria de Movimentação:** Histórico de entradas e saídas de donativos vinculado aos respectivos abrigos municipais.

### 5. 🏠 Módulo de Abrigos & Acolhimento Humanizado (`/painel/abrigos`)
- **Mapeamento de Pontos de Acolhimento:** Cadastro de escolas, ginásios e centros comunitários como abrigos temporários.
- **Modalidades Inclusivas:** Classificação por tipo: **Humano**, **Pet Friendly** ou **Misto** (essencial para que famílias não recusem o resgate por apego aos seus animais).
- **Medidor Dinâmico de Ocupação:** Barra de capacidade vs. ocupação percentual em tempo real.
- **Censo de Pessoas Abrigadas:** Registro nominal de acolhidos com idade, CPF, dados de saúde, contatos familiares e relação de pets acompanhantes.

### 6. 🚒 Módulo de Equipes & Telemetria GPS ao Vivo (`/painel/equipes` & `/rastreio`)
- **Gestão de Forças de Resgate:** Organização de viaturas e agentes da Defesa Civil, Corpo de Bombeiros, SAMU, Guarda Municipal e equipes voluntárias motorizadas.
- **Heartbeat GPS Contínuo:** Agentes em campo ativam a tela `/rastreio`, que envia batimentos cardíacos de geolocalização a cada 10 segundos via `navigator.geolocation.watchPosition`.
- **Rastreabilidade Tática no Mapa:** O gabinete de crise visualiza a posição exata de cada equipe em tempo real sobre o mapa de ocorrências, permitindo despachar a viatura mais próxima.

### 7. 🤝 Módulo de Voluntários Especializados (`/painel/voluntarios`)
- **Banco de Competências Críticas:** Triagem de civis voluntários categorizados por capacidade técnica e equipamentos:
  - *Condutores 4x4 / Jipeiros*
  - *Pilotos de Barco / Jet-ski*
  - *Médicos, Enfermeiros e Socorristas*
  - *Operadores de Motosserra e Tratores*
  - *Apoio Logístico e Cozinha Comunitária*
- **Status de Mobilização:** Filtro rápido por disponibilidade imediata para convocações emergenciais via telefone/WhatsApp.

---

## 🏗️ Arquitetura do Sistema

```mermaid
flowchart TD
    subgraph População["📱 Cidadão em Risco"]
        PWA["PWA 1-Clique (Next.js)"]
        GPS["Coordenadas GPS Nativas"]
        FOTO["Câmera / Foto do Local"]
    end

    subgraph Backend["☁️ Nuvem & Backend (Supabase / PostgreSQL)"]
        AUTH["Supabase Auth (RBAC)"]
        DB[("PostgreSQL 15 + PostGIS")]
        STORAGE["Supabase Storage (Imagens)"]
        REALTIME["WebSockets Realtime Engine"]
        TURF["Turf.js (Interseção Mancha de Risco)"]
    end

    subgraph Gabinete["🖥️ Gabinete de Crise (/painel)"]
        MAPA["Mapa Tático Digital (Leaflet)"]
        TABELA["Tabela Operacional + CSV"]
        MOD_ABRIGOS["Módulo de Abrigos & Censo"]
        MOD_RECURSOS["Módulo de Estoque & Doações"]
        MOD_VOLUNTARIOS["Módulo de Voluntários"]
        MOD_EQUIPES["Equipes & Telemetria GPS"]
    end

    subgraph Campo["🚒 Agentes em Campo"]
        RASTREIO["Transmissor GPS (/rastreio)"]
    end

    PWA -->|Lat/Lng + Foto| DB
    PWA -->|Upload Foto| STORAGE
    DB --> TURF
    TURF -->|Prioridade ALTA se na Mancha| DB
    DB <-->|Eventos de Inserção/Update| REALTIME
    REALTIME --> MAPA
    REALTIME --> TABELA
    RASTREIO -->|GPS Heartbeat 10s| REALTIME
    REALTIME --> MOD_EQUIPES
```

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Propósito |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Renderização híbrida (RSC), rotas dinâmicas e alta performance |
| **Biblioteca UI** | React 19 | Interface declarativa com suporte aos recursos mais recentes |
| **Estilização** | Tailwind CSS | Design tático, responsivo e adaptado para telas de gabinete e mobile |
| **Ícones** | Lucide React | Iconografia consistente de resgate, saúde e logística |
| **Mapas & Geometria** | Leaflet.js, React-Leaflet, Turf.js | Renderização vetorial de polígonos de manchas de inundação e markers interativos |
| **Banco de Dados** | PostgreSQL 15 + PostGIS | Armazenamento relacional e cálculos geoespaciais esféricos nativos |
| **Backend as a Service** | Supabase | Gerenciamento de banco, Storage de fotos, Autenticação e canal Realtime |
| **Linguagem** | TypeScript 5 | Tipagem estrita de contratos de dados, ocorrências e entidades do ecossistema |

---

## ⚙️ Configuração das Variáveis de Ambiente

Crie ou configure o arquivo `.env` dentro da pasta `sistema/`:

```env
# Conexão com o Supabase
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANONIMA_AQUI
DATABASE_URL=postgresql://postgres:[SUA_SENHA]@db.SEU_PROJETO.supabase.co:5432/postgres
```

> **Aviso de Segurança:** O arquivo `.env` contém credenciais de acesso locais e é estritamente ignorado pelo `.gitignore`.

---

## 🚀 Como Executar Localmente

1. **Instale as dependências:**
   ```bash
   cd sistema
   npm install
   ```

2. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

3. **Rotas Disponíveis para Teste:**
   - **Registro Cidadão (Mobile):** `http://localhost:3000/`
   - **Login da Defesa Civil:** `http://localhost:3000/login`
   - **Mapa Tático Digital:** `http://localhost:3000/painel`
   - **Tabela Operacional de Desastres:** `http://localhost:3000/painel/tabela`
   - **Gestão de Abrigos e Censo:** `http://localhost:3000/painel/abrigos`
   - **Estoque de Recursos e Suprimentos:** `http://localhost:3000/painel/recursos`
   - **Gestão de Equipes de Resgate:** `http://localhost:3000/painel/equipes`
   - **Voluntários por Especialidade:** `http://localhost:3000/painel/voluntarios`
   - **Telemetria de Campo (Agente):** `http://localhost:3000/rastreio`

---

## 🗄️ Banco de Dados e Migrações (Supabase)

Para inicializar a estrutura completa do banco de dados:
1. Abra o **SQL Editor** no painel do Supabase.
2. Execute o script [`supabase_migrations/001_expansao_ecossistema.sql`](supabase_migrations/001_expansao_ecossistema.sql) ou [`../supabase.sql`](../supabase.sql).
3. Todas as tabelas são provisionadas com extensão `postgis`, índices espaciais, políticas de **Row Level Security (RLS)** e isolamento multi-município (`municipio DEFAULT 'sa_patrulha'`).

---

## 🔒 Privacidade e Segurança (LGPD)
O GeoAlerta trata informações sensíveis de localização de pessoas e equipes de resgate. Todas as tabelas sensíveis de cidadãos e abrigados são protegidas por RLS, acessíveis apenas por gestores autenticados. Em demonstrações e materiais públicos de portfólio, é obrigatório o uso estrito de dados sintéticos e anônimos.
