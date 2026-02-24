import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const publicRoutes = ['/login', '/register', '/api/auth', '/api/subscription'];

// API routes that need authentication
const protectedApiRoutes = [
  '/api/jobs',
  '/api/customers',
  '/api/inventory',
  '/api/topsheets',
  '/api/documents',
  '/api/settings',
  '/api/dashboard',
  '/api/admin'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for user session in cookie
  const userCookie = request.cookies.get('user');
  const user = userCookie ? JSON.parse(userCookie.value) : null;

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    // If user is already logged in and tries to access login, redirect to home
    if (user && pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // For API routes that need protection (except public ones)
  if (pathname.startsWith('/api/')) {
    const isPublicApi = publicRoutes.some(route => pathname.startsWith(route));
    
    if (!isPublicApi && !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // For page routes - protect all except login
  if (!user && pathname !== '/login') {
    // Redirect to login with return URL
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)'
  ]
};
