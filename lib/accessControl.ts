import fs from "fs";
import path from "path";

const LOCAL_FILE = path.join(process.cwd(), "access_control.json");
const TMP_FILE = path.join("/tmp", "access_control.json");

export interface AccessControlData {
  blockedEmails: string[];
  allowedEmails: string[];
  isWhitelistMode: boolean;
}

// In-Memory fallback cache for serverless invocation lifecycle
let memoryCache: AccessControlData | null = null;

async function fetchFromCloudKV(): Promise<AccessControlData | null> {
  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!kvUrl || !kvToken) return null;

  try {
    const res = await fetch(`${kvUrl}/get/access_control`, {
      headers: { Authorization: `Bearer ${kvToken}` },
      cache: "no-store"
    });
    if (res.ok) {
      const json = await res.json();
      if (json.result) {
        const parsed = typeof json.result === "string" ? JSON.parse(json.result) : json.result;
        return parsed;
      }
    }
  } catch (e) {}
  return null;
}

async function saveToCloudKV(data: AccessControlData): Promise<boolean> {
  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!kvUrl || !kvToken) return false;

  try {
    const res = await fetch(`${kvUrl}/set/access_control`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kvToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(JSON.stringify(data))
    });
    return res.ok;
  } catch (e) {}
  return false;
}

function loadAccessControlDataFromFile(): AccessControlData {
  if (memoryCache) return memoryCache;

  // 1. Try reading from /tmp (Vercel writable directory during serverless execution)
  try {
    if (fs.existsSync(TMP_FILE)) {
      const data = fs.readFileSync(TMP_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed && Array.isArray(parsed.blockedEmails)) {
        memoryCache = parsed;
        return parsed;
      }
    }
  } catch (e) {}

  // 2. Fallback to reading project root file
  try {
    if (fs.existsSync(LOCAL_FILE)) {
      const data = fs.readFileSync(LOCAL_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed && Array.isArray(parsed.blockedEmails)) {
        memoryCache = parsed;
        return parsed;
      }
    }
  } catch (e) {}

  const defaultData: AccessControlData = {
    blockedEmails: [],
    allowedEmails: ["prepcom@iimidr.ac.in"],
    isWhitelistMode: false
  };
  memoryCache = defaultData;
  return defaultData;
}

function saveAccessControlDataToFile(data: AccessControlData) {
  memoryCache = data;
  const jsonStr = JSON.stringify(data, null, 2);

  try {
    fs.writeFileSync(TMP_FILE, jsonStr, "utf-8");
  } catch (e) {}

  try {
    fs.writeFileSync(LOCAL_FILE, jsonStr, "utf-8");
  } catch (e) {}
}

export async function getAccessControlStateAsync(): Promise<AccessControlData> {
  const cloudData = await fetchFromCloudKV();
  if (cloudData) {
    memoryCache = cloudData;
    return cloudData;
  }
  return loadAccessControlDataFromFile();
}

export function getAccessControlState(): AccessControlData {
  return memoryCache || loadAccessControlDataFromFile();
}

export function parseEmails(input: string): string[] {
  if (!input) return [];
  return input
    .split(/[\s,;\n\r]+/)
    .map(e => e.toLowerCase().trim())
    .filter(e => e.length > 3 && e.includes("@"));
}

export async function checkEmailAccessAsync(email: string): Promise<{ allowed: boolean; reason?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const state = await getAccessControlStateAsync();

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

export function checkEmailAccess(email: string): { allowed: boolean; reason?: string } {
  const normalizedEmail = email.toLowerCase().trim();
  const state = getAccessControlState();

  const blockedSet = new Set((state.blockedEmails || []).map(e => e.toLowerCase()));
  const allowedSet = new Set((state.allowedEmails || []).map(e => e.toLowerCase()));

  if (blockedSet.has(normalizedEmail)) {
    return {
      allowed: false,
      reason: `Account '${normalizedEmail}' has been blocked by PrepCom Admin.`
    };
  }

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

export async function blockEmail(input: string) {
  const emails = parseEmails(input);
  const state = await getAccessControlStateAsync();
  const blockedSet = new Set((state.blockedEmails || []).map(e => e.toLowerCase()));
  emails.forEach(e => blockedSet.add(e));
  state.blockedEmails = Array.from(blockedSet);
  saveAccessControlDataToFile(state);
  await saveToCloudKV(state);
}

export async function unblockEmail(input: string) {
  const emails = parseEmails(input);
  const state = await getAccessControlStateAsync();
  const blockedSet = new Set((state.blockedEmails || []).map(e => e.toLowerCase()));
  emails.forEach(e => blockedSet.delete(e));
  state.blockedEmails = Array.from(blockedSet);
  saveAccessControlDataToFile(state);
  await saveToCloudKV(state);
}

export async function allowEmail(input: string) {
  const emails = parseEmails(input);
  const state = await getAccessControlStateAsync();
  const allowedSet = new Set((state.allowedEmails || []).map(e => e.toLowerCase()));
  emails.forEach(e => allowedSet.add(e));
  state.allowedEmails = Array.from(allowedSet);
  saveAccessControlDataToFile(state);
  await saveToCloudKV(state);
}

export async function removeAllowedEmail(input: string) {
  const emails = parseEmails(input);
  const state = await getAccessControlStateAsync();
  const allowedSet = new Set((state.allowedEmails || []).map(e => e.toLowerCase()));
  emails.forEach(e => allowedSet.delete(e));
  state.allowedEmails = Array.from(allowedSet);
  saveAccessControlDataToFile(state);
  await saveToCloudKV(state);
}

export async function setWhitelistMode(enabled: boolean) {
  const state = await getAccessControlStateAsync();
  state.isWhitelistMode = enabled;
  saveAccessControlDataToFile(state);
  await saveToCloudKV(state);
}
