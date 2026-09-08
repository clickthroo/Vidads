import { pool } from "@/lib/db";
import type { Product, Script } from "@/lib/types";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [productsResult, scriptsResult] = await Promise.all([
    pool.query<Product>("select id, name, description from products order by name"),
    pool.query<Script>("select * from scripts order by created_at desc"),
  ]);

  return (
    <Dashboard
      products={productsResult.rows}
      initialScripts={scriptsResult.rows}
    />
  );
}
