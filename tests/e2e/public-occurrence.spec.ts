import {test,expect} from '@playwright/test';
import pg from 'pg';
import {getSharp} from 'next/dist/server/image-optimizer.js';
import {assertTestTarget} from '../fixtures/database';
import {MAX_PHOTO_BYTES} from '../../src/features/occurrences/photos/contracts';
test.beforeEach(async({page,request})=>{
  await request.post('/__fixture/rotate-origin');
  await page.route('**/*',route=>{const host=new URL(route.request().url()).hostname;return ['127.0.0.1','localhost'].includes(host)?route.continue():route.abort();});
});
async function fill(page:import('@playwright/test').Page,medicalSupport:'true'|'false'|null='false'){
  await expect(page.getByRole('option',{name:'Alagamentos/Inundação',exact:true})).toBeAttached();
  await page.getByRole('textbox',{name:'Nome'}).fill('Cidadão teste');await page.getByRole('textbox',{name:'Contato'}).fill('(51) 99999-0000');await page.getByRole('combobox',{name:'Tipo de ocorrência'}).selectOption('Alagamentos/Inundação');await page.getByRole('textbox',{name:'Descrição'}).fill('<script>window.fixtureXss=true</script>');
  if(medicalSupport)await page.getByRole('radio',{name:medicalSupport==='true'?'Sim':'Não'}).check();
  await page.getByRole('checkbox',{name:'Confirmo que desejo enviar esta ocorrência sem foto.'}).check();
}
test('formulário público usa seletor claro e exibe as marcas institucionais',async({page})=>{
  await page.goto('/');
  for(const label of ['Nome *','Contato *','Tipo de ocorrência *','Descrição *','Localização do dispositivo *','Precisa de apoio médico? *'])await expect(page.getByText(label,{exact:true})).toBeVisible();
  await expect(page.getByRole('textbox',{name:'Contato'})).toHaveAttribute('required','');
  await expect(page.getByRole('combobox',{name:'Tipo de ocorrência'})).toHaveAttribute('required','');
  await expect(page.getByRole('radio',{name:'Sim'})).not.toBeChecked();await expect(page.getByRole('radio',{name:'Não'})).not.toBeChecked();
  await expect(page.getByRole('radio',{name:'Sim'})).toHaveAttribute('required','');
  expect(await page.getByLabel('Tipo de ocorrência').evaluate(element=>getComputedStyle(element).colorScheme)).toBe('light');
  const optionStyle=await page.getByLabel('Tipo de ocorrência').locator('option').nth(1).evaluate(element=>({background:getComputedStyle(element).backgroundColor,color:getComputedStyle(element).color}));
  expect(optionStyle).toEqual({background:'rgb(255, 255, 255)',color:'rgb(36, 55, 70)'});
  const institutions=page.getByRole('region',{name:'Instituições de atendimento'});
  for(const name of ['Prefeitura de Santo Antônio da Patrulha','Defesa Civil do Rio Grande do Sul','Corpo de Bombeiros Militar do Rio Grande do Sul']){
    const logo=institutions.getByRole('img',{name});await expect(logo).toBeVisible();
    await logo.scrollIntoViewIfNeeded();
    await expect.poll(()=>logo.evaluate(element=>{const image=element as HTMLImageElement;return image.complete&&image.naturalWidth>0;})).toBe(true);
  }
  await expect(institutions.getByText('SEMOT', {exact:false})).toBeVisible();
  await expect(institutions.getByText('SMTDS', {exact:false})).toBeVisible();
});
test('formulário informa falha ao carregar tipos e impede escolha sem catálogo',async({page})=>{
  await page.route('**/api/core/public/occurrence-types',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'SERVICE_UNAVAILABLE'}})}));
  await page.goto('/');
  await expect(page.getByLabel('Tipo de ocorrência')).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('Não foi possível carregar os tipos');
});
test('formulário bloqueia envio até escolha explícita de apoio médico',async({page,context})=>{
  await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:11,longitude:11,accuracy:8});
  let requests=0;page.on('request',request=>{if(request.url().endsWith('/api/core/public/occurrences')&&request.method()==='POST')requests++;});
  await page.goto('/');await expect(page.getByRole('button',{name:'Obter localização'})).toBeEnabled();await fill(page,null);await page.getByRole('button',{name:'Obter localização'}).click();
  expect(await page.locator('form').evaluate(form=>(form as HTMLFormElement).checkValidity())).toBe(false);
  await page.getByRole('button',{name:'Enviar ocorrência'}).click();expect(requests).toBe(0);
  await page.getByRole('radio',{name:'Sim'}).check();expect(await page.locator('form').evaluate(form=>(form as HTMLFormElement).checkValidity())).toBe(true);
});
test('cidadão pode escolher um arquivo ou abrir a câmera traseira para anexar foto',async({page})=>{
  await page.goto('/');
  await expect(page.getByRole('button',{name:'Escolher foto'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Tirar foto'})).toBeVisible();
  const chooser=page.locator('input[name="photo"]:not([capture])');
  const camera=page.locator('input[name="photo"][capture="environment"]');
  await expect(chooser).toHaveCount(1);await expect(camera).toHaveCount(1);
  const chooseDialog=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Escolher foto'}).click();await (await chooseDialog).setFiles({name:'foto-escolhida.jpg',mimeType:'image/jpeg',buffer:Buffer.from('imagem sintética')});
  await expect(page.getByText('foto-escolhida.jpg')).toBeVisible();
  const cameraDialog=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Tirar foto'}).click();await (await cameraDialog).setFiles({name:'foto-camera.jpg',mimeType:'image/jpeg',buffer:Buffer.from('imagem sintética')});
  await expect(page.getByText('foto-camera.jpg')).toBeVisible();
});
test('RF-004 foto maior que 5 MiB é comprimida antes do upload público',async({page,context})=>{
  await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:11,longitude:11,accuracy:8});
  const width=3000,height=3000,pixels=Buffer.allocUnsafe(width*height*3);let seed=0x12345678;
  for(let i=0;i<pixels.length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;pixels[i]=seed&255;}
  const original=await getSharp(1,false)(pixels,{raw:{width,height,channels:3}}).jpeg({quality:100,chromaSubsampling:'4:4:4'}).toBuffer();
  expect(original.length).toBeGreaterThan(MAX_PHOTO_BYTES);
  let uploadBodySize=0;
  await page.route('**/api/core/public/photos',async route=>{uploadBodySize=route.request().postDataBuffer()?.byteLength??0;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({photoToken:'synthetic-photo-token'})});});
  await page.route('**/api/core/public/occurrences',route=>route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({id:'60000000-0000-4000-8000-000000000011',protocol:'9011',status:'NOVA',priority:'NORMAL',version:1})}));
  await page.route('**/api/core/public/shelters',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({shelters:[]})}));
  await page.goto('/');
  await page.locator('input[name="photo"]:not([capture])').setInputFiles({name:'foto-grande.jpg',mimeType:'image/jpeg',buffer:original});
  await expect(page.getByRole('status').filter({hasText:'Foto selecionada'})).toContainText('comprimida');
  await expect(page.getByRole('img',{name:'Prévia da foto selecionada'})).toBeVisible();
  await page.getByRole('textbox',{name:'Nome'}).fill('Cidadão teste');await page.getByRole('textbox',{name:'Contato'}).fill('(51) 99999-0000');
  await page.getByRole('combobox',{name:'Tipo de ocorrência'}).selectOption('Alagamentos/Inundação');await page.getByRole('textbox',{name:'Descrição'}).fill('Foto de evidência');
  await page.getByRole('radio',{name:'Não'}).check();await page.getByRole('button',{name:'Autorizar envio desta foto'}).click();await page.getByRole('button',{name:'Obter localização'}).click();
  await expect(page.getByText('Localização obtida. Precisão: 8 metros.')).toBeVisible();await page.getByRole('button',{name:'Enviar ocorrência'}).click();
  await expect(page.getByText('9011')).toBeVisible();expect(uploadBodySize).toBeGreaterThan(0);expect(uploadBodySize).toBeLessThanOrEqual(MAX_PHOTO_BYTES+16384);
});
test('RF-001 GPS nativo e confirmação com protocolo no desktop e celular',async({page,context})=>{
  await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:11,longitude:11,accuracy:8});
  await page.goto('/');await expect(page.getByRole('button',{name:'Obter localização'})).toBeEnabled();await fill(page,'true');await page.getByLabel('Endereço da ocorrência (opcional)').fill('Rua de Teste, 123');
  expect(await page.getByRole('textbox',{name:'Nome'}).evaluate(element=>(element as HTMLInputElement).required)).toBe(true);expect(await page.getByRole('textbox',{name:'Contato'}).evaluate(element=>(element as HTMLInputElement).required)).toBe(true);expect(await page.getByLabel('Endereço da ocorrência (opcional)').evaluate(element=>(element as HTMLInputElement).required)).toBe(false);
  await expect(page.getByRole('button',{name:'Enviar ocorrência'})).toBeDisabled();await page.getByRole('button',{name:'Obter localização'}).click();await expect(page.getByText('Localização obtida. Precisão: 8 metros.')).toBeVisible();
  const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/core/public/occurrences')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Enviar ocorrência'}).click();const response=await responsePromise;expect(response.status()).toBe(201);
  const result=await response.json();expect(result.protocol).toMatch(/^\d+$/);await expect(page.locator('section[role="status"]')).toContainText(result.protocol);expect(await page.evaluate(()=>Object.hasOwn(window,'fixtureXss'))).toBe(false);
  assertTestTarget(process.env.TEST_DATABASE_URL);const db=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await db.connect();try{const row=(await db.query('SELECT o.address,o.needs_medical_support,o.priority,d.reporter_name,d.reporter_contact FROM public.occurrences o JOIN public.occurrence_private_data d ON d.occurrence_id=o.id WHERE o.id=$1',[result.id])).rows[0];expect(row).toEqual({address:'Rua de Teste, 123',needs_medical_support:true,priority:'NORMAL',reporter_name:'Cidadão teste',reporter_contact:'51999990000'});}finally{await db.end();}
});
test('RF-004 após o registro exibe abrigos abertos com rotas Google Maps e Waze',async({page,context})=>{
  await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:11,longitude:11,accuracy:8});
  await page.route('**/api/core/public/shelters',route=>route.fulfill({status:200,contentType:'application/json',headers:{'Cache-Control':'no-store'},body:JSON.stringify({shelters:[{id:'50000000-0000-4000-8000-000000000001',name:'Abrigo Central',type:'humano',address:'Praça Central, Santo Antônio da Patrulha',lat:-29.82,lng:-50.52,status:'Aberto'}]})}));
  await page.route('**/api/core/public/occurrences',route=>route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({id:'60000000-0000-4000-8000-000000000001',protocol:'9001',status:'NOVA',priority:'NORMAL',version:1})}));
  await page.goto('/');await expect(page.getByRole('button',{name:'Obter localização'})).toBeEnabled();await fill(page);await page.getByLabel('Tipo de ocorrência').selectOption('Chuvas Intensas');await page.getByRole('button',{name:'Obter localização'}).click();
  await page.getByRole('button',{name:'Enviar ocorrência'}).click();
  await expect(page.getByRole('heading',{name:'Abrigos disponíveis'})).toBeVisible();await expect(page.getByText('Abrigo Central')).toBeVisible();await expect(page.getByText('Situação: Aberto')).toBeVisible();
  await expect(page.getByRole('link',{name:'Rota no Google Maps'})).toHaveAttribute('href','https://www.google.com/maps/dir/?api=1&destination=-29.82%2C-50.52');
  await expect(page.getByRole('link',{name:'Rota no Waze'})).toHaveAttribute('href','https://waze.com/ul?ll=-29.82%2C-50.52&navigate=yes');
});
test('RF-004 falha ao carregar abrigos preserva protocolo e permite tentar de novo',async({page,context})=>{
  await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:11,longitude:11,accuracy:8});let catalogAttempts=0;
  await page.route('**/api/core/public/shelters',route=>{catalogAttempts++;return catalogAttempts===1?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'SERVICE_UNAVAILABLE'}})}):route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({shelters:[]})});});
  await page.route('**/api/core/public/occurrences',route=>route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({id:'60000000-0000-4000-8000-000000000002',protocol:'9002',status:'NOVA',priority:'NORMAL',version:1})}));
  await page.goto('/');await expect(page.getByRole('button',{name:'Obter localização'})).toBeEnabled();await fill(page);await page.getByRole('button',{name:'Obter localização'}).click();await page.getByRole('button',{name:'Enviar ocorrência'}).click();
  await expect(page.getByText('9002')).toBeVisible();await expect(page.getByText('A ocorrência foi registrada, mas não foi possível carregar a lista de abrigos.')).toBeVisible();await page.getByRole('button',{name:'Tentar carregar abrigos novamente'}).click();
  await expect(page.getByText('No momento, não há abrigos ativos')).toBeVisible();await expect(page.getByText('9002')).toBeVisible();expect(catalogAttempts).toBe(2);
});
test('RF-002 GPS negado indisponível timeout ausente ou inválido impede envio recuperável',async({page})=>{
  for(const scenario of [1,2,3,'missing','invalid'] as const){
    await page.goto('/');await expect(page.getByRole('button',{name:'Obter localização'})).toBeEnabled();
    await page.evaluate(value=>{
      Object.defineProperty(navigator,'geolocation',{configurable:true,value:value==='missing'?undefined:{getCurrentPosition:(success:(p:unknown)=>void,error:(e:unknown)=>void)=>{if(value==='invalid')success({coords:{latitude:91,longitude:0,accuracy:1}});else error({code:value});}}});
    },scenario);
    await page.getByRole('button',{name:'Obter localização'}).click();await expect(page.getByRole('alert',{name:'Problema no envio'})).toContainText(scenario===1?'negada':scenario===2?'indisponível':scenario===3?'Tempo esgotado':scenario==='missing'?'não disponível':'inválida');await expect(page.getByRole('button',{name:'Enviar ocorrência'})).toBeDisabled();await expect(page.getByRole('button',{name:'Obter localização'})).toBeEnabled();
  }
});
test('RF-001 perda de resposta após commit permite retry com mesma chave sem duplicar',async({page,context})=>{
  await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:11,longitude:11,accuracy:3});
  const keys:string[]=[];let result:{id:string;protocol:string}|undefined;
  await page.route('**/api/core/public/occurrences',async route=>{
    keys.push(route.request().headers()['idempotency-key']);
    if(keys.length===1){const response=await route.fetch();expect(response.status()).toBe(201);result=await response.json();await route.abort('failed');}
    else await route.continue();
  });
  await page.goto('/');await expect(page.getByRole('button',{name:'Obter localização'})).toBeEnabled();await fill(page);await page.getByRole('button',{name:'Obter localização'}).click();await expect(page.getByRole('button',{name:'Enviar ocorrência'})).toBeEnabled();
  await page.getByRole('button',{name:'Enviar ocorrência'}).click();await expect(page.getByRole('alert',{name:'Problema no envio'})).toContainText('Resposta não confirmada');await expect(page.getByText('Ocorrência registrada',{exact:true})).not.toBeVisible();
  await page.getByRole('button',{name:'Enviar ocorrência'}).click();await expect(page.getByRole('status').filter({hasText:'Ocorrência registrada'})).toContainText(result!.protocol);expect(keys).toHaveLength(2);expect(keys[0]).toBe(keys[1]);
  assertTestTarget(process.env.TEST_DATABASE_URL);const db=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await db.connect();try{for(const table of ['occurrence_events','occurrence_alerts'])expect((await db.query(`SELECT count(*)::int AS n FROM public.${table} WHERE occurrence_id=$1`,[result!.id])).rows[0].n).toBe(1);expect((await db.query('SELECT needs_medical_support FROM public.occurrences WHERE id=$1',[result!.id])).rows[0].needs_medical_support).toBe(false);}finally{await db.end();}
});
