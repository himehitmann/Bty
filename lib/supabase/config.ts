export function isSecureAuthOrigin(address: Pick<URL, "protocol" | "hostname">) {
  return address.protocol === "https:" || (address.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(address.hostname));
}

export function supabaseCookieOptions(protocol: string) {
  return { secure: protocol === "https:", sameSite: "lax" as const, path: "/" };
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  try {
    const endpoint = new URL(url);
    if (!isSecureAuthOrigin(endpoint) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) return null;

    const authCookieName = `sb-${endpoint.hostname.split(".")[0]}-auth-token`;
    return { url: endpoint.href, origin: endpoint.origin, authCookieName, key };
  } catch {
    return null;
  }
}
