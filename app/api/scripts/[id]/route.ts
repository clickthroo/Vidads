import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { Script, ScriptStatus } from "@/lib/types";

const ALLOWED_STATUSES: ScriptStatus[] = [
  "draft",
  "approved",
  "rendering",
  "ready",
  "failed",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { full_script, hook_text, status } = body as {
    full_script?: string;
    hook_text?: string;
    status?: ScriptStatus;
  };

  if (status && !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (full_script !== undefined) {
    updates.push(`full_script = $${i++}`);
    values.push(full_script);
  }
  if (hook_text !== undefined) {
    updates.push(`hook_text = $${i++}`);
    values.push(hook_text);
  }
  if (status !== undefined) {
    updates.push(`status = $${i++}`);
    values.push(status);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  values.push(params.id);
  const result = await pool.query<Script>(
    `update scripts set ${updates.join(", ")} where id = $${i} returning *`,
    values
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Script not found" }, { status: 404 });
  }

  return NextResponse.json({ script: result.rows[0] });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await pool.query("delete from scripts where id = $1", [
    params.id,
  ]);

  if (result.rowCount === 0) {
    return NextResponse.json({ error: "Script not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
