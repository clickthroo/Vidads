import type { Script } from "./types";

export interface RenderVideoResult {
  videoUrl: string;
  provider: string;
}

/**
 * Stub for kicking off video rendering from an approved script.
 * Will be wired up to the HeyGen API (HEYGEN_API_KEY) next.
 */
export async function renderVideo(script: Script): Promise<RenderVideoResult> {
  throw new Error(
    `renderVideo() is not implemented yet — wire this up to HeyGen (script ${script.id})`
  );
}
