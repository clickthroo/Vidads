import type { ScriptFormat } from "./formats";

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
  format: ScriptFormat;
  hook_text: string;
  full_script: string;
  status: ScriptStatus;
  created_at: string;
  heygen_video_id?: string | null;
  stitch_job_id?: string | null;
  video_url?: string | null;
}

export interface RenderClip {
  id: string;
  script_id: string;
  clip_index: number;
  spoken_text: string;
  avatar_look_id: string;
  heygen_video_id: string | null;
  status: "rendering" | "ready" | "failed";
  video_url: string | null;
  created_at: string;
}

export interface Video {
  id: string;
  script_id: string;
  video_url: string;
  provider: string;
  created_at: string;
}
