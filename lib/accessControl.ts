import fs from "fs";
import path from "path";

const LOCAL_FILE = path.join(process.cwd(), "access_control.json");
const TMP_FILE = path.join("/tmp", "access_control.json");

export interface AccessControlData {
  blockedEmails: string[];
  allowedEmails: string[];
  isWhitelistMode: boolean;
}

function loadAccessControlData(): AccessControlData {
  // 1. Try reading from /tmp (Vercel writable directory during serverless execution)
  try {
    if (fs.existsSync(TMP_FILE)) {
      const data = fs.readFileSync(TMP_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed && Array.isArray(parsed.blockedEmails)) return parsed;
    }
  } catch (e) {}

  // 2. Fallback to reading project root file
  try {
    if (fs.existsSync(LOCAL_FILE)) {
      const data = fs.readFileSync(LOCAL_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed && Array.isArray(parsed.blockedEmails)) return parsed;
    }
  } catch (e) {}

  return {
    blockedEmails: [],
    allowedEmails: ["prepcom@iimidr.ac.in"],
    isWhitelistMode: false
  };
}

function saveAccessControlData(data: AccessControlData) {
  const jsonStr = JSON.stringify(data, null, 2);

  // Write to /tmp (Vercel serverless runtime writable directory)
  try {
    fs.writeFileSync(TMP_FILE, jsonStr, "utf-8");
  } catch (e) {}

  // Also write to local project directory for local dev
  try {
    fs.writeFileSync(LOCAL_FILE, jsonStr, "utf-8");
  } catch (e) {}
}

export function getAccessControlState(): AccessControlData {
  return loadAccessControlData();
}

export function parseEmails(input: string): string[] {
  if (!input) return [];
  return input
    .split(/[\s,;\n\r]+/)
    .map(e => e.toLowerCase().trim())
    .filter(e => e.length > 3 && e.includes("@"));
}

export function checkEmailAccess(email: string): { allowed: boolean; reason?: string } {
  const normalizedEmail = email.toLowerCase().trim();
  const state = loadAccessControlData();

  const blockedSet = new Set((state.blockedEmails || []).map(e => e.toLowerCase()));
  const allowedSet = new Set((state.allowedEmails || []).map(e => e.toLowerCase()));

  // 1. Check if Email is explicitly Blocked
  if (blockedSet.has(normalizedEmail)) {
    return {
      allowed: false,
      reason: `Account '${normalizedEmail}' has been blocked by PrepCom Admin.`
    };
  }

  // 2. Check Whitelist Mode
  if (state.isWhitelistMode) {
    if (normalizedEmail === "prepcom@iimidr.ac.in" || normalizedEmail.startsWith("prepcom")) {
      return { allowed: true };
    }

    if (!allowedSet.has(normalizedEmail)) {
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
  const state = loadAccessControlData();
  const blockedSet = new Set((state.blockedEmails || []).map(e => e.toLowerCase()));
  emails.forEach(e => blockedSet.add(e));
  state.blockedEmails = Array.from(blockedSet);
  saveAccessControlData(state);
}

export function unblockEmail(input: string) {
  const emails = parseEmails(input);
  const state = loadAccessControlData();
  const blockedSet = new Set((state.blockedEmails || []).map(e => e.toLowerCase()));
  emails.forEach(e => blockedSet.delete(e));
  state.blockedEmails = Array.from(blockedSet);
  saveAccessControlData(state);
}

export function allowEmail(input: string) {
  const emails = parseEmails(input);
  const state = loadAccessControlData();
  const allowedSet = new Set((state.allowedEmails || []).map(e => e.toLowerCase()));
  emails.forEach(e => allowedSet.add(e));
  state.allowedEmails = Array.from(allowedSet);
  saveAccessControlData(state);
}

export function removeAllowedEmail(input: string) {
  const emails = parseEmails(input);
  const state = loadAccessControlData();
  const allowedSet = new Set((state.allowedEmails || []).map(e => e.toLowerCase()));
  emails.forEach(e => allowedSet.delete(e));
  state.allowedEmails = Array.from(allowedSet);
  saveAccessControlData(state);
}

export function setWhitelistMode(enabled: boolean) {
  const state = loadAccessControlData();
  state.isWhitelistMode = enabled;
  saveAccessControlData(state);
}
