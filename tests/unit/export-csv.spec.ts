import {expect,test} from '@playwright/test';
import {buildOccurrencesCsv} from '../../src/features/occurrences/export-csv';
import type {ListItem} from '../../src/features/occurrences/list-input';

const item:ListItem={
  id:'30000000-0000-4000-8000-000000000001',protocol:'2026',type:'Alagamento; rua “São João”',
  status:'NOVA',priority:'NORMAL',version:1,createdAt:'2026-10-01T03:00:00.000Z',updatedAt:'2026-10-01T03:00:00.000Z',
  groupId:'20000000-0000-4000-8000-000000000001',groupName:'Defesa Civil',reporterName:'José da Silva',reporterContact:'(51) 99999-0000',
};

test('RF-016 CSV usa UTF-8, delimitador e escaping corretos para dados portugueses',()=>{
  const csv=buildOccurrencesCsv([item],['protocol','type','groupId','reporterName']);
  expect(csv.startsWith('\uFEFF')).toBe(true);
  expect(csv).toContain('"Protocolo";"Tipo";"Grupo";"Nome do cidadão"');
  expect(csv).toContain('"Alagamento; rua “São João”"');
  expect(csv).toContain('"José da Silva"');
});

test('RF-016 neutraliza fórmulas e escapa aspas e quebras de linha',()=>{
  const malicious={...item,type:'=HYPERLINK("https://invalid.example";"abrir")',reporterName:'  +SOMA(1;2)\nlinha 2'};
  const csv=buildOccurrencesCsv([malicious],['type','reporterName']);
  expect(csv).toContain("\"'=HYPERLINK(\"\"https://invalid.example\"\";\"\"abrir\"\")\"");
  expect(csv).toContain("\"'  +SOMA(1;2)\nlinha 2\"");
});

test('RF-016 conjunto vazio ainda gera cabeçalho verificável',()=>{
  expect(buildOccurrencesCsv([],['protocol'])).toBe('\uFEFF"Protocolo";"ID do evento climático";"Evento climático"');
});

test('CSV sempre exporta identificador e nome do evento climático',()=>{
  const linked={...item,climateEventId:'90000000-0000-4000-8000-000000000035',climateEventName:'Cheia do Arroio'};
  const csv=buildOccurrencesCsv([linked],['protocol']);
  expect(csv).toContain('"ID do evento climático";"Evento climático"');
  expect(csv).toContain('"90000000-0000-4000-8000-000000000035";"Cheia do Arroio"');
});
test('apoio médico exporta os três estados sem perder false',()=>{
  expect(buildOccurrencesCsv([{...item,needsMedicalSupport:true}],['needsMedicalSupport']))
    .toBe('\uFEFF"Apoio médico";"ID do evento climático";"Evento climático"\r\n"Sim";"";"Sem evento"\r\n');
  expect(buildOccurrencesCsv([{...item,needsMedicalSupport:false}],['needsMedicalSupport']))
    .toBe('\uFEFF"Apoio médico";"ID do evento climático";"Evento climático"\r\n"Não";"";"Sem evento"\r\n');
  expect(buildOccurrencesCsv([{...item,needsMedicalSupport:null}],['needsMedicalSupport']))
    .toBe('\uFEFF"Apoio médico";"ID do evento climático";"Evento climático"\r\n"Não informado";"";"Sem evento"\r\n');
});
