import { Session } from "@supabase/supabase-js";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "./supabase";

// Google Sign-In needs a native module that isn't present in Expo Go.
// Load it lazily so the app boots in Expo Go for UI work; calling
// signInWithGoogle there will surface a clear error instead of crashing
// at module load.
let googleConfigured = false;
function loadGoogleSignin() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@react-native-google-signin/google-signin");
  if (!googleConfigured) {
    mod.GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
    googleConfigured = true;
  }
  return mod.GoogleSignin as {
    hasPlayServices: () => Promise<boolean>;
    signIn: () => Promise<
      | { type: "success"; data: { idToken?: string } }
      | { type: "cancelled"; data: null }
    >;
  };
}

function isCancellationError(e: unknown): boolean {
  // v16 returns { type: 'cancelled' }, but native bridge can still throw
  // on user cancel. Cover the common shapes.
  const code = (e as { code?: string | number })?.code;
  const msg = (e as { message?: string })?.message ?? "";
  return (
    code === "SIGN_IN_CANCELLED" ||
    code === -5 ||
    code === "-5" ||
    /cancel/i.test(msg)
  );
}

type AuthState = {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** Resolves true if signed in, false if user cancelled. Throws on real errors. */
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthState = {
    session,
    loading,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    },
    signInWithGoogle: async () => {
      const GoogleSignin = loadGoogleSignin();
      try {
        await GoogleSignin.hasPlayServices();
        const response = await GoogleSignin.signIn();

        if (response.type === "cancelled") return false;

        const idToken = response.data?.idToken;
        if (!idToken) {
          throw new Error("No ID token returned from Google Sign-In");
        }

        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: idToken,
        });
        if (error) throw error;
        return true;
      } catch (e) {
        if (isCancellationError(e)) return false;
        throw e;
      }
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
