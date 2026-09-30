import {test,expect} from '@playwright/test';
import {validatePublicInput,validateIdempotencyKey,PublicInputError} from '../../src/features/occurrences/public-input';
const input={type:'Alagamento',description:'Rua com água',reporterName:'Pessoa sintética',reporterContact:'Contato sintético',position:{latitude:-29.5,longitude:-50.5,accuracy:10}};
test('RF-001 limites textuais aceitos após trim e limites geográficos inclusivos',()=>{
  expect(validatePublicInput({...input,reporterName:'  Pessoa sintética  '})).toEqual(input);
  for(const [field,maximum] of [['type',80],['description',2000],['reporterName',120],['reporterContact',40]] as const){
    expect(validatePublicInput({...input,[field]:'x'.repeat(maximum)})[field]).toHaveLength(maximum);
    for(const value of [' ','x'.repeat(maximum+1),null,1]) expect(()=>validatePublicInput({...input,[field]:value})).toThrow(PublicInputError);
  }
  for(const latitude of [-90,90])for(const longitude of [-180,180])expect(validatePublicInput({...input,position:{latitude,longitude,accuracy:0}}).position).toEqual({latitude,longitude,accuracy:0});
});
test('RF-002 recusa GPS ausente inválido infinito string ou precisão negativa',()=>{
  for(const position of [undefined,null,[],{...input.position,latitude:90.1},{...input.position,longitude:-180.1},{...input.position,accuracy:-1},{...input.position,accuracy:undefined}])expect(()=>validatePublicInput({...input,position})).toThrow(PublicInputError);
  for(const field of ['latitude','longitude','accuracy'])for(const value of [NaN,Infinity,-Infinity,'0'])expect(()=>validatePublicInput({...input,position:{...input.position,[field]:value}})).toThrow(PublicInputError);
});
test('RNF-001 cidadão não determina grupo status prioridade foto ou município',()=>{
  for(const field of ['groupId','priority','status','municipalityId','photoToken'])expect(()=>validatePublicInput({...input,[field]:'forged'})).toThrow(PublicInputError);
  for(const value of [null,[],false,'text',{}])expect(()=>validatePublicInput(value)).toThrow(PublicInputError);
});
test('RF-001 texto malicioso permanece texto; validação não cria HTML executável',()=>{
  const payload='<script>alert("fixture")</script>';
  expect(validatePublicInput({...input,description:payload}).description).toBe(payload);
});
test('RF-001 chave de idempotência possui limite e rejeita caracteres de controle',()=>{
  expect(validateIdempotencyKey('fixture:key-1')).toBe('fixture:key-1');
  for(const value of [null,'','x'.repeat(201),'a\nb',' a','a b'])expect(()=>validateIdempotencyKey(value)).toThrow(PublicInputError);
});
