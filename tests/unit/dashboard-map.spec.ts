import {expect,test} from '@playwright/test';
import {getDashboardMap,DashboardMapAccessError} from '../../src/features/occurrences/application/get-dashboard-map';
import {DashboardQueryError,parseDashboardQuery,shapeDashboardView} from '../../src/features/occurrences/domain/dashboard-map';
import type {Actor} from '../../src/features/access/contracts';

const now=new Date('2026-10-01T12:00:00.000Z');

test('RF-007 mapa usa recorte municipal inicial e sete dias por padrão',()=>{
  expect(parseDashboardQuery(new URLSearchParams(),now)).toEqual({
    west:-50.65,south:-29.95,east:-50.35,north:-29.70,
    from:'2026-09-24T12:00:00.000Z',to:'2026-10-01T12:00:00.000Z',
  });
});

test('RF-007 mapa aceita bounds válidos e período máximo de 31 dias',()=>{
  const result=parseDashboardQuery(new URLSearchParams('west=-50.8&south=-30&east=-50&north=-29&from=2026-09-01&to=2026-10-01'),now);
  expect(result).toMatchObject({west:-50.8,south:-30,east:-50,north:-29,from:'2026-09-01T00:00:00.000Z',to:'2026-10-01T23:59:59.999Z'});
});

test('RF-007 mapa recusa limites incompletos, inválidos e parâmetros repetidos',()=>{
  for(const input of ['west=-50','west=-50&south=-30&east=-50&north=-29','west=-181&south=-30&east=-50&north=-29','west=-50&south=-29&east=-51&north=-30','unknown=1','west=-50&west=-49&south=-30&east=-48&north=-29']){
    expect(()=>parseDashboardQuery(new URLSearchParams(input),now),input).toThrow(DashboardQueryError);
  }
});

test('RF-007 mapa recusa datas inválidas e período maior que 31 dias',()=>{
  expect(()=>parseDashboardQuery(new URLSearchParams('from=2026-02-30'),now)).toThrow('INVALID_DATE');
  expect(()=>parseDashboardQuery(new URLSearchParams('from=2026-08-30&to=2026-10-01'),now)).toThrow('INVALID_DATE_RANGE');
  expect(()=>parseDashboardQuery(new URLSearchParams('from=2026-10-02&to=2026-10-01'),now)).toThrow('INVALID_DATE_RANGE');
});

test('RF-007 limita marcadores sem cortar as contagens completas recebidas',()=>{
  const markers=Array.from({length:1001},(_,index)=>({id:String(index),latitude:-29.8,longitude:-50.5,priority:'NORMAL' as const,status:'NOVA' as const}));
  const view=shapeDashboardView(markers,{NOVA:1250},{NORMAL:1250});
  expect(view.markers).toHaveLength(1000);
  expect(view.limited).toBe(true);
  expect(view.counts.byStatus.NOVA).toBe(1250);
  expect(view.counts.byPriority.NORMAL).toBe(1250);
  expect(view.counts.byStatus.RESOLVIDA).toBe(0);
});

test('RF-007 recorte com até mil pontos não informa limitação',()=>{
  const markers=Array.from({length:1000},(_,index)=>({id:String(index),latitude:-29.8,longitude:-50.5,priority:'ALTA' as const,status:'EM_TRIAGEM' as const}));
  expect(shapeDashboardView(markers,{},{}).limited).toBe(false);
});

test('RF-007 caso de uso verifica papel, grupo e estado antes de consultar',async()=>{
  const query=parseDashboardQuery(new URLSearchParams(),now);
  let calls=0;
  const port={read:async()=>{calls++;return {markers:[],byStatus:{NOVA:2},byPriority:{NORMAL:2}};}};
  const active:Actor={userId:'10000000-0000-4000-8000-000000000001',role:'CONSULTA',state:'ATIVO',municipalityId:'sa_patrulha',groupIds:['20000000-0000-4000-8000-000000000001']};
  const result=await getDashboardMap(active,query,port);
  expect(result.counts.byStatus.NOVA).toBe(2);
  const denied=[{...active,state:'SUSPENSO' as const},{...active,groupIds:[]}];
  for(const actor of denied)await expect(getDashboardMap(actor,query,port)).rejects.toBeInstanceOf(DashboardMapAccessError);
  expect(calls).toBe(1);
});

test('RF-007 consulta solicita um marcador extra para detectar o limite e propaga falhas do repositório',async()=>{
  const query=parseDashboardQuery(new URLSearchParams(),now);
  const active:Actor={userId:'10000000-0000-4000-8000-000000000001',role:'GESTOR',state:'ATIVO',municipalityId:'sa_patrulha',groupIds:['20000000-0000-4000-8000-000000000001']};
  let requestedLimit=0;
  const marker={id:'30000000-0000-4000-8000-000000000001',latitude:-29.8,longitude:-50.5,priority:'ALTA' as const,status:'NOVA' as const};
  await getDashboardMap(active,query,{read:async(_query,limit)=>{requestedLimit=limit;return {markers:Array.from({length:limit},()=>marker),byStatus:{NOVA:1200},byPriority:{ALTA:1200}};}});
  expect(requestedLimit).toBe(1001);
  await expect(getDashboardMap(active,query,{read:async()=>{throw new Error('repository unavailable');}})).rejects.toThrow('repository unavailable');
});
