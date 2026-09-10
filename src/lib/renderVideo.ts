import type { Script } from "./types";
import { AVATAR_LOOK_IDS, createHeyGenVideo, splitIntoScenes } from "./heygen";

export interface ClipJob {
  clipIndex: number;
  spokenText: string;
  avatarLookId: string;
  heygenVideoId: string;
}

/**
 * Kicks off one HeyGen render per scene (up to one per configured avatar
 * look, capped at 3), rotating avatar looks scene-to-scene so the final
 * stitched video has real scene changes instead of one continuous shot.
 * Callers must poll each clip's status separately — a single serverless
 * request can't safely wait for renders that take minutes.
 */
export async function startMultiClipRender(script: Script): Promise<ClipJob[]> {
  const sceneCount = Math.max(1, Math.min(3, AVATAR_LOOK_IDS.length));
  const scenes = splitIntoScenes(script.full_script, sceneCount);

  const jobs: ClipJob[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const avatarLookId = AVATAR_LOOK_IDS[i % AVATAR_LOOK_IDS.length];
    const heygenVideoId = await createHeyGenVideo(scenes[i], avatarLookId);
    jobs.push({ clipIndex: i, spokenText: scenes[i], avatarLookId, heygenVideoId });
  }
  return jobs;
}
