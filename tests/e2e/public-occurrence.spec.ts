import {test,expect} from '@playwright/test';
import pg from 'pg';
import {assertTestTarget} from '../fixtures/database';
test.beforeEach(async({page,request})=>{
  await request.post('/__fixture/rotate-origin');
  await page.route('**/*',route=>{const host=new URL(route.request().url()).hostname;return ['127.0.0.1','localhost'].includes(host)?route.continue():route.abort();});
});
async function fill(page:import('@playwright/test').Page){
  await page.getByLabel('Nome',{exact:true}).fill('Synthetic citizen');await page.getByLabel('Contato',{exact:true}).fill('Synthetic contact');await page.getByLabel('Descrição',{exact:true}).fill('<script>window.fixtureXss=true</script>');
}
test('RF-001 GPS nativo e confirmação com protocolo no desktop e celular',async({page,context})=>{
  await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:11,longitude:11,accuracy:8});
  await page.goto('/');await expect(page.getByRole('button',{name:'Obter localização'})).toBeEnabled();await fill(page);
  await expect(page.getByRole('button',{name:'Enviar ocorrência'})).toBeDisabled();await page.getByRole('button',{name:'Obter localização'}).click();await expect(page.getByText('Localização obtida. Precisão: 8 metros.')).toBeVisible();
  const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/core/public/occurrences')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Enviar ocorrência'}).click();const response=await responsePromise;expect(response.status()).toBe(201);
  const result=await response.json();await expect(page.getByRole('status')).toContainText(result.protocol);expect(await page.evaluate(()=>Object.hasOwn(window,'fixtureXss'))).toBe(false);
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
