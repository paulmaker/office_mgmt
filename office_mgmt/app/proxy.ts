import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Lightweight middleware - checks for auth cookie without importing Prisma/auth
// This keeps the Edge Function bundle size under 1MB
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Public routes
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  // Check for NextAuth session cookie (JWT strategy)
  // NextAuth v5 uses 'authjs.session-token' cookie name
  const sessionToken = request.cookies.get('authjs.session-token') || 
                       request.cookies.get('__Secure-authjs.session-token')

  // Redirect unauthenticated users to login
  if (!sessionToken) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Redirect logged-in users away from login
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Note: Admin role check removed from middleware to reduce bundle size
  // Admin routes are protected by server actions and layout checks instead

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - files with extensions (e.g., .png, .jpg, .svg)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
