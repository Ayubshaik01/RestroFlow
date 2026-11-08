import { createBrowserClient } from "@supabase/ssr";

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

export function isSupabaseConfigured(): boolean {
  const url = resolveUrl();
  const key = resolveAnonKey();
  return Boolean(
    url &&
    key &&
    !url.includes("placeholder") &&
    !key.includes("placeholder")
  );
}

export function createClient() {
  const supabaseUrl = resolveUrl();
  const supabaseAnonKey = resolveAnonKey();

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createClient();
