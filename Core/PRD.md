# PRD — Product Requirements Document (GeoAlerta)

## 1. Visão Geral do Produto
O **GeoAlerta** é um ecossistema modular integrado para a **Defesa Civil municipal**, composto por um aplicativo cidadão voltado para reporte rápido de ocorrências e um painel operacional/tático em tempo real para os gestores e órgãos de resposta (Defesa Civil, Bombeiros, Prefeitura, Voluntários).

O objetivo central é eliminar o tempo morto e o caos de comunicação em desastres naturais (inundações, alagamentos, deslizamentos), automatizando a triagem por geolocalização e manchas de inundação, e fornecendo controle centralizado de recursos, abrigos e equipes de campo.

---

## 2. Personas e Usuários do Sistema

### 2.1. Cidadão Afetado (PWA Mobile)
* **Perfil:** Pessoa em situação de emergência, com estresse elevado, frequentemente com conexão 3G/4G instável.
* **Necessidade:** Reportar risco/alagamento com **1 clique**, sem login obrigatório nem formulários burocráticos.
* **Comportamento:** Permite acesso ao GPS nativo, tira uma foto, escolhe a gravidade e envia.

### 2.2. Gestor da Defesa Civil / Operador Tático (Dashboard Desktop)
* **Perfil:** Coordenador de crise na central de monitoramento.
* **Necessidade:** Visão holística da cidade em mapa tático, com alertas in-app em tempo real, contagem de desabrigados, triagem automática e despacho de equipes.
* **Comportamento:** Acompanha mapa com camadas (ocorrências, manchas de inundação ativas, abrigos, equipes GPS em tempo real).

### 2.3. Agente de Equipe de Campo (Resgate / Bombeiros)
* **Perfil:** Socorrista em viatura, bote ou caminhão.
* **Necessidade:** Visualizar rotas e ocorrências atribuídas, transmitindo seu posicionamento GPS contínuo para o comando central.

### 2.4. Voluntários e Doadores
* **Perfil:** Cidadãos cadastrados por habilidade (jipeiros, barqueiros, médicos, enfermeiros, suporte logístico).
* **Necessidade:** Centralização de disponibilidade e contato rápido para acionamento pontual.

---

## 3. Funcionalidades Core (MVP & Módulos Ativos)

### 3.1. Reporte Cidadão 1-Clique (`/`)
* Captura obrigatória de geolocalização nativa via `navigator.geolocation`.
* Upload de fotografia de evidência para o Supabase Storage.
* Formulário simplificado (Tipo de emergência, descrição, contato opcional).
* Rastreamento público de protocolo via `/rastreio`.

### 3.2. Mapa Tático Operacional (`/painel`)
* Plotagem de ocorrências em mapa interativo (Leaflet) com clustering (`leaflet.markercluster`).
* Cálculo espacial com `@turf/turf` para cruzamento de ocorrências com polígonos de "Manchas de Inundação".
* Classificação automática de prioridade: ocorrências dentro da mancha recebem status **CRÍTICO / ALTO**.
* Notificações In-App em tempo real via Supabase Realtime (evitando sobrecarga de e-mails em crise).
* Ferramenta de desenho de novas manchas de risco no mapa (`MapDrawingTool`).

### 3.3. Gestão Tabular e Exportação (`/painel/tabela`)
* Tabela completa de ocorrências com filtros por status (Pendente, Em Atendimento, Resolvido), tipo e prioridade.
* Exportação de relatórios locais em formato CSV para prestação de contas e planejamento.

### 3.4. Ecossistema Modular Expansível (Multi-Município)
Cada município pode ativar módulos conforme necessidade via tabela `settings`:
* **Estoque de Recursos (`/painel/recursos`):** Controle de donativos e mantimentos (água, alimentos, colchões, remédios) com entradas, saídas e controle de validade.
* **Abrigos (`/painel/abrigos`):** Cadastro de abrigos classificados por tipo (**Humano, Pet ou Misto**), taxa de ocupação em tempo real e cadastro de desabrigados com registro de animais de estimação associados.
* **Equipes de Resgate com GPS em Tempo Real (`/painel/equipes`):** Transmissão de coordenadas via `watchPosition` do smartphone dos agentes (heartbeat a cada 10s) plotado ao vivo no mapa do centro de operações.
* **Banco de Voluntários (`/painel/voluntarios`):** Cadastro de voluntários filtráveis por especialidade (embarcação, 4x4, saúde, cozinha comunitária).

---

## 4. O Que Está Fora de Escopo (Out of Scope no Momento)
* ❌ Integração bidirecional com Google Sheets ou Excel externo (toda gestão ocorre no banco próprio).
* ❌ Envio massivo de SMS / WhatsApp (planejado para Fase 2).
* ❌ Integração com radares meteorológicos do CEMADEN / INPE (planejado para Fase 3).
* ❌ App nativo para App Store / Google Play (o PWA web responsivo supre a demanda com menor atrito).
