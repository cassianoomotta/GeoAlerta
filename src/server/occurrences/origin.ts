import { isIP } from 'node:net';
import { createHash } from 'node:crypto';
// VERCEL is a server environment fact, never a request header.
export function resolveOrigin(headers:Headers,env:Record<string,string|undefined>=process.env):string {
  if(env.VERCEL!=='1') throw new Error('Trusted Vercel ingress is required.');
  const value=headers.get('x-vercel-forwarded-for')?.trim();
  if(!value || !isIP(value)) throw new Error('Trusted ingress address unavailable.');
  // Normalize equivalent IPv6 representations and IPv4-mapped IPv6.
  const normalized=value.toLowerCase().startsWith('::ffff:') && isIP(value.slice(7))===4?value.slice(7):isIP(value)===6?new URL(`http://[${value}]/`).hostname:value;
  return createHash('sha256').update(normalized).digest('hex');
}
