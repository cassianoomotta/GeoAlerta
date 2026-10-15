import {test,expect,type Page} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
  await page.route('**/api/core/public/**',route=>{
    const path=new URL(route.request().url()).pathname;
    const body=path.endsWith('occurrence-types')?{types:['Inundação']}:path.endsWith('shelters')?{shelters:[]}:{error:{code:'UNEXPECTED_REQUEST'}};
    return route.fulfill({status:path.endsWith('occurrence-types')||path.endsWith('shelters')?200:500,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.addInitScript(()=>Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition:(success:(position:unknown)=>void)=>success({coords:{latitude:-29.8,longitude:-50.5,accuracy:7.043347318929986}})}}));
});
async function fill(page:Page){
  await page.goto('/');
  await page.getByRole('textbox',{name:'Nome'}).fill('Pessoa teste');
  await page.getByRole('textbox',{name:'Contato'}).fill('abc(51) 99999-0000xyz');
  await page.getByRole('combobox',{name:'Tipo de ocorrência'}).selectOption('Inundação');
  await page.getByRole('textbox',{name:'Descrição'}).fill('Registro sintético');
  await page.getByRole('radio',{name:'Não',exact:true}).check();
  await page.getByRole('button',{name:'Obter localização'}).click();
}
async function choosePhoto(page:Page,name='foto.jpg'){
  await page.locator('input[type=file]').first().setInputFiles({name,mimeType:'image/jpeg',buffer:Buffer.from('foto sintética')});
}
const registered={id:'synthetic',protocol:'9001',status:'NOVA',priority:'NORMAL',version:1};
test('precisão legível e contato numérico preservam o GPS original no envio',async({page})=>{
  await fill(page);
  await expect(page.getByRole('textbox',{name:'Contato'})).toHaveValue('51999990000');
  await expect(page.getByText('Localização obtida. Precisão: 7 metros.')).toBeVisible();
  let sent:Record<string,unknown>|undefined;
  await page.route('**/api/core/public/occurrences',route=>{sent=route.request().postDataJSON();return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify(registered)});});
  await page.getByRole('button',{name:'Enviar ocorrência'}).click();
  await expect(page.getByRole('heading',{name:'Ocorrência registrada'})).toBeVisible();
  expect(sent?.reporterContact).toBe('51999990000');expect(sent?.position).toEqual({latitude:-29.8,longitude:-50.5,accuracy:7.043347318929986});
});
test('foto é opcional e nenhum upload acontece sem arquivo selecionado',async({page})=>{
  await fill(page);let uploads=0;
  await expect(page.getByRole('checkbox',{name:'Autorizo o envio desta foto'})).toHaveCount(0);
  await page.route('**/api/core/public/photos',route=>{uploads++;return route.fulfill({status:503,body:'{}'});});
  await page.route('**/api/core/public/occurrences',route=>{expect(route.request().postDataJSON().photoToken).toBeUndefined();return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify(registered)});});
  await page.getByRole('button',{name:'Enviar ocorrência'}).click();
  await expect(page.getByRole('heading',{name:'Ocorrência registrada'})).toBeVisible();expect(uploads).toBe(0);
});
test('falha de upload permite confirmação e registro sem foto na tentativa seguinte',async({page})=>{
  await fill(page);await choosePhoto(page);let opens=0;
  await page.getByRole('checkbox',{name:'Autorizo o envio desta foto'}).check();
  await page.route('**/api/core/public/photos',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{message:'Não foi possível enviar a foto.'}})}));
  await page.route('**/api/core/public/occurrences',route=>{expect(route.request().postDataJSON().photoToken).toBeUndefined();opens++;return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify(registered)});});
  await page.getByRole('button',{name:'Enviar ocorrência'}).click();
  await expect(page.getByRole('alert',{name:'Problema no envio'})).toContainText('escolha continuar sem foto');expect(opens).toBe(0);
  await page.getByRole('button',{name:'Continuar sem foto'}).click();
  await page.getByRole('button',{name:'Enviar sem foto'}).click();
  await expect(page.getByRole('heading',{name:'Ocorrência registrada'})).toBeVisible();expect(opens).toBe(1);
});
test('foto exige autorização explícita e troca da foto revoga a autorização',async({page})=>{
  await fill(page);await choosePhoto(page,'foto-autorizacao-1.jpg');let uploads=0;
  await page.route('**/api/core/public/photos',route=>{uploads++;return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({photoToken:'synthetic-token'})});});
  await page.route('**/api/core/public/occurrences',route=>{expect(route.request().postDataJSON().photoToken).toBe('synthetic-token');return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify(registered)});});
  const authorization=page.getByRole('checkbox',{name:'Autorizo o envio desta foto'});
  const submit=page.getByRole('button',{name:'Enviar ocorrência'});
  await expect(authorization).toBeVisible();await expect(authorization).toHaveAttribute('required','');
  await expect(submit).toBeDisabled();expect(uploads).toBe(0);
  await authorization.check();await expect(submit).toBeEnabled();
  await choosePhoto(page,'foto-autorizacao-2.jpg');
  await expect(authorization).not.toBeChecked();await expect(submit).toBeDisabled();
  await authorization.check();
  await page.getByRole('button',{name:'Enviar ocorrência'}).click();
  await expect(page.getByRole('heading',{name:'Ocorrência registrada'})).toBeVisible();expect(uploads).toBe(1);
});
