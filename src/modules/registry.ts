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
    slug: "monitoramento",
    label: "Mapa Tático",
    href: "/painel",
    description: "Ocorrências, mapa e triagem",
    enabled: true,
  },
  {
    slug: "tabela",
    label: "Tabela Operacional",
    href: "/painel/tabela",
    description: "Relatórios e exportação CSV",
    enabled: true,
  },
  {
    slug: "recursos",
    label: "Estoque de Recursos",
    href: "/painel/recursos",
    description: "Itens, quantidades e movimentações",
    enabled: true,
  },
  {
    slug: "abrigos",
    label: "Abrigos",
    href: "/painel/abrigos",
    description: "Abrigos (humano/pet/misto) e pessoas",
    enabled: true,
  },
  {
    slug: "equipes",
    label: "Equipes & GPS",
    href: "/painel/equipes",
    description: "Equipes de resgate e localização",
    enabled: true,
  },
  {
    slug: "voluntarios",
    label: "Voluntários",
    href: "/painel/voluntarios",
    description: "Voluntários e especialidades",
    enabled: true,
  },
];

export function getEnabledModules(): ModuleDef[] {
  return MODULES.filter((m) => m.enabled);
}