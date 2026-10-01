# Interface de ocorrências

Componentes React usados nas páginas do cidadão e do painel:

- `ManualOccurrenceForm.tsx` e `manual-position.ts`: criação autenticada no painel e captura de GPS do dispositivo.
- `OccurrencePhoto.tsx`: consulta sob demanda de foto privada; a API verifica a permissão antes de entregar uma URL temporária.
- `CoreMapOverview.tsx` e `CoreMapCanvas.tsx`: filtros de período, contagens e mapa. O mapa limita os marcadores visíveis e informa quando há mais resultados.
- `ColumnPreferences.tsx` e `ListStatusMenu.tsx`: preferências de colunas e ações de status na lista.
- `CoreNotifications.tsx`: alertas in-app por Realtime e atualização da visão autorizada.
- `RiskZonePanel.tsx` e `StatusConfigurationPanel.tsx`: telas administrativas de zonas de risco e regras de status.

A página e as rotas do servidor continuam responsáveis por aplicar a autorização. Estes componentes não devem buscar dados privados diretamente da Data API do Supabase.
