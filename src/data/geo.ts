export const floodZonesGeoJSON = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Mancha de Inundação - Bairro Baixo",
        "riskLevel": "Alto",
        "color": "#ef4444"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [-50.525, -29.825],
            [-50.515, -29.828],
            [-50.510, -29.835],
            [-50.520, -29.840],
            [-50.530, -29.830],
            [-50.525, -29.825]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Mancha de Inundação - Rio dos Sinos",
        "riskLevel": "Médio",
        "color": "#f97316"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [-50.505, -29.815],
            [-50.495, -29.820],
            [-50.490, -29.830],
            [-50.500, -29.825],
            [-50.505, -29.815]
          ]
        ]
      }
    }
  ]
};

// Nota: Os abrigos agora são carregados dinamicamente do Supabase (tabela "shelters").
// O array estático foi removido para evitar dados desatualizados no mapa.
