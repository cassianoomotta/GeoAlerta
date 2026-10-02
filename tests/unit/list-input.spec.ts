import {test,expect} from '@playwright/test';
import {parseListFilters,validateColumns,availableColumns,listHref} from '../../src/features/occurrences/list-input';
test('RF-009 defaults e limites de paginação ordenação e data',()=>{
  expect(parseListFilters(new URLSearchParams())).toMatchObject({page:1,pageSize:50,sort:'createdAt',direction:'desc'});
  expect(parseListFilters(new URLSearchParams('from=2025-01-01&to=2025-01-02&pageSize=100')).to).toBe('2025-01-02T23:59:59.999Z');
  for(const q of ['page=0','page=-1','page=1e2','pageSize=101','sort=reporterName','direction=desc;drop','from=2025-02-30','from=2025-01-03&to=2025-01-01','status=INVALID','priority=CRITICAL','groupId=all','page=1&page=2','userId=other'])expect(()=>parseListFilters(new URLSearchParams(q)),q).toThrow();
});
test('RF-009 situação da categoria aceita somente todas ativas ou desativadas e preserva a busca',()=>{
  expect(parseListFilters(new URLSearchParams()).categoryStatus).toBeUndefined();
  for(const categoryStatus of ['active','inactive'] as const){
    const filters=parseListFilters(new URLSearchParams(`type=Inundação&categoryStatus=${categoryStatus}`));
    expect(filters).toMatchObject({type:'Inundação',categoryStatus});
    expect(new URL(listHref(filters,{page:2}),'http://localhost').searchParams.get('categoryStatus')).toBe(categoryStatus);
  }
  expect(()=>parseListFilters(new URLSearchParams('categoryStatus=unknown'))).toThrow();
});
test('RF-009 colunas são whitelist por capacidade sem duplicadas ou vazias',()=>{
  expect(availableColumns(false)).not.toContain('reporterName');expect(validateColumns(['protocol','reporterName'],availableColumns(true))).toEqual(['protocol','reporterName']);
  for(const columns of [[],['reporterName'],['protocol','protocol'],['photo_url'],['__proto__']])expect(()=>validateColumns(columns,availableColumns(false))).toThrow();
});
test('RF-009 links de paginação e atalhos preservam filtros e reiniciam página',()=>{
  const f=parseListFilters(new URLSearchParams('type=FLOOD&status=NOVA&priority=ALTA&from=2025-01-01&sort=status&direction=asc&pageSize=25'));
  const url=new URL(listHref(f,{page:2}),'http://localhost');expect(url.searchParams.get('type')).toBe('FLOOD');expect(url.searchParams.get('status')).toBe('NOVA');expect(url.searchParams.get('page')).toBe('2');expect(url.searchParams.get('sort')).toBe('status');
  expect(new URL(listHref(f,{status:'RESOLVIDA',page:1}),'http://localhost').searchParams.get('priority')).toBe('ALTA');
});
