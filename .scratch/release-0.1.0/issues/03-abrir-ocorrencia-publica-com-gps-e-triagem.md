# 03: Abrir ocorrência pública com GPS e triagem

**What to build:** Um cidadão sem conta registra uma ocorrência sem foto, usando GPS nativo, e recebe protocolo após a gravação com prioridade calculada pelas zonas de risco.

**Blocked by:** 01: Preparar a base Core preservando o legado.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-01, RF-001, RF-002, RF-003, RF-015, RNF-002

**Preparação:** proposta pendente de aprovação da divisão; não publicado no Notion.

**Decisão de escopo/dependência:** Não depende do login: utiliza a fronteira pública restrita e grupos/zonas sintéticos da base. A autorização privada será consumida nos tickets de backoffice.

- [ ] O formulário captura latitude, longitude e precisão pela API nativa; GPS negado, ausente, indisponível ou em timeout impede envio com orientação recuperável.
- [ ] Campos obrigatórios obedecem aos limites acordados: nome 1–120, contato 1–40, descrição 1–2.000 e tipo 1–80 caracteres; coordenadas são finitas e válidas e precisão é finita e não negativa.
- [ ] PostGIS classifica dentro ou na borda de qualquer zona ativa e vigente como ALTA; fora, buraco de polígono, zona inativa, futura ou vencida resulta em NORMAL, com SRID e ordem longitude/latitude corretos.
- [ ] Ocorrência NOVA, protocolo único, grupo padrão configurado, precisão, IDs/versões das zonas, evento de abertura e feed mínimo são persistidos atomicamente antes da confirmação.
- [ ] A ingestão usa role restrita e contexto da tentativa, sem conceder acesso a ocorrências de terceiros; prioridade e grupo público não são controlados pelo cliente.
- [ ] A mesma chave e corpo, inclusive em reenvios simultâneos após perda de resposta, retorna o mesmo protocolo com um registro, um evento e um alerta; a mesma chave com corpo diferente retorna conflito.
- [ ] O contador compartilhado limita 20 novas tentativas por minuto por origem confiável de rede; replays não contam, IP arbitrário não é autoridade e a tentativa excedente retorna 429 sem inserir.
- [ ] Testes de navegador móvel/desktop, API e banco real verificam GPS, falhas de rede, validação, texto malicioso, abuso, idempotência concorrente e classificação espacial.

