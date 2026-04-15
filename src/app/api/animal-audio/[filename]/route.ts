import { NextRequest } from "next/server";
import * as fs from "fs";
import * as path from "path";

/**
 * GET /api/animal-audio/[filename]
 *
 * Streams a cached animal SFX from the serverless /tmp cache. Only used on
 * Vercel where /public is read-only. Locally, files in /public/animals are
 * served directly as static assets.
 *
 * Filename must match `{animal-id}.mp3` to avoid path traversal.
 */
const FILENAME_RE = /^[a-z0-9-]+\.mp3$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  if (!FILENAME_RE.test(filename)) {
    return new Response("Not found", { status: 404 });
  }

  const isServerless = !!process.env.VERCEL || !!process.env.NETLIFY;
  const root = isServerless
    ? path.join("/tmp", "animals")
    : path.join(process.cwd(), "public", "animals");
  const filePath = path.join(root, filename);

  if (!filePath.startsWith(root) || !fs.existsSync(filePath)) {
    return new Response("Not found", { status: 404 });
  }

  const data = fs.readFileSync(filePath);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(data.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
