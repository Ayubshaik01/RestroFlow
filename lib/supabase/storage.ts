import { createAdminClient } from "./admin";

export const RESTAURANT_BUCKET = "restaurant-assets";

/**
 * Ensures the default storage bucket exists in Supabase.
 */
export async function ensureStorageBucket() {
  const supabase = createAdminClient();
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === RESTAURANT_BUCKET);
  if (!exists) {
    await supabase.storage.createBucket(RESTAURANT_BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5MB limit
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
    });
  }
}

/**
 * Uploads a file buffer or blob to Supabase Storage and returns the public URL.
 */
export async function uploadAsset(
  path: string,
  fileBuffer: Buffer | Blob,
  contentType: string,
): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(RESTAURANT_BUCKET)
    .upload(path, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload asset to Supabase Storage: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(RESTAURANT_BUCKET)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

