import { pool } from "@/lib/db";
import type { Product, Script } from "@/lib/types";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [productsResult, scriptsResult, topAnglesResult] = await Promise.all([
    pool.query<Product>("select id, name, description from products order by name"),
    pool.query<Script>(
      `select s.*, v.video_url
       from scripts s
       left join lateral (
         select video_url from videos where videos.script_id = s.id
         order by created_at desc limit 1
       ) v on true
       order by s.created_at desc`
    ),
    pool.query<{ angle: string }>(
      `select angle
       from scripts
       group by angle
       order by count(*) desc, max(created_at) desc
       limit 8`
    ),
  ]);

  return (
    <Dashboard
      products={productsResult.rows}
      initialScripts={scriptsResult.rows}
      suggestedAngles={topAnglesResult.rows.map((r) => r.angle)}
    />
  );
}
