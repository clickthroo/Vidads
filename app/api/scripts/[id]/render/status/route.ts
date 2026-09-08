import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getHeyGenVideoStatus } from "@/lib/heygen";
import type { Script } from "@/lib/types";

async function withLatestVideoUrl(script: Script): Promise<Script> {
  const videoResult = await pool.query<{ video_url: string }>(
    "select video_url from videos where script_id = $1 order by created_at desc limit 1",
    [script.id]
  );
  return { ...script, video_url: videoResult.rows[0]?.video_url ?? null };
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

  if (script.status !== "rendering" || !script.heygen_video_id) {
    return NextResponse.json({ script: await withLatestVideoUrl(script) });
  }

  let heygenStatus;
  try {
    heygenStatus = await getHeyGenVideoStatus(script.heygen_video_id);
  } catch (error) {
    console.error("HeyGen status check failed:", error);
    return NextResponse.json({ script });
  }

  if (heygenStatus.status === "completed" && heygenStatus.video_url) {
    await pool.query(
      "insert into videos (script_id, video_url, provider) values ($1, $2, 'heygen')",
      [script.id, heygenStatus.video_url]
    );
    const updated = await pool.query<Script>(
      "update scripts set status = 'ready' where id = $1 returning *",
      [script.id]
    );
    return NextResponse.json({ script: await withLatestVideoUrl(updated.rows[0]) });
  }

  if (heygenStatus.status === "failed") {
    const updated = await pool.query<Script>(
      "update scripts set status = 'failed' where id = $1 returning *",
      [script.id]
    );
    return NextResponse.json({
      script: updated.rows[0],
      error: heygenStatus.error?.message ?? "HeyGen video generation failed",
    });
  }

  return NextResponse.json({ script });
}
