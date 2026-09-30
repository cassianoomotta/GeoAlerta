import {test,expect} from '@playwright/test';
import {resolveOrigin} from '../../src/server/occurrences/origin';
test('RNF-002 origem só vem do header Vercel em processo Vercel',()=>{
  const headers=new Headers({'x-vercel-forwarded-for':'192.0.2.1','x-forwarded-for':'forged','x-real-ip':'forged'});
  expect(()=>resolveOrigin(headers,{})).toThrow();
  expect(resolveOrigin(headers,{VERCEL:'1'})).toMatch(/^[a-f0-9]{64}$/);
  expect(resolveOrigin(headers,{VERCEL:'1'})).toBe(resolveOrigin(new Headers({'x-vercel-forwarded-for':'192.0.2.1'}),{VERCEL:'1'}));
  for(const value of ['', 'invalid', '192.0.2.1,192.0.2.2'])expect(()=>resolveOrigin(new Headers({'x-vercel-forwarded-for':value}),{VERCEL:'1'})).toThrow();
  expect(()=>resolveOrigin(new Headers({'x-forwarded-for':'192.0.2.1'}),{VERCEL:'1'})).toThrow();
});
test('RNF-002 representações equivalentes de IP não criam nova origem',()=>{
  const hash=(ip:string)=>resolveOrigin(new Headers({'x-vercel-forwarded-for':ip}),{VERCEL:'1'});
  expect(hash('::ffff:192.0.2.1')).toBe(hash('192.0.2.1'));
  expect(hash('2001:db8::1')).toBe(hash('2001:0db8:0:0:0:0:0:1'));
});
