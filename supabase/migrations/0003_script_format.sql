-- Support multiple ad script formats (testimonial, unboxing, before/after, etc.)
-- alongside the original classic UGC structure.

alter table scripts add column if not exists format text not null default 'ugc_hook';
