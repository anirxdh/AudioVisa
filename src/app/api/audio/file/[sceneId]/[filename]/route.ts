import { NextRequest } from "next/server";
import * as fs from "fs";
import * as path from "path";

/**
 * GET /api/audio/file/[sceneId]/[filename]
 *
 * Streams audio bytes from the serverless /tmp cache. Used on Vercel where
 * /public is read-only so generated audio lives in /tmp/audio/{sceneId}/.
 *
 * Only reads files matching ^(sfx-\d+|music)\.mp3$ to avoid path traversal.
 */
const ALLOWED = /^(sfx-\d+|music)\.mp3$/;
const SCENE_ID_RE = /^[a-z0-9-]+$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sceneId: string; filename: string }> }
) {
  const { sceneId, filename } = await params;

  if (!SCENE_ID_RE.test(sceneId) || !ALLOWED.test(filename)) {
    return new Response("Not found", { status: 404 });
  }

  const root = process.env.VERCEL
    ? path.join("/tmp", "audio")
    : path.join(process.cwd(), "public", "audio");
  const filePath = path.join(root, sceneId, filename);

  if (!filePath.startsWith(root)) {
    return new Response("Not found", { status: 404 });
  }
  if (!fs.existsSync(filePath)) {
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
