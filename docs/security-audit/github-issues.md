# Issues de Segurança (GitHub)

Essas issues foram geradas automaticamente após a auditoria de segurança baseada nas 5 Falhas Capitais do projeto GeoAlerta.

---

## 🚨 Issue 1: Banco sem Tranca (RLS Desprotegido)

**Título:** [Security] Configurar Row Level Security (RLS) nas tabelas do Supabase
**Labels:** `security`, `critical`, `supabase`

**Descrição:**
Atualmente, o banco de dados (tabela `occurrences` e o bucket `occurrence_photos`) está sendo acessado livremente pelo frontend usando a `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Sem o RLS, qualquer cliente anônimo pode realizar comandos irrestritos de `INSERT` (DDoS Lógico / Spam) ou ler os dados das ocorrências através da API aberta.

**Critérios de Aceite:**
- [ ] Ativar RLS na tabela `occurrences`.
- [ ] Ativar RLS no bucket de storage `occurrence_photos`.
- [ ] Criar policy permitindo `INSERT` anônimo apenas em condições restritas (ex: limite de tamanho, rate limit se possível).
- [ ] Criar policy impedindo que usuários anônimos consigam usar comandos de `DELETE` ou `UPDATE` sob qualquer hipótese.
- [ ] (Opcional, porém recomendado) Restringir `SELECT` público ou criar views que anonimizem dados cidadãos caso a leitura precise ser pública.

---

## 🚨 Issue 2: Permissão Definida no Navegador (Painel Público)

**Título:** [Security] Implementar Middleware de Autenticação no `/painel`
**Labels:** `security`, `critical`, `auth`

**Descrição:**
A rota oficial dos gestores (`/painel`) não possui verificação no servidor (Server-Side) de sessão e autorização. Qualquer pessoa que acessar o link terá acesso ao mapa em tempo real contendo dados sensíveis de cidadãos em situação de risco.

**Critérios de Aceite:**
- [ ] Configurar Next.js Middleware ou Supabase Auth SSR.
- [ ] Proteger as rotas filhas de `/painel` garantindo que apenas os perfis (roles) oficiais (Defesa Civil, Obras, etc.) tenham permissão de renderização.
- [ ] Redirecionar usuários não logados de volta para a `/login`.

---

## ⚠️ Issue 3: IDOR (Insecure Direct Object Reference)

**Título:** [Security] Vincular Ações e Atualizações ao Perfil do Usuário
**Labels:** `security`, `high`, `backend`

**Descrição:**
Quando a funcionalidade de atualizar ou dar baixa em ocorrências for implementada no `/painel`, deve-se garantir que o objeto atualizado pertença à alçada do usuário ou que ele tenha uma role administrativa. O sistema atual permite que a API receba comandos sem validar o autor da requisição.

**Critérios de Aceite:**
- [ ] Criar tabela de perfis de usuário (`users_profiles`) vinculada ao Supabase Auth.
- [ ] Ajustar as policies do Supabase para garantir que operações `UPDATE` em `occurrences` só sejam feitas se a query for originada por uma sessão de um gestor validado.
- [ ] Validar sessões de servidor na hora de processar `UPDATE`.

---

## 💡 Issue 4: Tratamento de Arquivos e XSS

**Título:** [Security] Sanitizar Entradas Textuais e Headers de Arquivos (Storage)
**Labels:** `security`, `medium`, `xss`

**Descrição:**
O formulário de ocorrência extrai a extensão do arquivo diretamente do nome enviado pelo cliente no navegador (`file.name.split('.').pop()`). Isso pode ser manipulado para estourar o banco com injeções. Além disso, não há restrição clara sobre os tipos MIME aceitos além da flag HTML `accept`, o que é contornável. Os campos `name` e `description` também precisam de limitação via `zod`.

**Critérios de Aceite:**
- [ ] Implementar validação `zod` em Server Actions para os campos textuais.
- [ ] Validar rigidamente as extensões e mime-types no frontend (JS puro) antes do upload da imagem.
- [ ] Alterar o UUID dos arquivos enviados no Supabase para não depender das strings enviadas pelo browser, utilizando geração UUID v4 estrita (ex: `crypto.randomUUID()`).
