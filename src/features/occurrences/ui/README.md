# Lista Core

A página Server Component consulta somente uma página autorizada e renderiza total, filtros GET, links que preservam a URL e colunas efetivas da conta. `ColumnPreferences` usa interação cliente para salvar colunas via API autenticada; não recebe colunas privadas quando o papel é Consulta. Não há consulta direta à Data API ou carregamento do histórico inteiro.
