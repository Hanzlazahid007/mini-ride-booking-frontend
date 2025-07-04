import { NextResponse } from 'next/server'

export function middleware(req) {
  const token = req.cookies.get('token')?.value
  const loginUrl = new URL('/login', req.url)

  if (!token) {
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

// Apply middleware ONLY to /rider routes
export const config = {
  matcher: ['/rider','/dashboard'],  // applies to /rider and anything under it
}
