import {expect,test} from '@playwright/test';
import {randomInt,randomUUID} from 'node:crypto';

test('reconecta o feed de alertas e recupera uma ocorrência criada durante a desconexão',async({page,request})=>{
  const email=process.env.TASK26_MANAGER_EMAIL;
  const password=process.env.TASK26_MANAGER_PASSWORD;
  if(!email||!password)throw new Error('Credenciais sintéticas de homologação ausentes.');

  let realtimeSockets=0;
  let successfulJoins=0;
  page.on('websocket',socket=>{
    if(!socket.url().includes('/realtime/v1/websocket'))return;
    realtimeSockets++;
    socket.on('framereceived',frame=>{
      const payload=typeof frame.payload==='string'?frame.payload:frame.payload.toString();
      if(payload.includes('phx_reply')&&payload.includes('"status":"ok"'))successfulJoins++;
    });
  });

  await page.goto('/login');
  await page.getByPlaceholder('operador@prefeitura.gov.br').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button',{name:'Entrar no Painel'}).click();
  await expect(page).toHaveURL(/\/painel(?:$|\/)/);
  await expect(page.getByRole('heading',{name:'Dashboard',exact:true})).toBeVisible();

  const notifications=page.getByRole('button',{name:/Alertas in-app/});
  await expect(notifications).toBeVisible();
  await notifications.click();
  await expect.poll(()=>successfulJoins,{timeout:45_000}).toBeGreaterThan(0);
  const joinsBeforeDisconnect=successfulJoins;

  await page.context().setOffline(true);
  await expect(page.getByRole('status')).toContainText(/Conexão de alertas indisponível|Não foi possível recuperar os alertas autorizados/,{timeout:45_000});

  const idempotencyKey=`task26-e2e-${randomUUID()}`;
  const syntheticIp=`203.0.113.${randomInt(1,254)}`;
  const created=await request.post('/api/core/public/occurrences',{
    headers:{'Idempotency-Key':idempotencyKey,'x-vercel-forwarded-for':syntheticIp},
    data:{
      type:'Alagamentos/Inundação',
      description:`Reconexão E2E ${idempotencyKey}`,
      reporterName:'Teste automatizado',
      reporterContact:'(51) 99999-9999',
      address:'Registro sintético da homologação',
      position:{latitude:-29.8235,longitude:-50.5192,accuracy:7},
    },
  });
  const createdText=await created.text();
  expect(created.status(),createdText).toBe(201);
  const occurrence=JSON.parse(createdText) as {id:string};
  console.log(`TASK26_SYNTHETIC_OCCURRENCE=${occurrence.id}`);
  const recoveredAlert=page.locator(`a[href="/painel/ocorrencias/${occurrence.id}"]`);
  await expect(recoveredAlert).toHaveCount(0);

  await page.context().setOffline(false);
  await expect.poll(()=>successfulJoins,{timeout:60_000}).toBeGreaterThan(joinsBeforeDisconnect);
  await expect(recoveredAlert).toBeVisible({timeout:30_000});
});
