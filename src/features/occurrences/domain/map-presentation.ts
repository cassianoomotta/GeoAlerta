import type {Priority,Status} from '../contracts';

// Fixed, high-contrast marker colors keep the same meaning on both map themes.
export const mapStatusAppearance:Record<Status,{color:string;name:string}>={
  NOVA:{color:'#2563eb',name:'Nova'},
  EM_TRIAGEM:{color:'#b45309',name:'Em triagem'},
  EM_ATENDIMENTO:{color:'#7c3aed',name:'Em atendimento'},
  RESOLVIDA:{color:'#15803d',name:'Resolvida'},
  CANCELADA:{color:'#64748b',name:'Cancelada'},
};

// All paths are authored constants; occurrence text never becomes SVG markup.
export const typeIconPaths={
  water:'M2 6c2-2 4 2 6 0s4 2 6 0 4 2 6 0M2 12c2-2 4 2 6 0s4 2 6 0 4 2 6 0M2 18c2-2 4 2 6 0s4 2 6 0 4 2 6 0',
  tree:'M12 2 5 10h3l-5 7h7v5h4v-5h7l-5-7h3L12 2Z',
  fire:'M12 3c1 4 6 5 6 10a6 6 0 0 1-12 0c0-2 1-4 3-6 0 3 1 3 2 4 1-2 2-5 1-8Z',
  electricity:'m13 2-9 12h7l-1 8 10-12h-7l1-8Z',
  mountain:'m2 21 8-17 4 8 3-4 5 13H2Zm5-11 3 3 3-3',
  rain:'M6 14a4 4 0 0 1-1-8 6 6 0 0 1 11-1 4 4 0 0 1 2 9M7 17l-1 4m7-4-1 4m7-4-1 4',
  wind:'M3 8h12a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h6a3 3 0 1 1-3 3',
  home:'m3 10 9-7 9 7v11H3V10Zm6 11v-8h6v8',
  road:'m8 3-4 18m12-18 4 18M12 3v3m0 4v4m0 4v3',
  health:'M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z',
  hazard:'m12 3 10 18H2L12 3Zm0 5v6m0 3v1',
  sun:'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
  cold:'M12 2v20M3 7l18 10M3 17 21 7M9 4l3 3 3-3M9 20l3-3 3 3M3 10l4-1-1-4M18 19l-1-4 4-1M3 14l4 1-1 4M18 5l-1 4 4 1',
  pipe:'M3 9h7V3h4v10H7v8H3V9Zm-2 0h6m3-8v6m-9 14h6',
  bug:'M8 9h8v7a4 4 0 0 1-8 0V9Zm2-4h4l2 4H8l2-4Zm-7 6h5m8 0h5M3 16h5m8 0h5M7 3l3 2m7-2-3 2',
  sign:'M3 4h18v12H3V4Zm9 12v6M6 8h12M6 12h8',
  generic:'M12 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 4v5m0 3v1',
};
export type TypeIcon=keyof typeof typeIconPaths;
const icons:Record<string,TypeIcon>={
  'alagamentos/inundacao':'water','alagamento / inundacao':'water','alagamento':'water','inundacao':'water','enxurrada':'water','rompimento de barragem':'water','contaminacao da agua':'water',
  'queda de arvore':'tree','incendio':'fire','rompimento de fiacao eletrica':'electricity','queda de poste':'electricity',
  'movimentacao de massa':'mountain','deslizamento de terra':'mountain','deslizamento':'mountain','erosao':'mountain','terremoto':'mountain',
  'chuvas intensas':'rain','granizo':'rain','tornado':'wind','vendaval':'wind','ventos fortes':'wind',
  'desabamento':'home','destelhamento':'home','desabrigados':'home','acolhimento':'home',
  'buracos':'road','bueiro / ponte obstruida':'road','epidemias':'health','resgate humano urgente':'health','resgate':'health',
  'desastre radioativo':'hazard','produtos perigosos':'hazard','vazamento de produto perigoso':'hazard',
  'estiagem':'sun','onda de calor':'sun','onda de frio':'cold','rompimento de tubulacao':'pipe','infestacoes/pragas':'bug',
  'outdoor e similares':'sign','queda de placa':'sign',
};
export function occurrenceTypeIcon(type:string):TypeIcon{
  const normalized=type.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  return Object.hasOwn(icons,normalized)?icons[normalized]:'generic';
}
export function occurrenceMarkerHtml(type:string,status:Status,priority:Priority):string{
  const color=mapStatusAppearance[status].color;
  const warning=priority==='ALTA'?'<svg class="occurrence-marker-warning" aria-hidden="true" viewBox="0 0 20 20"><path d="m10 1 9 17H1Z" fill="var(--danger)" stroke="var(--surface)" stroke-width="1.5"/><path d="M10 6v5m0 3v1" stroke="var(--danger-foreground)" stroke-width="2"/></svg>':'';
  return `<span class="occurrence-marker" style="background:${color}"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${typeIconPaths[occurrenceTypeIcon(type)]}"/></svg>${warning}</span>`;
}
