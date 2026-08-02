import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";
import {
  getAccessControlState,
  blockEmail,
  unblockEmail,
  allowEmail,
  removeAllowedEmail,
  setWhitelistMode,
  parseEmails
} from "@/lib/accessControl";

const LOCAL_USER_FILE = path.join(process.cwd(), "user_activity.json");
const TMP_USER_FILE = path.join("/tmp", "user_activity.json");

interface TelemetryUser {
  email: string;
  role: string;
  session_start: string;
  last_active: string;
  total_time_seconds: number;
  login_count: number;
  activity_count: number;
  status: string;
}

function loadTelemetryDb(): { [email: string]: TelemetryUser } {
  // 1. Read from /tmp (Vercel writable directory during serverless execution)
  try {
    if (fs.existsSync(TMP_USER_FILE)) {
      const data = fs.readFileSync(TMP_USER_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch (e) {}

  // 2. Read from root directory
  try {
    if (fs.existsSync(LOCAL_USER_FILE)) {
      const data = fs.readFileSync(LOCAL_USER_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch (e) {}

  return {};
}

function saveTelemetryDb(db: { [email: string]: TelemetryUser }) {
  const jsonStr = JSON.stringify(db, null, 2);

  try {
    fs.writeFileSync(TMP_USER_FILE, jsonStr, "utf-8");
  } catch (e) {}

  try {
    fs.writeFileSync(LOCAL_USER_FILE, jsonStr, "utf-8");
  } catch (e) {}
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

  const telemetryDb = loadTelemetryDb();
  const accessControlState = getAccessControlState();
  const blockedSet = new Set((accessControlState.blockedEmails || []).map(e => e.toLowerCase()));

  const userList = Object.values(telemetryDb);
  userList.sort((a, b) => (b.last_active || "").localeCompare(a.last_active || ""));

  const totalUsers = userList.length;
  const totalLogins = userList.reduce((acc, u) => acc + (u.login_count || 0), 0);
  const totalActions = userList.reduce((acc, u) => acc + (u.activity_count || 0), 0);
  const totalTimeSeconds = userList.reduce((acc, u) => acc + (u.total_time_seconds || 0), 0);

  const avgTimeSecondsPerUser = totalUsers > 0 ? Math.round(totalTimeSeconds / totalUsers) : 0;
  const avgTimeMinutesPerUser = (avgTimeSecondsPerUser / 60).toFixed(1);

  const formattedUserList = userList.map(u => {
    const mins = Math.max(1, Math.round((u.total_time_seconds || 0) / 60));
    return {
      ...u,
      is_blocked: blockedSet.has(u.email.toLowerCase()),
      duration_display: `${mins} min${mins === 1 ? "" : "s"}`,
      avg_time_display: `${mins} mins`
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
      avg_time_display: `${avgTimeMinutesPerUser} mins / user`
    },
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

  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || "heartbeat";

    const telemetryDb = loadTelemetryDb();
    const accessControlState = getAccessControlState();
    const blockedSet = new Set((accessControlState.blockedEmails || []).map(e => e.toLowerCase()));

    // ADMIN MANAGEMENT ACTIONS (RESTRICTED TO prepcom@iimidr.ac.in)
    if (role === "admin" || email.startsWith("prepcom")) {
      if (action === "block_email" && body.targetEmail) {
        const parsed = parseEmails(body.targetEmail);
        blockEmail(body.targetEmail);
        parsed.forEach(e => {
          if (telemetryDb[e]) telemetryDb[e].status = "Blocked";
        });
        saveTelemetryDb(telemetryDb);
        return NextResponse.json({ success: true, message: `Blocked ${parsed.length} email(s): ${parsed.join(", ")}` });
      }

      if (action === "unblock_email" && body.targetEmail) {
        const parsed = parseEmails(body.targetEmail);
        unblockEmail(body.targetEmail);
        parsed.forEach(e => {
          if (telemetryDb[e]) telemetryDb[e].status = "Active";
        });
        saveTelemetryDb(telemetryDb);
        return NextResponse.json({ success: true, message: `Unblocked ${parsed.length} email(s)` });
      }

      if (action === "allow_email" && body.targetEmail) {
        const parsed = parseEmails(body.targetEmail);
        allowEmail(body.targetEmail);
        return NextResponse.json({ success: true, message: `Added ${parsed.length} email(s) to allowed list` });
      }

      if (action === "remove_allowed_email" && body.targetEmail) {
        const parsed = parseEmails(body.targetEmail);
        removeAllowedEmail(body.targetEmail);
        return NextResponse.json({ success: true, message: `Removed ${parsed.length} email(s) from allowed list` });
      }

      if (action === "toggle_whitelist") {
        setWhitelistMode(body.enabled === true);
        return NextResponse.json({ success: true, isWhitelistMode: body.enabled === true });
      }
    }

    // REGULAR USER HEARTBEAT / LOGIN PERSISTENCE
    if (!telemetryDb[email]) {
      telemetryDb[email] = {
        email: email,
        role: role,
        session_start: nowStr,
        last_active: nowStr,
        total_time_seconds: 15,
        login_count: 1,
        activity_count: 1,
        status: blockedSet.has(email) ? "Blocked" : "Active"
      };
    } else {
      const u = telemetryDb[email];
      u.last_active = nowStr;
      u.activity_count = (u.activity_count || 0) + 1;
      u.total_time_seconds = (u.total_time_seconds || 0) + 15;
      if (action === "login") {
        u.login_count = (u.login_count || 0) + 1;
        u.session_start = nowStr;
      }
    }

    saveTelemetryDb(telemetryDb);
    return NextResponse.json({ success: true, user: telemetryDb[email] });
  } catch (e) {
    return NextResponse.json({ error: "Failed to record telemetry action" }, { status: 500 });
  }
}
