import {test,expect} from '@playwright/test';
import pg from 'pg';
import {assertTestTarget} from '../fixtures/database';
test.beforeEach(async({page,request})=>{
  await request.post('/__fixture/rotate-origin');
  await page.route('**/*',route=>{const host=new URL(route.request().url()).hostname;return ['127.0.0.1','localhost'].includes(host)?route.continue():route.abort();});
});
async function fill(page:import('@playwright/test').Page){
  await expect(page.getByLabel('Tipo de ocorrência').locator('option')).toHaveCount(31);
  await page.getByLabel('Nome',{exact:true}).fill('Cidadão teste');await page.getByLabel('Contato',{exact:true}).fill('(51) 99999-0000');await page.getByLabel('Tipo de ocorrência').selectOption('Alagamentos/Inundação');await page.getByLabel('Descrição',{exact:true}).fill('<script>window.fixtureXss=true</script>');
}
test('formulário público usa seletor claro e exibe as marcas institucionais',async({page})=>{
  await page.goto('/');
  for(const label of ['Nome *','Contato *','Tipo de ocorrência *','Descrição *','Localização do dispositivo *'])await expect(page.getByText(label,{exact:true})).toBeVisible();
  await expect(page.getByLabel('Contato')).toHaveAttribute('required','');
  await expect(page.getByLabel('Tipo de ocorrência')).toHaveAttribute('required','');
  expect(await page.getByLabel('Tipo de ocorrência').evaluate(element=>getComputedStyle(element).colorScheme)).toBe('light');
  const optionStyle=await page.getByLabel('Tipo de ocorrência').locator('option').nth(1).evaluate(element=>({background:getComputedStyle(element).backgroundColor,color:getComputedStyle(element).color}));
  expect(optionStyle).toEqual({background:'rgb(255, 255, 255)',color:'rgb(15, 23, 42)'});
  const institutions=page.getByRole('region',{name:'Instituições de atendimento'});
  for(const name of ['Prefeitura de Santo Antônio da Patrulha','Defesa Civil do Rio Grande do Sul','Corpo de Bombeiros Militar do Rio Grande do Sul']){
    const logo=institutions.getByRole('img',{name});await expect(logo).toBeVisible();
    expect(await logo.evaluate(element=>(element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
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
test('RF-001 GPS nativo e confirmação com protocolo no desktop e celular',async({page,context})=>{
  await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:11,longitude:11,accuracy:8});
  await page.goto('/');await expect(page.getByRole('button',{name:'Obter localização'})).toBeEnabled();await fill(page);await page.getByLabel('Endereço da ocorrência (opcional)').fill('Rua de Teste, 123');
  expect(await page.getByLabel('Nome',{exact:true}).evaluate(element=>(element as HTMLInputElement).required)).toBe(true);expect(await page.getByLabel('Contato (opcional)').evaluate(element=>(element as HTMLInputElement).required)).toBe(false);expect(await page.getByLabel('Endereço da ocorrência (opcional)').evaluate(element=>(element as HTMLInputElement).required)).toBe(false);
  await expect(page.getByRole('button',{name:'Enviar ocorrência'})).toBeDisabled();await page.getByRole('button',{name:'Obter localização'}).click();await expect(page.getByText('Localização obtida. Precisão: 8 metros.')).toBeVisible();
  const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/core/public/occurrences')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Enviar ocorrência'}).click();const response=await responsePromise;expect(response.status()).toBe(201);
  const result=await response.json();expect(result.protocol).toMatch(/^\d+$/);await expect(page.getByRole('status')).toContainText(result.protocol);expect(await page.evaluate(()=>Object.hasOwn(window,'fixtureXss'))).toBe(false);
  assertTestTarget(process.env.TEST_DATABASE_URL);const db=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await db.connect();try{const row=(await db.query('SELECT o.address,d.reporter_name,d.reporter_contact FROM public.occurrences o JOIN public.occurrence_private_data d ON d.occurrence_id=o.id WHERE o.id=$1',[result.id])).rows[0];expect(row).toEqual({address:'Rua de Teste, 123',reporter_name:'Cidadão teste',reporter_contact:null});}finally{await db.end();}
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
  await page.getByRole('button',{name:'Enviar ocorrência'}).click();await expect(page.getByRole('status')).toContainText(result!.protocol);expect(keys).toHaveLength(2);expect(keys[0]).toBe(keys[1]);
  assertTestTarget(process.env.TEST_DATABASE_URL);const db=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await db.connect();try{for(const table of ['occurrence_events','occurrence_alerts'])expect((await db.query(`SELECT count(*)::int AS n FROM public.${table} WHERE occurrence_id=$1`,[result!.id])).rows[0].n).toBe(1);}finally{await db.end();}
});
