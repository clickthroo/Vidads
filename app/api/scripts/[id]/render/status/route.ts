import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getHeyGenVideoStatus } from "@/lib/heygen";
import { createStitchJob, getStitchStatus } from "@/lib/json2video";
import type { RenderClip, Script } from "@/lib/types";

async function withLatestVideoUrl(script: Script): Promise<Script> {
  const videoResult = await pool.query<{ video_url: string }>(
    "select video_url from videos where script_id = $1 order by created_at desc limit 1",
    [script.id]
  );
  return { ...script, video_url: videoResult.rows[0]?.video_url ?? null };
}

async function markFailed(scriptId: string, message: string) {
  const updated = await pool.query<Script>(
    "update scripts set status = 'failed' where id = $1 returning *",
    [scriptId]
  );
  return { script: updated.rows[0], error: message };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const scriptResult = await pool.query<Script>(
    "select * from scripts where id = $1",
    [params.id]
  );
  const script = scriptResult.rows[0];
  if (!script) {
    return NextResponse.json({ error: "Script not found" }, { status: 404 });
  }

  if (script.status !== "rendering") {
    return NextResponse.json({ script: await withLatestVideoUrl(script) });
  }

  // Stage 2: all clips already rendered, waiting on the JSON2Video stitch job.
  if (script.stitch_job_id) {
    let stitchStatus;
    try {
      stitchStatus = await getStitchStatus(script.stitch_job_id);
    } catch (error) {
      console.error("JSON2Video status check failed:", error);
      return NextResponse.json({ script });
    }

    if (stitchStatus.status === "done" && stitchStatus.url) {
      await pool.query(
        "insert into videos (script_id, video_url, provider) values ($1, $2, 'json2video')",
        [script.id, stitchStatus.url]
      );
      const updated = await pool.query<Script>(
        "update scripts set status = 'ready' where id = $1 returning *",
        [script.id]
      );
      return NextResponse.json({ script: await withLatestVideoUrl(updated.rows[0]) });
    }

    if (stitchStatus.status === "error") {
      return NextResponse.json(
        await markFailed(
          script.id,
          stitchStatus.message ?? "Stitching the final video together failed"
        )
      );
    }

    return NextResponse.json({ script }); // still pending/running
  }

  // Stage 1: check each clip's HeyGen render.
  const clipsResult = await pool.query<RenderClip>(
    "select * from render_clips where script_id = $1 order by clip_index",
    [script.id]
  );
  const clips = clipsResult.rows;

  if (clips.length === 0) {
    return NextResponse.json(
      await markFailed(script.id, "No render clips found for this script")
    );
  }

  for (const clip of clips) {
    if (clip.status !== "rendering" || !clip.heygen_video_id) continue;

    let heygenStatus;
    try {
      heygenStatus = await getHeyGenVideoStatus(clip.heygen_video_id);
    } catch (error) {
      console.error("HeyGen status check failed:", error);
      continue; // transient — leave this clip pending and try again next poll
    }

    if (heygenStatus.status === "completed" && heygenStatus.video_url) {
      await pool.query(
        "update render_clips set status = 'ready', video_url = $2 where id = $1",
        [clip.id, heygenStatus.video_url]
      );
      clip.status = "ready";
      clip.video_url = heygenStatus.video_url;
    } else if (heygenStatus.status === "failed") {
      await pool.query("update render_clips set status = 'failed' where id = $1", [
        clip.id,
      ]);
      clip.status = "failed";
    }
  }

  if (clips.some((c) => c.status === "failed")) {
    return NextResponse.json(
      await markFailed(script.id, "One of the video clips failed to render")
    );
  }

  if (clips.every((c) => c.status === "ready")) {
    const clipUrls = clips
      .sort((a, b) => a.clip_index - b.clip_index)
      .map((c) => c.video_url as string);

    try {
      const stitchJobId = await createStitchJob(clipUrls);
      const updated = await pool.query<Script>(
        "update scripts set stitch_job_id = $2 where id = $1 returning *",
        [script.id, stitchJobId]
      );
      return NextResponse.json({ script: updated.rows[0] });
    } catch (error) {
      console.error("Failed to start stitch job:", error);
      return NextResponse.json(
        await markFailed(
          script.id,
          error instanceof Error ? error.message : "Failed to start final video assembly"
        )
      );
    }
  }

  return NextResponse.json({ script }); // clips still rendering
}
