import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/login",
  },
})

export const config = {
  matcher: [
    // Exclude from middleware: api/auth, api/inngest, login, static assets
    "/((?!api/auth|api/inngest|login|register|_next/static|_next/image|favicon.ico).*)",
  ],
}
