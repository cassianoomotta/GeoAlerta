import {expect,test} from '@playwright/test';
import {parseEventDashboardQuery,shapeEventDashboardMetrics,type EventDashboardRawMetric} from '../../src/features/occurrences/domain/dashboard-events';

const eventA={id:'11111111-1111-4111-8111-111111111111',name:'Evento A',state:'EM_ANDAMENTO' as const,plannedStart:'2026-10-01',plannedEnd:'2026-10-03',startedAt:'2026-10-01T12:00:00.000Z',endedAt:null};
const eventB={id:'22222222-2222-4222-8222-222222222222',name:'Evento B',state:'ENCERRADO' as const,plannedStart:'2026-09-01',plannedEnd:'2026-09-03',startedAt:'2026-09-01T12:00:00.000Z',endedAt:'2026-09-03T12:00:00.000Z'};

test('seleciona dois eventos distintos e rejeita IDs repetidos ou parâmetros malformados',()=>{
  expect(parseEventDashboardQuery(new URLSearchParams(`primary=${eventA.id}&comparison=${eventB.id}`))).toEqual({primaryEventId:eventA.id,comparisonEventId:eventB.id});
  for(const value of [`primary=${eventA.id}&primary=${eventB.id}`,`primary=${eventA.id}&comparison=${eventA.id}`,'primary=not-a-uuid','unexpected=1'])expect(()=>parseEventDashboardQuery(new URLSearchParams(value))).toThrow();
});

test('gera as mesmas categorias e percentuais para cada evento, preservando não informado',()=>{
  const raw:EventDashboardRawMetric[]=[
    {event:eventA,total:6,byType:[{type:'Alagamento',count:3},{type:'Deslizamento',count:2},{type:'Outro',count:1}],byPriority:{ALTA:2,NORMAL:4},byMedicalSupport:{yes:2,no:3,unknown:1},byStatus:{NOVA:1,EM_TRIAGEM:1,EM_ATENDIMENTO:1,RESOLVIDA:2,CANCELADA:1}},
    {event:eventB,total:0,byType:[],byPriority:{},byMedicalSupport:{},byStatus:{}},
  ];
  const result=shapeEventDashboardMetrics(raw,[{code:'NOVA',label:'Nova',displayOrder:1},{code:'EM_TRIAGEM',label:'Triagem',displayOrder:2},{code:'EM_ATENDIMENTO',label:'Atendimento',displayOrder:3},{code:'RESOLVIDA',label:'Resolvida',displayOrder:4},{code:'CANCELADA',label:'Cancelada',displayOrder:5}]);
  expect(result[0]).toMatchObject({total:6,open:3,closed:2,cancelled:1});
  expect(result[0].byMedicalSupport).toEqual([{label:'Sim',count:2,percentage:33.3},{label:'Não',count:3,percentage:50},{label:'Não informado',count:1,percentage:16.7}]);
  expect(result[0].byType.map(item=>item.count)).toEqual([3,2,1]);
  expect(result[1].byType.map(item=>[item.label,item.count])).toEqual([['Alagamento',0],['Deslizamento',0],['Outro',0]]);
  expect(result[0].byPriority.map(item=>item.count)).toEqual([4,2]);
  expect(result[0].byStatus.map(item=>item.count)).toEqual([1,1,1,2,1]);
  expect(result[1]).toMatchObject({total:0,open:0,closed:0,cancelled:0});
  expect([...result[1].byType,...result[1].byPriority,...result[1].byMedicalSupport,...result[1].byStatus].every(item=>item.count===0&&item.percentage===0)).toBe(true);
});
