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
      // which can overwrite a custom `name` set during signup.
      // If the user has a `custom_name` (set during signup/profile edit),
      // restore `name` from it so getDisplayName returns the right value.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const meta = user?.user_metadata;
      if (meta?.custom_name && meta.name !== meta.custom_name) {
        await supabase.auth.updateUser({
          data: { name: meta.custom_name },
        });
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If code exchange fails or no code, redirect to login
  return NextResponse.redirect(`${origin}/login`);
}
