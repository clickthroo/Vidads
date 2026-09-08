import type { Script } from "./types";
import { createHeyGenVideo, toSpokenText } from "./heygen";

/**
 * Kicks off HeyGen video generation and returns its job id. Callers must
 * poll getHeyGenVideoStatus separately — a single serverless request can't
 * safely wait for the render to finish, since that can take minutes.
 */
export async function startRenderVideo(script: Script): Promise<string> {
  const spokenText = toSpokenText(script.full_script);
  return createHeyGenVideo(spokenText);
}
