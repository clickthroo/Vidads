import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { startMultiClipRender } from "@/lib/renderVideo";
import type { Script } from "@/lib/types";

export async function POST(
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
  if (script.status !== "approved" && script.status !== "failed") {
    return NextResponse.json(
      { error: "Only approved (or previously failed) scripts can be rendered" },
      { status: 400 }
    );
  }

  // Clear out any clips/stitch job left over from a previous failed attempt.
  await pool.query("delete from render_clips where script_id = $1", [script.id]);

  try {
    const jobs = await startMultiClipRender(script);
    for (const job of jobs) {
      await pool.query(
        `insert into render_clips
           (script_id, clip_index, spoken_text, avatar_look_id, heygen_video_id, status)
         values ($1, $2, $3, $4, $5, 'rendering')`,
        [script.id, job.clipIndex, job.spokenText, job.avatarLookId, job.heygenVideoId]
      );
    }
    const updated = await pool.query<Script>(
      "update scripts set status = 'rendering', stitch_job_id = null where id = $1 returning *",
      [script.id]
    );
    return NextResponse.json({ script: updated.rows[0] });
  } catch (error) {
    console.error("Failed to start video rendering:", error);
    const updated = await pool.query<Script>(
      "update scripts set status = 'failed' where id = $1 returning *",
      [script.id]
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Rendering failed to start",
        script: updated.rows[0],
      },
      { status: 502 }
    );
  }
}
