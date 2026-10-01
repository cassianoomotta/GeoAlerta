import {test, expect} from '@playwright/test';
import {getSharp} from 'next/dist/server/image-optimizer.js';
import {MAX_PHOTO_BYTES, photoMetadata, PhotoError, type PrivatePhotoStorage} from '../../src/features/occurrences/photos/contracts';
import {issuePhotoToken, resolvePhotoToken} from '../../src/features/occurrences/photos/token';
import {readPrivatePhoto, stageVerifiedPhoto, privatePhotoAvailable} from '../../src/features/occurrences/photos/service';
import {readPhotoForm, photoResponse} from '../../src/features/occurrences/photos/http';
import {verifyPhoto} from '../../src/server/photos/image';
import {sendPublicAttempt, PhotoUploadFailure, type PhotoAttempt} from '../../src/features/occurrences/photos/public-attempt';
import {validatePublicInput} from '../../src/features/occurrences/public-input';
import type {Actor} from '../../src/features/access/contracts';
const secret = 'synthetic-secret-for-unit-tests-0123456789';
const user: Actor = {userId: 'synthetic', municipalityId: 'sa_patrulha', groupIds: ['a','b'], state: 'ATIVO', role: 'OPERADOR'};
const result = {id:'synthetic',protocol:'GA-synthetic',status:'NOVA',priority:'NORMAL',version:1} as const;
const key = 'attempt-a';
const baseBody = JSON.stringify({type:'Alagamento',description:'Dados sintéticos',reporterName:'Sintético',reporterContact:'Sintético',position:{latitude:0,longitude:0,accuracy:1}});
const reference = {objectKey:'core/00000000-0000-4000-a000-000000000001.png',groupId:'b',municipalityId:'sa_patrulha'};
function storageDouble() {
  const calls: string[] = [];
  const storage: PrivatePhotoStorage = {assertPrivate: async()=>{calls.push('private');},upload: async()=>{calls.push('upload');},sign: async(_key,seconds)=>{calls.push(`sign:${seconds}`);return 'https://synthetic.invalid/signed';}};
  return {storage,calls};
}
async function fixture(format: 'jpeg'|'png'|'webp') {
  const data = await getSharp(1,false)({create:{width:2,height:2,channels:3,background:{r:20,g:100,b:200}}}).toFormat(format).toBuffer();
  return new File([new Uint8Array(data)], `fixture.${format}`, {type:`image/${format}`});
}
test('RF-004 decodifica JPEG PNG WebP completos e reencoda sem anexos', async()=>{
  for(const format of ['jpeg','png','webp'] as const){
    const file=await fixture(format);
    const verified=await verifyPhoto(file);
    expect(verified.mime).toBe(file.type);
    expect(verified.bytes.length).toBeGreaterThan(0);
    const appended = new File([await file.arrayBuffer(),'<script>synthetic</script>'],file.name,{type:file.type});
    const normalized=await verifyPhoto(appended);
    expect(Buffer.from(normalized.bytes).includes(Buffer.from('<script>'))).toBe(false);
  }
});
test('RF-004 limite de 5 MiB inclusivo, extensão e MIME coerentes',()=>{
  expect(photoMetadata({name:'fixture.JPEG',type:'image/jpeg',size:MAX_PHOTO_BYTES})).toBe('image/jpeg');
  for(const file of [{name:'a.jpg',type:'image/png',size:1},{name:'a.svg',type:'image/svg+xml',size:1},{name:'a.png',type:'image/png',size:0},{name:'a.png',type:'image/png',size:MAX_PHOTO_BYTES+1}])expect(()=>photoMetadata(file)).toThrow(PhotoError);
});
test('RF-004 conteúdo falso truncado ou de outro formato é recusado',async()=>{
  const png=await fixture('png');
  const bytes=Buffer.from(await png.arrayBuffer());
  for(const file of [new File(['text'],'fake.png',{type:'image/png'}),new File([bytes.subarray(0,33)],'truncated.png',{type:'image/png'}),new File([bytes],'fake.jpg',{type:'image/jpeg'}),new File(['<svg/>'],'fake.webp',{type:'image/webp'}),new File([new Uint8Array(MAX_PHOTO_BYTES+1)],'huge.png',{type:'image/png'})])await expect(verifyPhoto(file)).rejects.toBeInstanceOf(PhotoError);
  const corrupt=Buffer.from(bytes);corrupt[corrupt.length-20]^=255;
  await expect(verifyPhoto(new File([corrupt],'corrupt.png',{type:'image/png'}))).rejects.toBeInstanceOf(PhotoError);
});
test('RF-004 token assinado vincula objeto a tentativa, expira e rejeita adulteração',()=>{
  const staged=issuePhotoToken(key,'png',secret,1000);
  expect(resolvePhotoToken(staged.photoToken,key,secret,1001)).toBe(staged.objectKey);
  for(const [token,attempt,tokenSecret,now] of [[staged.photoToken,'other',secret,1001],[staged.photoToken,key,'different-secret-synthetic-0123456789',1001],[staged.photoToken,key,secret,901000],[staged.photoToken+'x',key,secret,1001],['bad',key,secret,1001]] as const)expect(()=>resolvePhotoToken(token,attempt,tokenSecret,now)).toThrow(PhotoError);
  const input=validatePublicInput({...JSON.parse(baseBody),photoToken:staged.photoToken});
  expect(input.photoToken).toBe(staged.photoToken);
  expect(()=>issuePhotoToken(key,'png','short')).toThrow(PhotoError);
});
test('RF-004 upload privado devolve somente token e nunca anuncia sucesso após falha',async()=>{
  const photo=await verifyPhoto(await fixture('png'));
  const {storage,calls}=storageDouble();
  const staged=await stageVerifiedPhoto(photo,key,secret,storage);
  expect(Object.keys(staged)).toEqual(['photoToken']);
  expect(calls).toEqual(['private','upload']);
  for(const operation of ['assertPrivate','upload'] as const){
    const failed={...storage,[operation]:async()=>{throw new Error('private synthetic failure');}};
    await expect(stageVerifiedPhoto(photo,key,secret,failed)).rejects.toMatchObject({status:503,code:'PHOTO_UNAVAILABLE'});
  }
});
test('RF-010 leitura autorizada em múltiplos grupos assina por exatos 60 segundos',async()=>{
  for(const role of ['OPERADOR','GESTOR','ADMINISTRADOR'] as const){
    const {storage,calls}=storageDouble();
    const output=await readPrivatePhoto({...user,role},'synthetic',async()=>reference,storage,1000);
    expect(output.expiresAt).toBe(new Date(61000).toISOString());
    expect(calls).toEqual(['private','sign:60']);
  }
});
test('RF-010 detalhe expõe presença de foto somente à capacidade e grupo autorizados',async()=>{
  let calls=0;
  const find=async()=>{calls++;return reference.objectKey;};
  expect(await privatePhotoAvailable(user,reference,find)).toBe(true);
  expect(calls).toBe(1);
  for(const [actor,scope] of [[{...user,role:'CONSULTA' as const},reference],[{...user,state:'SUSPENSO' as const},reference],[user,{...reference,groupId:'c'}],[user,{...reference,municipalityId:'other'}]] as const)expect(await privatePhotoAvailable(actor,scope,find)).toBe(false);
  expect(calls).toBe(1);
  expect(await privatePhotoAvailable(user,reference,async()=>null)).toBe(false);
  expect(await privatePhotoAvailable(user,reference,async()=>'https://legacy.invalid/photo')).toBe(false);
});
test('RNF-001 anônimo Consulta e contas inativas não consultam repositório/Storage',async()=>{
  for(const actor of [null,{...user,role:'CONSULTA' as const},...(['PENDENTE','SUSPENSO','DESATIVADO'] as const).map(state=>({...user,state})),{...user,municipalityId:'other'}]){
    const {storage,calls}=storageDouble();let lookups=0;
    await expect(readPrivatePhoto(actor,'synthetic',async()=>{lookups++;return reference;},storage)).rejects.toMatchObject({status:404});
    expect(lookups).toBe(0);expect(calls).toEqual([]);
  }
});
test('RNF-001 outro grupo município ID ausente ou objeto legado não gera URL',async()=>{
  for(const photo of [null,{...reference,groupId:'c'},{...reference,municipalityId:'other'},{...reference,objectKey:null},{...reference,objectKey:'https://legacy.invalid/public.jpg'}]){
    const {storage,calls}=storageDouble();
    await expect(readPrivatePhoto(user,'synthetic',async()=>photo,storage)).rejects.toMatchObject({status:404});
    expect(calls).toEqual([]);
  }
});
test('RF-010 falha de bucket/assinatura não expõe erro interno ou URL',async()=>{
  for(const operation of ['assertPrivate','sign'] as const){
    const {storage}=storageDouble();
    const failed={...storage,[operation]:async()=>{throw new Error('SECRET synthetic');}};
    try{await readPrivatePhoto(user,'synthetic',async()=>reference,failed);throw new Error('Expected failure');}catch(error){const response=photoResponse(error);expect(response.status).toBe(503);expect(response.headers.get('Cache-Control')).toBe('no-store');expect(await response.text()).not.toContain('SECRET');}
  }
});
test('RF-004 multipart bounded stream rejeita campos extras e tamanho sem confiar em Content-Length',async()=>{
  const file=await fixture('png');const form=new FormData();form.set('file',file);
  const received=await readPhotoForm(new Request('http://synthetic.invalid',{method:'POST',body:form}));
  expect(received.name).toBe(file.name);
  form.set('objectKey','forged');
  await expect(readPhotoForm(new Request('http://synthetic.invalid',{method:'POST',body:form}))).rejects.toBeInstanceOf(PhotoError);
  const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(MAX_PHOTO_BYTES+16385));controller.close();}});
  await expect(readPhotoForm(new Request('http://synthetic.invalid',{method:'POST',headers:{'Content-Type':'multipart/form-data; boundary=fixture','Content-Length':'1'},body:stream,duplex:'half'} as RequestInit))).rejects.toBeInstanceOf(PhotoError);
});
function attempt(file:File|null):PhotoAttempt{return {key,baseBody,file,uploadFailed:false,submissionStarted:false};}
test('RF-004 falha de foto impede registro; retry ou omissão explicitamente confirmada',async()=>{
  const file=await fixture('png'),a=attempt(file);let opens=0,uploads=0;
  const transport={stage:async()=>{uploads++;throw new Error('Falha sintética');},open:async(body:string)=>{opens++;expect(JSON.parse(body).photoToken).toBeUndefined();return result;}};
  await expect(sendPublicAttempt(a,false,transport)).rejects.toBeInstanceOf(PhotoUploadFailure);
  expect(opens).toBe(0);expect(a.uploadFailed).toBe(true);
  expect(await sendPublicAttempt(a,true,transport)).toEqual(result);expect(uploads).toBe(1);expect(opens).toBe(1);
  await expect(sendPublicAttempt(attempt(file),true,transport)).rejects.toThrow();
});
test('RF-004 retry após resposta perdida preserva exatamente token corpo e chave',async()=>{
  const a=attempt(await fixture('png'));let uploads=0;const bodies:string[]=[];const keys:string[]=[];
  const transport={stage:async()=>{uploads++;return issuePhotoToken(key,'png',secret).photoToken;},open:async(body:string,attemptKey:string)=>{bodies.push(body);keys.push(attemptKey);if(bodies.length===1)throw new Error('Resposta perdida');return result;}};
  await expect(sendPublicAttempt(a,false,transport)).rejects.toThrow('Resposta perdida');
  expect(await sendPublicAttempt(a,false,transport)).toEqual(result);
  expect(uploads).toBe(1);expect(bodies[0]).toBe(bodies[1]);expect(keys).toEqual([key,key]);
  await expect(sendPublicAttempt(a,true,transport)).rejects.toThrow();
});
test('RF-004 sem foto não chama Storage; nova tentativa de upload pode ter sucesso',async()=>{
  let uploads=0,opens=0;
  const transport={stage:async()=>{uploads++;if(uploads===1)throw new Error('Falha sintética');return issuePhotoToken(key,'png',secret).photoToken;},open:async()=>{opens++;return result;}};
  await sendPublicAttempt(attempt(null),false,transport);expect(uploads).toBe(0);
  const a=attempt(await fixture('png'));
  await expect(sendPublicAttempt(a,false,transport)).rejects.toBeInstanceOf(PhotoUploadFailure);
  await sendPublicAttempt(a,false,transport);expect(opens).toBe(2);expect(uploads).toBe(2);expect(a.uploadFailed).toBe(false);
});
