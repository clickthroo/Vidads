import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { startRenderVideo } from "@/lib/renderVideo";
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

  try {
    const heygenVideoId = await startRenderVideo(script);
    const updated = await pool.query<Script>(
      "update scripts set status = 'rendering', heygen_video_id = $2 where id = $1 returning *",
      [script.id, heygenVideoId]
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
