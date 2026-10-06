// =============================================
// GeoAlerta - Registro Modular (feature flags por município)
// A navegação do painel lê daqui. Desabilitar um módulo aqui
// (ou nas settings do Supabase) esconde o módulo daquele município.
// =============================================

export interface ModuleDef {
  slug: string;
  label: string;
  href: string;
  description: string;
  enabled: boolean;
}

export const MODULES: ModuleDef[] = [
  {
    slug: "dashboard",
    label: "Dashboard",
    href: "/painel",
    description: "Indicadores e alertas de ocorrências",
    enabled: true,
  },
  {
    slug: "monitoramento",
    label: "Mapa",
    href: "/painel/mapa",
    description: "Mapa Core de ocorrências e triagem",
    enabled: true,
  },
  {
    slug: "tabela",
    label: "Lista de ocorrências",
    href: "/painel/ocorrencias",
    description: "Relatórios e exportação CSV",
    enabled: true,
  },
  {
    slug: "nova-ocorrencia",
    label: "Nova ocorrência",
    href: "/painel/ocorrencias/nova",
    description: "Registro manual de uma nova ocorrência",
    enabled: true,
  },
  {
    slug: "recursos",
    label: "Estoque de Recursos",
    href: "/painel/recursos",
    description: "Itens, quantidades e movimentações",
    enabled: false,
  },
  {
    slug: "abrigos",
    label: "Abrigos",
    href: "/painel/abrigos",
    description: "Abrigos (humano/pet/misto) e pessoas",
    enabled: false,
  },
  {
    slug: "equipes",
    label: "Equipes & GPS",
    href: "/painel/equipes",
    description: "Equipes de resgate e localização",
    enabled: false,
  },
  {
    slug: "voluntarios",
    label: "Voluntários",
    href: "/painel/voluntarios",
    description: "Voluntários e especialidades",
    enabled: false,
  },
];

export function getEnabledModules(): ModuleDef[] {
  return MODULES.filter((m) => m.enabled);
}
