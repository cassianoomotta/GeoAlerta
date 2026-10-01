# Lista Core

A página Server Component consulta somente uma página autorizada e renderiza total, filtros GET, links que preservam a URL e colunas efetivas da conta. `ColumnPreferences` usa interação cliente para salvar colunas via API autenticada; não recebe colunas privadas quando o papel é Consulta. Não há consulta direta à Data API ou carregamento do histórico inteiro.

`ManualOccurrenceForm` coleta GPS do dispositivo antes de enviar uma abertura autenticada. O comando inclui o grupo autorizado da lista, reutiliza a chave de idempotência em retentativas do mesmo corpo e mostra o protocolo confirmado ou uma orientação recuperável.
