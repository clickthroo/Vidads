const HEYGEN_API_BASE = "https://api.heygen.com";

// Placeholder stock avatar/voice from HeyGen's public catalog. Swap these
// for IDs from your own HeyGen account (dashboard, or GET /v2/avatars and
// GET /v2/voices) once you've picked one — override via env vars below.
const DEFAULT_AVATAR_ID = "Angela-inTshirt-20220820";
const DEFAULT_VOICE_ID = "1bd001e7e50f421d891986aad5158bc8";

// One or more avatar "look" IDs, comma-separated. Multiple looks let a
// script rotate between them scene-to-scene, so the rendered video changes
// visual angle instead of being one unbroken continuous shot. Falls back
// to the older single HEYGEN_AVATAR_ID var, then the stock placeholder.
export const AVATAR_LOOK_IDS: string[] = (
  process.env.HEYGEN_AVATAR_LOOK_IDS ||
  process.env.HEYGEN_AVATAR_ID ||
  DEFAULT_AVATAR_ID
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const VOICE_ID = process.env.HEYGEN_VOICE_ID || DEFAULT_VOICE_ID;

function apiKey(): string {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) throw new Error("HEYGEN_API_KEY is not set");
  return key;
}

/**
 * Strips the "Label (0-3s): " style prefixes our scripts are stored with,
 * so HeyGen's TTS reads only the actual line, not the section markers, then
 * groups the remaining lines into `sceneCount` roughly-equal spoken chunks —
 * one per HeyGen clip, so the rendered video can change avatar look/angle
 * scene to scene instead of being one unbroken shot.
 */
export function splitIntoScenes(fullScript: string, sceneCount: number): string[] {
  const lines = fullScript
    .split("\n")
    .map((line) => line.replace(/^[A-Za-z][\w\s]*\(\d+-\d+s\)\s*:\s*/, "").trim())
    .filter(Boolean);

  const count = Math.max(1, Math.min(sceneCount, lines.length));
  const perScene = Math.ceil(lines.length / count);
  const scenes: string[] = [];
  for (let i = 0; i < lines.length; i += perScene) {
    scenes.push(lines.slice(i, i + perScene).join(" "));
  }
  return scenes;
}

export async function createHeyGenVideo(
  spokenText: string,
  avatarLookId: string
): Promise<string> {
  const res = await fetch(`${HEYGEN_API_BASE}/v2/video/generate`, {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: avatarLookId,
            avatar_style: "normal",
          },
          voice: {
            type: "text",
            input_text: spokenText,
            voice_id: VOICE_ID,
          },
        },
      ],
      dimension: { width: 1080, height: 1920 },
    }),
  });

  const data = await res.json();
  if (!res.ok || !data?.data?.video_id) {
    throw new Error(
      `HeyGen video creation failed: ${data?.error?.message ?? res.statusText}`
    );
  }
  return data.data.video_id as string;
}

export interface HeyGenStatus {
  status: "pending" | "waiting" | "processing" | "completed" | "failed";
  video_url?: string;
  error?: { message: string } | null;
}

export async function getHeyGenVideoStatus(videoId: string): Promise<HeyGenStatus> {
  const res = await fetch(
    `${HEYGEN_API_BASE}/v1/video_status.get?video_id=${videoId}`,
    { headers: { "X-Api-Key": apiKey() } }
  );
  const data = await res.json();
  if (!res.ok || !data?.data) {
    throw new Error(`HeyGen status check failed: ${res.statusText}`);
  }
  return data.data as HeyGenStatus;
}
