import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const HOSTED_DOMAIN = process.env.HOSTED_DOMAIN || "iimidr.ac.in";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          hd: HOSTED_DOMAIN,
          prompt: "select_account"
        }
      }
    })
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error"
  },
  callbacks: {
    // CRITICAL SERVER-SIDE SECURITY CHECK
    // Rejects non-@iimidr.ac.in accounts BEFORE a session is ever created
    async signIn({ profile }) {
      if (!profile || !profile.email) {
        return false;
      }
      
      const email = profile.email.toLowerCase().trim();
      const isDomainValid = email.endsWith(`@${HOSTED_DOMAIN}`);
      const isEmailVerified = (profile as any).email_verified === true;

      if (!isDomainValid || !isEmailVerified) {
        // Return error page redirect before creating session
        return `/auth/error?error=AccessRestricted&email=${encodeURIComponent(email)}`;
      }

      return true;
    },
    async jwt({ token, profile }) {
      if (profile && profile.email) {
        const email = profile.email.toLowerCase().trim();
        token.email = email;
        token.role = (email.startsWith("admin") || email.includes("placecom") || email.includes("prepcom")) ? "admin" : "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role || "user";
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET || "prepchat_nextauth_jwt_secret_key_32_bytes_min"
};
