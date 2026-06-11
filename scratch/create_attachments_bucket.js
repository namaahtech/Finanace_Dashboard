/**
 * Creates the 'attachments' storage bucket in Supabase.
 * Run with: node scratch/create_attachments_bucket.js
 */
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log("Creating 'attachments' bucket...");

  // Check if it already exists
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.error("Failed to list buckets:", listErr.message);
    process.exit(1);
  }

  const exists = buckets.some((b) => b.id === "attachments");
  if (exists) {
    console.log("✅ 'attachments' bucket already exists.");
    
    // Update it to make sure settings are correct
    const { error: updateErr } = await supabase.storage.updateBucket("attachments", {
      public: false,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: null,  // All types
    });
    if (updateErr) {
      console.error("Failed to update bucket:", updateErr.message);
    } else {
      console.log("✅ Bucket settings updated: 50MB limit, all file types allowed.");
    }
    return;
  }

  // Create it
  const { data, error } = await supabase.storage.createBucket("attachments", {
    public: false,
    fileSizeLimit: 52428800, // 50MB per file
    allowedMimeTypes: null,  // NULL = all formats: PDF, DOCX, PNG, ZIP, MP4, etc.
  });

  if (error) {
    console.error("❌ Failed to create bucket:", error.message);
    process.exit(1);
  }

  console.log("✅ 'attachments' bucket created successfully:", data);
  console.log("   - Public: false (authenticated users only)");
  console.log("   - File size limit: 50MB");
  console.log("   - Allowed types: ALL formats");
}

main().catch(console.error);
