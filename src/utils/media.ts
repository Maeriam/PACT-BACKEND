import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
const STORAGE_ZONE = "stockwisee"; // your Bunny Storage zone name
const STORAGE_PASSWORD = process.env.BUNNY_STORAGE_PASSWORD; // Bunny dashboard → Storage → Password
const REGION = "jh";
const BASE_URL = `https://storage.bunnycdn.com/${STORAGE_ZONE}`;
const CDN_BASE_URL = "https://pact-hackathon.b-cdn.net"; // your Pull Zone or CDN domain


// ----------------------------
// Types
// ----------------------------
export interface UploadResult {
  key: string;
  url: string;
}

// ----------------------------
// Helpers
// ----------------------------
function guessMimeType(fileName: string): string {
  const ext = fileName.toLowerCase();

  if (ext.endsWith(".png")) return "image/png";
  if (ext.endsWith(".jpg") || ext.endsWith(".jpeg")) return "image/jpeg";
  if (ext.endsWith(".svg")) return "image/svg+xml";

  // fallback
  return "application/octet-stream";
}


function generateFileKey(adminId: string, shopName: string, fileName: string, serialNumber: number): string {
   const ext = fileName.split(".").pop(); // get extension
  return `${adminId}/${shopName}/${serialNumber}.${ext}`;
}

if (!STORAGE_PASSWORD) {
  throw new Error("BunnyCDN Storage Access Key not set in environment variables!");
}

if (!STORAGE_ZONE) {
  throw new Error("BunnyCDN Storage Zone not configured!");
}

// Centralized axios instance
const bunnyAxios = axios.create({
  baseURL: BASE_URL,
  headers: { AccessKey: STORAGE_PASSWORD.trim() },
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
});

// ----------------------------
// Upload single file
// ----------------------------
export async function uploadFileToBunny(
  file: { buffer: Buffer; fileName: string; serialNumber: number; adminId: string; shopName: string }
): Promise<UploadResult> {
  try {
    const { buffer, fileName ,adminId,serialNumber,shopName} = file;
    const key = generateFileKey(adminId, shopName, fileName, serialNumber);
    const mimeType = guessMimeType(fileName);

    await bunnyAxios.put(`/${key}`, buffer, {
      headers: { "Content-Type": mimeType },
    });

    return { key, url: `${CDN_BASE_URL}/${key}` };
  } catch (error: any) {
    console.error("Bunny upload error:", error.response?.data || error.message);
    throw new Error(`Bunny upload failed: ${error.response?.data?.Message || error.message}`);
  }
}

export async function uploadFilesToBunny(
  files: { buffer: Buffer; fileName: string; serialNumber: number; adminId: string; shopName: string }[]
): Promise<UploadResult[]> {
  const results = await Promise.allSettled(
    files.map((file) => uploadFileToBunny(file))
  );

  // filter out rejected or skipped uploads
  return results
    .filter((r) => r.status === "fulfilled" && r.value !== null)
    .map((r: any) => r.value);
}


// ----------------------------
// Update (replace) a single file
// ----------------------------
export async function updateFileInBunny(
  newFile: { buffer: Buffer; fileName: string; serialNumber: number; adminId: string; shopName: string },
  oldKey?: string
): Promise<UploadResult> {
  try {
    if (oldKey) {
      await bunnyAxios.delete(`/${oldKey}`);
    }
    return await uploadFileToBunny(newFile);
  } catch (error: any) {
    console.error("Bunny update error:", error.response?.data || error.message);
    throw new Error(`Bunny update failed: ${error.response?.data?.Message || error.message}`);
  }
}


// ----------------------------
// Delete multiple files
// ----------------------------
export async function deleteFilesFromBunny(keys: string[]): Promise<string[]> {
  try {
    await Promise.all(keys.map((key) => bunnyAxios.delete(`/${key}`)));
    return keys;
  } catch (error: any) {
    console.error("Bunny delete error:", error.response?.data || error.message);
    throw new Error(`Bunny delete failed: ${error.response?.data?.Message || error.message}`);
  }
}

// ----------------------------
// Extract storage key from URL
// ----------------------------
export function extractKeyFromUrl(url: string): string {
  const baseUrl = `${CDN_BASE_URL}/`;
  if (url.startsWith(baseUrl)) {
    return url.slice(baseUrl.length);
  }
  throw new Error("Invalid Bunny CDN URL format");
}
