import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { generateScripts } from "@/lib/anthropic";
import type { Product, Script } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { productId, angle } = body as { productId?: string; angle?: string };

  if (!productId || !angle?.trim()) {
    return NextResponse.json(
      { error: "productId and angle are required" },
      { status: 400 }
    );
  }

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
    generated = await generateScripts(product, angle.trim());
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
      `insert into scripts (product_id, angle, hook_text, full_script, status)
       values ($1, $2, $3, $4, 'draft')
       returning *`,
      [productId, angle.trim(), item.hook_text, item.full_script]
    );
    inserted.push(result.rows[0]);
  }

  return NextResponse.json({ scripts: inserted });
}
