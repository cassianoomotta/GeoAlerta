import {expect,test} from '@playwright/test';
import {getDashboardMap,DashboardMapAccessError} from '../../src/features/occurrences/application/get-dashboard-map';
import {DashboardQueryError,dashboardMapBounds,parseDashboardQuery,shapeDashboardView} from '../../src/features/occurrences/domain/dashboard-map';
import {resizeDashboardMapViewport} from '../../src/features/occurrences/ui/map-viewport';
import type {Actor} from '../../src/features/access/contracts';

const now=new Date('2026-10-01T12:00:00.000Z');

test('RF-007 mapa recalcula tamanho do Leaflet e consulta o viewport visível após redimensionar',()=>{
  const calls:unknown[]=[];
  const map={
    invalidateSize:(options:unknown)=>calls.push(['invalidate',options]),
    getBounds:()=>({getWest:()=>-50.6,getSouth:()=>-29.9,getEast:()=>-50.4,getNorth:()=>-29.7}),
  };
  let viewport:unknown;

  resizeDashboardMapViewport(map,next=>{viewport=next;});

  expect(calls).toEqual([['invalidate',{pan:false,debounceMoveend:true}]]);
  expect(viewport).toEqual({west:-50.6,south:-29.9,east:-50.4,north:-29.7});
});

test('RF-007 mapa sem filtros consulta o histórico sem limites temporais ou espaciais',()=>{
  const query=parseDashboardQuery(new URLSearchParams(),now);
  expect(dashboardMapBounds([
    {latitude:-29.84,longitude:-50.50},
    {latitude:-29.60,longitude:-50.30},
  ])).toEqual([[-29.84,-50.50],[-29.60,-50.30]]);
  expect(query).toEqual({});
});

test('RF-007 mapa inclui pontos fora do retângulo municipal fixo e enquadra ponto único',()=>{
  expect(dashboardMapBounds([{latitude:-29.60,longitude:-50.30}])).toEqual([[-29.61,-50.31],[-29.59,-50.29]]);
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
  const markers=Array.from({length:1001},(_,index)=>({id:String(index),protocol:String(index+1),type:'Incêndio',latitude:-29.8,longitude:-50.5,priority:'NORMAL' as const,status:'NOVA' as const}));
  const view=shapeDashboardView(markers,{NOVA:1250},{NORMAL:1250});
  expect(view.markers).toHaveLength(1000);
  expect(view.limited).toBe(true);
  expect(view.counts.byStatus.NOVA).toBe(1250);
  expect(view.counts.byPriority.NORMAL).toBe(1250);
  expect(view.counts.byStatus.RESOLVIDA).toBe(0);
});

test('RF-007 recorte com até mil pontos não informa limitação',()=>{
  const markers=Array.from({length:1000},(_,index)=>({id:String(index),protocol:String(index+1),type:'Incêndio',latitude:-29.8,longitude:-50.5,priority:'ALTA' as const,status:'EM_TRIAGEM' as const}));
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
  const marker={id:'30000000-0000-4000-8000-000000000001',protocol:'25',type:'Incêndio',latitude:-29.8,longitude:-50.5,priority:'ALTA' as const,status:'NOVA' as const};
  await getDashboardMap(active,query,{read:async(_query,limit)=>{requestedLimit=limit;return {markers:Array.from({length:limit},()=>marker),byStatus:{NOVA:1200},byPriority:{ALTA:1200}};}});
  expect(requestedLimit).toBe(1001);
  await expect(getDashboardMap(active,query,{read:async()=>{throw new Error('repository unavailable');}})).rejects.toThrow('repository unavailable');
});


test('mapa combina vários status, prioridades e tipos sem alterar o recorte',()=>{
  const query=parseDashboardQuery(new URLSearchParams('status=NOVA&status=EM_TRIAGEM&priority=ALTA&type=Queda+de+Árvore&type=Incêndio&from=2026-10-01&to=2026-10-02'),now);
  expect(query).toMatchObject({statuses:['NOVA','EM_TRIAGEM'],priorities:['ALTA'],types:['Queda de Árvore','Incêndio']});
});

test('mapa distingue seleção vazia de todos os registros e recusa filtros inválidos',()=>{
  expect(parseDashboardQuery(new URLSearchParams('status=&priority=&type='),now)).toEqual({statuses:[],priorities:[],types:[]});
  expect(parseDashboardQuery(new URLSearchParams(),now)).toEqual({});
  for(const input of ['status=INVALID','status=NOVA&status=NOVA','priority=URGENTE','type=&type=Incêndio','type= '+encodeURIComponent('a'.repeat(121))]){
    expect(()=>parseDashboardQuery(new URLSearchParams(input),now),input).toThrow(DashboardQueryError);
  }
});


test('mapa aceita a seleção dos tipos exibidos mesmo com mais de cem categorias históricas',()=>{
  const params=new URLSearchParams();
  for(let index=0;index<101;index++)params.append('type',`Categoria ${index}`);
  expect(parseDashboardQuery(params).types).toHaveLength(101);
});
