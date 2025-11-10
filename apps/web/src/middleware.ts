import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Public routes that don't require authentication
 */
const publicRoutes = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

/**
 * Auth routes that redirect to dashboard if already authenticated
 */
const authRoutes = ['/login', '/register'];

/**
 * Protected routes that require authentication
 */
const protectedRoutes = [
  '/dashboard',
  '/settings',
  '/users',
  '/teams',
  '/billing',
];

/**
 * Check if a path matches any of the given routes
 */
function isRouteMatch(pathname: string, routes: string[]): boolean {
  return routes.some(route => pathname.startsWith(route));
}

/**
 * Get token from request cookies
 */
function getTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get('accessToken')?.value || null;
}

/**
 * Next.js middleware for authentication and route protection
 * Note: i18n routing is temporarily disabled until we restructure app with [locale] folder
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = getTokenFromRequest(request);

  // Handle root route - allow it to pass through
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Check if route is public
  if (isRouteMatch(pathname, publicRoutes)) {
    // If user is authenticated and trying to access auth routes, redirect to dashboard
    if (token && isRouteMatch(pathname, authRoutes)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Check if route is protected
  if (isRouteMatch(pathname, protectedRoutes)) {
    // If no token, redirect to login
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
