import { auth } from "@/app/api/auth/[...nextauth]/route"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { ROUTE_TO_MODULE, type ModuleKey } from "@/lib/module-access"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Allow public routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/' ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/settings')) {
    if (!session) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Check module access for specific routes
  if (session?.user) {
    const enabledModules = (session.user as any)?.enabledModules || []
    const module = ROUTE_TO_MODULE[pathname]

    // If this route requires a module and the module is not enabled, redirect
    if (module && !enabledModules.includes(module)) {
      // Redirect to dashboard with a message
      const dashboardUrl = new URL('/dashboard', req.url)
      dashboardUrl.searchParams.set('error', 'module_disabled')
      return NextResponse.redirect(dashboardUrl)
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
