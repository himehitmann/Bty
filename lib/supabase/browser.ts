import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";

const bucket = "palette-photos";
const signedUrlLifetime = 15 * 60;
export const palettePhotoMaxBytes = 8 * 1024 * 1024;

const imageExtensions: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

let browserClient: SupabaseClient | undefined;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config || typeof window === "undefined") return null;

  browserClient ??= createBrowserClient(config.url, config.key, {
    cookieOptions: { secure: window.location.protocol === "https:" },
  });
  return browserClient;
}

export class RemoteStateConflict extends Error {
  constructor() {
    super("Cet espace a été modifié depuis un autre appareil. Rechargez vos données avant de reprendre.");
    this.name = "RemoteStateConflict";
  }
}

export async function loadRemoteState<T>(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from("user_workspaces")
    .select("state, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return {
    state: (data?.state ?? null) as T | null,
    updatedAt: (data?.updated_at ?? null) as string | null,
  };
}

export async function saveRemoteState<T extends object>(
  client: SupabaseClient,
  userId: string,
  state: T,
  expectedUpdatedAt?: string | null,
): Promise<string> {
  const table = client.from("user_workspaces");

  if (expectedUpdatedAt === undefined) {
    const { data, error } = await table
      .upsert({ user_id: userId, state })
      .select("updated_at")
      .single();

    if (error) throw error;
    return data.updated_at;
  }

  if (expectedUpdatedAt === null) {
    const { data, error } = await table
      .insert({ user_id: userId, state })
      .select("updated_at")
      .single();

    if (error?.code === "23505") throw new RemoteStateConflict();
    if (error) throw error;
    return data.updated_at;
  }

  const { data, error } = await table
    .update({ state })
    .eq("user_id", userId)
    .eq("updated_at", expectedUpdatedAt)
    .select("updated_at")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new RemoteStateConflict();
  return data.updated_at;
}

export async function getPalettePhotoUrl(client: SupabaseClient, path: string): Promise<string> {
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, signedUrlLifetime);
  if (error) throw error;
  return data.signedUrl;
}

export async function removePalettePhoto(client: SupabaseClient, path: string): Promise<void> {
  const { error } = await client.storage.from(bucket).remove([path]);
  if (error) throw error;
}

export async function uploadPalettePhoto(
  client: SupabaseClient,
  userId: string,
  file: File,
): Promise<{ path: string; url: string }> {
  const extension = imageExtensions[file.type];
  if (!extension) throw new Error("Choisissez une photo JPEG, PNG ou WebP.");
  if (file.size === 0 || file.size > palettePhotoMaxBytes) {
    throw new Error("La photo doit peser entre 1 octet et 8 Mo.");
  }

  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from(bucket).upload(path, file, { contentType: file.type });
  if (error) throw error;

  try {
    return { path, url: await getPalettePhotoUrl(client, path) };
  } catch (error) {
    await removePalettePhoto(client, path).catch(() => undefined);
    throw error;
  }
}
