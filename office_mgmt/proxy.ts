import { auth } from "@/app/api/auth/[...nextauth]/route"
import { NextResponse } from "next/server"

export default auth((request) => {
  const { pathname } = request.nextUrl
  const isLoggedIn = !!request.auth

  // Public routes
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  // Redirect unauthenticated users to login
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Redirect logged-in users away from login
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Admin routes - check role
  if (pathname.startsWith("/admin")) {
    const role = (request.auth?.user as any)?.role
    if (!role || !['PLATFORM_ADMIN', 'ACCOUNT_ADMIN', 'ENTITY_ADMIN'].includes(role)) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
