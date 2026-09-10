const J2V_API_BASE = "https://api.json2video.com/v2";

// Optional: a royalty-free background music track mixed in quietly under
// the voice track. Leave unset to skip music entirely.
const MUSIC_URL = process.env.STITCH_MUSIC_URL || "";

function apiKey(): string {
  const key = process.env.JSON2VIDEO_API_KEY;
  if (!key) throw new Error("JSON2VIDEO_API_KEY is not set");
  return key;
}

/**
 * Kicks off a JSON2Video job that stitches the given HeyGen clip URLs
 * (in order) into one video, punches in slightly on each scene, and
 * auto-transcribes the real audio into Hormozi-style word-highlight
 * captions. Returns the JSON2Video project id to poll.
 *
 * NOTE: exact field names below are our best read of JSON2Video's
 * documented "movie" JSON shape — this may need a real-key test-and-adjust
 * pass, the same way the HeyGen integration did.
 */
export async function createStitchJob(clipUrls: string[]): Promise<string> {
  const movie = {
    resolution: "custom",
    width: 1080,
    height: 1920,
    scenes: clipUrls.map((url) => ({
      elements: [
        {
          type: "video",
          src: url,
          zoom: 3,
        },
      ],
    })),
    elements: [
      {
        type: "subtitles",
        settings: {
          "font-family": "Anton",
          "font-size": 90,
          "word-color": "#FFFFFF",
          "line-color": "#FFFFFF",
          "outline-color": "#000000",
          "outline-width": 8,
          "highlight-color": "#FFDD00",
          position: "center-center",
        },
      },
      ...(MUSIC_URL
        ? [{ type: "audio", src: MUSIC_URL, volume: 0.15 }]
        : []),
    ],
  };

  const res = await fetch(`${J2V_API_BASE}/movies`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(movie),
  });

  const data = await res.json();
  if (!res.ok || !data?.project) {
    throw new Error(
      `JSON2Video job creation failed: ${data?.message ?? res.statusText}`
    );
  }
  return data.project as string;
}

export interface StitchStatus {
  status: "pending" | "running" | "done" | "error";
  url?: string;
  message?: string;
}

export async function getStitchStatus(projectId: string): Promise<StitchStatus> {
  const res = await fetch(`${J2V_API_BASE}/movies?project=${projectId}`, {
    headers: { "x-api-key": apiKey() },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`JSON2Video status check failed: ${res.statusText}`);
  }
  return {
    status: data?.movie?.status ?? "pending",
    url: data?.movie?.url,
    message: data?.movie?.message,
  };
}
