import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// In-Memory Telemetry Database for Serverless Execution
// Stores user session start, end, and duration stats
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

  // STRICT AUTHORIZATION: ONLY prepcom@iimidr.ac.in OR ADMIN ROLE HAS ACCESS TO TELEMETRY
  if (role !== "admin" && !email.startsWith("prepcom")) {
    return NextResponse.json({ error: "Access Denied: Telemetry monitoring is restricted exclusively to prepcom@iimidr.ac.in" }, { status: 403 });
  }

  const userList = Object.values(telemetryDb);
  userList.sort((a, b) => (b.last_active || "").localeCompare(a.last_active || ""));

  const totalUsers = userList.length;
  const totalLogins = userList.reduce((acc, u) => acc + (u.login_count || 0), 0);
  const totalActions = userList.reduce((acc, u) => acc + (u.activity_count || 0), 0);
  const totalTimeSeconds = userList.reduce((acc, u) => acc + (u.total_time_seconds || 0), 0);

  // Calculate Average Time per User
  const avgTimeSecondsPerUser = totalUsers > 0 ? Math.round(totalTimeSeconds / totalUsers) : 0;
  const avgTimeMinutesPerUser = (avgTimeSecondsPerUser / 60).toFixed(1);

  const formattedUserList = userList.map(u => {
    const mins = Math.max(1, Math.round((u.total_time_seconds || 0) / 60));
    return {
      ...u,
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
  const nowTs = Math.floor(Date.now() / 1000);

  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || "heartbeat";

    if (!telemetryDb[email]) {
      telemetryDb[email] = {
        email: email,
        role: role,
        session_start: nowStr,
        last_active: nowStr,
        total_time_seconds: 15,
        login_count: 1,
        activity_count: 1,
        status: "Active"
      };
    } else {
      const u = telemetryDb[email];
      u.last_active = nowStr;
      u.activity_count = (u.activity_count || 0) + 1;
      u.total_time_seconds = (u.total_time_seconds || 0) + 15; // 15 seconds added per heartbeat interval
      if (action === "login") {
        u.login_count = (u.login_count || 0) + 1;
        u.session_start = nowStr;
      }
    }

    return NextResponse.json({ success: true, user: telemetryDb[email] });
  } catch (e) {
    return NextResponse.json({ error: "Failed to record heartbeat" }, { status: 500 });
  }
}
