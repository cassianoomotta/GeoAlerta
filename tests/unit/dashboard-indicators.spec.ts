import {expect,test} from '@playwright/test';
import * as dashboard from '../../src/features/occurrences/domain/dashboard-indicators';

test('período usa dias de São Paulo e inclui integralmente o último dia',()=>{
  expect(dashboard.parseIndicatorQuery(new URLSearchParams('from=2026-10-01&to=2026-10-06'))).toEqual({from:'2026-10-01T03:00:00.000Z',to:'2026-10-07T03:00:00.000Z'});
  expect(dashboard.parseIndicatorQuery(new URLSearchParams())).toEqual({});
});

test('período rejeita datas inexistentes, ordem invertida, parâmetros extras e mais de 31 dias',()=>{
  for(const input of ['from=2026-02-30','from=2026-10-07&to=2026-10-06','from=2026-09-01&to=2026-10-06','status=NOVA','from=2026-10-01&from=2026-10-02'])expect(()=>dashboard.parseIndicatorQuery(new URLSearchParams(input))).toThrow();
});

test('filtro parcial completa o período sem mudar o dia selecionado',()=>{
  expect(dashboard.parseIndicatorQuery(new URLSearchParams('from=2026-10-01'),new Date('2026-10-06T12:00:00Z'))).toEqual({from:'2026-10-01T03:00:00.000Z',to:'2026-10-07T03:00:00.000Z'});
  expect(dashboard.parseIndicatorQuery(new URLSearchParams('to=2026-10-06'))).toEqual({from:'2026-09-06T03:00:00.000Z',to:'2026-10-07T03:00:00.000Z'});
});

test('séries preenchem dias sem movimento e mantêm encerramentos de ocorrências antigas',()=>{
  const view=dashboard.shapeIndicatorView({byStatus:{NOVA:4,EM_TRIAGEM:2,EM_ATENDIMENTO:1,RESOLVIDA:2,CANCELADA:1},byPriority:{ALTA:3,NORMAL:7},byType:[{type:'Inundação',count:8},{type:'Resgate',count:2}],daily:[{day:'2026-10-01',opened:10,closed:0},{day:'2026-10-03',opened:0,closed:12}]},{from:'2026-10-01T03:00:00.000Z',to:'2026-10-04T03:00:00.000Z'});
  expect(view.summary).toEqual({total:10,open:7,inProgress:1,highPriority:3});
  expect(view.daily).toEqual([{day:'2026-10-01',opened:10,closed:0},{day:'2026-10-02',opened:0,closed:0},{day:'2026-10-03',opened:0,closed:12}]);
  expect(view.byStatus.CANCELADA).toBe(1);
  expect(view.byType).toEqual([{type:'Inundação',count:8},{type:'Resgate',count:2}]);
});

test('histórico vazio retorna totais zero e período vazio ainda tem todos os dias',()=>{
  const data={byStatus:{},byPriority:{},byType:[],daily:[]};
  expect(dashboard.shapeIndicatorView(data,{}).daily).toEqual([]);
  expect(dashboard.shapeIndicatorView(data,{}).summary.total).toBe(0);
  expect(dashboard.shapeIndicatorView(data,{from:'2026-10-01T03:00:00Z',to:'2026-10-02T03:00:00Z'}).daily).toEqual([{day:'2026-10-01',opened:0,closed:0}]);
});
