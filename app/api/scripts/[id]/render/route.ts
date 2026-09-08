import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { renderVideo } from "@/lib/renderVideo";
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
  if (script.status !== "approved") {
    return NextResponse.json(
      { error: "Only approved scripts can be rendered" },
      { status: 400 }
    );
  }

  await pool.query("update scripts set status = 'rendering' where id = $1", [
    script.id,
  ]);

  try {
    const { videoUrl, provider } = await renderVideo(script);
    await pool.query(
      "insert into videos (script_id, video_url, provider) values ($1, $2, $3)",
      [script.id, videoUrl, provider]
    );
    const updated = await pool.query<Script>(
      "update scripts set status = 'ready' where id = $1 returning *",
      [script.id]
    );
    return NextResponse.json({ script: updated.rows[0] });
  } catch (error) {
    console.error("Video rendering failed:", error);
    const updated = await pool.query<Script>(
      "update scripts set status = 'failed' where id = $1 returning *",
      [script.id]
    );
    return NextResponse.json(
      { error: "Rendering not implemented yet", script: updated.rows[0] },
      { status: 501 }
    );
  }
}
