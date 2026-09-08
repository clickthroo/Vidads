import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { generateScripts } from "@/lib/anthropic";
import { isScriptFormat, type ScriptFormat } from "@/lib/formats";
import type { Product, Script } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { productId, angle, format } = body as {
    productId?: string;
    angle?: string;
    format?: ScriptFormat;
  };

  if (!productId || !angle?.trim()) {
    return NextResponse.json(
      { error: "productId and angle are required" },
      { status: 400 }
    );
  }

  const scriptFormat: ScriptFormat = isScriptFormat(format) ? format : "ugc_hook";

  const productResult = await pool.query<Product>(
    "select id, name, description from products where id = $1",
    [productId]
  );
  const product = productResult.rows[0];
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  let generated;
  try {
    generated = await generateScripts(product, angle.trim(), scriptFormat);
  } catch (error) {
    console.error("Script generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate scripts" },
      { status: 502 }
    );
  }

  const inserted: Script[] = [];
  for (const item of generated) {
    const result = await pool.query<Script>(
      `insert into scripts (product_id, angle, format, hook_text, full_script, status)
       values ($1, $2, $3, $4, $5, 'draft')
       returning *`,
      [productId, angle.trim(), scriptFormat, item.hook_text, item.full_script]
    );
    inserted.push(result.rows[0]);
  }

  return NextResponse.json({ scripts: inserted });
}
