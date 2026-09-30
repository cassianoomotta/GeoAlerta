# Regras de Negócio (Business Rules)

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

