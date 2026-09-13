import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If the user is trying to access a protected route without a session
  if (req.nextUrl.pathname.startsWith('/painel')) {
    if (!session) {
      // Redirect to login page
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/login';
      return NextResponse.redirect(redirectUrl);
    }
  }

  // If the user is on the login page and ALREADY authenticated, send them to the painel
  if (req.nextUrl.pathname === '/login' && session) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/painel';
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ['/painel/:path*', '/login'],
};
