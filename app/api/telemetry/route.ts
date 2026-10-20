import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";
import os from "os";
import {
  getAccessControlStateAsync,
  blockEmail,
  unblockEmail,
  allowEmail,
  removeAllowedEmail,
  setWhitelistMode,
  parseEmails
} from "@/lib/accessControl";

const LOCAL_USER_FILE = path.join(process.cwd(), "user_activity.json");
const TMP_USER_FILE = path.join(os.tmpdir(), "prepchat_user_activity.json");

export interface TelemetryUser {
  email: string;
  role: string;
  session_start: string;
  last_active: string;
  total_time_seconds: number;
  login_count: number;
  activity_count: number;
  page_views?: number;
  status: string;
  companies_visited?: string[];
  company_visit_count?: number;
  daily_stats?: {
    [dateStr: string]: {
      time_seconds?: number;
      actions?: number;
      page_views?: number;
      companies?: string[];
    };
  };
}

let telemetryCache: { [email: string]: TelemetryUser } | null = null;

async function fetchTelemetryFromCloudKV(): Promise<{ [email: string]: TelemetryUser } | null> {
  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!kvUrl || !kvToken) return null;

  try {
    const res = await fetch(`${kvUrl}/get/user_activity`, {
      headers: { Authorization: `Bearer ${kvToken}` },
      cache: "no-store"
    });
    if (res.ok) {
      const json = await res.json();
      if (json.result) {
        let parsed = json.result;
        // Upstash values can be double-serialized strings, so parse recursively until we get an object
        while (typeof parsed === "string") {
          parsed = JSON.parse(parsed);
        }
        return parsed;
      }
    }
  } catch (e) {}
  return null;
}

async function saveTelemetryToCloudKV(db: { [email: string]: TelemetryUser }): Promise<boolean> {
  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!kvUrl || !kvToken) return false;

  try {
    const res = await fetch(`${kvUrl}/set/user_activity`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kvToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(JSON.stringify(db))
    });
    return res.ok;
  } catch (e) {}
  return false;
}

function loadTelemetryDbFromFile(): { [email: string]: TelemetryUser } {
  if (telemetryCache) return telemetryCache;

  const merged: { [email: string]: TelemetryUser } = {};

  try {
    if (fs.existsSync(LOCAL_USER_FILE)) {
      const data = fs.readFileSync(LOCAL_USER_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        Object.assign(merged, parsed);
      }
    }
  } catch (e) {}

  try {
    if (fs.existsSync(TMP_USER_FILE)) {
      const data = fs.readFileSync(TMP_USER_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        Object.keys(parsed).forEach(email => {
          if (!merged[email]) {
            merged[email] = parsed[email];
          } else {
            const existing = merged[email];
            const incoming = parsed[email];
            merged[email] = {
              ...existing,
              ...incoming,
              total_time_seconds: Math.max(existing.total_time_seconds || 0, incoming.total_time_seconds || 0),
              activity_count: Math.max(existing.activity_count || 0, incoming.activity_count || 0),
              login_count: Math.max(existing.login_count || 0, incoming.login_count || 0),
              daily_stats: { ...(existing.daily_stats || {}), ...(incoming.daily_stats || {}) }
            };
          }
        });
      }
    }
  } catch (e) {}

  telemetryCache = merged;
  return merged;
}

function saveTelemetryDbToFile(db: { [email: string]: TelemetryUser }) {
  telemetryCache = db;
  const jsonStr = JSON.stringify(db, null, 2);

  try {
    fs.writeFileSync(TMP_USER_FILE, jsonStr, "utf-8");
  } catch (e) {}

  try {
    fs.writeFileSync(LOCAL_USER_FILE, jsonStr, "utf-8");
  } catch (e) {}
}

async function getTelemetryDbAsync(): Promise<{ [email: string]: TelemetryUser }> {
  const cloudData = await fetchTelemetryFromCloudKV();
  const fileData = loadTelemetryDbFromFile();

  if (cloudData && typeof cloudData === "object" && !Array.isArray(cloudData)) {
    const merged = { ...fileData, ...cloudData };
    telemetryCache = merged;
    return merged;
  }
  return fileData;
}

