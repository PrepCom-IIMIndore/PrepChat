// Access Control & Email Security Manager
// Enforces Server-side Whitelist (Allowed List) and Blacklist (Blocked List)
// Supports multi-email inputs separated by spaces, commas, semicolons, or newlines

export const blockedEmails = new Set<string>();
export const allowedEmails = new Set<string>([
  "prepcom@iimidr.ac.in"
]);
export let isWhitelistMode = false;

// Helper to parse multiple emails separated by space, comma, semicolon, or newline
export function parseEmails(input: string): string[] {
  if (!input) return [];
  return input
    .split(/[\s,;\n\r]+/)
    .map(e => e.toLowerCase().trim())
    .filter(e => e.length > 3 && e.includes("@"));
}

export function checkEmailAccess(email: string): { allowed: boolean; reason?: string } {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check if Email is explicitly Blocked / Blacklisted
  if (blockedEmails.has(normalizedEmail)) {
    return {
      allowed: false,
      reason: `Account '${normalizedEmail}' has been blocked by PrepCom Admin.`
    };
  }

  // 2. If Whitelist Mode is enabled, check if Email is in Allowed List
  if (isWhitelistMode) {
    // Admin always retains access
    if (normalizedEmail === "prepcom@iimidr.ac.in" || normalizedEmail.startsWith("prepcom")) {
      return { allowed: true };
    }

    if (!allowedEmails.has(normalizedEmail)) {
      return {
        allowed: false,
        reason: `Access is restricted to authorized accounts only. '${normalizedEmail}' is not in the allowed access list.`
      };
    }
  }

  return { allowed: true };
}

export function blockEmail(input: string) {
  const emails = parseEmails(input);
  emails.forEach(e => blockedEmails.add(e));
}

export function unblockEmail(input: string) {
  const emails = parseEmails(input);
  emails.forEach(e => blockedEmails.delete(e));
}

export function allowEmail(input: string) {
  const emails = parseEmails(input);
  emails.forEach(e => allowedEmails.add(e));
}

export function removeAllowedEmail(input: string) {
  const emails = parseEmails(input);
  emails.forEach(e => allowedEmails.delete(e));
}

export function setWhitelistMode(enabled: boolean) {
  isWhitelistMode = enabled;
}
