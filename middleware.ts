import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error"
  }
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - /auth/signin (Sign in page)
     * - /auth/error (Error page)
     * - /logo.png, favicon.ico (static assets)
     * - /api/auth/* (NextAuth API endpoints)
     */
    "/((?!auth/signin|auth/error|logo.png|favicon.ico|_next/static|_next/image|api/auth).*)"
  ]
};
