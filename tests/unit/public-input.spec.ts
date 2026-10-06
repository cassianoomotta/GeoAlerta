import {test,expect} from '@playwright/test';
import {validatePublicInput,validateIdempotencyKey,PublicInputError} from '../../src/features/occurrences/public-input';
const input={type:'Alagamentos/Inundação',description:'Rua com água',reporterName:'Pessoa sintética',reporterContact:'Contato sintético',position:{latitude:-29.5,longitude:-50.5,accuracy:10}};
const validate=(value:unknown,options:Parameters<typeof validatePublicInput>[1]={})=>validatePublicInput(value,{allowedTypes:['Alagamentos/Inundação'],...options});
test('RF-001 limites textuais aceitos após trim e limites geográficos inclusivos',()=>{
  expect(validate({...input,reporterName:'  Pessoa sintética  '})).toEqual({...input,reporterName:'Pessoa sintética',address:null,needsMedicalSupport:null});
  expect(validate({...input,description:'x'.repeat(2000)}).description).toHaveLength(2000);
  for(const value of [' ','x'.repeat(2001),null,1]) expect(()=>validate({...input,description:value})).toThrow(PublicInputError);
  for(const [field,maximum] of [['reporterName',120],['reporterContact',40]] as const){
    expect(validate({...input,[field]:'x'.repeat(maximum)})[field]).toHaveLength(maximum);
    for(const value of ['x'.repeat(maximum+1),1]) expect(()=>validate({...input,[field]:value})).toThrow(PublicInputError);
  }
  for(const latitude of [-90,90])for(const longitude of [-180,180])expect(validate({...input,position:{latitude,longitude,accuracy:0}}).position).toEqual({latitude,longitude,accuracy:0});
});
test('RF-001 nome, contato e tipo são obrigatórios; endereço é opcional',()=>{
  expect(validate({...input,address:'  '})).toMatchObject({reporterName:'Pessoa sintética',reporterContact:'Contato sintético',address:null});
  for(const reporterName of ['', '  ', null, undefined, 1]) expect(()=>validate({...input,reporterName})).toThrow(PublicInputError);
  for(const reporterContact of ['', '  ', null, undefined, 1]) expect(()=>validate({...input,reporterContact})).toThrow(PublicInputError);
  for(const type of ['', '  ', null, undefined, 1]) expect(()=>validate({...input,type})).toThrow(PublicInputError);
  expect(validate({...input,address:'  Rua das Flores, 123  '})).toMatchObject({address:'Rua das Flores, 123'});
  expect(()=>validate({...input,address:'x'.repeat(301)})).toThrow(PublicInputError);
});
test('RF-001 tipo público depende da lista ativa fornecida pelo catálogo',()=>{
  expect(validate({...input,type:'Alagamentos/Inundação'}).type).toBe('Alagamentos/Inundação');
  expect(()=>validate({...input,type:'Outro tipo'})).toThrow(PublicInputError);
  expect(validatePublicInput({...input,type:'Tipo personalizado'}, {allowCustomType:true}).type).toBe('Tipo personalizado');
});
test('RF-001 tipo público aceita categorias ativas fornecidas pelo catálogo do banco',()=>{
  const activeTypes=['Dano em via','Inundação'];
  expect(validatePublicInput({...input,type:'Dano em via'}, {allowedTypes:activeTypes}).type).toBe('Dano em via');
  expect(()=>validatePublicInput({...input,type:'Tipo desativado'}, {allowedTypes:activeTypes})).toThrow(PublicInputError);
});
test('RF-002 recusa GPS ausente inválido infinito string ou precisão negativa',()=>{
  for(const position of [undefined,null,[],{...input.position,latitude:90.1},{...input.position,longitude:-180.1},{...input.position,accuracy:-1},{...input.position,accuracy:undefined}])expect(()=>validate({...input,position})).toThrow(PublicInputError);
  for(const field of ['latitude','longitude','accuracy'])for(const value of [NaN,Infinity,-Infinity,'0'])expect(()=>validate({...input,position:{...input.position,[field]:value}})).toThrow(PublicInputError);
});
test('RNF-001 cidadão não determina grupo status prioridade foto ou município',()=>{
  for(const field of ['groupId','priority','status','municipalityId','photoToken'])expect(()=>validate({...input,[field]:'forged'})).toThrow(PublicInputError);
  for(const value of [null,[],false,'text',{}])expect(()=>validate(value)).toThrow(PublicInputError);
});
test('RF-001 texto malicioso permanece texto; validação não cria HTML executável',()=>{
  const payload='<script>alert("fixture")</script>';
  expect(validate({...input,description:payload}).description).toBe(payload);
});
test('apoio médico preserva Sim, Não e Não informado sem converter false em null',()=>{
  expect(validate({...input,needsMedicalSupport:true}).needsMedicalSupport).toBe(true);
  expect(validate({...input,needsMedicalSupport:false}).needsMedicalSupport).toBe(false);
  expect(validate({...input,needsMedicalSupport:null}).needsMedicalSupport).toBeNull();
  expect(validate(input).needsMedicalSupport).toBeNull();
  for(const value of ['false',0,[],{}]) expect(()=>validate({...input,needsMedicalSupport:value})).toThrow(PublicInputError);
});
test('RF-001 chave de idempotência possui limite e rejeita caracteres de controle',()=>{
  expect(validateIdempotencyKey('fixture:key-1')).toBe('fixture:key-1');
  for(const value of [null,'','x'.repeat(201),'a\nb',' a','a b'])expect(()=>validateIdempotencyKey(value)).toThrow(PublicInputError);
});
