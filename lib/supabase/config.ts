export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  try {
    const endpoint = new URL(url);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
    const supported = endpoint.protocol === "https:" || (endpoint.protocol === "http:" && local);
    if (!supported || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) return null;

    const authCookieName = `sb-${endpoint.hostname.split(".")[0]}-auth-token`;
    return { url: endpoint.href, origin: endpoint.origin, authCookieName, key };
  } catch {
    return null;
  }
}
