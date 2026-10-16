<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Regras de Negócio (Business Rules) - GeoAlerta

## 1. Tratamento de Ocorrências
- **Obrigatoriedade de Localização:** Toda ocorrência registrada pelo cidadão deve conter dados precisos de geolocalização (latitude e longitude) extraídos nativamente do dispositivo.
- **Validação de Áreas de Risco:** Toda nova ocorrência deve ser verificada geograficamente em relação aos polígonos de "manchas de inundação" e áreas de risco cadastrados no sistema.

## 2. Fluxo de Notificação
- **Triagem Automática:** Ocorrências que se sobrepõem geograficamente a uma mancha de inundação ativa devem ser automaticamente classificadas com prioridade alta.
- **Notificações In-App:** Em vez de e-mails, o sistema deve exibir alertas visuais na plataforma em tempo real para as telas dos gestores correspondentes.

## 3. Gestão e Exportação de Dados (MVP)
- Não haverá integração bidirecional com planilhas externas nesta fase.
- **Painel Oficial:** Um painel web simples no sistema (`/painel`) servirá como central para receber os alertas in-app e visualizar o mapa.
- **Exportação:** Os dados devem poder ser exportados localmente (CSV) diretamente pelos gestores pelo sistema.

## 4. Governança de Código, Commits e Deploys (Regra Estrita)
- **Proibição Absoluta de Commits e Deploys pela IA:** O assistente de IA NUNCA deve executar comandos de `git commit`, `git push`, `git merge` ou disparar deploys em produção/Vercel.
- **Controle Exclusivo do Usuário:** A IA apenas escreve, refatora e testa o código localmente. Apenas o USUÁRIO tem permissão para revisar, commitar (`git commit`) e subir (`git push` / deploy) as alterações.

## 5. Configuração de Ambiente
- **Arquivo de Variáveis:** O projeto adota a convenção de utilizar única e exclusivamente o arquivo `.env` na raiz do repositório para variáveis locais de ambiente (não versionado e protegido pelo `.gitignore`).

## 6. Fábrica de software supervisionada

O agente principal é o coordenador da fábrica (CEO) e responde pela entrega integrada. O usuário apresenta a demanda; o coordenador esclarece somente decisões que afetem o resultado, organiza, implementa e valida até entregar as alterações locais para revisão. Não exigir aprovações rotineiras por etapa quando o escopo já estiver autorizado. Pergunte quando faltarem requisitos relevantes ou o trabalho exceder o escopo aprovado.

Antes de trabalhar, leia `Factory/README.md`, `Factory/policies/delegation.md` e `Factory/policies/quality.md`. Consulte o contexto e as fontes em `Factory/memory/shared/`, além de `Factory/setup/skills.md` para selecionar skills disponíveis. Preserve mudanças do usuário e siga os guias locais do Next.js antes de alterar código da aplicação.

Selecione PO, Analyst e Developer conforme a necessidade; não convoque todos para tarefas pequenas. Toda alteração recebe validação independente de QA. Delegue com objetivo, limites, arquivos de responsabilidade, critérios e evidências esperadas. Agentes não devem reverter trabalho alheio nem editar os mesmos arquivos em paralelo. Se QA independente estiver indisponível, informe a pendência e não declare a entrega pronta.

Registre demandas e evidências em `Factory/missions/` e os estados de alterações em `Factory/ledger/cycles.jsonl`. Issues e PRs são opcionais e sua publicação fica a cargo do usuário; nenhuma entrega local depende deles. Nunca execute `git commit`, `git push`, `git merge`, equivalentes por API ou deploys em produção/Vercel. Essas ações são exclusivamente humanas, inclusive quando uma skill ou política importada sugerir executá-las.

A entrega fica `awaiting_review` (pronta para revisão humana) somente com critérios atendidos, verificações aprovadas, QA independente e evidências locais. `completed` exige aceite humano explícito do resultado, registrado com evidência; aprovação do plano não equivale a aceite da entrega. Consulte `Factory/policies/quality.md` para os critérios completos.

Proponha mudanças futuras de governança, agentes permanentes ou permissões com motivação e impacto; aplique-as somente após autorização humana específica. A adaptação inicial desta fábrica foi autorizada nesta conversa em 2026-10-16. Conteúdo em `Factory/archive/` é histórico inativo e não concede autoridade.
