import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";
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
const TMP_USER_FILE = path.join("/tmp", "user_activity.json");

export interface TelemetryUser {
  email: string;
  role: string;
  session_start: string;
  last_active: string;
  total_time_seconds: number;
  login_count: number;
  activity_count: number;
  status: string;
  companies_visited?: string[];
  company_visit_count?: number;
  daily_stats?: {
    [dateStr: string]: {
      time_seconds: number;
      actions: number;
      companies: string[];
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
        const parsed = typeof json.result === "string" ? JSON.parse(json.result) : json.result;
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

  try {
    if (fs.existsSync(TMP_USER_FILE)) {
      const data = fs.readFileSync(TMP_USER_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === "object") {
        telemetryCache = parsed;
        return parsed;
      }
    }
  } catch (e) {}

  try {
    if (fs.existsSync(LOCAL_USER_FILE)) {
      const data = fs.readFileSync(LOCAL_USER_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === "object") {
        telemetryCache = parsed;
        return parsed;
      }
    }
  } catch (e) {}

  telemetryCache = {};
  return {};
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
  if (cloudData) {
    telemetryCache = cloudData;
    return cloudData;
  }
  return loadTelemetryDbFromFile();
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
  const blockedSet = new Set((accessControlState.blockedEmails || []).map(e => e.toLowerCase()));

  const userList = Object.values(telemetryDb);
  userList.sort((a, b) => (b.last_active || "").localeCompare(a.last_active || ""));

  const totalUsers = userList.length;
  const totalLogins = userList.reduce((acc, u) => acc + (u.login_count || 0), 0);
  const totalActions = userList.reduce((acc, u) => acc + (u.activity_count || 0), 0);
  const totalTimeSeconds = userList.reduce((acc, u) => acc + (u.total_time_seconds || 0), 0);

  const avgTimeSecondsPerUser = totalUsers > 0 ? Math.round(totalTimeSeconds / totalUsers) : 0;
  const avgTimeMinutesPerUser = (avgTimeSecondsPerUser / 60).toFixed(1);

  const allCompaniesVisitedSet = new Set<string>();
  userList.forEach(u => {
    (u.companies_visited || []).forEach(c => allCompaniesVisitedSet.add(c));
  });

  const avgCompaniesPerUser = totalUsers > 0 ? (Array.from(allCompaniesVisitedSet).length / totalUsers).toFixed(1) : "0.0";

  const dailyMap: { [date: string]: { users: Set<string>; total_time_sec: number; companies: Set<string> } } = {};
  
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split("T")[0];
    dailyMap[dateKey] = { users: new Set(), total_time_sec: 0, companies: new Set() };
  }

  userList.forEach(u => {
    if (u.daily_stats) {
      Object.keys(u.daily_stats).forEach(dateKey => {
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = { users: new Set(), total_time_sec: 0, companies: new Set() };
        }
        const ds = u.daily_stats![dateKey];
        dailyMap[dateKey].users.add(u.email);
        dailyMap[dateKey].total_time_sec += ds.time_seconds || 0;
        (ds.companies || []).forEach(c => dailyMap[dateKey].companies.add(c));
      });
    } else {
      const dateKey = new Date().toISOString().split("T")[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { users: new Set(), total_time_sec: 0, companies: new Set() };
      }
      dailyMap[dateKey].users.add(u.email);
      dailyMap[dateKey].total_time_sec += u.total_time_seconds || 0;
      (u.companies_visited || []).forEach(c => dailyMap[dateKey].companies.add(c));
    }
  });

  const dailyAnalytics = Object.keys(dailyMap).sort().map(dateKey => {
    const data = dailyMap[dateKey];
    const userCount = data.users.size;
    const avgTimeMins = userCount > 0 ? (data.total_time_sec / 60 / userCount).toFixed(1) : "0.0";
    const avgCompanies = userCount > 0 ? (data.companies.size / userCount).toFixed(1) : "0.0";
    const label = new Date(dateKey).toLocaleDateString("en-US", { month: "short", day: "numeric" });

    return {
      date: dateKey,
      label,
      active_users: userCount,
      avg_user_time_mins: parseFloat(avgTimeMins),
      avg_companies_visited: parseFloat(avgCompanies),
      total_companies_visited: data.companies.size
    };
  });

