import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"

export default auth((request) => {
  const { pathname } = request.nextUrl
  const isLoggedIn = !!request.auth

  // Public routes
  const publicRoutes = ['/login', '/api/auth']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // If not logged in and trying to access protected route
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // If logged in and trying to access login, redirect to dashboard
  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Admin routes - check role
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    const role = (request.auth?.user as any)?.role
    // Only Platform Admins, Account Admins, and Entity Admins can access admin
    if (!role || !['PLATFORM_ADMIN', 'ACCOUNT_ADMIN', 'ENTITY_ADMIN'].includes(role)) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
