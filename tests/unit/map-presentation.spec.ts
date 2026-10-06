import {expect,test} from '@playwright/test';
import {mapStatusAppearance,occurrenceMarkerHtml,occurrenceTypeIcon} from '../../src/features/occurrences/domain/map-presentation';

test('ícones reconhecem categorias com acentos e usam fallback seguro para tipos novos',()=>{
  expect(occurrenceTypeIcon('Queda de Árvore')).toBe('tree');
  expect(occurrenceTypeIcon('ALAGAMENTOS/INUNDAÇÃO')).toBe('water');
  expect(occurrenceTypeIcon('Categoria futura')).toBe('generic');
  const html=occurrenceMarkerHtml('<img src=x onerror=alert(1)>','NOVA','NORMAL');
  expect(html).not.toContain('<img');expect(html).not.toContain('onerror');
});

test('status têm cores distintas e prioridade alta mantém o tipo e a cor',()=>{
  expect(new Set(Object.values(mapStatusAppearance).map(item=>item.color)).size).toBe(5);
  for(const status of ['NOVA','EM_TRIAGEM','EM_ATENDIMENTO','RESOLVIDA','CANCELADA'] as const){
    const normal=occurrenceMarkerHtml('Incêndio',status,'NORMAL');
    const high=occurrenceMarkerHtml('Incêndio',status,'ALTA');
    expect(normal).toContain(mapStatusAppearance[status].color);expect(high).toContain(mapStatusAppearance[status].color);
    expect(normal).not.toContain('occurrence-marker-warning');expect(high).toContain('occurrence-marker-warning');
  }
});


test('nomes de propriedades herdadas usam o ícone genérico',()=>{
  for(const type of ['constructor','__proto__','toString']){
    expect(occurrenceTypeIcon(type)).toBe('generic');
    expect(occurrenceMarkerHtml(type,'NOVA','NORMAL')).not.toContain('undefined');
  }
});
