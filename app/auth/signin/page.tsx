"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = () => {
    setLoading(true);
    signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="login-overlay-screen">
      <div className="login-glass-card">
        <div className="login-header">
          <img src="/logo.png" alt="IIM Indore Logo" className="login-logo-img" />
          <h2>PrepChat Portal</h2>
          <span className="login-badge">🔒 Official IIM Indore Access Only</span>
        </div>

        <div className="google-auth-box">
          <p className="google-signin-subtitle">
            Sign in using your official IIM Indore Google Workspace account to access interview experiences & intelligence.
          </p>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="btn-google-login"
          >
            <svg className="google-svg-icon" viewBox="0 0 24 24" width="22" height="22">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>{loading ? "Redirecting to Google..." : "Sign in with Google (@iimidr.ac.in)"}</span>
          </button>

          {loading && (
            <div className="login-loading-box mt-3">
              <div className="spinner-sm"></div>
              <span>Connecting to Google OAuth 2.0...</span>
            </div>
          )}
        </div>

        <div className="login-footer">
          <p>Protected by NextAuth.js Serverless Authentication. Access restricted to verified @iimidr.ac.in accounts.</p>
        </div>
      </div>
    </div>
  );
}
