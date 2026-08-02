import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  blockedEmails,
  allowedEmails,
  isWhitelistMode,
  blockEmail,
  unblockEmail,
  allowEmail,
  removeAllowedEmail,
  setWhitelistMode
} from "@/lib/accessControl";

const telemetryDb: {
  [email: string]: {
    email: string;
    role: string;
    session_start: string;
    last_active: string;
    total_time_seconds: number;
    login_count: number;
    activity_count: number;
    status: string;
  }
} = {};

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
      is_blocked: blockedEmails.has(u.email),
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
      blockedEmails: Array.from(blockedEmails),
      allowedEmails: Array.from(allowedEmails),
      isWhitelistMode: isWhitelistMode
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

    // ADMIN MANAGEMENT ACTIONS (RESTRICED TO prepcom@iimidr.ac.in)
    if (role === "admin" || email.startsWith("prepcom")) {
      if (action === "block_email" && body.targetEmail) {
        blockEmail(body.targetEmail);
        if (telemetryDb[body.targetEmail.toLowerCase()]) {
          telemetryDb[body.targetEmail.toLowerCase()].status = "Blocked";
        }
        return NextResponse.json({ success: true, message: `Email ${body.targetEmail} has been blocked.` });
      }

      if (action === "unblock_email" && body.targetEmail) {
        unblockEmail(body.targetEmail);
        if (telemetryDb[body.targetEmail.toLowerCase()]) {
          telemetryDb[body.targetEmail.toLowerCase()].status = "Active";
        }
        return NextResponse.json({ success: true, message: `Email ${body.targetEmail} unblocked.` });
      }

      if (action === "allow_email" && body.targetEmail) {
        allowEmail(body.targetEmail);
        return NextResponse.json({ success: true, message: `Email ${body.targetEmail} added to allowed list.` });
      }

      if (action === "remove_allowed_email" && body.targetEmail) {
        removeAllowedEmail(body.targetEmail);
        return NextResponse.json({ success: true, message: `Email ${body.targetEmail} removed from allowed list.` });
      }

      if (action === "toggle_whitelist") {
        setWhitelistMode(body.enabled === true);
        return NextResponse.json({ success: true, isWhitelistMode: body.enabled === true });
      }
    }

    // REGULAR USER HEARTBEAT
    if (!telemetryDb[email]) {
      telemetryDb[email] = {
        email: email,
        role: role,
        session_start: nowStr,
        last_active: nowStr,
        total_time_seconds: 15,
        login_count: 1,
        activity_count: 1,
        status: blockedEmails.has(email) ? "Blocked" : "Active"
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

    return NextResponse.json({ success: true, user: telemetryDb[email] });
  } catch (e) {
    return NextResponse.json({ error: "Failed to record telemetry action" }, { status: 500 });
  }
}
