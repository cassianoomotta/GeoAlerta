# Produto: Sistema de Monitoramento e Gestão de Ocorrências

## Visão Geral
Uma plataforma integrada (aplicativo para o cidadão e painel web para gestão) voltada para a Defesa Civil. O objetivo central é agilizar o registro de ocorrências georreferenciadas, mapear riscos (inundações) e automatizar o tempo de resposta através de fluxos de ação inteligentes.

## Usuários do Sistema
1. **Cidadão (App PWA):** Registra problemas e sua localização com o mínimo de cliques possíveis através de um formulário web ultra-simplificado. *(Fase 2: Integração via Bot de WhatsApp).*
2. **Agente/Gestor (Dashboard MVP):** Acessa um painel web centralizado na própria plataforma onde monitora o mapa e recebe alertas em tempo real.

## Funcionalidades Core (MVP)
- **Fluxo Cidadão 1-Clique (PWA):** Interface web levíssima focada em um botão de ação rápida que captura localização nativa (GPS) e permite envio de foto/texto. As fotos são enviadas para um cofre de arquivos na nuvem (Storage) e vinculadas à ocorrência.
- **Roteamento e Notificação In-App (Tempo Real):** Ao invés de e-mails, as ocorrências aparecem instantaneamente como notificações (Pop-ups/Cards) no painel web da plataforma, direcionadas ao órgão correto para evitar sobrecarga em caixas de entrada durante desastres.
- **Mapa Tático Digital:** Uma página web dedicada no sistema utilizando Leaflet.js e APIs públicas de mapas para plotar em tempo real todas as ocorrências cadastradas em um mapa interativo visual.

## Stack Sugerida
- Frontend: Next.js (React) - PWA
- Backend/DB: Supabase (com PostGIS para consultas geográficas)
- Mapas: Leaflet.js
