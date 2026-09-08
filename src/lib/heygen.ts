const HEYGEN_API_BASE = "https://api.heygen.com";

// Placeholder stock avatar/voice from HeyGen's public catalog. Swap these
// for IDs from your own HeyGen account (dashboard, or GET /v2/avatars and
// GET /v2/voices) once you've picked one — override via env vars below.
const DEFAULT_AVATAR_ID = "Angela-inTshirt-20220820";
const DEFAULT_VOICE_ID = "1bd001e7e50f421d891986aad5158bc8";

const AVATAR_ID = process.env.HEYGEN_AVATAR_ID || DEFAULT_AVATAR_ID;
const VOICE_ID = process.env.HEYGEN_VOICE_ID || DEFAULT_VOICE_ID;

function apiKey(): string {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) throw new Error("HEYGEN_API_KEY is not set");
  return key;
}

/**
 * Strips the "Label (0-3s): " style prefixes our scripts are stored with,
 * so HeyGen's TTS reads only the actual line, not the section markers.
 */
export function toSpokenText(fullScript: string): string {
  return fullScript
    .split("\n")
    .map((line) => line.replace(/^[A-Za-z][\w\s]*\(\d+-\d+s\)\s*:\s*/, "").trim())
    .filter(Boolean)
    .join(" ");
}

export async function createHeyGenVideo(spokenText: string): Promise<string> {
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
            avatar_id: AVATAR_ID,
            avatar_style: "normal",
          },
          voice: {
            type: "text",
            input_text: spokenText,
            voice_id: VOICE_ID,
          },
        },
      ],
      dimension: { width: 1280, height: 720 },
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
