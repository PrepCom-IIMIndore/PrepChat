// Access Control & Email Security Manager
// Enforces Server-side Whitelist (Allowed List) and Blacklist (Blocked List)

export const blockedEmails = new Set<string>();
export const allowedEmails = new Set<string>([
  "prepcom@iimidr.ac.in"
]);
export let isWhitelistMode = false;

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

export function blockEmail(email: string) {
  const norm = email.toLowerCase().trim();
  if (norm) blockedEmails.add(norm);
}

export function unblockEmail(email: string) {
  const norm = email.toLowerCase().trim();
  if (norm) blockedEmails.delete(norm);
}

export function allowEmail(email: string) {
  const norm = email.toLowerCase().trim();
  if (norm) allowedEmails.add(norm);
}

export function removeAllowedEmail(email: string) {
  const norm = email.toLowerCase().trim();
  if (norm) allowedEmails.delete(norm);
}

export function setWhitelistMode(enabled: boolean) {
  isWhitelistMode = enabled;
}
