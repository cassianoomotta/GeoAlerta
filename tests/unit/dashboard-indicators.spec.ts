import {expect,test} from '@playwright/test';
import {DashboardIndicatorsAccessError,getDashboardIndicators} from '../../src/features/occurrences/application/get-dashboard-indicators';
import type {Actor} from '../../src/features/access/contracts';
import {DashboardIndicatorsQueryError,parseDashboardIndicatorsQuery} from '../../src/features/occurrences/domain/dashboard-indicators';

const now=new Date('2026-10-06T12:00:00.000Z');

test('indicadores delimitam hoje no fuso do município',()=>{
  expect(parseDashboardIndicatorsQuery(new URLSearchParams('period=today'),now)).toMatchObject({
    period:'today',from:'2026-10-06T03:00:00.000Z',to:'2026-10-07T03:00:00.000Z',
  });
});

test('indicadores delimitam semana iniciando na segunda-feira local',()=>{
  expect(parseDashboardIndicatorsQuery(new URLSearchParams('period=week'),now)).toMatchObject({
    period:'week',from:'2026-10-05T03:00:00.000Z',to:'2026-10-07T03:00:00.000Z',
  });
});

test('indicadores delimitam mês-calendário no fuso do município',()=>{
  expect(parseDashboardIndicatorsQuery(new URLSearchParams('period=month'),now)).toMatchObject({
    period:'month',from:'2026-10-01T03:00:00.000Z',to:'2026-10-07T03:00:00.000Z',
  });
});

test('período personalizado inclui o dia final e aplica o bairro à mesma consulta',()=>{
  expect(parseDashboardIndicatorsQuery(new URLSearchParams('period=custom&from=2026-10-01&to=2026-10-03&neighborhood=SAP-1'),now)).toMatchObject({
    period:'custom',from:'2026-10-01T03:00:00.000Z',to:'2026-10-04T03:00:00.000Z',neighborhoodCode:'SAP-1',
  });
});

test('indicadores recusam períodos, datas, intervalos e filtros inválidos',()=>{
  for(const input of [
    'period=year',
    'period=custom',
    'period=custom&from=2026-02-30&to=2026-03-01',
    'period=custom&from=2026-10-04&to=2026-10-03',
    'period=custom&from=2025-10-01&to=2026-10-02',
    'period=today&from=2026-10-01',
    'period=today&neighborhood=CENTRO&neighborhood=JAU',
  ]){
    expect(()=>parseDashboardIndicatorsQuery(new URLSearchParams(input),now),input).toThrow(DashboardIndicatorsQueryError);
  }
});

test('caso de uso aplica a consulta recebida e bloqueia atores sem acesso',async()=>{
  const query=parseDashboardIndicatorsQuery(new URLSearchParams('period=today&neighborhood=CENTRO'),now);
  const actor:Actor={userId:'10000000-0000-4000-8000-000000000001',role:'GESTOR',state:'ATIVO',municipalityId:'sa_patrulha',groupIds:['20000000-0000-4000-8000-000000000001']};
  let received:unknown;
  const data={totals:{registered:4,open:1,inService:1,resolved:1,cancelled:1},daily:[],byNeighborhood:[],byType:[],neighborhoods:[],byStatus:{}};
  const view=await getDashboardIndicators(actor,query,{read:async(value)=>{received=value;return data;}});
  expect(received).toEqual(query);
  expect(view).toMatchObject({...data,window:{...query,timeZone:'America/Sao_Paulo'}});
  const denied={...actor,state:'SUSPENSO' as const};
  await expect(getDashboardIndicators(denied,query,{read:async()=>data})).rejects.toBeInstanceOf(DashboardIndicatorsAccessError);
});
