# GeoAlerta - Sistema de Monitoramento e Gabinete de Crise

Sistema oficial para registro ágil de ocorrências climáticas (alagamentos, deslizamentos, quedas de árvores) pelos cidadãos e triagem operacional em tempo real para a Defesa Civil e órgãos municipais.

---

## 🛠️ Stack Tecnológica

- **Frontend:** Next.js 16 (App Router), React 19, TailwindCSS, Lucide React
- **Mapas:** Leaflet.js, React-Leaflet, React-Leaflet-Cluster
- **Backend / Database:** Supabase (PostgreSQL + extensão geográfica PostGIS, Realtime e Storage)

---

## ⚙️ Configuração das Variáveis de Ambiente

As configurações de conexão com o Supabase devem ser definidas no arquivo `.env` dentro da pasta `sistema/`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_AQUI
DATABASE_URL=postgresql://postgres:[SENHA]@db.SEU_PROJETO.supabase.co:5432/postgres
```

> **Atenção:** O arquivo `.env` contém credenciais locais e é ignorado pelo `.gitignore` para não ser commitado no repositório.

---

## 🚀 Como Rodar Localmente

1. Instale as dependências:
```bash
npm install
```

2. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

3. Acesse a aplicação no navegador:
- **Área do Cidadão (Registro rápido):** [http://localhost:3000](http://localhost:3000)
- **Login dos Gestores:** [http://localhost:3000/login](http://localhost:3000/login)
- **Painel Tático / Mapa:** [http://localhost:3000/painel](http://localhost:3000/painel)
- **Tabela Operacional / Exportação CSV:** [http://localhost:3000/painel/tabela](http://localhost:3000/painel/tabela)

---

## 🗄️ Estrutura do Banco de Dados

Para configurar um novo banco de dados Supabase, basta executar o script [`../supabase.sql`](../supabase.sql) no **SQL Editor** do Supabase. O script provisiona a extensão PostGIS, o módulo de ocorrências, buckets de storage, realtime, os módulos do ecossistema (Recursos, Abrigos, Equipes, Voluntários, Settings) e todas as políticas de segurança RLS.
