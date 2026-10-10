import {expect,test} from '@playwright/test';
import {isRealtimeAuthorizationFailure,mergeCoreAlerts,parseCoreAlert,parseAlertOccurrenceMetadata} from '../../src/features/occurrences/alerts';
import {transitionPresentation} from '../../src/features/occurrences/domain/transition-presentation';

const first={event_id:'40000000-0000-4000-8000-000000000001',occurrence_id:'30000000-0000-4000-8000-000000000001',group_id:'20000000-0000-4000-8000-000000000001',priority:'ALTA',status:'NOVA',at:'2026-10-01T03:00:00.000Z'};

test('RF-007 alerta valida o contrato mínimo e elimina qualquer campo extra',()=>{
  const parsed=parseCoreAlert({...first,description:'private description',reporter_name:'private name',photo_url:'private/photo',latitude:-29.8,longitude:-50.5});
  expect(parsed).toEqual({eventId:first.event_id,occurrenceId:first.occurrence_id,groupId:first.group_id,priority:'ALTA',status:'NOVA',at:first.at});
  expect(Object.keys(parsed??{}).sort()).toEqual(['at','eventId','groupId','occurrenceId','priority','status']);
});

test('RF-007 alerta rejeita identificadores, estados e datas inválidos',()=>{
  expect(parseCoreAlert({...first,event_id:'not-a-uuid'})).toBeNull();
  expect(parseCoreAlert({...first,status:'UNKNOWN'})).toBeNull();
  expect(parseCoreAlert({...first,at:'not-a-date'})).toBeNull();
  expect(parseCoreAlert(null)).toBeNull();
});

test('RF-007 recuperação mescla eventos sem duplicar e mantém os mais recentes',()=>{
  const existing=parseCoreAlert(first)!;
  const repeated={...first,priority:'NORMAL'};
  const newer=parseCoreAlert({...first,event_id:'40000000-0000-4000-8000-000000000002',at:'2026-10-01T04:00:00.000Z'})!;
  const result=mergeCoreAlerts([existing],[parseCoreAlert(repeated)!,newer],1);
  expect(result).toEqual([newer]);
  expect(mergeCoreAlerts([existing],[parseCoreAlert(repeated)!])).toHaveLength(1);
});

test('RF-007 falha de autorização encerra o canal e erros de transporte permanecem recuperáveis',()=>{
  expect(isRealtimeAuthorizationFailure(new Error('Unauthorized'))).toBe(true);
  expect(isRealtimeAuthorizationFailure(new Error('row-level security denied'))).toBe(true);
  expect(isRealtimeAuthorizationFailure(new Error('WebSocket timed out'))).toBe(false);
});

test('metadados de alerta só aceitam ocorrência identificada com protocolo e tipo textuais',()=>{
  expect(parseAlertOccurrenceMetadata([{id:first.occurrence_id,protocol:'SAP-42',type:'Alagamento'}])).toEqual({
    [first.occurrence_id]:{protocol:'SAP-42',type:'Alagamento'},
  });
  expect(parseAlertOccurrenceMetadata([{id:first.occurrence_id,protocol:'',type:'x'.repeat(201)}])).toEqual({});
});

test('transições priorizam verbos claros e cores semânticas para triagem e cancelamento',()=>{
  expect(transitionPresentation('EM_TRIAGEM','Em triagem')).toEqual({label:'Enviar para triagem',tone:'info'});
  expect(transitionPresentation('CANCELADA','Cancelada')).toEqual({label:'Cancelar ocorrência',tone:'danger'});
  expect(transitionPresentation('RESOLVIDA','Resolvida')).toEqual({label:'Marcar como Resolvida',tone:'primary'});
});
