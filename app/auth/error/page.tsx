"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const reason = searchParams.get("reason");

  return (
    <div className="login-glass-card">
      <div className="login-header">
        <img src="/logo.png" alt="IIM Indore Logo" className="login-logo-img" />
        <h2>Access Restricted</h2>
        <span className="login-badge" style={{ background: "#fee2e2", color: "#dc2626", borderColor: "#fca5a5" }}>
          ⛔ Access Control Restriction
        </span>
      </div>

      <div className="login-error-banner" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="material-symbols-outlined" style={{ color: "#dc2626" }}>block</span>
          <strong>{reason || "Access restricted to authorized IIM Indore accounts (@iimidr.ac.in)"}</strong>
        </div>
        <p style={{ margin: 0, fontSize: "0.82rem", lineHeight: 1.5 }}>
          {email ? (
            <>
              The account <strong>{email}</strong> has been restricted or blocked from accessing PrepChat by PrepCom Admin.
            </>
          ) : (
            <>
              Only authorized <strong>@iimidr.ac.in</strong> Google Workspace accounts are permitted to access PrepChat. No session token was issued.
            </>
          )}
        </p>
      </div>

      <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
        <Link href="/auth/signin" className="btn-login-submit" style={{ textDecoration: "none", display: "inline-flex" }}>
          <span>Try Again with Authorized Google Account</span>
        </Link>
      </div>

      <div className="login-footer">
        <p>Enforced server-side in NextAuth.js signIn callback before session creation.</p>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="login-overlay-screen">
      <Suspense fallback={
        <div className="login-glass-card">
          <div className="login-loading-box">
            <div className="spinner-sm"></div>
            <span>Loading...</span>
          </div>
        </div>
      }>
        <AuthErrorContent />
      </Suspense>
    </div>
  );
}
