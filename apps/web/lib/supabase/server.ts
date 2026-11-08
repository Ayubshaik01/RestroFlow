import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const DEFAULT_SUPABASE_URL = "https://jerzykvnvjvafhvfsnrp.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_m77vZPAc9Um4BhkvEDseMA_beoHa2Sl";

function resolveUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (envUrl && !envUrl.includes("placeholder")) {
    return envUrl;
  }
  return DEFAULT_SUPABASE_URL;
}

function resolveAnonKey(): string {
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (envKey && !envKey.includes("placeholder")) {
    return envKey;
  }
  return DEFAULT_SUPABASE_ANON_KEY;
}

export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = resolveUrl();
  const supabaseAnonKey = resolveAnonKey();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // The `set` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing sessions.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // The `delete` method was called from a Server Component.
        }
      },
    },
  });
}
