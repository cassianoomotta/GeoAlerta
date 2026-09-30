import { createServerClient } from '@supabase/ssr';
export async function fixtureCookies(name:string) {
  const cookies:{name:string;value:string}[]=[];
  const client=createServerClient('http://127.0.0.1:3101','fixture-anon-key',{cookies:{getAll:()=>cookies,setAll:values=>{for(const c of values){const old=cookies.find(x=>x.name===c.name);if(old)old.value=c.value;else cookies.push({name:c.name,value:c.value});}}}});
  const {error}=await client.auth.signInWithPassword({email:`${name}@fixture.invalid`,password:'fixture-password'});
  if(error)throw new Error('Fixture sign-in failed.');
  return cookies;
}
