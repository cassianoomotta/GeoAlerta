// Explicitly authorized session simulation; this is NOT Supabase Auth.
import { createServer } from 'node:http';
import { accounts } from './access';
const revoked=new Set<string>();
function user(id:string){return {id,aud:'authenticated',role:'authenticated',email:`${accounts.find(a=>a.id===id)!.name}@fixture.invalid`,app_metadata:{provider:'email'},user_metadata:{role:'ADMINISTRADOR',groups:['forged']},created_at:'2026-09-30T00:00:00Z'};}
function token(id:string){return [Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'fixture'].join('.');}
createServer(async(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:3100');res.setHeader('Access-Control-Allow-Headers',req.headers['access-control-request-headers']||'authorization,apikey,content-type,x-client-info,x-supabase-api-version');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Content-Type','application/json');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  const path=new URL(req.url!,'http://localhost').pathname;
  if(path==='/health'){res.end('{}');return;}
  const bearer=(req.headers.authorization||'').replace(/^Bearer /,'');
  let id:string|undefined;
  try{id=JSON.parse(Buffer.from(bearer.split('.')[1]||'','base64url').toString()).sub;}catch{}
  if(path==='/auth/v1/token'){
    let body='';for await(const chunk of req)body+=chunk;
    const input=JSON.parse(body);
    const account=accounts.find(a=>`${a.name}@fixture.invalid`===input.email);
    if(!account||input.password!=='fixture-password'){res.writeHead(400);res.end(JSON.stringify({error_code:'invalid_credentials',msg:'E-mail ou senha incorretos.'}));return;}
    const access_token=token(account.id);revoked.delete(access_token);
    res.end(JSON.stringify({access_token,refresh_token:`fixture-${account.id}`,expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:user(account.id)}));return;
  }
  if(path==='/auth/v1/logout'){revoked.add(bearer);res.writeHead(204);res.end();return;}
  if(path==='/auth/v1/user'&&accounts.some(a=>a.id===id)&&!revoked.has(bearer)){res.end(JSON.stringify(user(id!)));return;}
  res.writeHead(401);res.end(JSON.stringify({msg:'Invalid fixture session'}));
}).listen(3101,'127.0.0.1');
