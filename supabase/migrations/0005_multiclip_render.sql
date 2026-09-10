-- Support multi-clip rendering: a script's video is now assembled from 2-3
-- separately-rendered HeyGen clips (different avatar looks, for scene
-- changes), then stitched together with captions/zoom/music via JSON2Video.

create table if not exists render_clips (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references scripts(id) on delete cascade,
  clip_index int not null,
  spoken_text text not null,
  avatar_look_id text not null,
  heygen_video_id text,
  status text not null default 'rendering',
  video_url text,
  created_at timestamptz not null default now()
);

create index if not exists render_clips_script_id_idx on render_clips(script_id);

-- Tracks the JSON2Video composition job once all clips for a script are ready.
alter table scripts add column if not exists stitch_job_id text;