async function persistTelemetryDb(db: { [email: string]: TelemetryUser }) {
  saveTelemetryDbToFile(db);
  await saveTelemetryToCloudKV(db);
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized - Login Required" }, { status: 401 });
  }

  const email = session.user.email.toLowerCase().trim();
  const role = (session.user as any)?.role || "user";

  if (role !== "admin" && !email.startsWith("prepcom")) {
    return NextResponse.json({ error: "Access Denied: Telemetry monitoring is restricted exclusively to prepcom@iimidr.ac.in" }, { status: 403 });
  }

  const telemetryDb = await getTelemetryDbAsync();
  const accessControlState = await getAccessControlStateAsync();

  // Aggregate unique active users per day across all recorded activity
  const dailyActiveUsersMap: { [dateStr: string]: Set<string> } = {};

  Object.values(telemetryDb).forEach(u => {
    if (u.daily_stats && typeof u.daily_stats === "object") {
      Object.keys(u.daily_stats).forEach(dateStr => {
        if (!dailyActiveUsersMap[dateStr]) {
          dailyActiveUsersMap[dateStr] = new Set();
        }
        dailyActiveUsersMap[dateStr].add(u.email);
      });
    } else if (u.last_active) {
      // Fallback: extract date from last_active timestamp
      const match = u.last_active.match(/\d{4}-\d{2}-\d{2}/);
      if (match) {
        const d = match[0];
        if (!dailyActiveUsersMap[d]) dailyActiveUsersMap[d] = new Set();
        dailyActiveUsersMap[d].add(u.email);
      }
    }
  });

  const dates = Object.keys(dailyActiveUsersMap).sort();
  const totalDays = Math.max(dates.length, 1);
  const totalDailyUsers = dates.reduce((acc, d) => acc + dailyActiveUsersMap[d].size, 0);
  const avgUsersPerDay = dates.length > 0 ? (totalDailyUsers / totalDays).toFixed(1) : "0.0";

  const recentDailyBreakdown = dates.slice(-7).map(dateStr => {
    let label = dateStr;
    try {
      label = new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch (e) {}
    return {
      date: dateStr,
      label,
      active_users: dailyActiveUsersMap[dateStr].size
    };
  });

  return NextResponse.json({
    averageUsersPerDay: avgUsersPerDay,
    totalDaysRecorded: dates.length,
    recentDailyBreakdown,
    summary: {
      average_users_per_day: avgUsersPerDay,
      total_days_recorded: dates.length
    },
    accessControl: {
      blockedEmails: accessControlState.blockedEmails || [],
      allowedEmails: accessControlState.allowedEmails || [],
      isWhitelistMode: accessControlState.isWhitelistMode === true
    }
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email.toLowerCase().trim();
  const role = (session.user as any)?.role || "user";
  const todayKey = new Date().toISOString().split("T")[0];

  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || "login";

    const telemetryDb = await getTelemetryDbAsync();

    // ADMIN MANAGEMENT ACTIONS (RESTRICTED TO prepcom@iimidr.ac.in)
    if (role === "admin" || email.startsWith("prepcom")) {
      if (action === "delete_user" && body.targetEmail) {
        const target = body.targetEmail.toLowerCase().trim();
        if (telemetryDb[target]) {
          delete telemetryDb[target];
          await persistTelemetryDb(telemetryDb);
          return NextResponse.json({ success: true, message: `Removed telemetry record for ${target}` });
        }
        return NextResponse.json({ success: false, message: "Target user not found" });
      }

      if (action === "block_email" && body.targetEmail) {
        const parsed = parseEmails(body.targetEmail);
        await blockEmail(body.targetEmail);
        parsed.forEach(e => {
          if (telemetryDb[e]) telemetryDb[e].status = "Blocked";
        });
        await persistTelemetryDb(telemetryDb);
        return NextResponse.json({ success: true, message: `Blocked ${parsed.length} email(s): ${parsed.join(", ")}` });
      }

      if (action === "unblock_email" && body.targetEmail) {
        const parsed = parseEmails(body.targetEmail);
        await unblockEmail(body.targetEmail);
        parsed.forEach(e => {
          if (telemetryDb[e]) telemetryDb[e].status = "Active";
        });
        await persistTelemetryDb(telemetryDb);
        return NextResponse.json({ success: true, message: `Unblocked ${parsed.length} email(s)` });
      }

      if (action === "allow_email" && body.targetEmail) {
        const parsed = parseEmails(body.targetEmail);
        await allowEmail(body.targetEmail);
        return NextResponse.json({ success: true, message: `Added ${parsed.length} email(s) to allowed list` });
      }

      if (action === "remove_allowed_email" && body.targetEmail) {
        const parsed = parseEmails(body.targetEmail);
        await removeAllowedEmail(body.targetEmail);
        return NextResponse.json({ success: true, message: `Removed ${parsed.length} email(s) from allowed list` });
      }

      if (action === "toggle_whitelist") {
        await setWhitelistMode(body.enabled === true);
        return NextResponse.json({ success: true, isWhitelistMode: body.enabled === true });
      }
    }

    // DISCARD HEAVY TELEMETRY (heartbeats, browsing, company visits, page views)
    if (action === "heartbeat" || action === "page_view" || action === "company_visit") {
      return NextResponse.json({ success: true, tracking: "disabled" });
    }

    // ONLY RECORD MINIMAL DAILY ACTIVE USER FOR "average users per day" METRIC
    if (action === "login" || action === "visit") {
      const user: TelemetryUser = telemetryDb[email] || {
        email: email,
        role: role,
        session_start: todayKey,
        last_active: todayKey,
        total_time_seconds: 0,
        login_count: 0,
        activity_count: 0,
        status: "Active",
        companies_visited: [],
        company_visit_count: 0,
        daily_stats: {}
      };

      if (!user.daily_stats) user.daily_stats = {};

      // If user was not already logged today, record today's active presence once
      if (!user.daily_stats[todayKey]) {
        user.daily_stats[todayKey] = { actions: 1 };
        user.login_count = (user.login_count || 0) + 1;
        user.last_active = todayKey;
        telemetryDb[email] = user;
        await persistTelemetryDb(telemetryDb);
      }

      return NextResponse.json({ success: true, tracking: "minimal_daily" });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to record telemetry action" }, { status: 500 });
  }
}
