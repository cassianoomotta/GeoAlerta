import {expect,test} from '@playwright/test';
import {shapeDashboardView} from '../../src/features/occurrences/domain/dashboard-map';

test('RF-007 mapa identifica estados abertos e fechados sem depender da cor',()=>{
  const candidates=[
    {id:'30000000-0000-4000-8000-000000000011',protocol:'test-30000000-0000-4000-8000-000000000011',latitude:-29.8,longitude:-50.5,type:'Alagamento',priority:'ALTA' as const,status:'NOVA' as const},
    {id:'30000000-0000-4000-8000-000000000012',protocol:'test-30000000-0000-4000-8000-000000000012',latitude:-29.8,longitude:-50.5,type:'Alagamento',priority:'NORMAL' as const,status:'EM_TRIAGEM' as const},
    {id:'30000000-0000-4000-8000-000000000013',protocol:'test-30000000-0000-4000-8000-000000000013',latitude:-29.8,longitude:-50.5,type:'Árvore',priority:'NORMAL' as const,status:'EM_ATENDIMENTO' as const},
    {id:'30000000-0000-4000-8000-000000000014',protocol:'test-30000000-0000-4000-8000-000000000014',latitude:-29.8,longitude:-50.5,type:'Árvore',priority:'NORMAL' as const,status:'RESOLVIDA' as const},
    {id:'30000000-0000-4000-8000-000000000015',protocol:'test-30000000-0000-4000-8000-000000000015',latitude:-29.8,longitude:-50.5,type:'Árvore',priority:'NORMAL' as const,status:'CANCELADA' as const},
  ];
  const view=shapeDashboardView(candidates,{},{});
  expect(view.markers.map(marker=>[marker.status,marker.state])).toEqual([
    ['NOVA','open'],['EM_TRIAGEM','open'],['EM_ATENDIMENTO','open'],['RESOLVIDA','closed'],['CANCELADA','closed'],
  ]);
});