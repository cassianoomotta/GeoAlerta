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


