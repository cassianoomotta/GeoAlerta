# TASKS — Roadmap e Backlog de Implementação (GeoAlerta)

Este arquivo é a fonte única de verdade do progresso de engenharia do GeoAlerta. Tarefas atômicas e milestones são atualizados após cada ciclo de entrega.

---

## 🚀 Milestones e Progresso

### Fase 1: MVP Operacional Base
- [x] Configuração inicial do projeto Next.js 16 App Router com Turbopack e TypeScript estrito.
- [x] Configuração do Tailwind CSS com tema Dark Mode Slate 950/900 e variáveis CSS.
- [x] Integração cliente do Supabase (`@supabase/supabase-js`) e criação do esquema inicial `occurrences` e `flood_zones`.
- [x] Desenvolvimento da tela pública de reporte cidadão com captura nativa de GPS (`navigator.geolocation`).
- [x] Integração de upload de fotos de ocorrência para o Supabase Storage.
- [x] Criação do Painel Tático (`/painel`) com visualizador Leaflet dinâmico e clustering de pontos.
- [x] Mecanismo espacial de cálculo de intersecção com manchas de inundação via `@turf/turf`.
- [x] Página tabular de gestão com filtros avançados e exportação de relatórios locais em CSV (`/painel/tabela`).
- [x] Página de rastreamento público de ocorrências por protocolo (`/rastreio`).
- [x] Migração de autenticação para cookies HTTP-only seguros com `@supabase/ssr` e proteção de rotas com middleware.

---

### Fase 2: Expansão Modular do Ecossistema (Multi-Município)
- [x] Arquitetura modular desacoplada com registro central (`src/modules/registry.ts`).
- [x] Menu dinâmico do painel com leitura de feature flags por município.
- [x] **Módulo Recursos (`/painel/recursos`):** Gestão de estoque de donativos, controle de validade e movimentações de entrada/saída.
- [x] **Módulo Abrigos (`/painel/abrigos`):** Cadastro de abrigos para Humanos, Pets e Mistos, com taxa de lotação e cadastro de desabrigados.
- [x] **Módulo Equipes (`/painel/equipes`):** Transmissão de GPS em tempo real dos socorristas em campo via `watchPosition` com heartbeat de 10s no mapa.
- [x] **Módulo Voluntários (`/painel/voluntarios`):** Cadastro e filtragem por especialidade (barco, jipe 4x4, saúde, cozinha).
- [x] Geração da migration completa do banco: `sistema/supabase_migrations/001_expansao_ecossistema.sql`.

---

### Fase 3: Auditoria, Documentação e Validação
- [x] Execução de auditoria de segurança rigorosa das 5 Falhas (relatório em `docs/security-audit/`).
- [x] Geração de Apresentação Executiva em PPTX e PDF com mockups visuais para prefeituras.
- [x] Validação de compilação em produção (`npm run build`) com 0 erros de TypeScript em todas as 11 rotas.
- [x] Formalização do pacote de Engenharia de Contexto (6 arquivos em `Core/`).

---

## 📌 Próximos Passos (Backlog Ativo)

### Prioridade Alta (Imediata)
- [ ] **Executar migration no Supabase:** Aplicar o script `sistema/supabase_migrations/001_expansao_ecossistema.sql` no SQL Editor do painel Supabase para criar as novas tabelas (`shelters`, `teams`, `resources`, `volunteers`, etc.).
- [ ] **Revisão e Commit do Usuário:** O usuário deve revisar o `git status` e commitar as novas pastas adicionadas (`Core/`, `sistema/supabase_migrations/`).

### Prioridade Média (Evolução Técnica)
- [ ] **Offline-First no PWA:** Adicionar Service Worker para permitir registro de ocorrências mesmo se a conexão cair temporariamente, sincronizando via background sync assim que o sinal retornar.
- [ ] **Bot de WhatsApp:** Integração de canal conversacional alternativo para envio de ocorrências sem necessidade de abrir o navegador.
- [ ] **Módulo de Avisos Direcionados (`/painel/avisos`):** Alertas pop-up com raio geográfico para moradores de zonas sob evacuação iminente.
