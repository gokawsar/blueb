import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const publicRoutes = ['/login', '/register', '/api/auth', '/api/subscription', '/_next', '/favicon.ico', '/public'];

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

function getUserFromCookie(request: NextRequest): any {
  try {
    const userCookie = request.cookies.get('user');
    if (userCookie && userCookie.value) {
      return JSON.parse(userCookie.value);
    }
  } catch (e) {
    console.error('Error parsing user cookie:', e);
  }
  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') // Any file with extension
  ) {
    return NextResponse.next();
  }

  // Check for user session in cookie
  const user = getUserFromCookie(request);

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    // If user is already logged in and tries to access login or register, redirect to home
    if (user && (pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // For API routes that need protection
  if (pathname.startsWith('/api/')) {
    // Skip auth check for subscription API (public for plans display)
    if (pathname.startsWith('/api/subscription')) {
      return NextResponse.next();
    }
    
    // Skip auth check for auth API (login/register/logout)
    if (pathname.startsWith('/api/auth')) {
      return NextResponse.next();
    }
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // For page routes - protect all except login/register and public paths
  // This includes the root "/" path
  if (!user && pathname !== '/login' && pathname !== '/register') {
    // Build login URL with return URL
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is authenticated and tries to access login, redirect to home
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
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
