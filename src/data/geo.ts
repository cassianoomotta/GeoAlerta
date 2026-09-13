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

export const shelters = [
  {
    id: '1',
    name: "Ginásio Municipal de Esportes",
    address: "Rua Exemplo, 123 - Centro",
    capacity: 250,
    occupied: 45,
    lat: -29.8252,
    lng: -50.5186,
    phone: "(51) 3662-1234",
    status: "Aberto"
  },
  {
    id: '2',
    name: "Escola Estadual Técnica",
    address: "Av. Principal, 987 - Bairro Alto",
    capacity: 400,
    occupied: 120,
    lat: -29.8150,
    lng: -50.5280,
    phone: "(51) 3662-5678",
    status: "Aberto"
  }
];
