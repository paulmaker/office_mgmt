import { auth } from "@/app/api/auth/[...nextauth]/route"
import { NextResponse } from "next/server"

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

  // Protect dashboard routes - only basic auth check here
  // Module access checks are handled in the layout to keep middleware lightweight
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/settings') || 
      pathname.startsWith('/clients') || pathname.startsWith('/subcontractors') || pathname.startsWith('/employees') ||
      pathname.startsWith('/suppliers') || pathname.startsWith('/jobs') || pathname.startsWith('/job-prices') ||
      pathname.startsWith('/invoices') || pathname.startsWith('/timesheets') || pathname.startsWith('/payroll') ||
      pathname.startsWith('/banking') || pathname.startsWith('/reports') || pathname.startsWith('/assets') ||
      pathname.startsWith('/quick-links')) {
    if (!session) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
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