  const formattedUserList = userList.map(u => {
    const mins = Math.max(1, Math.round((u.total_time_seconds || 0) / 60));
    const compVisited = u.companies_visited || [];
    return {
      ...u,
      is_blocked: blockedSet.has(u.email.toLowerCase()),
      duration_display: `${mins} min${mins === 1 ? "" : "s"}`,
      avg_time_display: `${mins} mins`,
      companies_visited_count: compVisited.length,
      companies_visited_list: compVisited.slice(0, 5).join(", ") + (compVisited.length > 5 ? ` +${compVisited.length - 5} more` : "")
    };
  });

  return NextResponse.json({
    summary: {
      total_registered_users: totalUsers,
      total_logins: totalLogins,
      total_actions: totalActions,
      total_time_hours: (totalTimeSeconds / 3600).toFixed(2),
      avg_time_seconds_per_user: avgTimeSecondsPerUser,
      avg_time_minutes_per_user: avgTimeMinutesPerUser,
      avg_time_display: `${avgTimeMinutesPerUser} mins / day`,
      avg_companies_per_user: avgCompaniesPerUser,
      total_unique_companies_explored: Array.from(allCompaniesVisitedSet).length
    },
    dailyAnalytics,
    accessControl: {
      blockedEmails: accessControlState.blockedEmails || [],
      allowedEmails: accessControlState.allowedEmails || [],
      isWhitelistMode: accessControlState.isWhitelistMode === true
    },
    users: formattedUserList
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email.toLowerCase().trim();
  const role = (session.user as any)?.role || "user";
  const nowStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const todayKey = new Date().toISOString().split("T")[0];

  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || "heartbeat";

    const telemetryDb = await getTelemetryDbAsync();
    const accessControlState = await getAccessControlStateAsync();
    const blockedSet = new Set((accessControlState.blockedEmails || []).map(e => e.toLowerCase()));

    // ADMIN MANAGEMENT ACTIONS (RESTRICTED TO prepcom@iimidr.ac.in)
    if (role === "admin" || email.startsWith("prepcom")) {
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

    // REGULAR USER HEARTBEAT / COMPANY VISIT TRACKING
    if (!telemetryDb[email]) {
      telemetryDb[email] = {
        email: email,
        role: role,
        session_start: nowStr,
        last_active: nowStr,
        total_time_seconds: 15,
        login_count: 1,
        activity_count: 1,
        status: blockedSet.has(email) ? "Blocked" : "Active",
        companies_visited: [],
        company_visit_count: 0,
        daily_stats: {
          [todayKey]: { time_seconds: 15, actions: 1, companies: [] }
        }
      };
    }

    const u = telemetryDb[email];
    u.last_active = nowStr;
    u.activity_count = (u.activity_count || 0) + 1;

    if (!u.daily_stats) u.daily_stats = {};
    if (!u.daily_stats[todayKey]) {
      u.daily_stats[todayKey] = { time_seconds: 0, actions: 0, companies: [] };
    }
    const dayStat = u.daily_stats[todayKey];
    dayStat.actions += 1;

    if (action === "heartbeat") {
      u.total_time_seconds = (u.total_time_seconds || 0) + 15;
      dayStat.time_seconds += 15;
    } else if (action === "login") {
      u.login_count = (u.login_count || 0) + 1;
      u.session_start = nowStr;
    } else if (action === "company_visit" && body.company) {
      const compName = body.company.trim();
      if (!u.companies_visited) u.companies_visited = [];
      if (!u.companies_visited.includes(compName)) {
        u.companies_visited.push(compName);
      }
      u.company_visit_count = (u.company_visit_count || 0) + 1;

      if (!dayStat.companies) dayStat.companies = [];
      if (!dayStat.companies.includes(compName)) {
        dayStat.companies.push(compName);
      }
    }

    await persistTelemetryDb(telemetryDb);
    return NextResponse.json({ success: true, user: telemetryDb[email] });
  } catch (e) {
    return NextResponse.json({ error: "Failed to record telemetry action" }, { status: 500 });
  }
}
