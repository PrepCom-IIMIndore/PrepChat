import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import userActivity from "@/user_activity.json";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userList = Object.values(userActivity as any);
  userList.sort((a: any, b: any) => (b.last_login || "").localeCompare(a.last_login || ""));

  const totalLogins = userList.reduce((acc: number, u: any) => acc + (u.login_count || 0), 0);
  const totalActions = userList.reduce((acc: number, u: any) => acc + (u.activity_count || 0), 0);
  const flaggedUsers = userList.filter((u: any) => (u.login_count || 0) > 15 || (u.activity_count || 0) > 100);

  return NextResponse.json({
    summary: {
      total_registered_users: userList.length,
      total_logins: totalLogins,
      total_actions: totalActions,
      flagged_abuse_count: flaggedUsers.length
    },
    users: userList
  });
}
