export type ScriptStatus = "draft" | "approved" | "rendering" | "ready" | "failed";

export interface Product {
  id: string;
  name: string;
  description: string;
}

export interface Script {
  id: string;
  product_id: string;
  angle: string;
  hook_text: string;
  full_script: string;
  status: ScriptStatus;
  created_at: string;
  heygen_video_id?: string | null;
  video_url?: string | null;
}

export interface Video {
  id: string;
  script_id: string;
  video_url: string;
  provider: string;
  created_at: string;
}
