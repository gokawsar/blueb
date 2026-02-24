import { NextRequest } from 'next/server';

/**
 * Get user ID from request cookie
 * @param request - Next.js request object
 * @returns userId number or null if not authenticated
 */
export function getUserIdFromRequest(request: NextRequest): number | null {
  try {
    const userCookie = request.cookies.get('user');
    
    if (userCookie && userCookie.value) {
      const user = JSON.parse(decodeURIComponent(userCookie.value));
      if (user && user.id) {
        return user.id;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting userId from request:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 * @param request - Next.js request object
 * @returns true if authenticated, false otherwise
 */
export function isAuthenticated(request: NextRequest): boolean {
  const userId = getUserIdFromRequest(request);
  return userId !== null;
}

/**
 * Require authentication - throws error if not authenticated
 * @param request - Next.js request object
 * @returns userId number
 * @throws Error if not authenticated
 */
export function requireAuth(request: NextRequest): number {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    throw new Error('Authentication required');
  }
  return userId;
}
