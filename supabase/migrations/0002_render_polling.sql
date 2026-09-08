-- Support async rendering: track the in-flight HeyGen job so a short-lived
-- serverless request can kick off rendering and a separate poll can check on it.

alter table scripts add column if not exists heygen_video_id text;
