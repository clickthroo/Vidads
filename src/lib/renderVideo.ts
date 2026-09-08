import type { Script } from "./types";
import { createHeyGenVideo, pollHeyGenVideo, toSpokenText } from "./heygen";

export interface RenderVideoResult {
  videoUrl: string;
  provider: string;
}

export async function renderVideo(script: Script): Promise<RenderVideoResult> {
  const spokenText = toSpokenText(script.full_script);
  const videoId = await createHeyGenVideo(spokenText);
  const videoUrl = await pollHeyGenVideo(videoId);
  return { videoUrl, provider: "heygen" };
}
