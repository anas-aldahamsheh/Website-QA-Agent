import { NextRequest, NextResponse } from 'next/server';

// The dashboard includes scan, triage, and data-deletion actions. Require an
// operator credential before exposing any route in a production deployment.
export function middleware(request: NextRequest) {
  if (process.env['NODE_ENV'] !== 'production') return NextResponse.next();

  const user = process.env['APP_BASIC_AUTH_USER'];
  const password = process.env['APP_BASIC_AUTH_PASSWORD'];
  if (!user || !password) {
    return new NextResponse('Operator authentication is not configured.', { status: 503 });
  }

  const expected = `Basic ${btoa(`${user}:${password}`)}`;
  if (request.headers.get('authorization') !== expected) {
    return new NextResponse('Authentication required.', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="SiteScope QA"' }
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|icon.svg).*)']
};
