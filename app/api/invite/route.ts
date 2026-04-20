import { NextRequest, NextResponse } from "next/server";
import { createApiClient, createAdminClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = createApiClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { email, message } = await req.json();
  if (!email) {
    return NextResponse.json(
      { error: "email is required" },
      { status: 400 },
    );
  }

  const displayName =
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "a friend";

  const initial = displayName.charAt(0).toUpperCase();

  const admin = createAdminClient();
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        inviter_name: displayName,
        inviter_initial: initial,
        inviter_message: message || "",
      },
      redirectTo: "https://spinereads.com/auth/accept-invite",
    },
  );

  if (inviteError)
    return NextResponse.json({ error: inviteError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
