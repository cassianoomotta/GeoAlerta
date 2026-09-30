import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withIdentity, AccessError } from './server/access/context';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If trying to access /painel without being logged in
  if (request.nextUrl.pathname.startsWith('/painel')) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      const denied=NextResponse.redirect(redirectUrl);
      response.cookies.getAll().forEach(cookie=>denied.cookies.set(cookie));
      return denied;
    }
    try { await withIdentity(user.id,async()=>true); }
    catch(error) {
      if (!(error instanceof AccessError)) return new NextResponse('Serviço temporariamente indisponível.',{status:503});
      const denied=NextResponse.redirect(new URL('/login?denied=1',request.url));
      response.cookies.getAll().forEach(cookie=>denied.cookies.set(cookie));
      return denied;
    }
  }

  // If on /login and already logged in
  if (request.nextUrl.pathname === '/login' && user && !request.nextUrl.searchParams.has('denied')) {
    try { await withIdentity(user.id,async()=>true); } catch { return response; }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/painel';
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ['/painel/:path*', '/login'],
};

