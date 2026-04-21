import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Google OAuth merges provider profile data into user_metadata,
      // overwriting `name` with the Google profile name. Restore it from
      // `custom_name` if set, or from the email identity's original data.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const meta = user?.user_metadata;
      if (meta && user?.identities && user.identities.length > 1) {
        const savedName = meta.custom_name;
        if (savedName && meta.name !== savedName) {
          await supabase.auth.updateUser({
            data: { name: savedName },
          });
        } else if (!savedName) {
          // Legacy account without custom_name — recover from email identity
          const emailIdentity = user.identities.find(
            (i) => i.provider === "email",
          );
          const originalName = (
            emailIdentity?.identity_data as Record<string, string>
          )?.name;
          if (originalName && meta.name !== originalName) {
            await supabase.auth.updateUser({
              data: { name: originalName, custom_name: originalName },
            });
          }
        }
      }
      // If the user has no username yet, send them to choose one
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();
        if (!profile?.username) {
          return NextResponse.redirect(
            `${origin}/auth/choose-username${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`,
          );
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If code exchange fails or no code, redirect to login
  return NextResponse.redirect(`${origin}/login`);
}
